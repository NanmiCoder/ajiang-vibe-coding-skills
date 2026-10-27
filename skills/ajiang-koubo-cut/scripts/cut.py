#!/usr/bin/env python3
"""Frame-accurate speech edits. Editorial decisions belong in the input plan.

Requires Python 3.10+, ffmpeg and ffprobe; no Python packages are required.
All intervals are half-open: start is included, end is excluded.
"""
import argparse
from array import array
from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import wave


def dump(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def command(args, log=None):
    p = subprocess.run([str(a) for a in args], capture_output=True)
    if log:
        Path(log).write_bytes(p.stderr)
    if p.returncode:
        raise ValueError(f"Command failed ({p.returncode}); {log or p.stderr.decode(errors='replace')[-1800:]}")
    return p.stdout


def fingerprint(path):
    path = Path(path)
    stat = path.stat()
    with path.open("rb") as f:
        head = f.read(1048576)
        f.seek(max(0, stat.st_size-1048576))
        tail = f.read(1048576)
    return {"bytes": stat.st_size, "mtime_ns": stat.st_mtime_ns,
            "edge_sha256": hashlib.sha256(head+tail).hexdigest()}


def probe(path, packets=False):
    args = ["ffprobe", "-v", "error", "-show_streams", "-show_format"]
    if packets:
        args += ["-select_streams", "v:0", "-show_packets", "-show_entries", "packet=pts,duration"]
    return json.loads(command(args+["-of", "json", path]))


def inspect(path):
    meta = probe(path)
    v = next((s for s in meta["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in meta["streams"] if s["codec_type"] == "audio"), None)
    if not v or not a:
        raise ValueError("A video stream and embedded audio are required.")
    try:
        fps = Fraction(v.get("avg_frame_rate", "0/1"))
    except (ValueError, ZeroDivisionError):
        raise ValueError("Cannot determine video frame rate.")
    if fps <= 0:
        raise ValueError("Cannot determine video frame rate.")
    packets = probe(path, packets=True)["packets"]
    if not packets or any("pts" not in p for p in packets):
        raise ValueError("Video packet PTS are missing; establish a CFR working copy first.")
    pts = sorted(int(p["pts"]) for p in packets)
    tb = Fraction(v["time_base"])
    expected = 1/fps
    tolerance = max(float(tb)*1.1, 0.00002)
    bad = sum(abs(float((z-x)*tb-expected)) > tolerance for x, z in zip(pts, pts[1:]))
    cfr = bad == 0 and len(set(pts)) == len(pts)
    return {"path": str(Path(path).resolve()), "fingerprint": fingerprint(path),
            "fps": str(fps), "cfr": cfr, "irregular_frame_intervals": bad,
            "frames": len(pts), "duration": float(len(pts)/fps),
            "video_start": float(pts[0]*tb), "width": v["width"], "height": v["height"],
            "audio_rate": int(a["sample_rate"]), "channels": int(a["channels"]),
            "video": v, "audio": a}


def rational(value):
    return Fraction(str(value))


def stamp(seconds):
    whole, ms = divmod(round(seconds*1000), 1000)
    return f"{whole//3600:02}:{whole%3600//60:02}:{whole%60:02},{ms:03}"


def read_subtitles(path):
    path = Path(path)
    if path.suffix.lower() == ".json":
        cues = load(path)
        if isinstance(cues, dict):
            cues = cues["cues"]
    else:
        cues = []
        def sec(t):
            h, m, s = t.replace(",", ".").split(":")
            return int(h)*3600+int(m)*60+float(s)
        for block in re.split(r"\n\s*\n", path.read_text(encoding="utf-8-sig").strip()):
            lines = block.splitlines()
            line = next((i for i, s in enumerate(lines) if "-->" in s), None)
            if line is None:
                raise ValueError("Invalid SRT block: "+block[:120])
            a, z = [s.strip().split()[0] for s in lines[line].split("-->")]
            cues.append({"start": sec(a), "end": sec(z), "text": "\n".join(lines[line+1:])})
    previous = 0
    for i, c in enumerate(cues, 1):
        if not (0 <= c["start"] < c["end"]) or not str(c["text"]).strip():
            raise ValueError(f"Invalid subtitle cue {i}.")
        if c["start"] < previous-0.002:
            raise ValueError(f"Subtitle cue {i} overlaps or is out of order; correct the source timeline.")
        previous = c["end"]
    return cues


def write_srt(path, cues):
    Path(path).write_text("\n\n".join(
        f"{i}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}"
        for i, c in enumerate(cues, 1))+"\n", encoding="utf-8")


def map_subtitles(cues, base_keeps, parts, fps):
    mapped = []
    for i, cue in enumerate(cues, 1):
        a, z = cue["start"], cue["end"]
        coverage = sum(max(0, min(z, e/fps)-max(a, s/fps)) for s, e, _ in base_keeps)
        if coverage <= 0.0001:
            continue
        lost = z-a-coverage
        # Silence shortening is excluded from this test. Spoken-content cuts need editorial review.
        if lost > max(0.035, 0.6/fps) and not cue.get("reviewed", False):
            raise ValueError(f"Subtitle cue {i} crosses a content deletion ({lost:.3f}s): {cue['text']!r}. "
                             "Split/retime it to the retained words, or provide corrected JSON text with reviewed:true.")
        spans = []
        for p in parts:
            left, right = max(a, p["source_in"]/fps), min(z, p["source_out"]/fps)
            if right > left:
                spans.append((p["output_in"]/fps+left-p["source_in"]/fps,
                              p["output_in"]/fps+right-p["source_in"]/fps))
        if not spans:
            continue
        item = {"start": min(s[0] for s in spans), "end": max(s[1] for s in spans),
                "text": cue["text"], "source_cue": i}
        if round(item["end"]*1000) <= round(item["start"]*1000):
            raise ValueError(f"Subtitle cue {i} becomes shorter than 1ms; merge or correct it.")
        if mapped and item["start"] < mapped[-1]["end"]-0.002:
            raise ValueError(f"Mapped subtitle cue {i} overlaps its predecessor; correct the source cues.")
        mapped.append(item)
    return mapped


def copy_source(source, target):
    temp = target.with_name(target.name+f".{os.getpid()}.copying")
    try:
        if platform.system() == "Darwin":
            p = subprocess.run(["cp", "-c", str(source), str(temp)], capture_output=True)
            if p.returncode:
                temp.unlink(missing_ok=True)
                shutil.copy2(source, temp)
        else:
            shutil.copy2(source, temp)
        shutil.copystat(source, temp)
        os.replace(temp, target)
    finally:
        temp.unlink(missing_ok=True)


def trim_pcm(source, target, parts, rate, channels, fps, fade_ms=3):
    """Use absolute rational frame positions; round the output cumulatively, not per clip."""
    corrections = []
    with wave.open(str(source), "rb") as src, wave.open(str(target), "wb") as dst:
        assert src.getsampwidth() == 2
        dst.setparams((channels, 2, rate, 0, "NONE", "not compressed"))
        for p in parts:
            si = round(Fraction(p["source_in"]*rate, 1)/fps)
            se = round(Fraction(p["source_out"]*rate, 1)/fps)
            oi = round(Fraction(p["output_in"]*rate, 1)/fps)
            oe = round(Fraction(p["output_out"]*rate, 1)/fps)
            needed = oe-oi
            available = max(0, src.getnframes()-si)
            if needed-available > math.ceil(rate/fps)+1:
                raise ValueError("Selected video extends beyond its audio by more than one frame; inspect this ending.")
            src.setpos(min(si, src.getnframes()))
            fade = min(round(rate*fade_ms/1000), needed//2)
            done = 0
            while done < needed:
                count = min(65536, needed-done)
                take = min(count, max(0, se-si-done), max(0, available-done))
                raw = src.readframes(take)
                values = array("h")
                values.frombytes(raw)
                if sys.byteorder != "little":
                    values.byteswap()
                values.extend([0]*((count-take)*channels))
                edge_indices = set(range(max(0, -done), min(count, fade-done)))
                edge_indices.update(range(max(0, needed-fade-done), count))
                for n in edge_indices:
                    pos = done+n
                    gain = min(1, pos/max(1, fade-1), (needed-1-pos)/max(1, fade-1)) if fade else 1
                    if gain < 1:
                        for ch in range(channels):
                            k = n*channels+ch
                            values[k] = round(values[k]*max(0, gain))
                if sys.byteorder != "little":
                    values.byteswap()
                dst.writeframesraw(values.tobytes())
                done += count
            corrections.append({"source_samples": se-si, "output_samples": needed,
                                "rounding_adjustment": needed-(se-si), "output_start_sample": oi})
    return corrections


def prepare(args):
    source = Path(args.video).resolve()
    work = Path(args.work).resolve()
    work.mkdir(parents=True, exist_ok=True)
    copy = work/("source-copy"+source.suffix.lower())
    reserved = ["source.wav", "source.partial.wav", "edited.wav", "edited.srt", "timeline.json",
                "prepare-status.json", "source-info.json", "extract.log", "silence.log", "video-filter.txt",
                "encoder-preflight.log", "render-command.json", "render.log", "render-progress.txt",
                "render-result.json", "preview-result.json", "decode.log", "decode-progress.txt", "verification.json"]
    artifacts = [copy]+[work/name for name in reserved]
    inputs = [source, Path(args.plan).resolve(), Path(args.subtitles).resolve()]
    if any(p in artifacts for p in inputs):
        raise ValueError("An input collides with a generated work file; choose another work directory.")
    dump(work/"prepare-status.json", {"ready": False})
    info_file = work/"source-info.json"
    old = load(info_file) if info_file.exists() else None
    identity = fingerprint(source)
    if old and old["fingerprint"] != identity:
        raise ValueError("This work directory belongs to a different/changed source; choose another directory.")
    info = old or inspect(source)
    if not info["cfr"]:
        raise ValueError("VFR source detected. Establish and verify a CFR working copy before editing; "
                         "do not merely relabel the source FPS.")
    if not copy.exists():
        copy_source(source, copy)
    elif not old or fingerprint(copy) != identity:
        raise ValueError("Source copy already exists but does not match its manifest; use a new work directory.")
    dump(info_file, info)
    fps = Fraction(info["fps"])
    raw_plan = load(args.plan)
    keeps = []
    for i, entry in enumerate(raw_plan["keep"], 1):
        si = int(entry["in_frame"]) if "in_frame" in entry else round(rational(entry["start"])*fps)
        se = int(entry["out_frame"]) if "out_frame" in entry else round(rational(entry["end"])*fps)
        if not 0 <= si < se <= info["frames"]:
            raise ValueError(f"Keep interval {i} is empty or outside the video.")
        if keeps and si < keeps[-1][1]:
            raise ValueError(f"Keep interval {i} overlaps or reorders source time.")
        keeps.append((si, se, entry.get("note", "")))
    if not keeps:
        raise ValueError("The plan contains no retained footage.")

    wav = work/"source.wav"
    if not wav.exists():
        start = info["video_start"]
        wav_temp = work/"source.partial.wav"
        command(["ffmpeg", "-v", "error", "-copyts", "-i", copy, "-map", "0:a:0", "-vn",
                 "-af", f"asetpts=PTS-({start:.12f})/TB,aresample=async=1:first_pts=0",
                 "-ar", info["audio_rate"], "-ac", info["channels"], "-c:a", "pcm_s16le", "-y", wav_temp], work/"extract.log")
        os.replace(wav_temp, wav)
    gaps = []
    if args.shorten_pauses:
        if not (0 < args.leave < args.pause_min and args.pause_min > 0):
            raise ValueError("Require 0 < --leave < --pause-min.")
        p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(wav), "-af",
                            f"silencedetect=noise={args.noise}dB:d={args.pause_min}", "-f", "null", "-"], capture_output=True)
        (work/"silence.log").write_bytes(p.stderr)
        if p.returncode:
            raise ValueError("Silence detection failed; see silence.log.")
        text = p.stderr.decode(errors="replace")
        starts = [float(s) for s in re.findall(r"silence_start: ([\d.]+)", text)]
        ends = [float(s) for s in re.findall(r"silence_end: ([\d.]+)", text)]
        for a, z in zip(starts, ends):
            # Allocate more protection to the next word's lead-in than the previous tail.
            gaps.append((round(rational(a+args.leave*0.38)*fps), round(rational(z-args.leave*0.62)*fps)))
    pieces = []
    for si, se, note in keeps:
        left = si
        for a, z in gaps:
            if si+round(fps*.08) < a < z < se-round(fps*.08):
                pieces.append((left, a, note))
                left = z
        pieces.append((left, se, note))
    parts = []
    cursor = 0
    for si, se, note in pieces:
        if parts and si == parts[-1]["source_out"]:
            parts[-1]["source_out"] = se
            cursor += se-si
            parts[-1]["output_out"] = cursor
        else:
            parts.append({"source_in": si, "source_out": se, "output_in": cursor,
                          "output_out": cursor+se-si, "note": note})
            cursor += se-si
    cues = map_subtitles(read_subtitles(args.subtitles), keeps, parts, float(fps))
    if not cues:
        raise ValueError("No subtitles remain; check the corrected source subtitle timeline.")
    audio = trim_pcm(wav, work/"edited.wav", parts, info["audio_rate"], info["channels"], fps)
    write_srt(work/"edited.srt", cues)
    timeline = {"fps": str(fps), "source": str(copy), "source_original": str(source),
                "input_paths": [str(p) for p in inputs],
                "source_info": str(info_file), "frames": cursor, "duration": float(cursor/fps),
                "parts": parts, "subtitles": cues, "audio_sample_mapping": audio,
                "pause_shortening": bool(args.shorten_pauses)}
    dump(work/"timeline.json", timeline)
    expr = "+".join(f"between(n,{p['source_in']},{p['source_out']-1})" for p in parts)
    (work/"video-filter.txt").write_text(f"select='{expr}',setpts=N*{fps.denominator}/({fps.numerator}*TB)", encoding="utf-8")
    dump(work/"prepare-status.json", {"ready": True})
    print(json.dumps({"work": str(work), "source_duration": info["duration"], "duration": timeline["duration"],
                      "parts": len(parts), "subtitle_cues": len(cues)}, ensure_ascii=False))


def apple_available(work):
    if platform.system() != "Darwin":
        return False
    p = subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "color=s=128x128:r=1",
                        "-frames:v", "1", "-c:v", "h264_videotoolbox", "-f", "null", "-"], capture_output=True)
    (work/"encoder-preflight.log").write_bytes(p.stderr)
    return p.returncode == 0


def render(args):
    work = Path(args.work).resolve()
    if not load(work/"prepare-status.json").get("ready"):
        raise ValueError("Preparation did not complete successfully; resolve the prepare error and rerun it.")
    timeline = load(work/"timeline.json")
    info = load(timeline["source_info"])
    output = Path(args.output).resolve() if args.output else work/"preview.mp4"
    if not args.output and not args.preview:
        raise ValueError("Final render requires --output.")
    if output.suffix.lower() != ".mp4":
        raise ValueError("Output must end in .mp4.")
    sidecar = output.with_suffix(".srt")
    originals = [Path(p) for p in timeline.get("input_paths", [])]
    originals += [Path(timeline["source"]), Path(timeline["source_original"]), work/"source.wav", work/"edited.wav"]
    if output in originals or sidecar in originals:
        raise ValueError("Output would overwrite an input/working source.")
    if not args.overwrite and (output.exists() or sidecar.exists()):
        raise ValueError("Output MP4/SRT already exists; choose a new name or explicitly use --overwrite.")
    if info["video"].get("color_transfer") in ["smpte2084", "arib-std-b67"]:
        raise ValueError("HDR source: select an explicit HDR-preserving or tone-map workflow before H.264 export.")
    width, height = info["width"], info["height"]
    if width%2 or height%2:
        raise ValueError("Odd source dimensions need an explicit padding/cropping decision for H.264.")
    encoder = args.encoder
    if encoder in ["auto", "apple"]:
        available = apple_available(work)
        if encoder == "apple" and not available:
            raise ValueError("Apple encoder unavailable; see encoder-preflight.log, or choose --encoder cpu.")
        encoder = "apple" if available else "cpu"
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_name(f".{output.stem}.{os.getpid()}.partial.mp4")
    srt_temp = output.with_name(f".{output.stem}.{os.getpid()}.partial.srt")
    vf = (work/"video-filter.txt").read_text().strip()
    if args.preview:
        scale = min(1, 1920/width, 1080/height)
        width, height = max(2, int(width*scale)//2*2), max(2, int(height*scale)//2*2)
        vf += f",scale={width}:{height}"
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", timeline["source"], "-i", work/"edited.wav",
           "-map", "0:v:0", "-map", "1:a:0", "-vf", vf, "-fps_mode", "cfr", "-r", timeline["fps"]]
    if encoder == "apple":
        bitrate = int(width*height*float(Fraction(timeline["fps"]))*0.045+4000000)
        cmd += ["-c:v", "h264_videotoolbox", "-b:v", str(bitrate), "-profile:v", "high"]
    else:
        cmd += ["-c:v", "libx264", "-crf", "18", "-preset", "fast"]
    cmd += ["-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k" if info["channels"] == 1 else "256k",
            "-ar", str(info["audio_rate"]), "-movflags", "+faststart", "-progress", str(work/"render-progress.txt"),
            "-y", str(temp)]
    dump(work/"render-command.json", [str(a) for a in cmd])
    command(cmd, work/"render.log")
    check = probe(temp)
    v = next(s for s in check["streams"] if s["codec_type"] == "video")
    if int(v.get("nb_frames", -1)) != timeline["frames"]:
        raise ValueError("Rendered frame count differs from the timeline; partial file and logs retained.")
    srt_temp.write_bytes((work/"edited.srt").read_bytes())
    if args.overwrite:
        os.replace(temp, output)
        os.replace(srt_temp, sidecar)
    else:
        # Hard links publish atomically without overwriting a file created during the render.
        os.link(srt_temp, sidecar)
        try:
            os.link(temp, output)
        except Exception:
            sidecar.unlink()
            raise
        temp.unlink()
        srt_temp.unlink()
    result = {"video": str(output), "subtitles": str(sidecar), "mode": "preview" if args.preview else "final",
              "encoder": encoder, "width": width, "height": height, "frames": timeline["frames"],
              "duration": timeline["duration"], "fingerprint": fingerprint(output)}
    dump(work/("preview-result.json" if args.preview else "render-result.json"), result)
    print(json.dumps(result, ensure_ascii=False))


def verify(args):
    work = Path(args.work).resolve()
    video = Path(args.video).resolve()
    timeline = load(work/"timeline.json")
    info = load(timeline["source_info"])
    meta = probe(video)
    v = next(s for s in meta["streams"] if s["codec_type"] == "video")
    a = next(s for s in meta["streams"] if s["codec_type"] == "audio")
    fps = Fraction(timeline["fps"])
    expected = (info["width"], info["height"])
    mode = "final"
    # Prefer the matching final result; a stale preview record must not classify a later final.
    identity = fingerprint(video)
    for record in [work/"render-result.json", work/"preview-result.json"]:
        if record.exists():
            result = load(record)
            if result["video"] == str(video) and result.get("fingerprint") == identity:
                expected = (result["width"], result["height"])
                mode = result["mode"]
                break
    failures = []
    if (v["width"], v["height"]) != expected: failures.append("resolution mismatch")
    if Fraction(v["avg_frame_rate"]) != fps: failures.append("FPS mismatch")
    if int(v.get("nb_frames", -1)) != timeline["frames"]: failures.append("frame count mismatch")
    if abs(float(v["duration"])-timeline["duration"]) > 0.002: failures.append("video duration mismatch")
    if abs(float(a["duration"])-timeline["duration"]) > max(1/float(fps), 1024/info["audio_rate"])+0.002:
        failures.append("audio duration mismatch")
    cues = read_subtitles(video.with_suffix(".srt"))
    if any(c["end"] > timeline["duration"]+0.002 for c in cues): failures.append("subtitle exceeds video")
    if len(cues) != len(timeline["subtitles"]): failures.append("subtitle cue count mismatch")
    for i, (actual, intended) in enumerate(zip(cues, timeline["subtitles"]), 1):
        if (str(actual["text"]).strip() != str(intended["text"]).strip() or
            any(round(actual[k]*1000) != round(intended[k]*1000) for k in ["start", "end"])):
            failures.append(f"subtitle cue {i} differs from the prepared timeline")
            break
    if args.full_decode:
        command(["ffmpeg", "-v", "error", "-xerror", "-i", video, "-map", "0:v:0", "-map", "0:a:0",
                 "-progress", str(work/"decode-progress.txt"), "-f", "null", "-"], work/"decode.log")
    report = {"passed": not failures, "failures": failures, "mode": mode, "video": str(video),
              "frames": int(v.get("nb_frames", -1)), "duration": float(v["duration"]),
              "audio_duration": float(a["duration"]), "subtitles": len(cues),
              "full_decode": "passed" if args.full_decode else "not run"}
    dump(work/"verification.json", report)
    if failures:
        raise ValueError("Verification failed: "+", ".join(failures))
    print(json.dumps(report, ensure_ascii=False))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="action", required=True)
    q = sub.add_parser("inspect", help="Inspect packet timestamps without decoding video.")
    q.add_argument("video"); q.add_argument("--out")
    q = sub.add_parser("prepare", help="Copy source and compile a reviewed editorial plan.")
    for n in ["video", "plan", "subtitles", "work"]: q.add_argument("--"+n, required=True)
    q.add_argument("--shorten-pauses", action="store_true")
    q.add_argument("--noise", type=float, default=-33)
    q.add_argument("--pause-min", type=float, default=0.30)
    q.add_argument("--leave", type=float, default=0.17)
    q = sub.add_parser("render", help="Render once to a temporary MP4, then publish MP4+SRT.")
    q.add_argument("--work", required=True); q.add_argument("--output")
    q.add_argument("--encoder", choices=["auto", "cpu", "apple"], default="auto")
    q.add_argument("--preview", action="store_true"); q.add_argument("--overwrite", action="store_true")
    q = sub.add_parser("verify", help="Check timing/captions; optionally decode the complete final once.")
    q.add_argument("--work", required=True); q.add_argument("--video", required=True)
    q.add_argument("--full-decode", action="store_true")
    args = p.parse_args()
    try:
        if args.action == "inspect":
            if args.out:
                target, source = Path(args.out), Path(args.video)
                if target.resolve() == source.resolve() or (target.exists() and target.samefile(source)):
                    raise ValueError("Inspection output would overwrite the source video; choose another --out path.")
            data = inspect(args.video)
            if args.out: dump(args.out, data)
            print(json.dumps({k: data[k] for k in ["path", "fps", "cfr", "frames", "duration", "width", "height"]}, ensure_ascii=False))
        else:
            globals()[args.action](args)
    except (ValueError, KeyError, OSError, wave.Error) as e:
        p.exit(2, f"ERROR: {e}\n")


if __name__ == "__main__":
    main()
