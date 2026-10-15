#!/usr/bin/env python3
"""SRT → segments.json（整个工程唯一的时间数据源）+ 替换对照表。

用法
  # 1) 列出每句字幕的帧号，读懂视频、挑段落用
  python3 srt_segments.py list --srt 视频.srt [--video 母版.mov] [--fps 30]

  # 2) 按选定的区间生成 segments.json 和 替换对照表.txt
  python3 srt_segments.py build --srt 视频.srt [--video 母版.mov] \
      --seg "00:00:00-00:16:00=开场" --seg "03:23:06-03:32:15=Case01耳机官网|01" ... \
      --out <工程>/src/segments.json [--table <素材目录>/替换对照表.txt]

时间写法（区间两端都可以用）
  mm:ss:ff        分:秒:帧（剪辑软件常用，帧按 fps 计）   03:23:06
  HH:MM:SS:FF     时:分:秒:帧                              00:03:23:06
  HH:MM:SS,mmm    SRT 写法                                  00:03:23,200
  f6096           直接写帧号
区间是 [起点, 终点)：终点那一帧属于后面的原片。
"""
import argparse
import json
import os
import re
import subprocess
import sys

VIDEO_EXT = ('.mov', '.mp4', '.mkv', '.m4v')


def parse_srt(path):
    txt = open(path, encoding='utf-8-sig').read().replace('\r\n', '\n').strip()
    cues = []
    for block in re.split(r'\n\s*\n', txt):
        lines = block.strip().split('\n')
        if len(lines) < 2:
            continue
        m = re.match(r'(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)', lines[1])
        if not m:
            continue
        g = list(map(int, m.groups()))
        start = g[0] * 3600000 + g[1] * 60000 + g[2] * 1000 + g[3]
        end = g[4] * 3600000 + g[5] * 60000 + g[6] * 1000 + g[7]
        cues.append({'n': int(lines[0]), 'startMs': start, 'endMs': end, 'text': ' '.join(lines[2:]).strip()})
    return cues


def probe(video):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration', '-of', 'json', video],
        capture_output=True, text=True, check=True,
    ).stdout
    s = json.loads(out)['streams'][0]
    num, den = map(int, s['r_frame_rate'].split('/'))
    fps = num / den
    frames = int(s.get('nb_frames') or round(float(s['duration']) * fps))
    return {'fps': fps, 'width': int(s['width']), 'height': int(s['height']), 'frames': frames}


def find_video(srt):
    stem = os.path.splitext(srt)[0]
    for ext in VIDEO_EXT:
        for cand in (stem + ext, stem + ext.upper()):
            if os.path.exists(cand):
                return cand
    return None


def srt_time(ms):
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def mmssff(f, fps):
    fps = round(fps)
    return f'{f // (60 * fps):02d}:{f // fps % 60:02d}:{f % fps:02d}'


def to_frame(s, fps):
    s = s.strip()
    if s.startswith('f'):
        return int(s[1:])
    m = re.fullmatch(r'(\d+):(\d+):(\d+)[,.](\d+)', s)
    if m:
        h, mi, se, ms = map(int, m.groups())
        return round((h * 3600 + mi * 60 + se + ms / 1000) * fps)
    parts = list(map(int, s.split(':')))
    if len(parts) == 3:  # mm:ss:ff
        mi, se, ff = parts
        return round((mi * 60 + se) * fps) + ff
    if len(parts) == 4:  # HH:MM:SS:FF
        h, mi, se, ff = parts
        return round((h * 3600 + mi * 60 + se) * fps) + ff
    raise ValueError(f'看不懂的时间：{s}')


def ms_of(f, fps):
    return round(f * 1000 / fps)


def safe_title(t):
    return re.sub(r'[\\/:*?"<>|\s]+', '', t)


def cmd_list(a):
    cues = parse_srt(a.srt)
    video = a.video or find_video(a.srt)
    info = probe(video) if video else None
    fps = a.fps or (info['fps'] if info else 30)
    if info:
        print(f'# 母版 {video}  {info["width"]}x{info["height"]}  {fps:g}fps  {info["frames"]} 帧')
    else:
        print(f'# 没找到母版视频，按 {fps:g}fps 计算')
    print(f'# 共 {len(cues)} 句。列：条号 | 起始帧 | 分:秒:帧 | SRT 起点 | 文本')
    for c in cues:
        f = round(c['startMs'] * fps / 1000)
        print(f"{c['n']:>4} | f{f:<6} | {mmssff(f, fps)} | {srt_time(c['startMs'])} | {c['text']}")


def cmd_build(a):
    cues = parse_srt(a.srt)
    video = a.video or find_video(a.srt)
    info = probe(video) if video else None
    fps = a.fps or (info['fps'] if info else 30)
    if abs(fps - round(fps)) > 0.01:
        sys.exit(f'母版是 {fps}fps（非整数帧率）。本工具按整数帧率设计，先确认要按多少 fps 制作，再用 --fps 指定。')
    fps = round(fps)
    segs = []
    for i, spec in enumerate(a.seg):
        rng, _, title = spec.partition('=')
        a_s, b_s = re.split(r'\s*[-~]\s*(?=f?\d)', rng.strip(), maxsplit=1)
        fa, fb = to_frame(a_s, fps), to_frame(b_s, fps)
        if fb <= fa:
            sys.exit(f'区间终点不在起点之后：{spec}')
        if info and fb > info['frames']:
            sys.exit(f'区间超出母版长度（{info["frames"]} 帧）：{spec}')
        A, B = ms_of(fa, fps), ms_of(fb, fps)
        inside = [c for c in cues if c['endMs'] > A and c['startMs'] < B]
        if not inside:
            sys.exit(f'这个区间里没有字幕：{spec}')
        title, _, chip = title.partition('|')
        title = title.strip() or f'段落{i}'
        chip = chip.strip() or title[:4]
        name = f"{i}_{safe_title(title)}_{srt_time(A).replace(':', '-')}~{srt_time(B).replace(':', '-')}_字幕{inside[0]['n']}-{inside[-1]['n']}"
        segs.append({
            'key': f'seg{i}',
            'index': i,
            'title': title,
            'chip': chip,  # 顶部导航里显示的短名
            'from': fa,
            'to': fb,
            'frames': fb - fa,
            'mmssff': [mmssff(fa, fps), mmssff(fb, fps)],
            'srt': [srt_time(A), srt_time(B)],
            'cueRange': [inside[0]['n'], inside[-1]['n']],
            'outName': name,
            # at / end：段内帧号（相对 from），at 可能为负（句子在区间开始前就开口了）
            'cues': [
                {'n': c['n'], 'at': round(c['startMs'] * fps / 1000) - fa, 'end': round(c['endMs'] * fps / 1000) - fa, 'text': c['text']}
                for c in inside
            ],
            # 段内换页帧号，配乐会在这些点前停一拍并加轻上升音；做分镜时填写
            'breaks': [],
        })
    data = {
        'fps': fps,
        'width': info['width'] if info else 3840,
        'height': info['height'] if info else 2160,
        'masterFrames': info['frames'] if info else None,
        'master': os.path.abspath(video) if video else None,
        'srt': os.path.abspath(a.srt),
        'segments': segs,
    }
    if a.out and os.path.exists(a.out) and not a.force:
        old = json.load(open(a.out, encoding='utf-8'))
        for s in segs:  # 保留已填写的 breaks
            for o in old.get('segments', []):
                if o.get('from') == s['from'] and o.get('to') == s['to']:
                    s['breaks'] = o.get('breaks', [])
    out = json.dumps(data, ensure_ascii=False, indent=2)
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        open(a.out, 'w', encoding='utf-8').write(out)
        print('写入', a.out)
    else:
        print(out)
    if a.table:
        write_table(data, a.table)
        print('写入', a.table)


def write_table(data, path):
    fps = data['fps']
    lines = [
        '包装片段 · 替换对照表', '',
        '用法：把每个 mp4 的入点对齐到"SRT 起点"，覆盖视频轨直到"SRT 终点"。',
        f'时间与 {os.path.basename(data["srt"])} 同一时间轴；终点是开区间（终点那一帧属于后面的原片）。',
        f'帧号按 {fps}fps 计算。成片音频只有配乐 + 音效，口播留在原音轨。', '',
    ]
    for s in data['segments']:
        c0, c1 = s['cues'][0], s['cues'][-1]
        lines += [
            f'■ {s["outName"]}',
            f'   SRT 起点 {s["srt"][0]}  →  SRT 终点 {s["srt"][1]}   时长 {s["frames"] / fps:.3f}s',
            f'   分:秒:帧 {s["mmssff"][0]} → {s["mmssff"][1]}    帧 {s["from"]} – {s["to"]}（共 {s["frames"]} 帧）',
            f'   覆盖字幕 #{c0["n"]} – #{c1["n"]}',
            f'     首句 #{c0["n"]} {c0["text"]}' + ('  ← 这句在区间开始前已经开口' if c0['at'] < 0 else ''),
            f'     末句 #{c1["n"]} {c1["text"]}' + ('  ← 这句在区间结束后才说完' if c1['end'] > s['frames'] else ''),
            '',
        ]
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    open(path, 'w', encoding='utf-8').write('\n'.join(lines))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    for name in ('list', 'build'):
        q = sub.add_parser(name)
        q.add_argument('--srt', required=True)
        q.add_argument('--video', help='母版视频；不写时找 SRT 同名的视频文件')
        q.add_argument('--fps', type=float, help='覆盖帧率（默认读母版，读不到按 30）')
        if name == 'build':
            q.add_argument('--seg', action='append', required=True, help='"起点-终点=标题|导航短名"，可重复；短名可省')
            q.add_argument('--out', help='segments.json 输出路径')
            q.add_argument('--table', help='替换对照表输出路径')
            q.add_argument('--force', action='store_true', help='不保留旧文件里已填写的 breaks')
    a = p.parse_args()
    {'list': cmd_list, 'build': cmd_build}[a.cmd](a)


if __name__ == '__main__':
    main()
