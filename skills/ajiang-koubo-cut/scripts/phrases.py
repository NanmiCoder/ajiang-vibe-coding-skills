#!/usr/bin/env python3
# 按停顿切短语，逐段单独转写（重说的半句不会被吞）。两个用途：
#  1) 重复关卡第一道：相邻短语首尾重复（如「…如果说有」+「如果说有仲裁条款」）一眼可见
#  2) 输出 assets/phrases.json 给 mix.py 做配乐避让
# 用法：$VENV/bin/python phrases.py <master.mp4> <out.json> [--workers N]
import argparse, concurrent.futures, json, os, re, subprocess, sys
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


def _worker(args):
    model_path, cpu_threads, items = args
    m = WhisperModel(model_path, device='cpu', compute_type='int8', cpu_threads=cpu_threads)
    res = []
    for idx, s0, s1, clip in items:
        ss, _ = m.transcribe(
            clip,
            language='zh',
            beam_size=1,
            temperature=0.0,
            max_new_tokens=128,
            initial_prompt='逐字记录。',
            vad_filter=False,
            condition_on_previous_text=False,
        )
        txt = re.sub(r'[，。,.!?、？！\s“”"]', '', ''.join(s.text for s in ss))
        res.append((idx, round(s0, 2), round(s1, 2), txt))
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('out')
    ap.add_argument('--workers', type=int, default=0)
    A = ap.parse_args()

    a = np.frombuffer(
        subprocess.run(['ffmpeg', '-v', 'error', '-i', A.src, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True, check=True).stdout,
        np.float32,
    )
    # 10ms RMS 能量 → 语音段（静音 ≥ 0.12s 断开）
    hop = SR // 100
    e = np.sqrt(np.convolve(a ** 2, np.ones(hop) / hop, 'same')[::hop] + 1e-12)
    db = 20 * np.log10(e)
    thr = np.percentile(db, 95) - 30
    sp = db > thr
    segs, i, n = [], 0, len(sp)
    while i < n:
        if sp[i]:
            j = i
            while j < n and (sp[j] or (j + 12 < n and sp[j:j + 12].any())):
                j += 1
            if j - i >= 8:
                segs.append((i / 100, j / 100))
            i = j
        else:
            i += 1

    model_path = resolve_cached_model('large-v3-turbo')
    ncpu = os.cpu_count() or 4
    workers = A.workers if A.workers > 0 else min(6, max(1, ncpu // 2), max(1, len(segs)))
    cpu_threads = max(1, min(4, ncpu // max(1, workers)))

    tasks = []
    for idx, (s0, s1) in enumerate(segs):
        x = a[int(max(0, s0 - 0.05) * SR):int((s1 + 0.05) * SR)].copy()
        tasks.append((idx, s0, s1, x))

    rows = []
    if workers <= 1 or len(tasks) <= 4:
        rows = _worker((model_path, min(8, ncpu), tasks))
    else:
        buckets = [tasks[k::workers] for k in range(workers)]
        with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as ex:
            for part in ex.map(_worker, [(model_path, cpu_threads, b) for b in buckets if b]):
                rows.extend(part)

    rows.sort(key=lambda r: r[0])
    out = []
    for _, s0, s1, txt in rows:
        out.append({'s': s0, 'e': s1, 'text': txt})
        print(f'{s0:7.2f}-{s1:7.2f}  {txt}', flush=True)
    Path(A.out).parent.mkdir(parents=True, exist_ok=True)
    json.dump(out, open(A.out, 'w', encoding='utf-8'), ensure_ascii=False)


if __name__ == '__main__':
    main()
