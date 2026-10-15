#!/usr/bin/env python3
"""生成工程用的轻量卡点音效和每段配乐（纯合成，没有外部采样，无版权问题）。

用法：python3 make_audio.py <工程目录> [--only sfx|bgm] [--seg seg2]
依赖：numpy、scipy、soundfile（没有就建个 venv：python3 -m venv .venv && .venv/bin/pip install numpy scipy soundfile）
读取：<工程>/src/segments.json（fps、每段帧数、breaks）
输出：<工程>/public/audio/sfx/*.wav、<工程>/public/audio/bgm-<seg>.wav

音效原则：短（多数 < 0.4s）、没有低频轰鸣、起音柔和，只做点缀，不和口播抢。
配乐：120 BPM（30fps 下一拍 = 15 帧），默认 A 小调 Am9 → Fmaj7 → C → G6，pad + pluck 琶音 + 轻鼓；
段内 breaks 前停一拍并加很轻的上升音，和画面换页对齐。整体偏轻，作为口播底下的铺底。
"""
import argparse
import json
import os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = None  # public/audio，main() 里设置

SR = 48000
FPS = 30
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(412)


def tt(d):
    return np.arange(int(d * SR)) / SR


def hz(n):
    return 440 * 2 ** ((n - 69) / 12)


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x, axis=0)


def sweep(x, f0, f1, kind='low', block=512):
    out = np.zeros_like(x)
    zi = None
    nb = int(np.ceil(len(x) / block))
    for b in range(nb):
        fc = f0 * (f1 / f0) ** (b / max(1, nb - 1))
        sos = butter(2, min(fc, SR * 0.45), kind, fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2) + x.shape[1:])
        y, zi = sosfilt(sos, x[b * block:(b + 1) * block], axis=0, zi=zi)
        out[b * block:(b + 1) * block] = y
    return out


def stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    return np.stack([x * np.sqrt((1 - pan) / 2), x * np.sqrt((1 + pan) / 2)], 1)


def reverb(x, dur=1.8, decay=3.0, mix=0.25):
    ti = tt(dur)
    ir = np.stack([rng.normal(0, 1, len(ti)), rng.normal(0, 1, len(ti))], 1) * np.exp(-ti * decay)[:, None]
    ir = lp(ir, 7000)
    ir /= np.sqrt((ir ** 2).sum())
    x = stereo(x)
    wet = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], 1)
    out = np.zeros_like(wet)
    out[: len(x)] += x
    return out + wet * mix


def norm(x, peak=0.9):
    m = np.abs(x).max()
    return x / m * peak if m > 0 else x


def fade_tail(x, ms=8):
    n = int(SR * ms / 1000)
    x = x.copy()
    x[-n:] *= np.linspace(1, 0, n)[:, None] if x.ndim == 2 else np.linspace(1, 0, n)
    return x


def riser(d=1.2, f0=400, f1=9000):
    t = tt(d)
    n = rng.uniform(-1, 1, (len(t), 2))
    x = hp(sweep(n, f0, f1, 'low'), 250)
    tone = np.sin(2 * np.pi * (220 * t + (1320 - 220) * t ** 2 / (2 * d)))[:, None] * 0.18
    return (x + tone) * ((t / d) ** 2.4)[:, None]



CH = [
    (45, [57, 60, 64, 67, 71]),  # Am9
    (41, [57, 60, 64, 65, 69]),  # Fmaj7
    (48, [55, 60, 64, 67, 72]),  # C
    (43, [55, 59, 62, 64, 67]),  # G6
]
ARP = [0, 2, 4, 1, 3, 2, 4, 3]


def saw(f, t, k_max=24, phase=0.0):
    s = np.zeros_like(t)
    for k in range(1, int(min(k_max, (SR * 0.45) // f)) + 1):
        s += np.sin(2 * np.pi * k * f * t + phase * k) / k
    return s


def pad(note, d, amp):
    t = tt(d + 0.4)
    f = hz(note)
    L = np.zeros_like(t)
    R = np.zeros_like(t)
    for i, c in enumerate([-10, 0, 10]):
        v = saw(f * 2 ** (c / 1200), t, 12, rng.uniform(0, 6.28))
        p = (i - 1) * 0.6
        L += v * np.sqrt((1 - p) / 2)
        R += v * np.sqrt((1 + p) / 2)
    x = lp(np.stack([L, R], 1) / 3, 1300)
    e = np.minimum(1, t / 0.35) * np.clip((d + 0.4 - t) / 0.4, 0, 1)
    return x * e[:, None] * amp


def pluck(note, amp, d=0.5):
    t = tt(d)
    f = hz(note)
    s = np.zeros_like(t)
    for k in range(1, int(min(20, (SR * 0.45) // f)) + 1):
        s += np.sin(2 * np.pi * k * f * t) / k * np.exp(-t * (6 + k * 2.2))
    return s * np.minimum(1, t / 0.002) * amp


def bass(note, d, amp):
    t = tt(d)
    f = hz(note)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    e = np.minimum(1, t / 0.006) * np.clip((d - t) / 0.05, 0, 1)
    return np.tanh(1.8 * s) * e * amp


def kick(amp):
    t = tt(0.35)
    ph = 2 * np.pi * (48 * t + (120 - 48) * 0.04 * (1 - np.exp(-t / 0.04)))
    return np.tanh(1.3 * np.sin(ph) * np.exp(-t * 9)) * amp


def hat(amp, open_=False):
    t = tt(0.22 if open_ else 0.05)
    return hp(rng.uniform(-1, 1, len(t)), 8000, 4) * np.exp(-t * (16 if open_ else 80)) * amp


def snap(amp):
    t = tt(0.18)
    return bp(rng.uniform(-1, 1, len(t)), 1200, 5000) * np.exp(-t * 30) * amp


def score(name, frames, breaks=(), energy=None, intro_bars=0):
    """breaks：段内换页帧号，前一拍收掉鼓 + 上升音。energy(t)→0..1 控制鼓组密度。"""
    dur = frames / FPS
    N = int(dur * SR) + SR
    bus = {k: np.zeros((N, 2)) for k in ['drums', 'bass', 'pad', 'arp', 'fx']}

    def put(b, t0, sig, pan=0.0, gain=1.0):
        i = int(round(t0 * SR))
        if i >= N or i + len(sig) <= 0:
            return
        s = stereo(sig, pan)
        a = max(0, i)
        j = min(N, i + len(s))
        bus[b][a:j] += s[a - i:j - i] * gain

    br = [b / FPS for b in breaks]

    def in_break(t):
        return any(b - BEAT <= t < b for b in br)

    en = energy or (lambda t: 1.0)
    bars = int(np.ceil(dur / (4 * BEAT))) + 1
    for bar in range(bars):
        t0 = bar * 4 * BEAT
        root, voic = CH[bar % 4]
        for i, n in enumerate(voic[:4]):
            put('pad', t0, pad(n, 4 * BEAT, 0.05), (i - 1.5) * 0.35)
    beats = int(np.ceil(dur / BEAT))
    for b in range(beats):
        t0 = b * BEAT
        bar = b // 4
        root, voic = CH[bar % 4]
        e = en(t0)
        groove = bar >= intro_bars
        if groove and not in_break(t0):
            put('drums', t0, kick(0.55 + 0.25 * e))
            if e > 0.5 and b % 2 == 1:
                put('drums', t0, snap(0.22), 0.1)
            for h in range(4 if e > 0.7 else 2):
                put('drums', t0 + h * BEAT / (4 if e > 0.7 else 2), hat(0.06 if h % 2 else 0.035, e > 0.7 and h == 2 and b % 4 == 3), 0.3 if h % 2 else -0.3)
        if not in_break(t0):
            put('bass', t0 + BEAT / 2, bass(root - 12 + 12, BEAT / 2 * 0.9, 0.2))
            if e > 0.6:
                put('bass', t0, bass(root, BEAT / 2 * 0.8, 0.16))
        for s in range(2):
            step = (b * 2 + s) % 8
            put('arp', t0 + s * BEAT / 2, pluck(voic[ARP[step] % len(voic)] + 12, 0.07 if s == 0 else 0.05), -0.4 if s else 0.4)
    for b in br:
        put('fx', b - 1.0, riser(1.0, 600, 8000), 0, 0.12)

    # 侧链 + 延迟 + 混响
    g = np.ones(N)
    for b in range(beats):
        t0 = b * BEAT
        if in_break(t0) or (b // 4) < intro_bars:
            continue
        i = int(t0 * SR)
        j = min(N, i + int(0.4 * SR))
        x = np.arange(j - i) / SR
        g[i:j] = np.minimum(g[i:j], 1 - 0.5 * np.exp(-x / 0.08))
    bus['pad'] *= g[:, None]
    bus['bass'] *= (1 - (1 - g) * 1.2).clip(0.2, 1)[:, None]
    d = int(0.375 * SR)
    arp = bus['arp'].copy()
    for k in range(1, 5):
        tap = np.zeros_like(arp)
        tap[k * d:] = bus['arp'][: N - k * d]
        arp += (tap[:, ::-1] if k % 2 else tap) * 0.3 * 0.45 ** (k - 1)
    bus['arp'] = lp(arp, 5000)
    ti = tt(2.4)
    ir = np.stack([rng.normal(0, 1, len(ti)), rng.normal(0, 1, len(ti))], 1) * np.exp(-ti * 2.6)[:, None]
    ir = lp(ir, 6500)
    ir /= np.sqrt((ir ** 2).sum())
    send = bus['pad'] * 0.4 + bus['arp'] * 0.35 + bus['fx'] * 0.3
    wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1) * 0.8
    mix = bus['drums'] * 0.9 + bus['bass'] * 0.7 + bus['pad'] * 0.85 + bus['arp'] * 0.8 + bus['fx'] + wet
    mix = hp(mix, 30)[: int(dur * SR)]
    t = np.arange(len(mix)) / SR
    fade = np.minimum(1, t / 0.04) * np.clip((dur - t) / 0.9, 0, 1) ** 1.3
    mix *= fade[:, None]
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix = norm(mix, 0.85)
    sf.write(os.path.join(ROOT, f'{name}.wav'), mix.astype(np.float32), SR, subtype='PCM_16')
    print(name, round(dur, 3), 's')


# ── 轻量卡点音效 ───────────────────────────────────────────────
# 原则：短（多数 < 0.4s）、没有低频轰鸣、起音柔和，只做点缀，不和口播抢。

def soft_save(name, x, peak):
    os.makedirs(os.path.join(ROOT, 'sfx'), exist_ok=True)
    x = fade_tail(norm(stereo(x), peak), 15)
    sf.write(os.path.join(ROOT, 'sfx', name + '.wav'), x.astype(np.float32), SR, subtype='PCM_16')


def bell_env(t, d):
    return np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2


def s_tick():
    t = tt(0.045)
    s = np.sin(2 * np.pi * 2300 * t) + 0.25 * np.sin(2 * np.pi * 4600 * t)
    return s * np.exp(-t * 150) * np.minimum(1, t / 0.0015)


def s_pop():
    t = tt(0.13)
    ph = 2 * np.pi * (520 * t + (1450 - 520) * 0.02 * (1 - np.exp(-t / 0.02)))
    return np.sin(ph) * np.exp(-t * 40) * np.minimum(1, t / 0.002)


def s_air(d=0.36, lo=900, hi=5200):
    t = tt(d)
    n = rng.uniform(-1, 1, (len(t), 2))
    x = bp(sweep(n, 1600, 4800, 'low'), lo, hi)
    e = bell_env(t, d)
    pan = np.linspace(-0.5, 0.5, len(t))
    x[:, 0] *= np.sqrt((1 - pan) / 2) * 1.4
    x[:, 1] *= np.sqrt((1 + pan) / 2) * 1.4
    return x * e[:, None]


def s_swipe():
    return s_air(0.5, 500, 3800)


def s_tap():
    t = tt(0.16)
    ph = 2 * np.pi * (150 * t + (260 - 150) * 0.015 * (1 - np.exp(-t / 0.015)))
    body = np.sin(ph) * np.exp(-t * 32)
    click = lp(rng.uniform(-1, 1, len(t)), 2500) * np.exp(-t * 220) * 0.25
    return (body + click) * np.minimum(1, t / 0.002)


def s_ding():
    t = tt(0.9)
    f = 1760
    s = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)
    return reverb(s * np.exp(-t * 5.5) * np.minimum(1, t / 0.003), 0.8, 4, 0.18)


def s_chime():
    x = np.zeros(int(SR * 1.0))
    for i, f in enumerate([1318.5, 1975.5]):
        t = tt(0.8)
        s = (np.sin(2 * np.pi * f * t) + 0.15 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 10)) * np.exp(-t * 6) * np.minimum(1, t / 0.003)
        o = int(i * 0.075 * SR)
        x[o:o + len(s)] += s[: len(x) - o] * (0.8 if i == 0 else 0.65)
    return reverb(x, 0.8, 4, 0.18)


def s_alert():
    x = np.zeros(int(SR * 0.6))
    for i, f in enumerate([880.0, 698.5]):
        t = tt(0.32)
        s = (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30)) * np.exp(-t * 11) * np.minimum(1, t / 0.002)
        o = int(i * 0.12 * SR)
        x[o:o + len(s)] += s[: len(x) - o]
    return x


def s_type(n=7):
    x = np.zeros(int(SR * 0.6))
    o = 0.0
    for i in range(n):
        t = tt(0.025)
        k = bp(rng.uniform(-1, 1, len(t)), 2000, 6000) * np.exp(-t * 400) * rng.uniform(0.5, 1.0)
        j = int(o * SR)
        x[j:j + len(k)] += k[: len(x) - j]
        o += rng.uniform(0.05, 0.085)
    return x



def make_soft_sfx():
    soft_save('tick', s_tick(), 0.5)    # 轻点：勾选、列表项点亮
    soft_save('pop', s_pop(), 0.5)      # 气泡：标签/状态块弹出
    soft_save('air', s_air(), 0.42)     # 轻风声：元素滑入、标题收起
    soft_save('swipe', s_swipe(), 0.42) # 换页
    soft_save('tap', s_tap(), 0.55)     # 落位"嗒"：印章、卡片落定（替代 boom/stamp）
    soft_save('ding', s_ding(), 0.38)   # 玻璃轻响：强调一个结论
    soft_save('chime', s_chime(), 0.42) # 两音上行：正向结果
    soft_save('alert', s_alert(), 0.42) # 柔和两音下行：问题/bug/待优化
    soft_save('type', s_type(), 0.35)   # 很轻的打字声
    print('sfx ok ->', os.path.join(ROOT, 'sfx'))


PRESETS = {
    # 名称: (和弦表, 说明)
    'minor-tech': (CH, 'A 小调，冷静、科技感（默认）'),
    'major-bright': ([
        (48, [60, 64, 67, 71, 74]),  # Cmaj9
        (45, [57, 60, 64, 67, 71]),  # Am9
        (41, [57, 60, 64, 65, 69]),  # Fmaj7
        (43, [55, 59, 62, 67, 69]),  # G6/9
    ], 'C 大调，明亮、轻快'),
}


def main():
    global ROOT, FPS, CH
    p = argparse.ArgumentParser()
    p.add_argument('project')
    p.add_argument('--only', choices=['sfx', 'bgm'])
    p.add_argument('--seg', action='append', help='只生成指定段的配乐，如 seg2')
    p.add_argument('--preset', default='minor-tech', choices=list(PRESETS))
    p.add_argument('--energy', type=float, default=0.6, help='鼓组密度 0~1，默认 0.6（偏轻）')
    a = p.parse_args()
    ROOT = os.path.join(os.path.abspath(a.project), 'public', 'audio')
    os.makedirs(ROOT, exist_ok=True)
    data = json.load(open(os.path.join(a.project, 'src', 'segments.json'), encoding='utf-8'))
    FPS = data['fps']
    CH = PRESETS[a.preset][0]
    if a.only != 'bgm':
        make_soft_sfx()
    if a.only != 'sfx':
        for s in data['segments']:
            if a.seg and s['key'] not in a.seg:
                continue
            score(f"bgm-{s['key']}", s['frames'], breaks=tuple(s.get('breaks', [])), energy=lambda t, e=a.energy: e)


if __name__ == '__main__':
    main()
