#!/usr/bin/env python3
"""B-roll 声音库：纯代码合成的音效 + 配乐，按主题（assets/themes/<id>/theme.json 的 sound 段）取用。

不直接运行。入口：
  scripts/broll_audio.py      工程用：时间线 → mix/bgm/sfx wav
  scripts/theme_demo_audio.py 主题画廊用：每个主题的音效样本、配乐循环、演示混音

约定
- 采样率 48k、立体声 float。所有随机数都用固定种子，同样的输入每次生成同样的声音。
- 音效全部是“轻”的：起音软、时长短、没有 boom / 冲击 / 下坠。轻重最后靠电平控制。
- SYNTHS[name](seed, dur) -> (n, 2) 数组，峰值约 0.5–0.7。dur 只对有长度的音效生效
  （pencil / marker / typing / keys-soft / counter / data / scan / whoosh / swoosh / air / zip），其余忽略。
- BGM_STYLES[style](dur, plan, bpm, seed, drums) -> (n, 2)。plan = [(起始秒, 和弦名, 能量0–1, 有无鼓)]。
"""
import re
import numpy as np
import pyloudnorm as pyln
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly, lfilter

SR = 48000


# ───────── 基础工具 ─────────
def t_(d): return np.arange(max(1, int(d * SR))) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def filt(x, kind, f, order=2):
    f = np.clip(f, 20, SR * 0.45)
    return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x, axis=0)
def lp(x, f, o=2): return filt(x, 'low', f, o)
def hp(x, f, o=2): return filt(x, 'high', f, o)
def bp(x, lo, hi, o=2): return filt(x, 'band', [lo, hi], o)
def fade(x, fi=0.003, fo=0.02):
    x = x.copy(); n = len(x)
    a, b = min(n, int(fi * SR)), min(n, int(fo * SR))
    if a: x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x
def st(x, pan=0.0, width=0.0):
    if x.ndim == 2: return x
    l, r = x * np.sqrt((1 - pan) / 2), x * np.sqrt((1 + pan) / 2)
    if width:
        d = int(width * SR)
        r = np.concatenate([np.zeros(d), r[:-d]]) if d else r
    return np.stack([l, r], 1)
def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak
def sweep_filter(x, f0, f1, kind='band', q=0.6, block=256):
    """逐块改变中心频率的滤波（whoosh / 扫描音）"""
    out = np.zeros_like(x); zi = None; nb = int(np.ceil(len(x) / block))
    for b in range(nb):
        fc = f0 * (f1 / f0) ** (b / max(1, nb - 1))
        if kind == 'band':
            sos = butter(1, [fc * (1 - q / 2), min(fc * (1 + q / 2), SR * 0.45)], 'band', fs=SR, output='sos')
        else:
            sos = butter(2, min(fc, SR * 0.45), kind, fs=SR, output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2) + x.shape[1:])
        y, zi = sosfilt(sos, x[b * block:(b + 1) * block], axis=0, zi=zi)
        out[b * block:(b + 1) * block] = y
    return out

def make_ir(dur=2.4, decay=2.6, bright=6500, seed=7):
    r = np.random.default_rng(seed); tt = t_(dur)
    ir = np.stack([r.normal(0, 1, len(tt)), r.normal(0, 1, len(tt))], 1) * np.exp(-tt * decay)[:, None]
    ir = lp(ir, bright); ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum())
IR_ROOM = make_ir(0.9, 6.0, 7000, 1)
IR_HALL = make_ir(3.2, 1.9, 5200, 2)
IR_DARK = make_ir(2.4, 2.4, 3200, 3)
def verb(x, ir, mix):
    x = st(x)
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x) + len(ir) - 1] for c in range(2)], 1)
    out = np.zeros_like(wet); out[: len(x)] += x
    return out + wet * mix
def delay(x, sec, fb=0.35, n=3, pingpong=True):
    x = st(x); d = int(sec * SR); out = np.zeros((len(x) + d * n, 2)); out[: len(x)] += x
    for k in range(1, n + 1):
        tap = x * fb ** k
        if pingpong and k % 2: tap = tap[:, ::-1]
        out[k * d:k * d + len(x)] += tap
    return out
def place(buf, x, t, gain=1.0, pan=0.0):
    s = max(0, int(round(max(0.0, t) * SR)))
    if s >= len(buf): return
    x = st(x, pan); buf[s:s + len(x)] += x[: len(buf) - s] * gain


# ═════════ 音效 ═════════
# —— 手稿（sketch）：纸面拟音 ——
def sfx_pencil(dur=0.6, strength=1.0, seed=0):
    """铅笔在纸上划线：带颗粒的高频沙沙声，笔触有轻重起伏"""
    r = np.random.default_rng(seed); n = int(dur * SR); tt = t_(dur)
    grain = r.normal(0, 1, n) * (r.random(n) < 0.35)
    x = bp(r.normal(0, 1, n), 2600, 9000, 2) * 0.55 + bp(grain, 1800, 7000, 2) * 0.9
    stroke = 0.65 + 0.35 * np.sin(2 * np.pi * (6 + 3 * r.random()) * tt + r.random() * 6)
    shape = np.minimum(1, tt / 0.05) * np.minimum(1, (dur - tt) / 0.12)
    x *= stroke * np.clip(shape, 0, 1) * strength
    return fade(verb(norm(x, 0.5), IR_ROOM, 0.08), 0.004, 0.05)

def sfx_marker(dur=0.45, seed=1):
    """红色马克笔：比铅笔圆润，带一点摩擦音调"""
    r = np.random.default_rng(seed); n = int(dur * SR); tt = t_(dur)
    x = bp(r.normal(0, 1, n), 900, 4200, 2)
    squeak = np.sin(2 * np.pi * (1650 + 220 * np.sin(2 * np.pi * 3 * tt)) * tt) * 0.06
    shape = np.clip(np.minimum(tt / 0.03, (dur - tt) / 0.08), 0, 1)
    x = (x * (0.7 + 0.3 * np.sin(2 * np.pi * 5 * tt)) + squeak) * shape
    return fade(verb(norm(x, 0.55), IR_ROOM, 0.1), 0.003, 0.04)

def sfx_pop(f0=820, f1=520, seed=2):
    """软气泡 pop：短正弦音高下滑 + 一点点击声"""
    tt = t_(0.16)
    ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-tt * 40)) / SR
    x = np.sin(ph) * np.exp(-tt * 28)
    click = bp(np.random.default_rng(seed).normal(0, 1, len(tt)), 2000, 7000) * np.exp(-tt * 300) * 0.4
    return fade(verb(norm(x + click, 0.7), IR_ROOM, 0.12), 0.001, 0.03)

def sfx_card(seed=3):
    """一张卡片/相纸落在桌上：纸张拍击 + 极轻的木桌低频"""
    r = np.random.default_rng(seed); tt = t_(0.22)
    slap = bp(r.normal(0, 1, len(tt)), 700, 6000) * np.exp(-tt * 55)
    body = np.sin(2 * np.pi * 160 * tt) * np.exp(-tt * 38) * 0.35
    flutter = bp(r.normal(0, 1, len(tt)), 2500, 9000) * np.exp(-((tt - 0.02) / 0.03) ** 2) * 0.4
    return fade(verb(norm(slap + body + flutter, 0.7), IR_ROOM, 0.15))

def sfx_deal(n=4, gap=0.28, seed=4):
    out = np.zeros((int((gap * n + 0.4) * SR), 2))
    for i in range(n):
        place(out, sfx_card(seed + i) * (0.85 + 0.15 * (i % 2)), i * gap)
    return out

def sfx_stamp(seed=5):
    """橡皮印章按下：闷的一下 + 纸面摩擦，不做冲击"""
    r = np.random.default_rng(seed); tt = t_(0.35)
    thud = np.sin(2 * np.pi * (120 + 60 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 24)
    press = lp(r.normal(0, 1, len(tt)), 1800) * np.exp(-tt * 45) * 0.6
    rub = bp(r.normal(0, 1, len(tt)), 1500, 5000) * np.exp(-((tt - 0.06) / 0.05) ** 2) * 0.25
    return fade(verb(norm(thud + press + rub, 0.8), IR_ROOM, 0.18))

def sfx_key(seed):
    r = np.random.default_rng(seed); tt = t_(0.07)
    clk = bp(r.normal(0, 1, len(tt)), 2500, 8000) * np.exp(-tt * 260)
    thock = np.sin(2 * np.pi * (180 + 40 * r.random()) * tt) * np.exp(-tt * 90) * 0.5
    return fade(st(norm(clk + thock, 0.5) * (0.7 + 0.3 * r.random()), (r.random() - 0.5) * 0.4), 0.0005, 0.01)

def sfx_typing(dur=0.9, rate=12, seed=6, keyfn=None):
    keyfn = keyfn or sfx_key
    r = np.random.default_rng(seed); out = np.zeros((int((dur + 0.15) * SR), 2)); t = 0.0; i = 0
    while t < dur:
        place(out, keyfn(seed * 100 + i), t)
        t += (1 / rate) * (0.55 + 0.9 * r.random()); i += 1
    return verb(out, IR_ROOM, 0.1)

def sfx_counter(dur=1.6, seed=7, f=3200, decay=500):
    """数字滚动：先密后疏的细碎 tick"""
    out = np.zeros((int((dur + 0.1) * SR), 2)); u = 0.0; i = 0
    while u < 1:
        tt = t_(0.012); ff = f + 400 * (i % 3)
        tk = np.sin(2 * np.pi * ff * tt) * np.exp(-tt * decay)
        s = int(dur * (1 - (1 - u) ** 0.5) * SR)
        out[s:s + len(tt)] += st(tk * (0.6 - 0.35 * u), 0.2 * np.sin(i))[: len(out) - s]
        u += 0.035; i += 1
    return out

def sfx_whoosh(dur=0.5, f0=400, f1=4000, seed=8, level=1.0):
    r = np.random.default_rng(seed); n = int(dur * SR); tt = t_(dur)
    x = sweep_filter(r.normal(0, 1, n), f0, f1, 'band', 0.9)
    x = x * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.6
    pan = np.linspace(-0.5, 0.5, n)
    L, R = x * np.sqrt((1 - pan) / 2), x * np.sqrt((1 + pan) / 2)
    return fade(verb(norm(np.stack([L, R], 1), 0.6 * level), IR_HALL, 0.12), 0.01, 0.05)

def sfx_page(seed=9):
    w = sfx_whoosh(0.32, 900, 5500, seed, 0.8)
    c = sfx_card(seed + 1) * 0.35; out = np.zeros((len(w) + len(c), 2))
    out[: len(w)] += w; place(out, c, 0.26)
    return out

def sfx_slam(seed=10):
    """大字压上来：短的空气上冲 + 很轻的低频托底（不是 boom）"""
    w = sfx_whoosh(0.28, 300, 2600, seed, 0.7)
    tt = t_(0.4); body = np.sin(2 * np.pi * (90 + 70 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14) * 0.5
    out = np.zeros((len(w) + len(tt), 2)); out[: len(w)] += w
    place(out, verb(norm(body, 0.6), IR_ROOM, 0.2)[: len(tt)], 0.22)
    return out

def sfx_bell(notes=(88,), dur=1.6, gap=0.09):
    out = np.zeros((int((dur + gap * len(notes)) * SR), 2))
    for i, m in enumerate(notes):
        tt = t_(dur); f = hz(m)
        x = sum(a * np.sin(2 * np.pi * f * k * tt) * np.exp(-tt * (3 + k * 2.2)) for k, a in [(1, 1), (2.76, .35), (5.4, .18), (8.93, .08)])
        x *= np.minimum(1, tt / 0.002)
        out[int(i * gap * SR):int(i * gap * SR) + len(tt)] += st(x, -0.2 + 0.4 * i / max(1, len(notes) - 1))
    return verb(norm(out, 0.5), IR_HALL, 0.3)

def sfx_cascade(n=6, gap=0.11, base=79, seed=11):
    """一串木质小音：节点/格子依次亮起（五声音阶上行）"""
    scale = [0, 2, 4, 7, 9, 12, 14, 16]; out = np.zeros((int((gap * n + 0.6) * SR), 2))
    for i in range(n):
        tt = t_(0.5); f = hz(base + scale[i % len(scale)])
        x = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 3.9 * tt) * np.exp(-tt * 40)) * np.exp(-tt * 14)
        x *= np.minimum(1, tt / 0.001)
        place(out, st(x * 0.5, -0.6 + 1.2 * i / max(1, n - 1)), i * gap)
    return verb(out, IR_HALL, 0.25)

def sfx_scan(dur=1.0, seed=12):
    w = sfx_whoosh(dur, 500, 6000, seed, 0.75); tt = t_(dur)
    hum = np.sin(2 * np.pi * (880 + 660 * tt / dur) * tt) * 0.05 * np.sin(np.pi * tt / dur)
    out = w.copy(); out[: len(tt)] += st(hum)
    return out

def sfx_shutter(n=5, gap=0.1, seed=13):
    out = np.zeros((int((gap * n + 0.2) * SR), 2)); r = np.random.default_rng(seed)
    for i in range(n):
        tt = t_(0.05)
        x = bp(r.normal(0, 1, len(tt)), 1500, 6000) * np.exp(-tt * 180)
        x2 = bp(r.normal(0, 1, len(tt)), 1200, 5000) * np.exp(-tt * 220) * 0.6
        pan = -0.4 + 0.8 * i / max(1, n - 1)
        place(out, st(x, pan), i * gap); place(out, st(x2, pan), i * gap + 0.025)
    return verb(norm(out, 0.5), IR_ROOM, 0.1)

def sfx_alert():
    """柔和的两音下行：差距 / 问题"""
    return sfx_bell((81, 76), 1.2, 0.14) * 0.9


# —— 9 个轻音效（graphite-duo / 通用） ——
def bell_env(t, d): return np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2

def s_tick(seed=0):
    t = t_(0.045); f = 2300 * (1 + 0.03 * ((seed % 5) - 2))
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return verb(norm(s * np.exp(-t * 150) * np.minimum(1, t / 0.0015), 0.5), IR_ROOM, 0.08)

def s_air(dur=0.36, lo=900, hi=5200, seed=0):
    r = np.random.default_rng(seed); t = t_(dur)
    x = bp(sweep_filter(r.uniform(-1, 1, (len(t), 2)), 1600, 4800, 'low'), lo, hi)
    pan = np.linspace(-0.5, 0.5, len(t))
    x[:, 0] *= np.sqrt((1 - pan) / 2) * 1.4; x[:, 1] *= np.sqrt((1 + pan) / 2) * 1.4
    return norm(x * bell_env(t, dur)[:, None], 0.42)

def s_swipe(seed=0): return s_air(0.5, 500, 3800, seed)

def s_tap(seed=0):
    r = np.random.default_rng(seed); t = t_(0.16)
    ph = 2 * np.pi * (150 * t + (260 - 150) * 0.015 * (1 - np.exp(-t / 0.015)))
    body = np.sin(ph) * np.exp(-t * 32)
    click = lp(r.uniform(-1, 1, len(t)), 2500) * np.exp(-t * 220) * 0.25
    return verb(norm((body + click) * np.minimum(1, t / 0.002), 0.55), IR_ROOM, 0.1)

def s_ding(f=1760):
    t = t_(0.9)
    s = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)
    return verb(norm(s * np.exp(-t * 5.5) * np.minimum(1, t / 0.003), 0.38), IR_HALL, 0.2)

def s_chime(freqs=(1318.5, 1975.5), gap=0.075):
    x = np.zeros(int(SR * 1.0))
    for i, f in enumerate(freqs):
        t = t_(0.8)
        s = (np.sin(2 * np.pi * f * t) + 0.15 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 10)) * np.exp(-t * 6) * np.minimum(1, t / 0.003)
        o = int(i * gap * SR); x[o:o + len(s)] += s[: len(x) - o] * (0.8 if i == 0 else 0.65)
    return verb(norm(x, 0.42), IR_HALL, 0.2)

def s_alert_soft():
    x = np.zeros(int(SR * 0.6))
    for i, f in enumerate([880.0, 698.5]):
        t = t_(0.32)
        s = (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30)) * np.exp(-t * 11) * np.minimum(1, t / 0.002)
        o = int(i * 0.12 * SR); x[o:o + len(s)] += s[: len(x) - o]
    return verb(norm(x, 0.42), IR_ROOM, 0.12)

def s_type_key(seed):
    r = np.random.default_rng(seed); t = t_(0.025)
    return st(bp(r.uniform(-1, 1, len(t)), 2000, 6000) * np.exp(-t * 400) * r.uniform(0.5, 1.0), (r.random() - .5) * .3)


# —— 纸白信号橙（paper-signal）：干净的木质 / UI ——
def marimba(m, dur=0.6, vel=0.6, bright=1.0):
    """马林巴：基频 + 4 倍泛音快速衰减，木质起音"""
    tt = t_(dur); f = hz(m)
    x = (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 7) + 0.35 * bright * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt * 38)
         + 0.12 * bright * np.sin(2 * np.pi * f * 9.9 * tt) * np.exp(-tt * 90))
    return x * np.minimum(1, tt / 0.0015) * vel

def u_pluck(seed=0, base=76):
    m = base + [0, 2, 4, 7][seed % 4]
    return verb(norm(marimba(m, 0.45, 0.8), 0.55), IR_ROOM, 0.12)

def u_pluck_up(seed=0, base=72):
    out = np.zeros((int(0.9 * SR), 2))
    for i, s in enumerate([0, 4, 7, 12]):
        place(out, marimba(base + s, 0.5, 0.7 - 0.06 * i), i * 0.065, 1.0, -0.3 + 0.2 * i)
    return verb(norm(out, 0.55), IR_HALL, 0.18)

def u_snap(seed=0):
    """卡片吸附到位：短促的纸面 snap + 很轻的木块"""
    r = np.random.default_rng(seed); tt = t_(0.12)
    snap = bp(r.normal(0, 1, len(tt)), 1800, 7000) * np.exp(-tt * 140)
    wood = marimba(64 + (seed % 3), 0.12, 0.35, 0.6)
    return verb(norm(snap + wood, 0.55), IR_ROOM, 0.1)

def u_thock(seed=0):
    """按下确认：柔软的木块“笃”（替代印章）"""
    r = np.random.default_rng(seed); tt = t_(0.2)
    body = np.sin(2 * np.pi * (330 + 90 * np.exp(-tt * 60)) * tt) * np.exp(-tt * 30)
    click = bp(r.normal(0, 1, len(tt)), 1500, 5000) * np.exp(-tt * 250) * 0.35
    return verb(norm(body + click, 0.6), IR_ROOM, 0.12)


# —— 黑场 HUD（hud-black）：数字 / 正弦，滤过，很收 ——
def h_blip(seed=0, f=1480):
    tt = t_(0.07); ff = f * (1 + 0.06 * ((seed % 3) - 1))
    x = np.sin(2 * np.pi * ff * tt) * np.exp(-tt * 60) * np.minimum(1, tt / 0.002)
    x = np.round(x * 24) / 24                     # 轻微量化，数字感
    return verb(norm(lp(x, 5000), 0.45), IR_DARK, 0.15)

def h_ping(seed=0):
    tt = t_(0.7); f = 2093
    x = (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * f * 1.5 * tt)) * np.exp(-tt * 7) * np.minimum(1, tt / 0.003)
    return norm(delay(verb(x, IR_DARK, 0.25), 0.18, 0.3, 3), 0.42)

def h_lock(seed=0):
    """数据锁定：两个极短的 blip + 细的机械咔"""
    r = np.random.default_rng(seed); out = np.zeros((int(0.25 * SR), 2))
    place(out, h_blip(seed, 1175), 0); place(out, h_blip(seed + 1, 1760), 0.055)
    tt = t_(0.03); place(out, bp(r.normal(0, 1, len(tt)), 3000, 9000) * np.exp(-tt * 300) * 0.3, 0.055)
    return norm(out, 0.5)

def h_keys_soft(dur=0.9, seed=0):
    def key(sd):
        r = np.random.default_rng(sd); tt = t_(0.03)
        return st(lp(bp(r.normal(0, 1, len(tt)), 1500, 6000), 4500) * np.exp(-tt * 320) * (0.5 + 0.5 * r.random()), (r.random() - .5) * .3)
    return norm(sfx_typing(dur, 15, seed, key), 0.4)

def h_data(dur=1.2, seed=0):
    """数据滚动：一串高低交错的正弦 tick，先密后疏"""
    out = np.zeros((int((dur + 0.1) * SR), 2)); u = 0.0; i = 0
    while u < 1:
        tt = t_(0.018); f = [2637, 3136, 2349, 3520][i % 4]
        place(out, np.sin(2 * np.pi * f * tt) * np.exp(-tt * 300) * (0.55 - 0.3 * u), dur * (1 - (1 - u) ** 0.5), 1.0, 0.3 * np.sin(i * 1.7))
        u += 0.04; i += 1
    return norm(lp(out, 6000), 0.4)

def h_glitch_soft(seed=0):
    """换页：一小段被切碎的气流，很短，不刺耳"""
    r = np.random.default_rng(seed); w = sfx_whoosh(0.3, 700, 5000, seed, 0.7)
    gate = np.repeat((r.random(int(len(w) / 600) + 1) > 0.3).astype(float), 600)[: len(w)]
    gate = lp(gate, 400)
    return norm(lp(w * gate[:, None], 6500), 0.45)

def h_pulse(seed=0):
    """强调：低频正弦脉冲 + 高频细线，短而收（不是 boom）"""
    tt = t_(0.35)
    sub = np.sin(2 * np.pi * 110 * tt) * np.exp(-tt * 14) * np.minimum(1, tt / 0.01)
    air = np.sin(2 * np.pi * 3520 * tt) * np.exp(-tt * 30) * 0.12
    return verb(norm(sub + air, 0.5), IR_DARK, 0.12)

def h_arp_up(seed=0):
    out = np.zeros((int(0.9 * SR), 2))
    for i, m in enumerate([69, 72, 76, 81, 84]):
        tt = t_(0.25); x = np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 16) * np.minimum(1, tt / 0.003)
        place(out, x * (0.6 + 0.08 * i), i * 0.05, 1.0, -0.5 + 0.25 * i)
    return norm(delay(verb(out, IR_DARK, 0.2), 0.15, 0.25, 2), 0.45)

def h_confirm(seed=0):
    out = np.zeros((int(0.6 * SR), 2))
    for i, m in enumerate([81, 88]):
        tt = t_(0.3); place(out, np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 14) * np.minimum(1, tt / 0.003), i * 0.07)
    return norm(verb(out, IR_DARK, 0.2), 0.42)


# —— 钴蓝海报（cobalt-poster）：明亮、贴纸、俏皮 ——
def p_bubble(seed=0):
    f0 = 600 + 120 * (seed % 4); tt = t_(0.14)
    ph = 2 * np.pi * np.cumsum(f0 + 900 * (1 - np.exp(-tt * 45))) / SR      # 上滑的气泡
    x = np.sin(ph) * np.exp(-tt * 30) * np.minimum(1, tt / 0.002)
    return verb(norm(x, 0.6), IR_ROOM, 0.12)

def p_sticker(seed=0):
    """贴纸拍上：塑料膜的短 slap + 轻微的弹"""
    r = np.random.default_rng(seed); tt = t_(0.18)
    slap = bp(r.normal(0, 1, len(tt)), 1200, 8000) * np.exp(-tt * 90)
    boing = np.sin(2 * np.pi * (420 + 60 * np.sin(2 * np.pi * 18 * tt)) * tt) * np.exp(-tt * 22) * 0.35
    return verb(norm(slap + boing, 0.55), IR_ROOM, 0.12)

def p_clap(seed=0):
    """拍手（一下，很轻，三层短噪声错开）"""
    r = np.random.default_rng(seed); out = np.zeros(int(0.25 * SR))
    for k, o in enumerate([0, 0.008, 0.017]):
        tt = t_(0.2); x = bp(r.normal(0, 1, len(tt)), 900, 4800) * np.exp(-tt * (60 if k < 2 else 22))
        s = int(o * SR); out[s:s + len(x)] += x[: len(out) - s]
    return verb(norm(out, 0.5), IR_ROOM, 0.18)

def p_zip(dur=0.3, seed=0):
    """马克笔刷过：上扫的短噪声"""
    r = np.random.default_rng(seed); n = int(dur * SR); tt = t_(dur)
    x = sweep_filter(r.normal(0, 1, n), 1200, 6500, 'band', 0.6) * np.sin(np.pi * tt / dur) ** 0.8
    return fade(norm(st(x, 0.0, 0.004), 0.45), 0.005, 0.03)

def p_swoosh(seed=0): return sfx_whoosh(0.42, 600, 6000, seed, 0.8)

def p_glock(seed=0):
    out = np.zeros((int(1.2 * SR), 2))
    for i, m in enumerate([84, 91]):
        tt = t_(1.0); f = hz(m)
        x = (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 9)) * np.exp(-tt * 4.5) * np.minimum(1, tt / 0.002)
        place(out, x, i * 0.09, 0.8, -0.2 + 0.4 * i)
    return verb(norm(out, 0.45), IR_HALL, 0.22)

def p_honk_soft(seed=0):
    """俏皮的“嗯？”：两个下滑的方波短音，低通后很软"""
    out = np.zeros(int(0.5 * SR))
    for i, (f0, f1) in enumerate([(523, 466), (440, 370)]):
        tt = t_(0.17); f = np.linspace(f0, f1, len(tt)); ph = 2 * np.pi * np.cumsum(f) / SR
        x = lp(np.sign(np.sin(ph)) * 0.5, 1400) * np.exp(-tt * 10) * np.minimum(1, tt / 0.01)
        s = int(i * 0.15 * SR); out[s:s + len(x)] += x
    return verb(norm(out, 0.4), IR_ROOM, 0.12)


# —— prompt-motion 候选主题补充音色（都很轻） ——
def x_confetti(seed=0):
    """撒纸屑：一阵细碎纸片抖动 + 两颗很小的钟琴亮点"""
    r = np.random.default_rng(seed); out = np.zeros((int(0.9 * SR), 2))
    for i in range(14):
        tt = t_(0.035); g = bp(r.normal(0, 1, len(tt)), 2500, 9000) * np.exp(-tt * 160) * r.uniform(0.25, 0.7)
        place(out, g, 0.03 + r.uniform(0, 0.45) * (i / 14) ** 0.7 + 0.02 * i, 1.0, r.uniform(-0.7, 0.7))
    for i, m in enumerate([96, 100]):
        tt = t_(0.5); f = hz(m)
        x = (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 12)) * np.exp(-tt * 9) * np.minimum(1, tt / 0.002)
        place(out, x * 0.35, 0.05 + 0.11 * i, 1.0, -0.3 + 0.6 * i)
    return verb(norm(out, 0.5), IR_ROOM, 0.15)

def x_glass(seed=0):
    """玻璃轻碰：两三条不和谐高频正弦，起音软，尾巴短"""
    tt = t_(0.7); f = 2350 * (1 + 0.02 * ((seed % 3) - 1))
    x = (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9) + 0.45 * np.sin(2 * np.pi * f * 2.32 * tt) * np.exp(-tt * 14)
         + 0.2 * np.sin(2 * np.pi * f * 3.87 * tt) * np.exp(-tt * 22)) * np.minimum(1, tt / 0.0025)
    return verb(norm(lp(x, 9000), 0.4), IR_ROOM, 0.18)

def x_roller(seed=0):
    """孔版滚轴：橡胶“啪-嗒”两下（低通噪声 + 软木）+ 一下细机械咔"""
    r = np.random.default_rng(seed); out = np.zeros((int(0.4 * SR), 2))
    for i, o in enumerate([0.0, 0.085]):
        tt = t_(0.09)
        body = lp(r.normal(0, 1, len(tt)), 1300) * np.exp(-tt * 55) + np.sin(2 * np.pi * (190 - 30 * i) * tt) * np.exp(-tt * 40) * 0.6
        place(out, body * (1.0 if i == 0 else 0.75) * np.minimum(1, tt / 0.003), o, 1.0, -0.15 + 0.3 * i)
    tt = t_(0.02); place(out, bp(r.normal(0, 1, len(tt)), 3000, 8000) * np.exp(-tt * 350) * 0.3, 0.16, 1.0, 0.2)
    return verb(norm(out, 0.5), IR_ROOM, 0.1)

def x_sub_tick(seed=0):
    """很短的软低频点 + 一丝咔嗒；整体收着（音量由 synth() 对齐，听感上偏轻）"""
    r = np.random.default_rng(seed); tt = t_(0.12)
    sub = np.sin(2 * np.pi * (70 + 25 * np.exp(-tt * 70)) * tt) * np.exp(-tt * 38) * np.minimum(1, tt / 0.004)
    click = bp(r.normal(0, 1, len(tt)), 2000, 6000) * np.exp(-tt * 500) * 0.25
    return norm(sub + click, 0.45)

def x_taiko_soft(seed=0):
    """软太鼓：毛毡槌闷击低鼓，音高略下滑，短房间感（不是电影 boom）"""
    r = np.random.default_rng(seed); tt = t_(0.55)
    ph = 2 * np.pi * np.cumsum(95 + 45 * np.exp(-tt * 28)) / SR
    body = (np.sin(ph) + 0.25 * np.sin(2.3 * ph)) * np.exp(-tt * 9)
    skin = lp(r.normal(0, 1, len(tt)), 900) * np.exp(-tt * 45) * 0.35
    x = (body + skin) * np.minimum(1, tt / 0.006)
    return verb(norm(lp(x, 2200), 0.55), IR_ROOM, 0.16)

def x_tv_blip(seed=0):
    """老电视“嘟”：短方波滤过，略带一点静电"""
    r = np.random.default_rng(seed); tt = t_(0.11); f = [1000, 1200, 800][seed % 3]
    sq = np.sign(np.sin(2 * np.pi * f * tt)) * 0.6
    x = lp(sq, 3000) * np.minimum(1, tt / 0.004) * np.clip((0.11 - tt) / 0.02, 0, 1)
    x = x + hp(r.normal(0, 1, len(tt)), 5000) * 0.03 * np.exp(-tt * 30)
    return verb(norm(x, 0.4), IR_ROOM, 0.08)


# —— 名称 → 合成函数 ——
SYNTHS = {
    # 手稿
    'pencil':   lambda seed, dur=None: sfx_pencil(dur or 0.6, 0.85, seed),
    'marker':   lambda seed, dur=None: sfx_marker(dur or 0.45, seed),
    'pop':      lambda seed, dur=None: sfx_pop(760 + 40 * (seed % 5), 500 + 30 * (seed % 4), seed),
    'card':     lambda seed, dur=None: sfx_card(seed),
    'deal':     lambda seed, dur=None: sfx_deal(3, 0.18, seed),
    'stamp':    lambda seed, dur=None: sfx_stamp(seed),
    'typing':   lambda seed, dur=None: sfx_typing(dur or 0.9, 12, seed),
    'counter':  lambda seed, dur=None: sfx_counter(dur or 1.2, seed),
    'whoosh':   lambda seed, dur=None: sfx_whoosh(dur or 0.5, 400, 4000, seed, 0.7),
    'page':     lambda seed, dur=None: sfx_page(seed),
    'slam':     lambda seed, dur=None: sfx_slam(seed),
    'bell':     lambda seed, dur=None: sfx_bell((86, 90), 1.3, 0.08),
    'cascade':  lambda seed, dur=None: sfx_cascade(5, 0.11, 79, seed),
    'scan':     lambda seed, dur=None: sfx_scan(dur or 1.0, seed),
    'shutter':  lambda seed, dur=None: sfx_shutter(4, 0.1, seed),
    'alert':    lambda seed, dur=None: sfx_alert(),
    # 9 个轻音效
    'tick':     lambda seed, dur=None: s_tick(seed),
    'air':      lambda seed, dur=None: s_air(dur or 0.36, 900, 5200, seed),
    'swipe':    lambda seed, dur=None: s_swipe(seed),
    'tap':      lambda seed, dur=None: s_tap(seed),
    'ding':     lambda seed, dur=None: s_ding(),
    'chime':    lambda seed, dur=None: s_chime(),
    'alert-soft': lambda seed, dur=None: s_alert_soft(),
    'type':     lambda seed, dur=None: norm(sfx_typing(dur or 0.5, 13, seed, s_type_key), 0.35),
    # 纸白信号橙
    'pluck':    lambda seed, dur=None: u_pluck(seed),
    'pluck-up': lambda seed, dur=None: u_pluck_up(seed),
    'snap':     lambda seed, dur=None: u_snap(seed),
    'thock':    lambda seed, dur=None: u_thock(seed),
    # 黑场 HUD
    'blip':     lambda seed, dur=None: h_blip(seed),
    'ping':     lambda seed, dur=None: h_ping(seed),
    'lock':     lambda seed, dur=None: h_lock(seed),
    'keys-soft': lambda seed, dur=None: h_keys_soft(dur or 0.9, seed),
    'data':     lambda seed, dur=None: h_data(dur or 1.2, seed),
    'glitch-soft': lambda seed, dur=None: h_glitch_soft(seed),
    'pulse':    lambda seed, dur=None: h_pulse(seed),
    'arp-up':   lambda seed, dur=None: h_arp_up(seed),
    'confirm':  lambda seed, dur=None: h_confirm(seed),
    # 钴蓝海报
    'bubble':   lambda seed, dur=None: p_bubble(seed),
    'sticker':  lambda seed, dur=None: p_sticker(seed),
    'clap':     lambda seed, dur=None: p_clap(seed),
    'zip':      lambda seed, dur=None: p_zip(dur or 0.3, seed),
    'swoosh':   lambda seed, dur=None: p_swoosh(seed),
    'glock':    lambda seed, dur=None: p_glock(seed),
    'honk-soft': lambda seed, dur=None: p_honk_soft(seed),
    # prompt-motion 候选主题
    'confetti': lambda seed, dur=None: x_confetti(seed),
    'glass':    lambda seed, dur=None: x_glass(seed),
    'roller':   lambda seed, dur=None: x_roller(seed),
    'sub-tick': lambda seed, dur=None: x_sub_tick(seed),
    'taiko-soft': lambda seed, dur=None: x_taiko_soft(seed),
    'tv-blip':  lambda seed, dur=None: x_tv_blip(seed),
}

def _loudest_rms(x, win=0.1):
    m = np.mean(st(x) ** 2, axis=1); w = max(1, int(win * SR))
    c = np.convolve(m, np.ones(w) / w, 'valid') if len(m) > w else np.array([m.mean()])
    return float(np.sqrt(c.max())) or 1e-9

def synth(name, seed=0, dur=None, level=0.08):
    """生成一个音色。各音色按“最响 100ms 的 RMS”对齐到 level（约 -22 dBFS），
    这样同一条时间线换主题时，增益的含义不变；峰值再封顶 0.8。"""
    if name not in SYNTHS:
        raise KeyError(f'未知音效 {name!r}，可用：{", ".join(sorted(SYNTHS))}')
    x = st(SYNTHS[name](seed, dur)).astype(np.float64)
    x = x * (level / _loudest_rms(x))
    pk = np.max(np.abs(x))
    return x * (0.8 / pk) if pk > 0.8 else x


# ═════════ 配乐 ═════════
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
QUAL = {  # 和弦性质 → 半音（相对根音）
    '': [0, 4, 7], 'm': [0, 3, 7], 'sus': [0, 5, 7], 'sus4': [0, 5, 7], 'sus2': [0, 2, 7],
    '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9],
    '9': [0, 4, 7, 10, 14], 'maj9': [0, 4, 7, 11, 14], 'm9': [0, 3, 7, 10, 14], 'add9': [0, 4, 7, 14], '6/9': [0, 4, 7, 9, 14],
}

def chord(name):
    """'Bbmaj7' → (低音 midi, 分解和弦 5 个音, pad 4 个音)，音区固定在 55–79 附近"""
    m = re.match(r'^([A-G])([#b]?)(.*)$', name.strip())
    if not m: raise ValueError(f'和弦名不认识：{name}')
    root = NOTE[m.group(1)] + {'#': 1, 'b': -1, '': 0}[m.group(2)]
    q = m.group(3)
    if q not in QUAL: raise ValueError(f'和弦性质不认识：{name}（支持 {", ".join(k or "大三" for k in QUAL)}）')
    iv = QUAL[q]
    pcs = sorted(set((root + i) % 12 for i in iv if i < 12))
    tones = sorted(55 + ((pc - 55) % 12) for pc in pcs)      # 三/七和弦密集排列，落在 55–66（自动转位）
    r_low = 55 + ((root - 55) % 12)
    ext = sorted(set(tones + [t + 12 for t in tones] + [r_low + i for i in iv if i >= 12]))  # 9 音放到上方，避免挤在一起
    arp = ext[:5]
    pad = (ext * 2)[:4] if len(ext) >= 4 else ext
    bass = 28 + ((root - 28) % 12)
    return bass, arp, pad

def default_plan(dur, progression, energy=0.5, bpm=120, drums=True, bars_per_chord=1):
    """没有 plan 时：每小节一个和弦，按 progression 循环"""
    bar = 4 * 60 / bpm * bars_per_chord; plan = []; t = 0.0; i = 0
    while t < dur - 0.01:
        plan.append((round(t, 3), progression[i % len(progression)], energy, drums)); t += bar; i += 1
    return plan

def _bufs(dur, k=4): return [np.zeros((int((dur + 3) * SR), 2)) for _ in range(k)]
def _spans(plan, dur):
    for i, (t0, ch, e, d) in enumerate(plan):
        yield t0, (plan[i + 1][0] if i + 1 < len(plan) else dur), ch, float(e), bool(d)
def _finish(mix, dur, tail=1.2):
    mix = mix[: int(dur * SR)]
    if len(mix) < int(dur * SR): mix = np.pad(mix, ((0, int(dur * SR) - len(mix)), (0, 0)))
    tl = min(len(mix), int(tail * SR))
    if tl: mix[-tl:] *= np.linspace(1, 0, tl)[:, None] ** 1.5
    mix[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
    return mix

# 乐器
def piano_note(m, dur, vel=0.6):
    """felt piano：带不和谐泛音、按速度变亮度，加锤击噪声"""
    tt = t_(dur + 1.6); f = hz(m); B = 0.0004; x = np.zeros_like(tt)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 9000: break
        x += (vel ** (0.6 + k * 0.25)) / k ** 1.1 * np.sin(2 * np.pi * fk * tt + k) * np.exp(-tt * (1.2 + 0.55 * k))
    x *= np.minimum(1, tt / 0.004)
    rel = np.ones_like(tt); r0 = int(dur * SR); rel[r0:] = np.exp(-np.arange(len(tt) - r0) / SR * 7); x *= rel
    ham = lp(np.random.default_rng(m).normal(0, 1, len(tt)), 2500) * np.exp(-tt * 120) * 0.06 * vel
    return lp(x + ham, 1800 + 3500 * vel)

def pad_chord(ms, dur, level=0.12, cutoff=1100, seed=0):
    r = np.random.default_rng(seed); tt = t_(dur + 1.0); x = np.zeros((len(tt), 2))
    for m in ms:
        for det, pan in [(-0.07, -0.6), (0.06, 0.6), (0.0, 0)]:
            f = hz(m + det); saw = 2 * ((f * tt + r.random()) % 1) - 1
            x += st(saw, pan)
    x = lp(x, cutoff, 2)
    e = np.clip(np.minimum(tt / 0.6, 1), 0, 1) * np.clip((dur + 1.0 - tt) / 1.0, 0, 1)
    return x * e[:, None] * level / len(ms)

def epiano_chord(ms, dur, level=0.1):
    """软电钢 pad：正弦 + 轻颤音"""
    tt = t_(dur + 0.8); x = np.zeros((len(tt), 2))
    trem = 1 + 0.18 * np.sin(2 * np.pi * 4.2 * tt)
    for i, m in enumerate(ms):
        f = hz(m); s = (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 3)) * np.exp(-tt * 0.6)
        x += st(s * trem, -0.4 + 0.8 * i / max(1, len(ms) - 1))
    e = np.minimum(1, tt / 0.02) * np.clip((dur + 0.8 - tt) / 0.8, 0, 1)
    return x * e[:, None] * level / len(ms)

def bass_note(m, dur, level=0.22, cutoff=400):
    tt = t_(dur); f = hz(m)
    x = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt)
    x *= np.minimum(1, tt / 0.01) * np.exp(-tt * 1.2) * np.clip((dur - tt) / 0.08, 0, 1)
    return lp(x, cutoff) * level

def saw_pluck(m, dur, level=0.1, cutoff=1800, seed=0):
    tt = t_(dur + 0.3); f = hz(m); r = np.random.default_rng(seed)
    s = 2 * ((f * tt + r.random()) % 1) - 1 + 2 * ((f * 1.004 * tt) % 1) - 1
    env_f = cutoff * (0.35 + 0.65 * np.exp(-tt * 18))
    y = np.zeros_like(s); blk = 256
    for b in range(0, len(s), blk):
        y[b:b + blk] = lp(s[b:b + blk], float(env_f[b]), 1)
    return y * np.exp(-tt * 9) * np.minimum(1, tt / 0.003) * level

def kick(level=0.35):
    tt = t_(0.35); ph = 2 * np.pi * np.cumsum(48 + 70 * np.exp(-tt * 35)) / SR
    return np.sin(ph) * np.exp(-tt * 9) * level
def shaker(level=0.05, seed=0):
    tt = t_(0.09); return hp(np.random.default_rng(seed).normal(0, 1, len(tt)), 6000) * np.exp(-((tt - 0.025) / 0.02) ** 2) * level
def brush(level=0.06, seed=0):
    tt = t_(0.25); return bp(np.random.default_rng(seed).normal(0, 1, len(tt)), 2000, 8000) * np.exp(-tt * 16) * level
def hat(level=0.04, seed=0, open_=False):
    tt = t_(0.22 if open_ else 0.05)
    return hp(np.random.default_rng(seed).uniform(-1, 1, len(tt)), 8000, 4) * np.exp(-tt * (16 if open_ else 80)) * level
def rim(level=0.05, seed=0):
    tt = t_(0.06); r = np.random.default_rng(seed)
    return (np.sin(2 * np.pi * 1700 * tt) * 0.5 + bp(r.normal(0, 1, len(tt)), 2000, 6000)) * np.exp(-tt * 120) * level
def clap_drum(level=0.08, seed=0): return st(p_clap(seed))[:, 0] * level / 0.5

def _sidechain(n, times, depth=0.45, rel=0.12):
    g = np.ones(n)
    for t in times:
        i = int(t * SR); j = min(n, i + int(0.4 * SR))
        if i >= n: continue
        x = np.arange(j - i) / SR; g[i:j] = np.minimum(g[i:j], 1 - depth * np.exp(-x / rel))
    return g

def put(buf, x, t, pan=0.0, gain=1.0):
    place(buf, x, t, gain, pan)


def bgm_felt_piano(dur, plan, bpm=120, seed=0, drums='brush'):
    """手稿：felt piano 八分音符分解和弦 + 锯齿 pad + 正弦贝斯 + 轻鼓（kick/shaker/brush）"""
    r = np.random.default_rng(seed); beat = 60 / bpm; pno, pad, bass, drm = _bufs(dur)
    pattern = [0, 2, 1, 3, 4, 3, 2, 1]
    for t0, t1, ch, energy, dr in _spans(plan, dur):
        b, arp, pd = chord(ch)
        put(pad, pad_chord(pd, t1 - t0, 0.10 + 0.06 * energy, seed=seed), t0)
        put(bass, bass_note(b, t1 - t0, 0.16 + 0.1 * energy), t0)
        step = beat / 2; k = 0; t = t0
        while t < t1 - 0.01:
            if energy < 0.35 and k % 2 == 1: k += 1; t += step; continue
            m = arp[pattern[k % 8]] + (12 if (energy > 0.7 and k % 8 == 6) else 0)
            vel = (0.42 + 0.22 * energy) * (1.0 if k % 2 == 0 else 0.78) * (0.92 + 0.16 * r.random())
            put(pno, piano_note(m, step * 1.6, vel) * 0.32, max(0.0, t + r.normal(0, 0.004)), -0.25 + 0.5 * (pattern[k % 8] / 4))
            if dr:
                if k % 4 == 0: put(drm, kick(0.20 + 0.12 * energy), t)
                put(drm, shaker(0.035 + 0.03 * energy, int(t * 1000)), t + (0.01 if k % 2 else 0), 0.3)
                if k % 8 == 4: put(drm, brush(0.05 + 0.04 * energy, int(t * 999)), t, -0.2)
            k += 1; t += step
    n = len(pno)
    mix = verb(pno, IR_HALL, 0.35)[:n] + verb(pad, IR_HALL, 0.5)[:n] + bass + verb(drm, IR_ROOM, 0.12)[:n]
    return _finish(mix, dur)

def bgm_marimba_pluck(dur, plan, bpm=112, seed=0, drums='click'):
    """纸白信号橙：马林巴切分琶音 + 软电钢 pad + 圆润贝斯 + rim/hat 轻点"""
    r = np.random.default_rng(seed); beat = 60 / bpm; mar, pad, bass, drm = _bufs(dur)
    pattern = [0, None, 2, 1, None, 3, 2, 4]   # 八分音符，带空拍更利落
    for t0, t1, ch, energy, dr in _spans(plan, dur):
        b, arp, pd = chord(ch)
        put(pad, epiano_chord([p + 12 for p in pd], t1 - t0, 0.09 + 0.05 * energy), t0)
        step = beat / 2; k = 0; t = t0
        while t < t1 - 0.01:
            p = pattern[k % 8]
            if p is not None and not (energy < 0.35 and k % 2):
                vel = (0.45 + 0.25 * energy) * (0.9 + 0.2 * r.random())
                put(mar, marimba(arp[p] + 12, 0.5, vel) * 0.3, t, -0.35 + 0.7 * p / 4)
            if k % 4 == 0: put(bass, bass_note(b + 12, beat * 1.6, 0.14 + 0.08 * energy, 600), t)
            if k % 8 == 7 and energy > 0.5: put(bass, bass_note(b + 19, beat * 0.4, 0.1, 600), t)
            if dr:
                put(drm, hat(0.022 + 0.02 * energy, int(t * 1000)), t + (0.012 if k % 2 else 0), 0.35)
                if k % 4 == 2: put(drm, rim(0.04 + 0.03 * energy, int(t * 997)), t, -0.15)
                if k % 8 == 0: put(drm, kick(0.14 + 0.1 * energy), t)
            k += 1; t += step
    n = len(mar)
    mix = verb(mar, IR_HALL, 0.25)[:n] + verb(pad, IR_HALL, 0.4)[:n] + bass + verb(drm, IR_ROOM, 0.1)[:n]
    return _finish(mix, dur)

def bgm_synth_pulse(dur, plan, bpm=118, seed=0, drums='tick'):
    """黑场 HUD：16 分音符滤波锯齿脉冲（根音/五度）+ 暗 pad + 低贝斯 + 软 kick + 细 hat，侧链"""
    beat = 60 / bpm; pls, pad, bass, drm = _bufs(dur); kicks = []
    for t0, t1, ch, energy, dr in _spans(plan, dur):
        b, arp, pd = chord(ch)
        put(pad, pad_chord(pd, t1 - t0, 0.12 + 0.05 * energy, 800 + 600 * energy, seed), t0)
        put(bass, bass_note(b, t1 - t0, 0.18 + 0.06 * energy, 260), t0)
        step = beat / 4; k = 0; t = t0; seq = [0, 0, 7, 0, 12, 0, 7, 3]
        while t < t1 - 0.01:
            if not (energy < 0.4 and k % 2):
                put(pls, saw_pluck(arp[0] + seq[k % 8] - 12, step * 0.9, 0.06 + 0.04 * energy, 900 + 2200 * energy, k), t, 0.35 * np.sin(k * 0.7))
            if dr and k % 4 == 0:
                put(drm, kick(0.16 + 0.1 * energy), t); kicks.append(t)
            if dr and k % 4 == 2: put(drm, hat(0.02 + 0.02 * energy, int(t * 1000)), t, 0.3)
            k += 1; t += step
    n = len(pls); g = _sidechain(n, kicks, 0.4)[:, None]
    mix = delay(verb(pls, IR_DARK, 0.2), 3 * beat / 4, 0.28, 3)[:n] * g + verb(pad, IR_DARK, 0.5)[:n] * g + bass * g + verb(drm, IR_ROOM, 0.08)[:n]
    return _finish(hp(mix, 30), dur)

def bgm_funk_pluck(dur, plan, bpm=124, seed=0, drums='clap'):
    """钴蓝海报：切分拨弦 + 跳跃贝斯 + 2/4 拍拍手 + hat，明亮轻快"""
    r = np.random.default_rng(seed); beat = 60 / bpm; plk, pad, bass, drm = _bufs(dur)
    hits = [0, 3, 6, 10, 12, 14]               # 16 分音符位置（一小节 16 格）
    bline = {0: 0, 3: 12, 6: 7, 8: 0, 11: 10, 14: 12}
    for t0, t1, ch, energy, dr in _spans(plan, dur):
        b, arp, pd = chord(ch)
        put(pad, epiano_chord(pd, t1 - t0, 0.06 + 0.04 * energy), t0)
        step = beat / 4; k = 0; t = t0
        while t < t1 - 0.01:
            pos = k % 16
            if pos in hits and not (energy < 0.4 and pos not in (0, 6, 12)):
                for j, m in enumerate(arp[1:4]):
                    put(plk, marimba(m + 12, 0.22, 0.32 + 0.14 * energy, 1.4) * 0.22, t + j * 0.006, -0.3 + 0.3 * j)
            if pos in bline: put(bass, bass_note(b + 12 + bline[pos], step * 1.7, 0.16 + 0.07 * energy, 700), t)
            if dr:
                if pos in (0, 8): put(drm, kick(0.16 + 0.1 * energy), t)
                if pos in (4, 12): put(drm, clap_drum(0.07 + 0.05 * energy, int(t * 1000)), t, 0.05)
                if pos % 2 == 0: put(drm, hat(0.018 + 0.015 * energy, int(t * 991), pos == 14), t + (0.01 if pos % 4 == 2 else 0), 0.3)
            k += 1; t += step
    n = len(plk)
    mix = verb(plk, IR_ROOM, 0.25)[:n] + verb(pad, IR_HALL, 0.35)[:n] + bass + verb(drm, IR_ROOM, 0.12)[:n]
    return _finish(mix, dur)

def bgm_minor_tech(dur, plan, bpm=120, seed=0, drums='tick'):
    """石墨双阵营：make_audio.py 的 minor-tech——pad + 带乒乓延迟的 pluck 琶音 + kick/snap/hat，侧链"""
    beat = 60 / bpm; pad, arpb, bass, drm = _bufs(dur); kicks = []; ARP = [0, 2, 4, 1, 3, 2, 4, 3]
    for t0, t1, ch, energy, dr in _spans(plan, dur):
        b, arp, pd = chord(ch)
        for i, m in enumerate(pd): put(pad, pad_chord([m], t1 - t0, 0.06, 1300, seed + i), t0, (i - 1.5) * 0.35)
        t = t0; k = 0
        while t < t1 - 0.01:
            put(arpb, marimba(arp[ARP[k % 8]] + 12, 0.45, 0.08 if k % 2 == 0 else 0.06, 1.6), t, -0.4 if k % 2 else 0.4)
            if k % 2 == 0:
                put(bass, bass_note(b + 12, beat / 2 * 0.9, 0.16, 500), t + beat / 2)
                if dr and energy > 0.3:
                    put(drm, kick(0.2 + 0.1 * energy), t); kicks.append(t)
                    put(drm, hat(0.03, int(t * 1000)), t + beat / 2, 0.3)
                    if energy > 0.5 and (k // 2) % 2 == 1: put(drm, brush(0.06, int(t * 997)), t, 0.1)
            k += 1; t += beat / 2
    n = len(pad); g = _sidechain(n, kicks, 0.5, 0.08)[:, None]
    mix = verb(pad, IR_HALL, 0.4)[:n] * g * 0.85 + lp(delay(arpb, 0.375, 0.3, 4), 5000)[:n] * 0.8 + bass * 0.7 + drm[:n] * 0.9
    return _finish(hp(mix, 30), dur, 0.9)

# —— prompt-motion 候选主题补充的乐器 ——
def ks_pluck(m, dur, vel=0.6, bright=0.5, seed=0):
    """Karplus-Strong 拨弦（尤克里里 / 尼龙弦）：lfilter 实现，很快"""
    f = hz(m); N = max(2, int(round(SR / f))); n = int((dur + 0.4) * SR)
    r = np.random.default_rng(seed)
    exc = np.zeros(n); burst = lp(r.uniform(-1, 1, N), 1200 + 5000 * bright)
    exc[:N] = burst * vel
    d = 0.996 - 0.006 * (1 - bright)
    a = np.zeros(N + 2); a[0] = 1; a[N] = -d / 2; a[N + 1] = -d / 2
    y = lfilter([1.0], a, exc)
    tt = np.arange(n) / SR
    rel = np.clip((dur + 0.4 - tt) / 0.4, 0, 1)
    return lp(y * rel, 4500)

def rhodes_note(m, dur, vel=0.5):
    """Rhodes 电钢：正弦 + 衰减的钟声泛音 + 轻颤音"""
    tt = t_(dur + 0.9); f = hz(m)
    x = (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 1.4) + 0.3 * vel * np.sin(2 * np.pi * f * 3.98 * tt) * np.exp(-tt * 9)
         + 0.12 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt * 3))
    x *= (1 + 0.12 * np.sin(2 * np.pi * 4.6 * tt)) * np.minimum(1, tt / 0.004)
    rel = np.ones_like(tt); r0 = int(dur * SR); rel[r0:] = np.exp(-np.arange(len(tt) - r0) / SR * 8)
    return lp(x * rel * vel, 2600 + 2000 * vel)

def vinyl_bed(dur, level=0.012, seed=0):
    """唱片底噪：很低的暖色嘶声 + 稀疏小爆点"""
    r = np.random.default_rng(seed); n = int(dur * SR)
    hiss = lp(hp(r.normal(0, 1, n), 400), 3500) * level
    pops = np.zeros(n); idx = r.integers(0, n, max(1, int(dur * 6)))
    pops[idx] = r.uniform(-1, 1, len(idx)) * level * 9
    return st(hiss + lp(pops, 5000), 0.0, 0.002)

def wood_clack(level=0.06, seed=0):
    tt = t_(0.08); r = np.random.default_rng(seed)
    return (np.sin(2 * np.pi * 900 * tt) * 0.6 + bp(r.normal(0, 1, len(tt)), 1200, 4000)) * np.exp(-tt * 90) * level

def taiko_drum(level=0.2, seed=0):
    return st(x_taiko_soft(seed))[:, 0] * level / 0.55

def _swing(k, step, amt=0.18):
    """八分音符摇摆：反拍往后推"""
    return step * amt if k % 2 else 0.0


def bgm_soft_house(dur, plan, bpm=120, seed=0, drums='house'):
    """四拍软 house：软 kick 每拍一下 + 反拍 hat + 2/4 轻拍手（click 时换成 rim）+ 反拍电钢和弦 stab + 暖 pad，侧链"""
    r = np.random.default_rng(seed); beat = 60 / bpm; stab, pad, bass, drm = _bufs(dur); kicks = []
    for t0, t1, ch, energy, dr in _spans(plan, dur):
        b, arp, pd = chord(ch)
        put(pad, pad_chord(pd, t1 - t0, 0.08 + 0.05 * energy, 900 + 500 * energy, seed), t0)
        k = 0; t = t0; step = beat / 2
        while t < t1 - 0.01:
            pos = k % 8                      # 一小节 8 个八分音符
            if pos in (1, 5) or (energy > 0.6 and pos == 7):
                for j, m in enumerate(pd):
                    put(stab, rhodes_note(m + 12, step * 0.7, 0.28 + 0.12 * energy) * 0.18, t + j * 0.004, -0.4 + 0.27 * j)
            if pos % 2 == 1: put(bass, bass_note(b + 12, step * 0.85, 0.15 + 0.07 * energy, 520), t)
            if dr:
                if pos % 2 == 0 and drums != 'tick' or (drums == 'tick' and pos % 4 == 0):
                    put(drm, kick(0.15 + 0.08 * energy), t); kicks.append(t)
                if pos % 2 == 1: put(drm, hat(0.02 + 0.018 * energy, int(t * 1000), open_=(pos == 7 and energy > 0.5)), t, 0.3)
                if pos in (2, 6) and energy > 0.4:
                    put(drm, rim(0.04 + 0.02 * energy, int(t * 997)) if drums == 'click' else clap_drum(0.05 + 0.03 * energy, int(t * 997)), t, -0.05)
            k += 1; t += step
    n = len(stab); g = _sidechain(n, kicks, 0.35, 0.1)[:, None]
    mix = verb(stab, IR_HALL, 0.3)[:n] * g + verb(pad, IR_HALL, 0.45)[:n] * g + bass * g + verb(drm, IR_ROOM, 0.08)[:n]
    return _finish(hp(mix, 32), dur)

def bgm_lofi_keys(dur, plan, bpm=90, seed=0, drums='brush'):
    """lo-fi 电钢：Rhodes 和弦（摇摆）+ 慵懒贝斯 + 唱片底噪 + kick / brush（或 rim）"""
    r = np.random.default_rng(seed); beat = 60 / bpm; keys, pad, bass, drm = _bufs(dur)
    for t0, t1, ch, energy, dr in _spans(plan, dur):
        b, arp, pd = chord(ch)
        step = beat / 2; k = 0; t = t0
        while t < t1 - 0.01:
            pos = k % 8; tt0 = t + _swing(k, step)
            if pos in (0, 3) or (energy > 0.55 and pos == 6):
                v = (0.38 + 0.18 * energy) * (0.9 + 0.2 * r.random())
                for j, m in enumerate(pd):
                    put(keys, rhodes_note(m + 12, beat * (1.4 if pos == 0 else 0.9), v) * 0.2, tt0 + j * 0.012, -0.35 + 0.23 * j)
            if pos in (0, 5): put(bass, bass_note(b + 12 + (7 if pos == 5 and energy > 0.5 else 0), beat * 1.2, 0.15 + 0.05 * energy, 450), tt0)
            if dr:
                if pos in (0, 5): put(drm, kick(0.14 + 0.07 * energy), tt0)
                if pos in (2, 6):
                    put(drm, rim(0.04 + 0.02 * energy, int(t * 997)) if drums == 'click' else brush(0.06 + 0.03 * energy, int(t * 997)), tt0, -0.1)
                put(drm, hat(0.012 + 0.01 * energy, int(t * 1000)), tt0, 0.35)
            k += 1; t += step
    n = len(keys)
    mix = verb(keys, IR_ROOM, 0.3)[:n] + bass + verb(drm, IR_ROOM, 0.1)[:n]
    vb = vinyl_bed(len(mix) / SR, 0.010, seed)[:n]; mix[: len(vb)] += vb
    return _finish(lp(mix, 7000), dur)

def bgm_swing_uke(dur, plan, bpm=120, seed=0, drums='brush'):
    """复古 swing：尤克里里扫弦（摇摆八分）+ 行走低音 + brush 2/4 + 轻 ride"""
    r = np.random.default_rng(seed); beat = 60 / bpm; uke, pad, bass, drm = _bufs(dur)
    strum = [1, 0, 1, 1, 0, 1, 1, 1]          # 下 - 下上 - 上下上
    for t0, t1, ch, energy, dr in _spans(plan, dur):
        b, arp, pd = chord(ch)
        step = beat / 2; k = 0; t = t0
        while t < t1 - 0.01:
            pos = k % 8; tt0 = t + _swing(k, step, 0.22)
            if strum[pos] and not (energy < 0.4 and pos % 2):
                up = pos % 2 == 1; notes = (pd[::-1] if up else pd)
                v = (0.5 + 0.2 * energy) * (0.7 if up else 1.0) * (0.9 + 0.2 * r.random())
                for j, m in enumerate(notes):
                    put(uke, ks_pluck(m + 12, step * 1.2, v, 0.55, seed + k * 7 + j) * 0.22, tt0 + j * 0.011, -0.3 + 0.2 * j)
            if pos % 2 == 0:                    # 行走低音：根-三-五-经过音
                walk = [0, 4 if 4 in [(x - b) % 12 for x in pd] else 3, 7, 10][(pos // 2) % 4]
                put(bass, bass_note(b + 12 + walk, beat * 0.9, 0.17 + 0.06 * energy, 500), t)
            if dr:
                if pos in (2, 6): put(drm, brush(0.07 + 0.03 * energy, int(t * 997)), tt0, -0.1)
                put(drm, hat(0.014 + 0.01 * energy, int(t * 1000), open_=(pos == 0)), tt0, 0.35)
                if pos == 0: put(drm, kick(0.11 + 0.05 * energy), t)
            k += 1; t += step
    n = len(uke)
    mix = verb(uke, IR_ROOM, 0.22)[:n] + bass + verb(drm, IR_ROOM, 0.12)[:n]
    return _finish(mix, dur)

def bgm_taiko_ambient(dur, plan, bpm=90, seed=0, drums='taiko'):
    """太鼓氛围：低弦 + 暗 pad 长音 + 1、3 拍软太鼓（能量高时加反拍轻击）+ 偶尔木拍子"""
    r = np.random.default_rng(seed); beat = 60 / bpm; strings, pad, bass, drm = _bufs(dur)
    for t0, t1, ch, energy, dr in _spans(plan, dur):
        b, arp, pd = chord(ch)
        put(pad, pad_chord(pd, t1 - t0, 0.10 + 0.05 * energy, 650 + 400 * energy, seed), t0)
        put(strings, pad_chord([b + 12, b + 19], t1 - t0, 0.12 + 0.05 * energy, 450, seed + 1), t0)
        put(bass, bass_note(b, t1 - t0, 0.12 + 0.05 * energy, 220), t0)
        k = 0; t = t0
        while t < t1 - 0.01:
            pos = k % 4
            if dr:
                if pos in (0, 2): put(drm, taiko_drum(0.28 + 0.12 * energy, seed + k), t, -0.1 if pos else 0.1)
                if energy > 0.55 and pos == 3: put(drm, taiko_drum(0.12, seed + k + 99), t + beat / 2, 0.25)
                if (k // 4) % 2 == 1 and pos == 3: put(drm, wood_clack(0.05 + 0.02 * energy, int(t * 997)), t + beat / 2, 0.3)
            k += 1; t += beat
    n = len(pad)
    mix = verb(pad, IR_DARK, 0.5)[:n] + verb(strings, IR_HALL, 0.4)[:n] + bass + verb(drm, IR_ROOM, 0.2)[:n]
    return _finish(hp(mix, 30), dur)


BGM_STYLES = {
    'felt-piano': bgm_felt_piano,
    'marimba-pluck': bgm_marimba_pluck,
    'synth-pulse': bgm_synth_pulse,
    'funk-pluck': bgm_funk_pluck,
    'minor-tech': bgm_minor_tech,
    'soft-house': bgm_soft_house,
    'lofi-keys': bgm_lofi_keys,
    'swing-uke': bgm_swing_uke,
    'taiko-ambient': bgm_taiko_ambient,
}

def bgm(style, dur, plan=None, bpm=120, progression=('C', 'Am', 'F', 'G'), energy=0.5, drums=True, seed=0):
    """drums：False 关鼓；字符串（'house' / 'click' / 'brush' / 'tick' / 'taiko' / 'clap'）是鼓组风格提示，交给配乐函数"""
    if style not in BGM_STYLES: raise KeyError(f'未知配乐风格 {style!r}，可用：{", ".join(BGM_STYLES)}')
    plan = plan or default_plan(dur, list(progression), energy, bpm, bool(drums))
    kw = {'drums': drums} if isinstance(drums, str) else {}
    return BGM_STYLES[style](dur, [tuple(p) for p in plan], bpm, seed, **kw)


# ═════════ 响度 / 限幅 ═════════
def lufs(x):
    """积分响度；短于 0.5s 的补静音再测（pyloudnorm 需要 400ms 块）"""
    if len(x) < int(0.5 * SR): x = np.pad(st(x), ((0, int(0.5 * SR) - len(x)), (0, 0)))
    v = pyln.Meter(SR).integrated_loudness(st(x))
    return v if np.isfinite(v) else -70.0

def to_lufs(x, target):
    return x * 10 ** ((target - lufs(x)) / 20)

def true_peak(x): return float(np.max(np.abs(resample_poly(x, 4, 1, axis=0)))) if len(x) else 0.0

def limit(x, ceiling_db=-14.0):
    """tanh 软限幅到 ceiling（4 倍过采样估真峰值），仍超就整体压一点"""
    c = 10 ** (ceiling_db / 20)
    if true_peak(x) <= c: return x
    k = c * 0.8
    x = np.where(np.abs(x) > k, np.sign(x) * (k + (c - k) * np.tanh((np.abs(x) - k) / (c - k))), x)
    tp = true_peak(x)
    return x * (c / tp) if tp > c else x

def db(x): return 20 * np.log10(max(1e-9, float(np.max(np.abs(x)))))
