#!/usr/bin/env python3
"""定位一处或多处疑似重复：打印能量谷底，并把每个音节片段【单独】转写（前后垫 0.3s 静音），两个模型对照。
dupscan.py 报出疑点后用它找准「第一遍从哪开始、到哪结束」，再把帧号交给 recut.py。

用法（兼容单区间与批量多区间，只加载一次模型）：
  $VENV/bin/python slices.py <master.mp4> <起秒> <止秒>
  $VENV/bin/python slices.py <master.mp4> 141:145 154:160 283:295
"""
import os, subprocess, sys
from fractions import Fraction
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

SR = 16000


def resolve_cached_model(name: str) -> str:
    root = Path(os.environ.get(
        'HF_HUB_CACHE',
        os.environ.get('HUGGINGFACE_HUB_CACHE', str(Path(os.environ.get('HF_HOME', str(Path.home() / '.cache/huggingface'))) / 'hub'))
    ))
    candidates_repos = {
        'large-v3-turbo': ['mobiuslabsgmbh/faster-whisper-large-v3-turbo', 'Systran/faster-whisper-large-v3-turbo'],
        'small': ['Systran/faster-whisper-small'],
    }.get(name, [name])
    for repo_name in candidates_repos:
        repo = root / ('models--' + repo_name.replace('/', '--'))
        ref = repo / 'refs/main'
        snaps = []
        if ref.exists():
            snaps.append(repo / 'snapshots' / ref.read_text().strip())
        if (repo / 'snapshots').exists():
            snaps += sorted((repo / 'snapshots').iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
        for snap in snaps:
            if (snap / 'model.bin').is_file() and (snap / 'config.json').is_file():
                return str(snap)
    return name


def probe_fps(src: str) -> float:
    p = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=avg_frame_rate', '-of', 'csv=p=0', src],
        capture_output=True, text=True,
    )
    raw = p.stdout.strip().strip(',')
    try:
        if raw and raw != '0/0':
            return float(Fraction(raw))
    except Exception:
        pass
    return 30.0


def parse_ranges(argv):
    if len(argv) == 4 and ':' not in argv[2] and ':' not in argv[3]:
        return [(float(argv[2]), float(argv[3]))]
    ranges = []
    for tok in argv[2:]:
        a, b = tok.split(':')
        ranges.append((float(a), float(b)))
    if not ranges:
        raise SystemExit('用法: slices.py <media> <t0> <t1>  或  slices.py <media> t0:t1 [t2:t3 ...]')
    return ranges


def main():
    src = sys.argv[1]
    ranges = parse_ranges(sys.argv)
    min_t = max(0.0, min(a for a, _ in ranges) - 0.5)
    max_t = max(b for _, b in ranges) + 0.5
    dur = max_t - min_t
    A = np.frombuffer(
        subprocess.run(
            ['ffmpeg', '-v', 'error', '-ss', f'{min_t:.3f}', '-t', f'{dur:.3f}', '-i', src, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
            capture_output=True, check=True,
        ).stdout,
        np.float32,
    )
    fps = probe_fps(src)
    threads = min(8, os.cpu_count() or 4)
    ms = {n: WhisperModel(resolve_cached_model(n), device='cpu', compute_type='int8', cpu_threads=threads) for n in ['small', 'large-v3-turbo']}
    pad = np.zeros(int(0.3 * SR), np.float32)
    hop = SR // 100

    def tr(a, b):
        i0, i1 = max(0, int((a - min_t) * SR)), max(0, int((b - min_t) * SR))
        y = np.concatenate([pad, A[i0:i1], pad])
        r = []
        for n, m in ms.items():
            ss, _ = m.transcribe(y, language='zh', beam_size=1, temperature=0.0, max_new_tokens=64, vad_filter=False, condition_on_previous_text=False)
            r.append(f'{n[:5]}「{"".join(s.text for s in ss).strip()}」')
        return ' '.join(r)

    for t0, t1 in ranges:
        if len(ranges) > 1:
            print(f'=== [{t0:.2f} - {t1:.2f}] ===')
        i0, i1 = max(0, int((t0 - min_t) * SR)), max(0, int((t1 - min_t) * SR))
        x = A[i0:i1]
        if len(x) < hop:
            print('  区间为空')
            continue
        e = 20 * np.log10(np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, 'same')[::hop]) + 1e-9)
        thr = e.max() - 35
        segs, on = [], None
        for i, v in enumerate(e):
            if v > thr and on is None:
                on = i
            if v <= thr and on is not None:
                if i - on >= 12:
                    segs.append((t0 + on / 100, t0 + i / 100))
                on = None
        if on is not None and (len(e) - on) >= 12:
            segs.append((t0 + on / 100, t1))
        print('能量谷底（< 峰值−35dB）分出的语音小段：', ', '.join(f'{a:.2f}-{b:.2f}' for a, b in segs))
        for a, b in segs:
            print(f'  {a:.2f}-{b:.2f}  {tr(a, b)}')
        for i in range(len(segs) - 1):
            print(f'  合并 {segs[i][0]:.2f}-{segs[i + 1][1]:.2f}  {tr(segs[i][0], segs[i + 1][1])}')
    fps_str = f'{int(round(fps))}' if abs(fps - round(fps)) < 0.01 else f'{fps:.3f}'
    print(f'帧号 = round(秒 × {fps_str})；recut.py --fps {fps_str} --cut 起帧:止帧 删 [起, 止)')


if __name__ == '__main__':
    main()
