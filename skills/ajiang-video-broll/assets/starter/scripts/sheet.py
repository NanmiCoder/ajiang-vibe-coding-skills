# 把多张截图拼成一张对照图：python3 scripts/sheet.py out.jpg a.jpg b.jpg ...
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f) for f in files]
w, h = 960, 540
cols = 2
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    im = im.resize((w, h))
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y))
    d.rectangle([x, y, x + 260, y + 28], fill=(0, 0, 0))
    d.text((x + 6, y + 6), f.split('/')[-1], fill=(255, 255, 0))
sheet.save(out, quality=88)
