#!/usr/bin/env python3
"""把 Freesound 素材整理成语义音效 public/sfx/<kind>.wav（48k 立体声、裁到动作长度、峰值归一），并量出音源峰值滞后写进 mix.json。

  python3 sfx_prep.py --project <工程> [--recipe public/sfx/recipe.json] [--only whoosh,click]

模板已经带了第 3 期定稿的 10 种音效（CC0），不换音色就不用跑。要换：
  1) 搜：python3 ~/.claude/skills/video-shotcraft/assets/scripts/sfx-source.py search "paper slide" --max-duration 1 --limit 6
     选声源匹配的（不是只看热度），默认只要 CC0；
  2) 下：python3 .../sfx-source.py get fs:12345 --out-dir <工程>/public/sfx/src
  3) 改 public/sfx/recipe.json 对应条目的 src / t0 / len，跑本脚本；再 node scripts/reaudio.mjs。
章节代码只写语义 {t, k}，音色由这里统一定 —— 全片一套声音，9 个 agent 不会各配各的。
"""
import argparse
import json
import os
import subprocess
import wave

import numpy as np

SR = 48000


def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = x.copy()
    for _ in range(2):
        for c in range(2):
            v, col = 0.0, y[:, c]
            o = np.empty_like(col)
            for i in range(len(col)):
                v = a * v + (1 - a) * col[i]
                o[i] = v
            y[:, c] = o
    return y


def cut(x, t0, ln, fade=0.05, fin=0.004):
    y = x[int(t0 * SR):int((t0 + ln) * SR)].copy()
    n = int(fade * SR)
    y[-n:] *= np.linspace(1, 0, n)[:, None]
    m = int(fin * SR)
    y[:m] *= np.linspace(0, 1, m)[:, None]
    return y


def save(path, x, peak_db):
    x = x / max(np.abs(x).max(), 1e-9) * 10 ** (peak_db / 20)
    x = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    w = wave.open(path, 'wb')
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(x.tobytes())
    w.close()


def synth_chime():
    tt = np.arange(int(1.4 * SR)) / SR
    env = np.minimum(1, tt / 0.006) * np.exp(-tt / 0.42)
    s = (np.sin(2 * np.pi * 1318.5 * tt) * 0.6 + np.sin(2 * np.pi * 1975.5 * tt) * 0.28 * np.exp(-tt / 0.25) + np.sin(2 * np.pi * 2637 * tt) * 0.12 * np.exp(-tt / 0.12)) * env
    return np.stack([s, s * 0.96], 1).astype(np.float32)


def synth_alert(hit):
    tt = np.arange(int(0.9 * SR)) / SR
    ph = 2 * np.pi * np.cumsum(np.where(tt < 0.16, 247, 196)) / SR
    tone = np.sin(ph) * np.minimum(1, tt / 0.01) * np.exp(-tt / 0.35) * 0.5
    o = np.zeros((len(tt), 2), np.float32)
    if hit is not None:
        o[:len(hit)] += hit[:len(tt)] * 0.9
    o += np.stack([tone, tone], 1)
    return o


def peak_lag(x):
    # 攻击点：10ms RMS 包络第一次到 70% 峰值的时间（和第 3 期人工定的值吻合到 ±0.04s；双击声如快门要人工核）
    env = np.sqrt(np.convolve((x ** 2).mean(1), np.ones(480) / 480, mode='same'))
    return round(float(np.argmax(env >= 0.7 * env.max())) / SR, 2)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--project', required=True)
    p.add_argument('--recipe')
    p.add_argument('--only')
    a = p.parse_args()
    P = os.path.abspath(a.project)
    R = json.load(open(a.recipe or os.path.join(P, 'public', 'sfx', 'recipe.json')))
    only = set(a.only.split(',')) if a.only else None
    mixp = os.path.join(P, 'src', 'data', 'mix.json')
    mix = json.load(open(mixp))
    src = lambda f: os.path.join(P, 'public', 'sfx', 'src', f)
    for k, r in R.items():
        if k.startswith('_') or (only and k not in only):
            continue
        if r.get('synth') == 'chime':
            x = synth_chime()
        elif r.get('synth') == 'alert':
            hit = lowpass(cut(load(src(r['src'])), 0, 0.26, 0.08), 3000) if r.get('src') else None
            x = synth_alert(hit)
        else:
            x = cut(load(src(r['src'])), r['t0'], r['len'], r.get('fade', 0.05))
            if r.get('lowpass'):
                x = lowpass(x, r['lowpass'])
        save(os.path.join(P, 'public', 'sfx', f'{k}.wav'), x, r['peak'])
        lag = r['pre'] if 'pre' in r else (0 if k == 'type' else min(peak_lag(x), 0.4))
        mix['pre'][k] = lag
        print(f'{k:8s} {len(x) / SR:5.2f}s  峰值滞后 {lag:.2f}s  ← {r.get("src") or r.get("synth")}')
    json.dump(mix, open(mixp, 'w'), ensure_ascii=False, indent=2)
    print('mix.json 的 pre 已更新；下一步 node scripts/reaudio.mjs')


if __name__ == '__main__':
    main()
