#!/usr/bin/env python3
"""交付检查：python3 check.py --project <工程> [seg0 seg3 ...] [--fix-peak] [--no-ends]

逐段核对 out/final 与 out/final-nobgm：
  - 文件名 = timing.json 的 outName（SRT 毫秒时间 + 字幕条号），分辨率 = meta.output，帧率 = meta.fps，帧数 = 区间帧数
  - 带配乐版：积分响度比口播低 14–18 LU（目标 16）；两版真峰值 ≤ −14 dBTP（--fix-peak：超标的用 alimiter 限幅重封装，画面不动）
  - 段尾干净：每段最后一帧应该是「空舞台」（同一张背景）。以各段首帧 + 末帧的中位图为空舞台参照，残留内容的段会被标出来
    （第 3 期审片：seg1、seg7 末帧还剩 5–10% 内容，首尾相接时会跳一帧）
  - 段首接缝亮度：每段首帧和上一段末帧的平均亮度（Y，0–255）差 > 3 就标出来
    （第 4 期：seg6/7/11 首帧亮度 23–26，上一段末帧约 10.8，剪映里接缝处会闪一下）
脚本只能证明这些；画面好不好看、声音大小合不合适，要看拼图、要人听。没试听就说没试听。
"""
import argparse
import json
import os
import re
import subprocess
import sys

import numpy as np

SEAM_DY = 3  # 段首接缝：首帧与上一段末帧的平均亮度差上限（0–255）


def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries',
                        'stream=width,height,r_frame_rate,nb_read_packets', '-of', 'json', p], capture_output=True, text=True)
    return json.loads(r.stdout)['streams'][0]


def loud(p):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', p, '-vn', '-af', 'loudnorm=print_format=summary', '-f', 'null', '-'], capture_output=True, text=True).stderr
    g = lambda k: float(re.search(k + r':\s+([-\d.inf]+)', r).group(1))
    return g('Input Integrated'), g('Input True Peak')


def grab(p, last):
    """首帧 / 真正的最后一帧 → 384×216 灰度（0–255 全范围）。末帧：解码最后 0.2s，取最后一张。"""
    n = 384 * 216
    if last:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-sseof', '-0.2', '-i', p, '-vf', 'scale=384:216,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
        raw = raw[len(raw) // n * n - n:len(raw) // n * n] if len(raw) >= n else b''
    else:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-frames:v', '1', '-vf', 'scale=384:216,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).astype(np.float32) if len(raw) == n else None


def suggest_trim(P, k, voice, M):
    """按 out/tmp/<seg>-sfx.wav（只有音效的那条）估一个 mix.json trim：让 配乐(口播−16) + 音效 ≈ 口播−15.5 LU。"""
    w = os.path.join(P, 'out', 'tmp', f'{k}-sfx.wav')
    if not os.path.exists(w):
        return None
    Is, tps = loud(w)
    if Is == float('-inf'):
        return None
    Ib = voice - M.get('bgmBelowVoice', 16)
    want = voice - 15.5
    room = 10 ** (want / 10) - 10 ** (Ib / 10)
    target_s = 10 * np.log10(room) if room > 0 else Ib - 6
    g = 10 ** ((min(target_s - Is, -14 - tps)) / 20)
    mix = json.load(open(os.path.join(P, 'src', 'data', 'mix.json')))
    cur = mix.get('trim', {}).get(k, 1)
    return f'建议 mix.json trim.{k} ≈ {cur * g:.2f}（再 reaudio）'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', default='.')
    ap.add_argument('segs', nargs='*')
    ap.add_argument('--fix-peak', action='store_true')
    ap.add_argument('--no-ends', action='store_true', help='跳过段尾空舞台和段首接缝亮度两项（只看规格和响度）')
    a = ap.parse_args()
    P = os.path.abspath(a.project)
    T = json.load(open(os.path.join(P, 'src', 'data', 'timing.json')))['segments']
    M = json.load(open(os.path.join(P, 'src', 'data', 'meta.json')))
    voice, ow, oh, fps = M['voiceLUFS'], M['output']['w'], M['output']['h'], M['fps']
    keys = a.segs or list(T)
    ok = True
    ends = {}
    for d, with_bgm in (('out/final', True), ('out/final-nobgm', False)):
        print(f'== {d}')
        for k in keys:
            s = T[k]
            p = os.path.join(P, d, f"{s['outName']}.mp4")
            if not os.path.exists(p):
                print(f'  ✗ {k} 缺文件 {os.path.basename(p)}')
                ok = False
                continue
            v = probe(p)
            n = int(v['nb_read_packets'])
            I, tp = loud(p)
            if tp > -14 and a.fix_peak:
                tmp = p + '.tmp.mp4'
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, '-c:v', 'copy', '-af', 'alimiter=limit=0.18:attack=2:release=60:level=disabled', '-c:a', 'aac', '-b:a', '320k', tmp], check=True)
                os.replace(tmp, p)
                I, tp = loud(p)
            below = voice - I
            problems = []
            if (v['width'], v['height']) != (ow, oh):
                problems.append(f"尺寸 {v['width']}x{v['height']}")
            if v['r_frame_rate'] != f'{fps}/1':
                problems.append(f"帧率 {v['r_frame_rate']}")
            if n != s['frames']:
                problems.append(f"帧数 {n}≠{s['frames']}")
            if tp > -14:
                problems.append(f'真峰值 {tp:.1f}>-14')
            if with_bgm and not (14 <= below <= 18):
                problems.append(f'比口播低 {below:.1f} LU（要 14–18）')
            if with_bgm and problems and any('LU' in x or '峰值' in x for x in problems):
                sug = suggest_trim(P, k, voice, M)
                if sug:
                    problems.append(sug)
            flag = '✓' if not problems else '✗'
            ok &= not problems
            print(f"  {flag} {k} {v['width']}x{v['height']} {v['r_frame_rate']} 帧 {n}/{s['frames']}  {I:.1f} LUFS（低于口播 {below:.1f} LU）峰 {tp:.1f} dBTP  {'；'.join(problems)}")
            if with_bgm and not a.no_ends:
                f0, f1 = grab(p, False), grab(p, True)
                if f0 is not None and f1 is not None:
                    ends[k] = (f0, f1)
    if ends:
        # 空舞台参照 = 所有段首帧 + 末帧的逐像素中位数（段首 0.3s 内容才入场，首帧本该是空舞台，所以多数帧是干净的）。
        # 判据：末帧里和参照差 >24 灰阶的像素占比 >0.05% 就算有残留（合稿实测：残留一行 96px 标题 ≈ 1%，干净段 0%）。
        ref = np.median(np.stack([f for pair in ends.values() for f in pair]), axis=0)
        print('== 段尾是否回到空舞台（末帧与空舞台参照不同的像素占比，>0.05% 算残留）')
        for k, (f0, f1) in ends.items():
            frac = float((np.abs(f1 - ref) > 24).mean() * 100)
            flag = '✓' if frac <= 0.05 else '✗'
            ok &= frac <= 0.05
            print(f'  {flag} {k} 末帧残留 {frac:.2f}%' + ('' if frac <= 0.05 else '（最后 2–4 帧要是纯空舞台：最后一个 Shot 用 fade，to ≈ 段长 + outDur/2 − 0.1）'))
    if ends:
        # 接缝亮度：上一段（按 timing 顺序，不管有没有在这次的段名里）末帧 vs 这一段首帧
        order = list(T)
        print(f'== 段首接缝亮度（首帧 vs 上一段末帧的平均亮度 Y，差 >{SEAM_DY:g} 剪映里会闪）')
        for k in keys:
            i = order.index(k)
            if i == 0 or k not in ends:
                continue
            pk = order[i - 1]
            prev_last = ends[pk][1] if pk in ends else grab(os.path.join(P, 'out/final', f"{T[pk]['outName']}.mp4"), True)
            if prev_last is None:
                print(f'  ? {k} 读不到上一段 {pk} 的末帧')
                continue
            y0, y1 = float(ends[k][0].mean()), float(prev_last.mean())
            good = abs(y0 - y1) <= SEAM_DY
            ok &= good
            print(f'  {"✓" if good else "✗"} {pk}→{k} 上段末帧 {y1:.1f} / 首帧 {y0:.1f}（差 {y0 - y1:+.1f}）' +
                  ('' if good else '：段首背景 0.3–0.5s 内从空舞台淡入（首帧必须就是空舞台，别一上来就是亮的面板/背景图）'))
    print('全部通过' if ok else '有未通过项')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
