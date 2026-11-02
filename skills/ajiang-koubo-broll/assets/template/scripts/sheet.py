# 拼图：python3 sheet.py out.jpg a.png b.png ...（每张标时间；画头像/字幕安全区虚框，数值读 src/data/meta.json）
import sys, os, re, json
from PIL import Image, ImageDraw, ImageFont
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
W = 960; cols = 2 if len(ims) > 1 else 1
th = [im.resize((W, int(im.height * W / im.width))) for im in ims]
h = th[0].height; rows = (len(th) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W + (cols + 1) * 12, rows * (h + 40) + 12), (40, 42, 48))
try: font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
except Exception: font = ImageFont.load_default()
k = W / 1920
try:
    SAFE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'meta.json')))['safe']
except Exception:
    SAFE = {'avatar': {'x': 1690, 'y': 30, 'w': 200, 'h': 200}, 'subtitle': {'x': 360, 'y': 966, 'w': 1200, 'h': 64}}
av, sb = SAFE['avatar'], SAFE['subtitle']
for i, (im, f) in enumerate(zip(th, files)):
    x = 12 + (i % cols) * (W + 12); y = 12 + (i // cols) * (h + 40)
    d = ImageDraw.Draw(im)
    d.ellipse([av['x'] * k, av['y'] * k, (av['x'] + av['w']) * k, (av['y'] + av['h']) * k], outline=(230, 60, 60), width=2)
    d.rectangle([sb['x'] * k, sb['y'] * k, (sb['x'] + sb['w']) * k, (sb['y'] + sb['h']) * k], outline=(230, 60, 60), width=2)
    sheet.paste(im, (x, y + 30))
    m = re.search(r'-([0-9.]+)\.png$', f)
    ImageDraw.Draw(sheet).text((x, y + 4), f"t = {m.group(1) if m else os.path.basename(f)} s", fill=(235, 235, 235), font=font)
sheet.save(out, quality=88)
