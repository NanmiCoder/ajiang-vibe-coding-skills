#!/usr/bin/env python3
"""给主题画廊生成试听音频：每个主题的音效样本、16 秒配乐循环、12 秒演示混音。

  <venv>/python <skill>/scripts/theme_demo_audio.py <输出目录> [--theme id ...]

写出 <输出目录>/<theme-id>/：
  <音色>.mp3      主题 sfx 映射里用到的每个音色一份（按音色名命名）
  bgm.mp3         16 秒配乐循环（能量有起伏）
  demo.mp3        12 秒演示：和画廊演示动画同一条时间线（场景在 0 / 4 / 8 秒切换）
  index.json      {"sfx": {事件: 文件}, "bgm": "bgm.mp3", "demo": "demo.mp3", ...}

注意：这里是独立试听用，演示混音按 配乐 -24 / 音效 -20.5 的相对关系混好后整体拉到 -20 LUFS，
比成片响得多（成片要再压到口播 −16 dB，见 broll_audio.py）。
"""
import argparse
import json
import pathlib
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import audio_lib as A  # noqa: E402

THEMES = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'themes'

DEMO = [[0.15, 'enter', .5], [0.55, 'type', .35], [1.6, 'draw', .4], [2.4, 'card', .5], [2.6, 'card', .45],
        [2.8, 'card', .45], [3.9, 'count', .4], [4.0, 'transition', .45], [4.5, 'slide', .4], [5.3, 'check', .5],
        [5.9, 'check', .5], [6.5, 'check', .5], [7.4, 'stamp', .6], [8.0, 'transition', .45], [8.5, 'reveal', .5],
        [9.6, 'key', .5], [10.6, 'mark', .4]]
DEMO_DUR = {'type': 0.9, 'count': 1.0, 'draw': 0.6}


def mp3(x, path, peak_db=-1.0):
    x = A.limit(x, peak_db)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        sf.write(f.name, x.astype(np.float32), A.SR, subtype='PCM_24')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f.name, '-c:a', 'libmp3lame', '-b:a', '160k', str(path)], check=True)
        pathlib.Path(f.name).unlink()


def run(theme, out):
    snd = theme['sound']; b = snd['bgm']; prog = b.get('progression', ['C', 'Am', 'F', 'G'])
    tid = theme['id']; d = out / tid; d.mkdir(parents=True, exist_ok=True)
    sfxmap = snd['sfx']; files = {}
    # 1. 每个音色一份样本（-22 LUFS 试听电平）
    for syn in sorted(set(sfxmap.values())):
        x = A.synth(syn, seed=7, dur=None)
        x = np.pad(x, ((int(0.03 * A.SR), int(0.25 * A.SR)), (0, 0)))
        mp3(A.to_lufs(x, -22), d / f'{syn}.mp3')
    files = {ev: f'{syn}.mp3' for ev, syn in sfxmap.items()}
    # 2. 16 秒配乐循环：能量先起后落
    bpm = b.get('bpm', 120); bar = 4 * 60 / bpm; plan = []; t = 0.0; i = 0
    curve = [0.4, 0.55, 0.7, 0.6, 0.75, 0.65, 0.5, 0.45]
    while t < 16 - 0.01:
        plan.append((round(t, 3), prog[i % len(prog)], curve[i % len(curve)], i > 0)); t += bar; i += 1
    music = A.bgm(b['style'], 16.0, plan, bpm, prog, b.get('energy', .5), True, seed=21)
    mp3(A.to_lufs(music, -20), d / 'bgm.mp3')
    # 3. 12 秒演示混音
    dplan = [(0.0, prog[0], .45, False), (2.0, prog[1 % len(prog)], .5, True), (4.0, prog[2 % len(prog)], .65, True),
             (6.0, prog[3 % len(prog)], .65, True), (8.0, prog[0], .8, True), (10.0, prog[1 % len(prog)], .6, True)]
    n = int(12.0 * A.SR)
    m = A.bgm(b['style'], 12.0, dplan, bpm, prog, .5, True, seed=33)[:n]
    sfx = np.zeros((n + 2 * A.SR, 2))
    # 每套模板的版式不同，音效时间也不同：优先用 gallery build 导出的 <out>/<id>/timeline.json
    tl_p = d / 'timeline.json'
    demo = [tuple(e[:3]) for e in json.loads(tl_p.read_text(encoding='utf-8'))] if tl_p.exists() else DEMO
    for k, (tt, ev, g) in enumerate(demo):
        syn = sfxmap.get(ev, ev)
        A.place(sfx, A.synth(syn, seed=100 + k, dur=DEMO_DUR.get(ev)), tt, g)
    sfx = sfx[:n]
    lv = snd.get('levels', {})
    mix = A.to_lufs(m, lv.get('bgm_lufs', -24)) + A.to_lufs(sfx, lv.get('sfx_lufs', -20.5))
    mix = A.to_lufs(mix, -20)
    mp3(mix, d / 'demo.mp3')
    idx = {'theme': tid, 'sfx': files, 'synths': sorted(set(sfxmap.values())), 'bgm': 'bgm.mp3', 'demo': 'demo.mp3',
           'bgm_style': b['style'], 'bpm': bpm, 'progression': prog,
           'note': '试听电平：演示混音 -20 LUFS、样本 -22 LUFS；成片会再压到口播 −16 dB'}
    (d / 'index.json').write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{tid:14s} 音色 {len(idx["synths"]):2d}  配乐 {b["style"]:13s}  demo {A.lufs(mix):.1f} LUFS  '
          f'峰值 {20 * np.log10(A.true_peak(A.limit(mix, -1))):.1f} dBTP')
    return idx


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('out'); ap.add_argument('--theme', nargs='*')
    a = ap.parse_args()
    out = pathlib.Path(a.out).resolve()
    for p in sorted(THEMES.glob('*/theme.json')):
        th = json.loads(p.read_text(encoding='utf-8'))
        if a.theme and th['id'] not in a.theme: continue
        run(th, out)


if __name__ == '__main__':
    main()
