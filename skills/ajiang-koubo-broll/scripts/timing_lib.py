"""SRT 解析、按章节切段、口播 ASR 逐字对齐 —— init_project.py 和 make_timing.py 共用。

时间约定
- 工程只有一条时间轴：精剪成片（SRT、ASR、母版视频必须是同一条剪后时间轴）。
- 段落区间 [from, to) 用帧号；每段 = 一个独立 composition，段内第 0 帧 = from。
- 字幕归属按「开口帧」落在哪一段（修正第 3 期 ms 取整把下一段首句也算进上一段末尾的问题）。
"""
import difflib
import json
import os
import re
import subprocess


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
    if not cues:
        raise SystemExit(f'SRT 里没有解析到字幕：{path}')
    return cues


def probe(master, fps=None):
    """母版信息。视频：取帧率 / 总帧数 / 尺寸；纯音频（mp3/wav/m4a，第 3 期一开始给的就是 mp3 + SRT）：
    没有帧率，按 fps（默认 60）和音频时长换算总帧数。返回 {'fps','avg_fps','width','height','frames','audio_only','duration'}。"""
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries',
         'format=duration:stream=codec_type,width,height,r_frame_rate,avg_frame_rate,nb_frames,duration,disposition',
         '-of', 'json', master], capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    dur = float(d.get('format', {}).get('duration') or 0)
    vids = [s for s in d.get('streams', []) if s.get('codec_type') == 'video' and not (s.get('disposition') or {}).get('attached_pic')]
    if not vids:  # 纯音频（mp3 封面图算 attached_pic，不当视频）
        if not dur:
            raise SystemExit(f'读不出时长：{master}')
        f = fps or 60
        return {'fps': f, 'avg_fps': f, 'width': None, 'height': None, 'frames': round(dur * f), 'audio_only': True, 'duration': dur}
    s = vids[0]
    num, den = map(int, s['r_frame_rate'].split('/'))
    an, ad = map(int, (s.get('avg_frame_rate') or s['r_frame_rate']).split('/'))
    rf = num / den
    use = fps or rf
    frames = int(s.get('nb_frames') or round(float(s.get('duration') or dur) * rf))
    if fps and abs(fps - rf) > 0.01:  # 用户指定了和母版不同的帧率：按时长换算
        frames = round(float(s.get('duration') or dur) * fps)
    return {'fps': use, 'src_fps': rf, 'avg_fps': an / ad if ad else rf, 'width': int(s['width']), 'height': int(s['height']),
            'frames': frames, 'audio_only': False, 'duration': float(s.get('duration') or dur)}


def srt_time(ms):
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def mmssff(f, fps):
    return f'{f // (60 * fps):02d}:{f // fps % 60:02d}:{f % fps:02d}'


def safe_title(t):
    return re.sub(r'[\\/:*?"<>|\s]+', '', t)


def to_frame(v, fps, cues):
    """章节起点：整数 = 字幕条号（从这条字幕开口处切）；'f123' = 帧号；'HH:MM:SS,mmm' = SRT 时间。"""
    if isinstance(v, int) or (isinstance(v, str) and v.isdigit()):
        n = int(v)
        hit = [c for c in cues if c['n'] == n]
        if not hit:
            raise SystemExit(f'没有第 {n} 条字幕')
        return round(hit[0]['startMs'] * fps / 1000)
    v = str(v).strip()
    if v.startswith('f'):
        return int(v[1:])
    m = re.fullmatch(r'(\d+):(\d+):(\d+)[,.](\d+)', v)
    if m:
        h, mi, se, ms = map(int, m.groups())
        return round((h * 3600 + mi * 60 + se + ms / 1000) * fps)
    raise SystemExit(f'看不懂的章节起点：{v}（写字幕条号、f帧号或 HH:MM:SS,mmm）')


def build_segments(cues, chapters, fps, total_frames):
    """chapters: [{"title": "开场", "start": 1}, ...]，按顺序首尾相接覆盖整片：第一段从 0 帧开始，最后一段到成片结尾。"""
    if not chapters:
        raise SystemExit('chapters 为空')
    starts = [0] + [to_frame(c['start'], fps, cues) for c in chapters[1:]]
    ends = starts[1:] + [total_frames]
    for i, (a, b) in enumerate(zip(starts, ends)):
        if b <= a:
            raise SystemExit(f'第 {i} 章的区间为空或倒序：{a}–{b}（检查 chapters 的 start 是否递增）')
    segs = []
    for i, (ch, fa, fb) in enumerate(zip(chapters, starts, ends)):
        inside = []
        for c in cues:
            f0 = round(c['startMs'] * fps / 1000)
            f1 = round(c['endMs'] * fps / 1000)
            first = (i == 0 and f0 < fa)  # 片头前的字幕并入第一段
            last = (i == len(chapters) - 1 and f0 >= fb)
            if fa <= f0 < fb or first or last:
                inside.append({'n': c['n'], 'at': f0 - fa, 'end': f1 - fa, 'text': c['text']})
        if not inside:
            raise SystemExit(f'第 {i} 章「{ch["title"]}」区间里没有字幕')
        A, B = round(fa * 1000 / fps), round(fb * 1000 / fps)
        title = ch['title'].strip()
        name = f"{i}_{safe_title(title)}_{srt_time(A).replace(':', '-')}~{srt_time(B).replace(':', '-')}_字幕{inside[0]['n']}-{inside[-1]['n']}"
        segs.append({
            'key': f'seg{i}', 'index': i, 'title': title, 'from': fa, 'to': fb, 'frames': fb - fa,
            'seconds': round((fb - fa) / fps, 3), 'mmssff': [mmssff(fa, fps), mmssff(fb, fps)],
            'srt': [srt_time(A), srt_time(B)], 'cueRange': [inside[0]['n'], inside[-1]['n']],
            'outName': name, 'cues': inside, 'brief': ch.get('brief', ''),
        })
    return segs


def align_chars(segs, asr, fps):
    """把每条字幕的每个字对到 ASR 的逐词时间上（difflib 全片字符串匹配；没命中的字在同一条字幕内线性插值）。
    返回 timing.json 结构和命中率。ASR 必须是精剪成片（同一时间轴）的转写。"""
    achars = []
    for s in asr.get('segments', []):
        for w in s.get('words', []) or []:
            t = (w.get('word') or '').strip()
            if not t:
                continue
            d = (w['end'] - w['start']) / max(len(t), 1)
            for i, ch in enumerate(t):
                achars.append((ch.lower(), w['start'] + i * d))
    out = {'fps': fps, 'segments': {}}
    allc = []
    for s in segs:
        base = s['from'] / fps
        cues = []
        for c in s['cues']:
            cues.append({'n': c['n'], 'start': round(c['at'] / fps, 3), 'end': round(c['end'] / fps, 3), 'text': c['text']})
            for i, ch in enumerate(c['text']):
                allc.append([s['key'], len(cues) - 1, i, ch, base + c['at'] / fps, base + c['end'] / fps, None])
        out['segments'][s['key']] = {k: s[k] for k in ('key', 'title', 'from', 'frames', 'seconds', 'outName')}
        out['segments'][s['key']]['cues'] = cues
    A = ''.join(a[0] for a in achars)
    B = ''.join(x[3].lower() for x in allc)
    offsets = []
    for b0, a0, n in difflib.SequenceMatcher(None, B, A, autojunk=False).get_matching_blocks():
        for k in range(n):
            x = allc[b0 + k]
            t = achars[a0 + k][1]
            if x[4] - 0.25 <= t <= x[5] + 0.25:
                x[6] = t
            offsets.append(t - x[4])
    hit = sum(1 for x in allc if x[6] is not None and not x[3].isspace())
    total = sum(1 for x in allc if not x[3].isspace())
    for s in segs:
        base = s['from'] / fps
        sd = out['segments'][s['key']]
        for ci, c in enumerate(sd['cues']):
            xs = [x for x in allc if x[0] == s['key'] and x[1] == ci]
            n = len(xs)
            times = [None if x[6] is None else x[6] - base for x in xs]
            known = [(i, t) for i, t in enumerate(times) if t is not None]
            res = []
            for i in range(n):
                if times[i] is not None:
                    res.append(times[i])
                    continue
                prev = [(j, t) for j, t in known if j < i]
                nxt = [(j, t) for j, t in known if j > i]
                p = prev[-1] if prev else (-1, c['start'])
                q = nxt[0] if nxt else (n, c['end'])
                res.append(p[1] + (q[1] - p[1]) * (i - p[0]) / (q[0] - p[0]))
            for i in range(1, n):
                if res[i] < res[i - 1]:
                    res[i] = res[i - 1]
            c['chars'] = [round(max(c['start'] - 0.2, min(c['end'], t)), 3) for t in res]
    offsets.sort()
    med = offsets[len(offsets) // 2] if offsets else None
    return out, hit, total, med


def write_table(segs, fps, srt_name, path):
    lines = ['B-roll 成片 · 替换对照表', '',
             '用法：每个 mp4 的入点对齐到「SRT 起点」，盖住视频轨直到「SRT 终点」。各段首尾相接，正好铺满整条精剪。',
             f'时间与 {srt_name} 同一时间轴；终点是开区间（终点那一帧属于下一段）。帧号按 {fps}fps 计算。',
             '成片音频只有配乐 + 音效，口播留在原音轨。', '']
    for s in segs:
        c0, c1 = s['cues'][0], s['cues'][-1]
        lines += [f'■ {s["outName"]}',
                  f'   SRT 起点 {s["srt"][0]}  →  SRT 终点 {s["srt"][1]}   时长 {s["frames"] / fps:.3f}s',
                  f'   分:秒:帧 {s["mmssff"][0]} → {s["mmssff"][1]}    帧 {s["from"]} – {s["to"]}（共 {s["frames"]} 帧）',
                  f'   覆盖字幕 #{c0["n"]} – #{c1["n"]}',
                  f'     首句 #{c0["n"]} {c0["text"]}',
                  f'     末句 #{c1["n"]} {c1["text"]}', '']
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    open(path, 'w', encoding='utf-8').write('\n'.join(lines))
