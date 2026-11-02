#!/usr/bin/env python3
"""全片一条连续配乐：拼够长度 → 压平长时响度（包络拉平）→ 对齐到「口播 −16 LU」→ 按段帧数精确切片。

  python3 bgm.py --project <工程> --track <配乐.mp3> [--below 16] [--loop-at 236 --loop-to 100 --xfade 4] [--credit "曲名 / 作者 / 许可 / 链接"]

输出 public/audio/bgm-segN.wav（Seg 外壳自动挂上），out/bgm-full.wav，out/bgm-report.txt；credit 写进 src/data/credits.json。
改完只需 node scripts/reaudio.mjs（只重做音轨，不重渲画面）。

为什么这样做（第 3 期实测）：
  - 配乐要一条贯穿全片、按段切片，段与段接缝才不跳；每段单独配乐会在接缝处断。
  - 选的曲子从 −20 渐强到 −10 LUFS：只做整体增益的话，后段比前段响 8–10 dB。先 dynaudnorm 压一遍，再用 3s 短时 RMS、
    10s 滑动平均做增益包络把整条拉平（±10/8 dB 封顶）；首尾淡入淡出要放在包络之后（否则包络会把淡出顶回去，seg8 踩过）。
  - ffmpeg ebur128 的 framelog 在这台机器上读不到逐帧值，所以用 numpy RMS 包络，不依赖它。
  - 目标 = 口播积分响度 − 16 LU（14–18 都可接受）；口播响度 init 时已量好写在 meta.json。
"""
import argparse
import json
import os
import subprocess
import wave

import numpy as np

SR = 48000


def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def wr(p, a):
    a = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    w = wave.open(p, 'wb')
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(a.tobytes())
    w.close()


def lufs(p):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', p, '-af', 'loudnorm=print_format=summary', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float([l for l in r.splitlines() if 'Input Integrated' in l][0].split()[2])
    tp = float([l for l in r.splitlines() if 'Input True Peak' in l][0].split()[3])
    return I, tp


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--project', required=True)
    p.add_argument('--track', required=True)
    p.add_argument('--below', type=float, help='比口播低多少 LU（默认 meta.bgmBelowVoice=16）')
    p.add_argument('--loop-at', type=float, help='曲子不够长时：在原曲第几秒开始交叉淡化回跳（默认 曲长−xfade）')
    p.add_argument('--loop-to', type=float, default=0, help='回跳到原曲第几秒（选一个段落起点，第 3 期用 100）')
    p.add_argument('--xfade', type=float, default=4)
    p.add_argument('--credit', help='写进来源说明的一行')
    a = p.parse_args()
    P = os.path.abspath(a.project)
    meta = json.load(open(os.path.join(P, 'src', 'data', 'meta.json')))
    T = json.load(open(os.path.join(P, 'src', 'data', 'timing.json')))
    fps = T['fps']
    segs = list(T['segments'].values())
    total = (segs[-1]['from'] + segs[-1]['frames']) / fps
    below = a.below if a.below is not None else meta.get('bgmBelowVoice', 16)
    target = meta['voiceLUFS'] - below
    os.makedirs(os.path.join(P, 'out'), exist_ok=True)

    x = load(a.track)
    if a.loop_at is not None and a.loop_to >= a.loop_at - a.xfade:
        raise SystemExit('--loop-to 必须早于 --loop-at − xfade')
    tl = len(x) / SR
    N = int(round(total * SR))
    out = np.zeros((N, 2), np.float32)
    n = int(a.xfade * SR)
    loop_at = a.loop_at if a.loop_at is not None else tl - a.xfade
    pos, src = 0, 0.0
    while pos < N:  # 原曲从 src 播到 loop_at，在最后 xfade 秒里交叉淡化回 loop_to，循环到够长
        seg = x[int(src * SR):int((loop_at + a.xfade) * SR)].copy()
        if pos > 0:
            seg[:n] *= (np.linspace(0, 1, n) ** 0.5)[:, None]
        L = min(len(seg), N - pos)
        if pos + L < N:
            seg[L - n:L] *= (np.linspace(1, 0, n) ** 0.5)[:, None]
        out[pos:pos + L] += seg[:L]
        if pos + L >= N:
            break
        pos += L - n
        src = a.loop_to
    tmp = os.path.join(P, 'out', 'bgm-full-raw.wav')
    wr(tmp, out)
    flat = os.path.join(P, 'out', 'bgm-flat.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', 'dynaudnorm=f=2000:g=61:m=3:p=0.5,highshelf=f=3000:g=-3', '-ar', str(SR), flat], check=True)
    y = load(flat)
    mono = (y[:, 0] ** 2 + y[:, 1] ** 2) / 2
    cs = np.concatenate([[0], np.cumsum(mono)])
    grid = np.arange(0, total + 0.1, 0.1)
    hw = int(1.5 * SR)
    idx = (grid * SR).astype(int)
    lo, hi = np.clip(idx - hw, 0, len(mono)), np.clip(idx + hw, 0, len(mono))
    st = 10 * np.log10(np.maximum((cs[hi] - cs[lo]) / np.maximum(hi - lo, 1), 1e-12))
    k = 100
    sm = np.convolve(np.pad(st, (k // 2, k // 2), mode='edge'), np.ones(k) / k, mode='same')[k // 2: k // 2 + len(grid)]
    mid = (grid > 5) & (grid < total - 5)
    ref = np.median(sm[mid] if mid.any() else sm)
    gain_db = np.clip(ref - sm, -10, 8)
    gain_db[grid > total - 6] = gain_db[min(len(grid) - 1, np.searchsorted(grid, total - 6))]
    gain_db[grid < 3] = gain_db[np.searchsorted(grid, 3)]
    y *= (10 ** (np.interp(np.arange(len(y)) / SR, grid, gain_db) / 20))[:, None]
    fo, fi = int(3.0 * SR), int(0.6 * SR)  # 包络之后再淡入淡出
    y[-fo:] *= (np.linspace(1, 0, fo) ** 1.5)[:, None]
    y[:fi] *= np.linspace(0, 1, fi)[:, None]
    env = os.path.join(P, 'out', 'bgm-env.wav')
    wr(env, y)
    g2 = target - lufs(env)[0]
    full = os.path.join(P, 'out', 'bgm-full.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', env, '-af', f'volume={g2:.2f}dB', '-ar', str(SR), full], check=True)
    rep = [f'目标 {target:.1f} LUFS（口播 {meta["voiceLUFS"]} − {below}）']
    for s in segs:
        dst = os.path.join(P, 'public', 'audio', f"bgm-{s['key']}.wav")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', full, '-ss', f"{s['from'] / fps:.6f}", '-t', f"{s['frames'] / fps:.6f}", '-ar', str(SR), '-ac', '2', dst], check=True)
        I, tp = lufs(dst)
        rep.append(f"{s['key']:>5} {I:6.1f} LUFS  峰 {tp:6.1f} dBTP")
    I, tp = lufs(full)
    rep.append(f'全片 {I:.1f} LUFS 峰 {tp:.1f} dBTP；各段差应 ≤1.5 LU（结尾段因淡出偏低正常）')
    open(os.path.join(P, 'out', 'bgm-report.txt'), 'w').write('\n'.join(rep))
    print('\n'.join(rep))
    if a.credit:
        cp = os.path.join(P, 'src', 'data', 'credits.json')
        cr = json.load(open(cp)) if os.path.exists(cp) else {}
        cr['bgm'] = a.credit
        json.dump(cr, open(cp, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
