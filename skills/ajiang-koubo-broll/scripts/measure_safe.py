#!/usr/bin/env python3
"""从母版截一帧、缩到 1920×1080 设计坐标、画 50px 网格，用 Read 看图量头像圆和字幕行，再改 <工程>/src/data/meta.json 的 safe。
  python3 measure_safe.py <母版.mp4> <输出.jpg> [--at=30]
母版不是 16:9（如 3228×2160 录屏）时按 16:9 居中缩放示意；以用户在剪映里的实际摆放为准。
默认（第 3 期用户原话）：“右上角只用留一个很小的头像区域作为安全区，底部留一点位置我放字幕，但是也不用特别宽”
  → avatar {x:1690,y:30,w:200,h:200}，subtitle {x:360,y:966,w:1200,h:64}，要读的字底边 ≤ 930。
纯音频母版（没有头像画面）：沿用默认，并在交付说明里写明。"""
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
at = float(next((a.split('=')[1] for a in sys.argv[3:] if a.startswith('--at=')), 30))
tmp = os.path.join(tempfile.mkdtemp(), 'frame.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(at), '-i', src, '-frames:v', '1', tmp], check=True)
im = Image.open(tmp).convert('RGB')
k = min(1920 / im.width, 1080 / im.height)
fr = Image.new('RGB', (1920, 1080), (0, 0, 0))
sm = im.resize((round(im.width * k), round(im.height * k)))
fr.paste(sm, ((1920 - sm.width) // 2, (1080 - sm.height) // 2))
d = ImageDraw.Draw(fr)
for x in range(0, 1920, 50):
    d.line([(x, 0), (x, 1080)], fill=(255, 60, 60) if x % 100 == 0 else (255, 170, 170), width=1)
    if x % 200 == 0: d.text((x + 3, 3), str(x), fill=(255, 255, 0))
for y in range(0, 1080, 50):
    d.line([(0, y), (1920, y)], fill=(255, 60, 60) if y % 100 == 0 else (255, 170, 170), width=1)
    if y % 100 == 0: d.text((3, y + 3), str(y), fill=(255, 255, 0))
fr.save(out, quality=85); print(out)
