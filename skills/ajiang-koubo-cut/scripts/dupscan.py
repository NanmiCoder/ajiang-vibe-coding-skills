#!/usr/bin/env python3
# 重复关卡第二道（必须 0 命中才能做包装）。
# 用法：$VENV/bin/python dupscan.py <master.mp4> qa/dupscan.json [--workers N] [--exhaustive]
# 优化：
#   1) 多核进程并行 + beam_size=1 / temperature=0.0 / max_new_tokens 防止 6x 温度重试与幻觉循环
#   2) 两阶段解码：初筛关 word_timestamps，仅对命中窗口补算精确词时间
#   3) small 跑全量 3s/1.5s 滑窗（有+无提示词，专抓「比如比如」等吞词）；
#      large-v3-turbo 默认跑 12s/6s 滑窗（无提示词，配合 phrases.py 的逐短语有提示词扫全覆盖，省去 8x 重复 30s 编码开销；加 --exhaustive 可全量 3s/1.5s）
# 实测 5 分钟音频从 ~45 分钟压至 ~1 分钟内。
import argparse, concurrent.futures, json, os, re, subprocess
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

SR = 16000
OK = set('看看 谢谢 常常 慢慢 天天 人人 刚刚 一一 哈哈 啊啊 关注关注 拜拜'.split())
PROMPT_TEXT = '逐字记录，包括口误、重复、重说的半句。'
STRIP_RE = re.compile(r'[，。,.!?、？！\s“”"…]+')


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


def find_repeats(txt: str):
    found = []
    for L in range(1, 7):
        for mm in re.finditer(r'(.{%d})\1' % L, txt):
            g = mm.group(0)
            if g in OK or (L == 1 and g[0] in '的了啊吧呢….'):
                continue
            found.append((mm.start(), g))
    return found


def _worker(args):
    model_name, model_path, cpu_threads, prompts, max_tokens, windows = args
    m = WhisperModel(model_path, device='cpu', compute_type='int8', cpu_threads=cpu_threads)
    hits = []
    for t, seg in windows:
        for pr in prompts:
            ss, _ = m.transcribe(
                seg,
                language='zh',
                beam_size=1,
                temperature=0.0,
                max_new_tokens=max_tokens,
                word_timestamps=False,
                initial_prompt=pr,
                vad_filter=False,
                condition_on_previous_text=False,
            )
            txt = STRIP_RE.sub('', ''.join(s.text for s in ss))
            reps = find_repeats(txt)
            if not reps:
                continue
            ss_w, _ = m.transcribe(
                seg,
                language='zh',
                beam_size=1,
                temperature=0.0,
                max_new_tokens=max_tokens,
                word_timestamps=True,
                initial_prompt=pr,
                vad_filter=False,
                condition_on_previous_text=False,
            )
            ws = [(w.start + t, STRIP_RE.sub('', w.word)) for s in ss_w for w in (s.words or [])]
            txt_w = ''.join(c for _, c in ws)
            reps_w = find_repeats(txt_w)
            use_reps = reps_w if reps_w else reps
            use_txt = txt_w if reps_w else txt
            for pos, g in use_reps:
                ts_ = t
                if reps_w and ws:
                    acc = 0
                    for st, c in ws:
                        if acc + len(c) > pos:
                            ts_ = st
                            break
                        acc += len(c)
                hits.append({
                    't': round(ts_, 2),
                    'rep': g,
                    'model': model_name,
                    'prompt': pr is not None,
                    'text': use_txt,
                })
    return hits


def build_windows(a: np.ndarray, D: float, win: float, step: float):
    windows = []
    t = 0.0
    while t < D - 0.5:
        windows.append((round(t, 2), a[int(t * SR):int(min(D, t + win) * SR)].copy()))
        t += step
    return windows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('out')
    ap.add_argument('--workers', type=int, default=0)
    ap.add_argument('--exhaustive', action='store_true', help='Also run large-v3-turbo on full 3s/1.5s × 2 prompts')
    A = ap.parse_args()

    a = np.frombuffer(
        subprocess.run(['ffmpeg', '-v', 'error', '-i', A.src, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True, check=True).stdout,
        np.float32,
    )
    D = len(a) / SR
    ncpu = os.cpu_count() or 4

    passes = [
        ('small', 3.0, 1.5, [PROMPT_TEXT, None], 64, 8),
        ('large-v3-turbo', 3.0 if A.exhaustive else 12.0, 1.5 if A.exhaustive else 6.0,
         [PROMPT_TEXT, None] if A.exhaustive else [None], 64 if A.exhaustive else 160, 6),
    ]

    hits = []
    for name, win, step, prompts, max_tokens, cap in passes:
        windows = build_windows(a, D, win, step)
        model_path = resolve_cached_model(name)
        workers = A.workers if A.workers > 0 else min(cap, max(1, ncpu // 2), max(1, len(windows)))
        cpu_threads = max(1, min(4, ncpu // max(1, workers)))
        if workers <= 1 or len(windows) <= 6:
            hits.extend(_worker((name, model_path, min(8, ncpu), prompts, max_tokens, windows)))
        else:
            buckets = [windows[k::workers] for k in range(workers)]
            with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as ex:
                for part in ex.map(_worker, [(name, model_path, cpu_threads, prompts, max_tokens, b) for b in buckets if b]):
                    hits.extend(part)

    hits.sort(key=lambda h: h['t'])
    merged = []
    for h in hits:
        if merged and abs(h['t'] - merged[-1]['t']) < 1.0 and h['rep'][:2] == merged[-1]['rep'][:2]:
            merged[-1]['n'] += 1
            continue
        h['n'] = 1
        merged.append(h)

    Path(A.out).parent.mkdir(parents=True, exist_ok=True)
    json.dump(merged, open(A.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for h in merged:
        print(f"{h['t']:7.2f}  {h['rep']:10s} ×{h['n']}  [{h['model']}{'+p' if h['prompt'] else ''}]  {h['text']}")


if __name__ == '__main__':
    main()
