#!/usr/bin/env python3
"""审片用联系表：从预览/成片 mp4 每隔 N 秒抽一帧，拼成带时间戳和安全区框的大图（给独立审片 agent 和总控看）。

  python3 contact.py --project <工程> out/preview/seg3.mp4 [--every 1.5] [--extra 12.4,25.6] [--cols 4]
输出 out/qa/contact-<文件名>.jpg（每张 480 宽）。帧太多会自动分成多张（每张最多 24 帧）。
"""
import argparse
import json
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont


def dur(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--project', default='.')
    ap.add_argument('video')
    ap.add_argument('--every', type=float, default=1.5)
    ap.add_argument('--extra', default='')
    ap.add_argument('--cols', type=int, default=4)
    a = ap.parse_args()
    P = os.path.abspath(a.project)
    v = a.video if os.path.isabs(a.video) else os.path.join(P, a.video)
    D = dur(v)
    ts = sorted(set([round(i * a.every, 2) for i in range(int(D / a.every) + 1)] + [float(x) for x in a.extra.split(',') if x]))
    ts = [t for t in ts if t < D - 0.02] + [round(D - 0.04, 2)]
    try:
        safe = json.load(open(os.path.join(P, 'src', 'data', 'meta.json')))['safe']
    except Exception:
        safe = None
    W = 480
    k = W / 1920
    font = None
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
    except Exception:
        font = ImageFont.load_default()
    outs = []
    for page in range(0, len(ts), 24):
        chunk = ts[page:page + 24]
        tiles = []
        for t in chunk:
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', v, '-frames:v', '1', '-vf', f'scale={W}:{int(W * 9 / 16)}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
            im = Image.frombytes('RGB', (W, int(W * 9 / 16)), raw) if len(raw) == W * int(W * 9 / 16) * 3 else Image.new('RGB', (W, int(W * 9 / 16)))
            d = ImageDraw.Draw(im)
            if safe:
                av, sb = safe['avatar'], safe['subtitle']
                d.ellipse([av['x'] * k, av['y'] * k, (av['x'] + av['w']) * k, (av['y'] + av['h']) * k], outline=(230, 60, 60))
                d.rectangle([sb['x'] * k, sb['y'] * k, (sb['x'] + sb['w']) * k, (sb['y'] + sb['h']) * k], outline=(230, 60, 60))
            tiles.append((t, im))
        rows = (len(tiles) + a.cols - 1) // a.cols
        h = int(W * 9 / 16)
        sheet = Image.new('RGB', (a.cols * (W + 8) + 8, rows * (h + 30) + 8), (36, 38, 44))
        for i, (t, im) in enumerate(tiles):
            x, y = 8 + (i % a.cols) * (W + 8), 8 + (i // a.cols) * (h + 30)
            sheet.paste(im, (x, y + 24))
            ImageDraw.Draw(sheet).text((x, y + 2), f'{t:.2f}s', fill=(235, 235, 235), font=font)
        os.makedirs(os.path.join(P, 'out', 'qa'), exist_ok=True)
        o = os.path.join(P, 'out', 'qa', f'contact-{os.path.splitext(os.path.basename(v))[0]}-{page // 24}.jpg')
        sheet.save(o, quality=85)
        outs.append(o)
    print('\n'.join(outs))


if __name__ == '__main__':
    main()
