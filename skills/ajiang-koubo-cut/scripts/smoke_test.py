#!/usr/bin/env python3
"""Small end-to-end checks; makes and removes its own synthetic media."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import wave

script = Path(__file__).resolve().with_name("cut.py")


def run(*args, ok=True):
    p = subprocess.run([str(a) for a in args], capture_output=True, text=True)
    if ok and p.returncode:
        raise AssertionError(p.stderr)
    return p


with tempfile.TemporaryDirectory(prefix=".cut-smoke-", dir=script.parent) as temp:
    root = Path(temp)
    source = root/"input.mp4"
    run("ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=30000/1001",
        "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-frames:v", "180",
        "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", source)
    work = root/"new"/"work"
    info = json.loads(run(sys.executable, script, "inspect", source,
                          "--out", work/"source-info.json").stdout)
    assert info["fps"] == "30000/1001" and info["cfr"] and info["frames"] == 180, info
    original_bytes = source.read_bytes()
    p = run(sys.executable, script, "inspect", source, "--out", source, ok=False)
    assert p.returncode and "overwrite the source video" in p.stderr
    assert source.read_bytes() == original_bytes
    plan = root/"plan.json"
    plan.write_text(json.dumps({"keep": [{"in_frame": a, "out_frame": z} for a, z in
                          [(0, 29), (33, 78), (85, 101), (120, 180)]]}))
    cues = [{"start": .05, "end": .8, "text": "第一句"},
            {"start": 1.2, "end": 2.1, "text": "第二句"},
            {"start": 2.5, "end": 2.95, "text": "删除的试读加保留的文字"},
            {"start": 4.1, "end": 5.9, "text": "最后一句"}]
    subs = root/"cues.json"
    subs.write_text(json.dumps(cues, ensure_ascii=False))
    p = run(sys.executable, script, "prepare", "--video", source, "--plan", plan,
            "--subtitles", subs, "--work", work, ok=False)
    assert p.returncode and "crosses a content deletion" in p.stderr, p.stderr
    # Corrected source text is explicitly reviewed; never carry the deleted words through.
    cues[2].update(text="保留的文字", reviewed=True)
    subs.write_text(json.dumps(cues, ensure_ascii=False))
    run(sys.executable, script, "prepare", "--video", source, "--plan", plan,
        "--subtitles", subs, "--work", work)
    timeline = json.loads((work/"timeline.json").read_text())
    assert timeline["frames"] == 150
    with wave.open(str(work/"edited.wav")) as audio:
        assert audio.getnframes() == 240240, audio.getnframes()
    assert all(abs(a["rounding_adjustment"]) <= 1 for a in timeline["audio_sample_mapping"])
    assert "删除的试读" not in (work/"edited.srt").read_text()
    output = root/"final.mp4"
    run(sys.executable, script, "render", "--work", work, "--output", output, "--encoder", "cpu")
    verified = json.loads(run(sys.executable, script, "verify", "--work", work,
                             "--video", output, "--full-decode").stdout)
    assert verified["passed"] and verified["frames"] == 150
    srt = output.with_suffix(".srt")
    original_srt = srt.read_text()
    for tampered in [original_srt.replace("第一句", "错误文字", 1),
                     original_srt.replace("00:00:00,050", "00:00:00,060", 1)]:
        assert tampered != original_srt
        srt.write_text(tampered)
        p = run(sys.executable, script, "verify", "--work", work, "--video", output, ok=False)
        assert p.returncode and "differs from the prepared timeline" in p.stderr, p.stderr
    srt.write_text(original_srt)
    p = run(sys.executable, script, "render", "--work", work, "--output", output, ok=False)
    assert p.returncode and "already exists" in p.stderr
    assert source.read_bytes() == (work/"source-copy.mp4").read_bytes()
    run(sys.executable, script, "render", "--work", work, "--preview", "--encoder", "cpu")
    preview = json.loads(run(sys.executable, script, "verify", "--work", work,
                            "--video", work/"preview.mp4").stdout)
    assert preview["passed"] and preview["mode"] == "preview"
    run(sys.executable, script, "render", "--work", work, "--output", work/"preview.mp4",
        "--encoder", "cpu", "--overwrite")
    final = json.loads(run(sys.executable, script, "verify", "--work", work,
                          "--video", work/"preview.mp4").stdout)
    assert final["passed"] and final["mode"] == "final"
    vfr = root/"variable.mp4"
    run("ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=160x90:rate=30:duration=3",
        "-f", "lavfi", "-i", "sine=sample_rate=48000:duration=5", "-vf",
        "setpts='if(lt(N,45),N/(30*TB),1.5/TB+(N-45)/(15*TB))'", "-fps_mode", "vfr",
        "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", vfr)
    variable = json.loads(run(sys.executable, script, "inspect", vfr).stdout)
    assert not variable["cfr"]
    p = run(sys.executable, script, "prepare", "--video", vfr, "--plan", plan,
            "--subtitles", subs, "--work", root/"vfr-work", ok=False)
    assert p.returncode and "VFR source detected" in p.stderr, p.stderr
    print(json.dumps({"passed": True, "fps": info["fps"], "frames": 150,
                      "audio_samples": 240240, "subtitle_cross_delete_rejected": True,
                      "reviewed_text_mapped": True, "source_unchanged": True,
                      "existing_output_protected": True, "preview": True,
                      "tampered_subtitles_rejected": True, "stale_preview_record_ignored": True,
                      "VFR_rejected": True, "inspect_source_overwrite_rejected": True}))
