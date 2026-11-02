# 量坐标：python3 scripts/grid.py <截图> <x0> <y0> <x1> <y1> <输出.jpg> [--step=50] [--px]
# 默认坐标是页面 CSS px（= 像素/2，适用于 2x 网页截图）；--px 表示用原图像素（user-report 等非 2x 图）。
# 输出一张带网格和刻度的裁切图（宽 ≤1000），用 Read 看它读坐标。
import sys
from PIL import Image, ImageDraw
a = [x for x in sys.argv[1:] if not x.startswith('--')]
opt = dict(x[2:].split('=') if '=' in x else (x[2:], '1') for x in sys.argv[1:] if x.startswith('--'))
src, x0, y0, x1, y1, out = a[0], *map(float, a[1:5]), a[5]
step = float(opt.get('step', 50)); u = 1 if 'px' in opt else 2
im = Image.open(src).convert('RGB').crop((int(x0 * u), int(y0 * u), int(x1 * u), int(y1 * u)))
s = min(1.0, 1000 / im.width); im = im.resize((int(im.width * s), int(im.height * s)))
d = ImageDraw.Draw(im); k = u * s
v = (int(x0 // step) + 1) * step
while v < x1:
    X = (v - x0) * k; d.line([(X, 0), (X, im.height)], fill=(255, 60, 60) if v % (step * 2) == 0 else (255, 170, 170)); d.text((X + 2, 2), str(int(v)), fill=(200, 0, 0)); v += step
v = (int(y0 // step) + 1) * step
while v < y1:
    Y = (v - y0) * k; d.line([(0, Y), (im.width, Y)], fill=(255, 60, 60) if v % (step * 2) == 0 else (255, 170, 170)); d.text((2, Y + 2), str(int(v)), fill=(200, 0, 0)); v += step
im.save(out, quality=88); print(out, im.size)
