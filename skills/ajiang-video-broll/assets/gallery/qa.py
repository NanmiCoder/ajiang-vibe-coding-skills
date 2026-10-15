"""单套模板自检：构建主题库到独立目录，用 headless Chrome 按若干时间点截演示画面，拼成一张图。

用法：python3 qa.py <主题id> <输出目录> [--times 0.8,2.2,3.8,5.0,6.6,7.8,9.2,11.5]
产出：<输出目录>/qa-<id>.jpg（每格左上角写时间），以及单帧 png。需要 PIL（pillow）和 Google Chrome。
"""
import os, subprocess, sys, argparse
HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')  # 非 macOS 用环境变量指定
ap = argparse.ArgumentParser(); ap.add_argument('id'); ap.add_argument('out')
ap.add_argument('--times', default=None)
ap.add_argument('--stress', action='store_true', help='用 stress.js（6 个场景、24 秒）代替演示内容')
a = ap.parse_args()
if not a.times: a.times = '1.5,3.8,5.6,7.8,9.6,11.8,14.0,15.8,18.0,19.8,22.0,23.8' if a.stress else '0.8,2.2,3.8,5.0,6.6,7.8,9.2,11.5'
out = os.path.abspath(a.out); os.makedirs(out, exist_ok=True)
subprocess.run([sys.executable, os.path.join(HERE, 'build.py'), out], check=True, stdout=subprocess.DEVNULL)
if a.stress:
    import shutil; shutil.copy(os.path.join(HERE, 'stress.js'), os.path.join(out, 'demo.js'))
page = os.path.join(out, 'qa.html')
open(page, 'w', encoding='utf-8').write('<meta charset="utf-8">' + open(os.path.join(out, 'index.html'), encoding='utf-8').read() +
    '<style>body{padding:0!important}.wrap>header,.wrap>section:not(.top),.info,.transport,.row{display:none!important}.top{display:block!important}'
    '.vp{position:fixed!important;left:0;top:0;width:1600px!important;border-radius:0!important}</style>')
shots = []
for t in a.times.split(','):
    png = os.path.join(out, f'{a.id}_{t}.png')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
                    '--window-size=1600,900', '--virtual-time-budget=12000', f'--screenshot={png}',
                    f'file://{page}?id={a.id}&t={t}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    shots.append((t, png))
from PIL import Image, ImageDraw
W, H = 800, 450
sheet = Image.new('RGB', (2 * W, ((len(shots) + 1) // 2) * H), 'white'); d = ImageDraw.Draw(sheet)
for i, (t, p) in enumerate(shots):
    im = Image.open(p).convert('RGB').crop((0, 0, 1600, 900)).resize((W, H))
    x, y = (i % 2) * W, (i // 2) * H
    sheet.paste(im, (x, y)); d.rectangle([x, y, x + 70, y + 24], fill='black'); d.text((x + 6, y + 5), f't={t}', fill='white')
dst = os.path.join(out, f'qa-{a.id}' + ('-stress' if a.stress else '') + '.jpg'); sheet.save(dst, quality=85); print(dst)
