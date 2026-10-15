#!/usr/bin/env python3
"""把成片截图描成铅笔分镜（“还没生成 / 先打算”的内容用它，真成片出来再换彩色）。

  python3 sketchify.py in.jpg [in2.jpg …] [-o 输出目录] [--prefix sk_] [--width 960]
                      [--paper "#F5EFE3"] [--ink "#342822"] [--theme-project <工程>]

配方（414 期定稿）：灰度开方 → 中值 3 → 高斯 1.3 → Sobel 幅值（按 99.3 分位归一）
  line = clip((g-.18)/.82)^.75；shade = (1-亮度)·.14；v = 1 - clip(line·.92 + shade)
  再映射到纸色和墨色。--theme-project 时取工程主题的 --bg / --fg（深色主题会自动反过来：纸深墨浅）。
依赖 numpy、scipy、pillow（没有就建一个 venv 装上）。
"""
import argparse
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage


def hex_rgb(h):
    h = h.strip().lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def theme_colors(project):
    sb = os.path.join(project, 'src', 'broll')
    th = json.load(open(os.path.join(sb, 'theme.json'), encoding='utf-8'))
    lock = json.load(open(os.path.join(sb, 'theme.lock.json'), encoding='utf-8'))
    v = th['vars'] | th['variants'][lock['variant']].get('vars', {})
    return v['--bg'], v['--fg']


def sketch(path, width, paper, ink):
    im = Image.open(path).convert('RGB')
    if width and im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255
    gray = (a @ np.array([.299, .587, .114], dtype=np.float32))
    g = np.sqrt(gray)
    g = ndimage.median_filter(g, 3)
    g = ndimage.gaussian_filter(g, 1.3)
    e = np.hypot(ndimage.sobel(g, 0), ndimage.sobel(g, 1))
    e = np.clip(e / (np.percentile(e, 99.3) + 1e-6), 0, 1)
    line = np.clip((e - .18) / .82, 0, 1) ** .75
    shade = (1 - gray) * .14
    v = 1 - np.clip(line * .92 + shade, 0, 1)
    out = ink[None, None, :] + (paper - ink)[None, None, :] * v[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('inputs', nargs='+')
    p.add_argument('-o', '--outdir')
    p.add_argument('--prefix', default='sk_')
    p.add_argument('--width', type=int, default=960)
    p.add_argument('--paper', default='#F5EFE3')
    p.add_argument('--ink', default='#342822')
    p.add_argument('--theme-project')
    a = p.parse_args()
    paper, ink = (theme_colors(a.theme_project) if a.theme_project else (a.paper, a.ink))
    paper, ink = hex_rgb(paper), hex_rgb(ink)
    for f in a.inputs:
        d = a.outdir or os.path.dirname(os.path.abspath(f))
        os.makedirs(d, exist_ok=True)
        dst = os.path.join(d, a.prefix + os.path.splitext(os.path.basename(f))[0] + '.jpg')
        sketch(f, a.width, paper, ink).save(dst, quality=88)
        print(dst)


if __name__ == '__main__':
    main()
