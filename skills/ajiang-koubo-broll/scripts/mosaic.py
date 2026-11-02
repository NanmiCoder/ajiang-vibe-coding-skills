#!/usr/bin/env python3
"""二维码 / 隐私打码：直接改源图（原图备份到 out/orig-mosaic/），所有用到这张图的镜头一起变成马赛克，不用改任何镜头代码。
需要 OpenCV：uv run --with opencv-python-headless --with pillow --with numpy python mosaic.py ...

隐私三道关（第 3 期是用户自己在预览里发现二维码的，所以绝不能排在预览之后）：
  ① 素材入库：每截一批 / 每拷一张用户图，就扫  public/：
       mosaic.py --project <工程> --scan
  ② 发预览页之前再扫一遍（preview_page.py 会检查 out/privacy-scan.json 比所有图片新、且没有未处理的命中）
  ③ 4K 成片抽帧复核（每 2 秒一帧，扫出二维码就是漏了）：
       mosaic.py --project <工程> --frames out/final/*.mp4 [--every 2]

其它用法：
  mosaic.py --project <工程> --scan <目录或图片...>               # 扫任意目录/图片（不写戳）
  mosaic.py --project <工程> public/st/x.jpg --auto                # 自动框二维码并打码
  mosaic.py --project <工程> public/st/x.jpg 2185 304 2499 617     # 手动框（原图像素，scripts/grid.py --px 量）
  mosaic.py --project <工程> --restore public/st/x.jpg             # 还原
扫描结果的退出码：0 = 没扫到；2 = 扫到了（要处理）。
扫不出 ≠ 没有：花式 / 带 logo / 低对比的码会漏，邮箱、手机号、Key、消费额这类文字隐私根本扫不到，必须人眼过一遍。
"""
import argparse
import json
import sys
import time
import glob
import os
import shutil

from PIL import Image

Image.MAX_IMAGE_PIXELS = None


def detect(path):
    """标准检测器 + Aruco 检测器各跑一遍（第 3 期交流群弹层的二维码标准检测器认不出，Aruco 能认出），多尺度，合并去重。"""
    import cv2
    im = cv2.imread(path)
    if im is None:
        return []
    dets = [cv2.QRCodeDetector()] + ([cv2.QRCodeDetectorAruco()] if hasattr(cv2, 'QRCodeDetectorAruco') else [])
    out = []
    for det in dets:
        for scale in (1.0, 0.5):
            img = im if scale == 1 else cv2.resize(im, None, fx=scale, fy=scale)
            try:
                ok, pts = det.detectMulti(img)
            except cv2.error:
                continue
            if ok and pts is not None:
                for q in pts:
                    xs, ys = q[:, 0] / scale, q[:, 1] / scale
                    b = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
                    if not any(abs(b[0] - o[0]) < 30 and abs(b[1] - o[1]) < 30 for o in out):
                        out.append(b)
                break
    return out


def pixelate(P, f, box, cells):
    bkdir = os.path.join(P, 'out', 'orig-mosaic')
    os.makedirs(bkdir, exist_ok=True)
    bk = os.path.join(bkdir, os.path.relpath(f, P).replace('/', '__'))
    if not os.path.exists(bk):
        shutil.copy(f, bk)
    im = Image.open(f).convert('RGB')
    pad = 6
    x0, y0, x1, y1 = box
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad + 1), min(im.height, y1 + pad + 1)
    w, h = x1 - x0, y1 - y0
    reg = im.crop((x0, y0, x1, y1)).resize((cells, max(1, round(cells * h / w))), Image.BOX).resize((w, h), Image.NEAREST)
    im.paste(reg, (x0, y0))
    im.save(f, quality=95)
    print('mosaic', os.path.relpath(f, P), (x0, y0, x1, y1), '备份', os.path.relpath(bk, P))


def scan_files(files, P):
    hits = {}
    for f in sorted(files):
        q = detect(f)
        if q:
            hits[os.path.relpath(f, P)] = q
            print('二维码', os.path.relpath(f, P), q)
    return hits


def images_under(paths):
    out = []
    for x in paths:
        if os.path.isdir(x):
            out += [f for ext in ('jpg', 'jpeg', 'png', 'webp') for f in glob.glob(os.path.join(x, '**', f'*.{ext}'), recursive=True)]
        elif os.path.isfile(x):
            out.append(x)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', default='.')
    ap.add_argument('image', nargs='*', help='图片（打码/还原时）或要扫的目录/图片（--scan 时）')
    ap.add_argument('--auto', action='store_true')
    ap.add_argument('--scan', action='store_true')
    ap.add_argument('--frames', nargs='+', help='成片 mp4：每 --every 秒抽一帧扫二维码（第三道关）')
    ap.add_argument('--every', type=float, default=2.0)
    ap.add_argument('--restore', action='store_true')
    ap.add_argument('--cells', type=int, default=9, help='马赛克格数（越小越碎，9 已扫不出）')
    a = ap.parse_args()
    P = os.path.abspath(a.project)
    if a.frames:
        import subprocess, tempfile
        tmp = tempfile.mkdtemp(prefix='qrframes-', dir=os.path.join(P, 'out') if os.path.isdir(os.path.join(P, 'out')) else None)
        files = []
        for v in a.frames:
            stem = os.path.splitext(os.path.basename(v))[0][:40].replace(' ', '_')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', v, '-vf', f'fps=1/{a.every}', '-q:v', '3', os.path.join(tmp, f'{stem}-%04d.jpg')], check=True)
            files += glob.glob(os.path.join(tmp, f'{stem}-*.jpg'))
        hits = scan_files(files, P)
        print(f'成片抽帧 {len(files)} 张：' + ('没扫到二维码' if not hits else f'{len(hits)} 帧扫到二维码 → 回源图打码、重渲受影响的段'))
        if not hits:
            shutil.rmtree(tmp, ignore_errors=True)
        sys.exit(2 if hits else 0)
    if a.scan:
        targets = [os.path.abspath(x) for x in a.image] or [os.path.join(P, 'public')]
        files = images_under(targets)
        hits = scan_files(files, P)
        print(f'扫了 {len(files)} 张图：' + ('没扫到二维码' if not hits else f'{len(hits)} 张有二维码 → mosaic.py <图> --auto（认不出就手动框）'))
        print('扫不出的不等于没有：用户提供的海报/报告卡/群弹窗、邮箱/手机号/Key/消费额要人眼再看一遍')
        if not a.image:  # 扫的是工程 public/：写戳，preview_page.py 发预览前会查它
            os.makedirs(os.path.join(P, 'out'), exist_ok=True)
            json.dump({'time': time.time(), 'files': len(files), 'hits': hits}, open(os.path.join(P, 'out', 'privacy-scan.json'), 'w'), ensure_ascii=False, indent=1)
        sys.exit(2 if hits else 0)
    if not a.image:
        raise SystemExit('给一张图：mosaic.py --project <工程> public/st/x.jpg --auto')
    f = os.path.abspath(os.path.join(P, a.image[0]) if not os.path.isabs(a.image[0]) else a.image[0])
    if a.restore:
        bk = os.path.join(P, 'out', 'orig-mosaic', os.path.relpath(f, P).replace('/', '__'))
        shutil.copy(bk, f)
        print('已还原', f)
        return
    box = [int(x) for x in a.image[1:]]
    boxes = detect(f) if a.auto else [box]
    if not boxes or not boxes[0] or len(boxes[0]) != 4:
        raise SystemExit('没有框：--auto 没认出来就手动给 x0 y0 x1 y1（原图像素）')
    for b in boxes:
        pixelate(P, f, b, a.cells)
    print('打完重跑 --scan（更新戳），并用 affected.py 找出要重渲的段')


if __name__ == '__main__':
    main()
