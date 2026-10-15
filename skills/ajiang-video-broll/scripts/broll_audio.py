#!/usr/bin/env python3
"""按主题给 B-roll 工程生成配乐 + 卡点音效，每段混成一条 wav（成片音轨，不含口播）。

  <venv>/python <skill>/scripts/broll_audio.py <工程目录> [--theme sketch] [--seg seg0] [--out 目录] [--min-gap 0.15]

读取
  src/broll/theme.lock.json     {"theme": "paper-signal", "variant": "signal"}（没给 --theme 时用它）
  <skill>/assets/themes/<id>/theme.json 的 sound 段：sfx 语义映射、bgm 风格、levels 电平
  src/segments.json             每段帧数（决定 wav 精确长度）、fps
  src/broll/timeline-<seg>.json [[段内秒, 事件, 增益, 场景名, (可选)时长秒], …]
                                事件是语义名（enter / card / stamp / type …），按主题映射成音色；
                                也可写 "type:1.4" 指定时长，或直接写音色名（pencil、blip …）
  src/broll/plan-<seg>.json     可选，配乐计划 [[起始秒, 和弦, 能量0-1, 有无鼓], …]；
                                没有就按主题 progression 每小节一个和弦
  口播响度：public/footage/<seg>.wav 或 public/broll/voice-<seg>.wav；都没有就按 -27 LUFS 估（会警告）

写出（默认 public/broll/，--out 可改）
  mix-<seg>.wav（成片用）、bgm-<seg>.wav、sfx-<seg>.wav（调试分轨），48k 立体声 24bit

电平（theme.json sound.levels）：配乐先归一到 bgm_lufs、音效到 sfx_lufs（音效比配乐突出约 3.5 dB），
再整体压到 口播 − below_voice_db，tanh 软限幅到 ceiling_dbfs（真峰值）。默认 −24 / −20.5 / 16 / −14。
"""
import argparse
import json
import pathlib
import sys

import numpy as np
import soundfile as sf
import pyloudnorm as pyln

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import audio_lib as A  # noqa: E402

SKILL = pathlib.Path(__file__).resolve().parent.parent
THEMES = SKILL / 'assets' / 'themes'
DEFAULT_LEVELS = {'bgm_lufs': -24, 'sfx_lufs': -20.5, 'below_voice_db': 16, 'ceiling_dbfs': -14}


def load_theme(tid):
    p = THEMES / tid / 'theme.json'
    if not p.exists():
        sys.exit(f'没有主题 {tid}（可用：{", ".join(sorted(d.name for d in THEMES.iterdir() if (d / "theme.json").exists()))}）')
    return json.loads(p.read_text(encoding='utf-8'))


def resolve(event, sfxmap):
    """语义事件 → (音色名, 时长)"""
    name, _, d = str(event).partition(':')
    dur = float(d) if d else None
    syn = sfxmap.get(name, name)
    if syn not in A.SYNTHS:
        raise KeyError(f'事件 {event!r} 映射到 {syn!r}，音色库里没有')
    return syn, dur


def space_events(events, min_gap):
    """两声间隔小于 min_gap 时只留增益大的那个（相同则留先到的）"""
    keep = []
    for e in sorted(events, key=lambda e: e[0]):
        if keep and e[0] - keep[-1][0] < min_gap:
            if e[2] > keep[-1][2]: keep[-1] = e
            continue
        keep.append(e)
    return keep


def render_sfx(events, sfxmap, n, min_gap=0.15):
    buf = np.zeros((n + 3 * A.SR, 2)); used = []
    evs = space_events([(float(e[0]), e[1], float(e[2]) if len(e) > 2 and e[2] is not None else 0.5,
                         e[3] if len(e) > 3 else '', e[4] if len(e) > 4 else None) for e in events], min_gap)
    for i, (t, ev, g, scene, d) in enumerate(evs):
        syn, dur = resolve(ev, sfxmap)
        x = A.synth(syn, seed=(int(t * 1000) * 7 + i) % 100003, dur=d or dur)
        A.place(buf, x, max(0.0, t), g)
        used.append((round(t, 3), ev, syn, g))
    out = buf[:n]
    f = int(0.02 * A.SR); out[-f:] *= np.linspace(1, 0, f)[:, None]
    return out, used


def voice_lufs(root, key):
    for p in (root / 'public' / 'footage' / f'{key}.wav', root / 'public' / 'broll' / f'voice-{key}.wav'):
        if p.exists():
            vo, vsr = sf.read(p)
            v = pyln.Meter(vsr).integrated_loudness(vo)
            if np.isfinite(v): return v, p.name
    print(f'  ⚠ {key}: 找不到口播 wav，按 -27 LUFS 估算', file=sys.stderr)
    return -27.0, None


def build(root, key, frames, fps, theme, out, min_gap=0.15):
    snd = theme['sound']; lv = {**DEFAULT_LEVELS, **snd.get('levels', {})}; b = snd['bgm']
    n = int(round(frames / fps * A.SR)); dur = n / A.SR
    tl_p = root / 'src' / 'broll' / f'timeline-{key}.json'
    tl = json.loads(tl_p.read_text(encoding='utf-8')) if tl_p.exists() else []
    scene_plan = None
    if isinstance(tl, dict):  # build_broll.py 导出的格式：{scenes, events, …}
        events = [e[:4] for e in tl.get('events', [])]
        prog = b.get('progression', ['C', 'Am', 'F', 'G'])
        # 默认配乐计划跟着场景走：换页换和弦；场景的 mood 可覆盖 {chord, energy, drums}
        scene_plan = []
        for i, sc in enumerate(tl.get('scenes', [])):
            m = sc.get('mood') or {}
            scene_plan.append([sc['from'], m.get('chord', prog[i % len(prog)]),
                               m.get('energy', b.get('energy', 0.5)), m.get('drums', True)])
    else:
        events = tl
    if not events: print(f'  ⚠ {key}: 没有 {tl_p.name} 里的音效事件，只出配乐', file=sys.stderr)
    plan_p = root / 'src' / 'broll' / f'plan-{key}.json'
    plan = json.loads(plan_p.read_text(encoding='utf-8')) if plan_p.exists() else scene_plan
    seed = sum(map(ord, key)) * 13
    music = A.bgm(b['style'], dur, plan, b.get('bpm', 120), b.get('progression', ['C', 'Am', 'F', 'G']),
                  b.get('energy', 0.5), b.get('drums', True), seed)[:n]
    if len(music) < n: music = np.pad(music, ((0, n - len(music)), (0, 0)))
    fo = int(0.6 * A.SR); music[-fo:] *= np.linspace(1, 0, fo)[:, None]
    sfx, used = render_sfx(events, snd['sfx'], n, min_gap)
    music = A.to_lufs(music, lv['bgm_lufs'])
    if used: sfx = A.to_lufs(sfx, lv['sfx_lufs'])
    mix = music + sfx
    v, src = voice_lufs(root, key)
    g = 10 ** ((v - lv['below_voice_db'] - A.lufs(mix)) / 20)
    mix, music, sfx = mix * g, music * g, sfx * g
    mix = A.limit(mix, lv['ceiling_dbfs'])
    out.mkdir(parents=True, exist_ok=True)
    for name, x in (('mix', mix), ('bgm', music), ('sfx', sfx)):
        sf.write(out / f'{name}-{key}.wav', x.astype(np.float32), A.SR, subtype='PCM_24')
    print(f'{key}  {frames} 帧 {dur:.3f}s  主题 {theme["id"]} / {b["style"]}  音效 {len(used)}/{len(events)} 个'
          f'  口播 {v:.1f} LUFS{"" if src else "(估)"}  成品 {A.lufs(mix):.1f} LUFS（低 {v - A.lufs(mix):.1f} dB）'
          f'  真峰值 {20 * np.log10(max(1e-9, A.true_peak(mix))):.1f} dBFS')
    return used


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('project'); ap.add_argument('--theme'); ap.add_argument('--seg')
    ap.add_argument('--out', help='输出目录（默认 <工程>/public/broll）')
    ap.add_argument('--min-gap', type=float, default=0.15, help="两声最小间隔秒（默认 0.15）")
    a = ap.parse_args()
    root = pathlib.Path(a.project).resolve()
    tid = a.theme
    if not tid:
        lock = root / 'src' / 'broll' / 'theme.lock.json'
        if not lock.exists(): sys.exit('没有 --theme，也没有 src/broll/theme.lock.json')
        tid = json.loads(lock.read_text(encoding='utf-8'))['theme']
    theme = load_theme(tid)
    meta = json.loads((root / 'src' / 'segments.json').read_text(encoding='utf-8'))
    fps = meta.get('fps', 30)
    out = pathlib.Path(a.out).resolve() if a.out else root / 'public' / 'broll'
    for s in meta['segments']:
        if a.seg and s['key'] != a.seg: continue
        build(root, s['key'], s['frames'], fps, theme, out, a.min_gap)


if __name__ == '__main__':
    main()
