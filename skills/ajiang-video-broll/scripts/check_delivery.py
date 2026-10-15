#!/usr/bin/env python3
"""交付前检查，必要时拷贝到用户的素材目录。

  python3 check_delivery.py <工程目录> [--copy-to <素材目录>]

逐段检查 out/<outName>.mp4：
  - 文件名 = segments.json 的 outName（SRT 毫秒时间 + 字幕条号）
  - 帧数 = 区间帧数，分辨率 = 母版分辨率，帧率一致
  - 有音轨（配乐 + 音效）；和同区间口播比响度（用户定的：约低 16 dB，10 dB 嫌响）：
      低于口播 < 10 dB 报错，< 14 dB 警告；峰值 > 上限（默认 -14 dBFS）报错
      目标值优先读 src/broll/theme.json 的 sound.levels（below_voice_db / ceiling_dbfs）
全部通过才拷贝（连同 替换对照表.txt）。退出码非 0 表示有问题。
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys


def ffprobe(path, *args):
    return subprocess.run(['ffprobe', '-v', 'error', *args, path], capture_output=True, text=True).stdout.strip()


def loudness(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    i = re.findall(r'I:\s+(-?[\d.]+|-inf) LUFS', err)
    pk = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', err)
    f = lambda v: float('-inf') if v == '-inf' else float(v)
    return (f(i[-1]) if i else None), (f(pk[-1]) if pk else None)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('project')
    p.add_argument('--copy-to')
    a = p.parse_args()
    root = os.path.abspath(a.project)
    data = json.load(open(os.path.join(root, 'src', 'segments.json'), encoding='utf-8'))
    below, ceiling = 16.0, -14.0
    tj = os.path.join(root, 'src', 'broll', 'theme.json')
    if os.path.exists(tj):
        lv = json.load(open(tj, encoding='utf-8')).get('sound', {}).get('levels', {})
        below, ceiling = float(lv.get('below_voice_db', below)), float(lv.get('ceiling_dbfs', ceiling))
    warns = []
    ok = True
    files = []
    for s in data['segments']:
        mp4 = os.path.join(root, 'out', s['outName'] + '.mp4')
        tag = f"[{s['key']}] {s['outName']}"
        if not os.path.exists(mp4):
            print('✗', tag, '没有成片'); ok = False; continue
        files.append(mp4)
        v = ffprobe(mp4, '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_frames', '-of', 'csv=p=0').split(',')
        w, h, rate, n = int(v[0]), int(v[1]), v[2], int(v[3])
        num, den = map(int, rate.split('/'))
        probs = []
        if n != s['frames']:
            probs.append(f'帧数 {n} ≠ {s["frames"]}')
        if (w, h) != (data['width'], data['height']):
            probs.append(f'分辨率 {w}x{h} ≠ 母版 {data["width"]}x{data["height"]}')
        if abs(num / den - data['fps']) > 0.01:
            probs.append(f'帧率 {num / den:g} ≠ {data["fps"]}')
        has_audio = bool(ffprobe(mp4, '-select_streams', 'a', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0'))
        mi = mp = vi = None
        if not has_audio:
            probs.append('没有音轨')
        else:
            mi, mp = loudness(mp4)
            voice = os.path.join(root, 'public', 'footage', s['key'] + '.wav')
            if os.path.exists(voice):
                vi, _ = loudness(voice)
                if mi is not None and vi is not None:
                    gap = vi - mi
                    if gap < 10:
                        probs.append(f'配乐音效 {mi:.1f} LUFS 只比口播 {vi:.1f} 低 {gap:.1f} dB（目标 {below:g}，10 dB 用户嫌响）')
                    elif gap < below - 2:
                        warns.append(f'[{s["key"]}] 比口播低 {gap:.1f} dB，目标 {below:g}')
            if mp is not None and mp > ceiling + .5:
                probs.append(f'峰值 {mp:.1f} dBFS 偏高（≤ {ceiling:g}）')
        info = f"{n}帧 {w}x{h}" + (f" | 配乐音效 {mi:.1f} LUFS 峰值 {mp:.1f}" if mi is not None else '') + (f" | 口播 {vi:.1f} LUFS" if vi is not None else '')
        print('✓' if not probs else '✗', tag, '|', info)
        for q in probs:
            print('    -', q)
        ok = ok and not probs
    for w in warns:
        print('！', w)
    if a.copy_to:
        if not ok:
            print('\n有问题，没有拷贝。'); sys.exit(1)
        os.makedirs(a.copy_to, exist_ok=True)
        for f in files + [os.path.join(root, '替换对照表.txt')]:
            if os.path.exists(f):
                shutil.copy2(f, a.copy_to)
        print('\n已拷贝到', a.copy_to)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
