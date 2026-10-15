#!/usr/bin/env python3
"""把视频素材切成成片用的帧序列和预览用的小 mp4，并登记帧数。

  python3 extract_clips.py <工程> <素材.mp4> --name c03 [--in 14] [--out 25.1] [--fps 30]

  public/broll/frames/<name>/0001.jpg …   1920 宽，-q:v 4（Remotion 逐帧换图，渲染结果确定）
  broll/assets/clips/<name>.mp4             960 宽 H.264 无声（预览页用 <video>）
  src/broll/clips.json                      {"<name>": {"frames": N, "fps": 30, "src": …, "in": 14, "out": 25.1}}

场景里写 H.clip('<name>', off, inp)：off = 场景内第几秒开始播，inp = 从切好的片段第几秒开始。
两边都从 --in 切起，所以 inp 在预览和成片里含义一样。
"""
import argparse
import glob
import json
import os
import shutil
import subprocess


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('project')
    p.add_argument('src')
    p.add_argument('--name', required=True)
    p.add_argument('--in', dest='tin', type=float, default=0)
    p.add_argument('--out', dest='tout', type=float)
    p.add_argument('--fps', type=float)
    p.add_argument('--width', type=int, default=1920)
    a = p.parse_args()
    root = os.path.abspath(a.project)
    fps = a.fps or json.load(open(os.path.join(root, 'src', 'segments.json'), encoding='utf-8'))['fps']
    cut = ['-ss', f'{a.tin:.3f}'] + (['-to', f'{a.tout:.3f}'] if a.tout else [])
    fdir = os.path.join(root, 'public', 'broll', 'frames', a.name)
    if os.path.isdir(fdir):
        shutil.rmtree(fdir)
    os.makedirs(fdir)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *cut, '-i', a.src, '-vf', f'fps={fps},scale={a.width}:-2', '-q:v', '4',
                    os.path.join(fdir, '%04d.jpg')], check=True)
    n = len(glob.glob(os.path.join(fdir, '*.jpg')))
    mp4 = os.path.join(root, 'broll', 'assets', 'clips', f'{a.name}.mp4')
    os.makedirs(os.path.dirname(mp4), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *cut, '-i', a.src, '-vf', 'scale=960:-2', '-an', '-c:v', 'libx264', '-crf', '26',
                    '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], check=True)
    cj = os.path.join(root, 'src', 'broll', 'clips.json')
    clips = json.load(open(cj, encoding='utf-8')) if os.path.exists(cj) else {}
    clips[a.name] = {'frames': n, 'fps': fps, 'src': os.path.abspath(a.src), 'in': a.tin, 'out': a.tout}
    os.makedirs(os.path.dirname(cj), exist_ok=True)
    json.dump(clips, open(cj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{a.name}: {n} 帧 → {fdir}；预览 {mp4}（{os.path.getsize(mp4) / 1e6:.1f} MB）')


if __name__ == '__main__':
    main()
