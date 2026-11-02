#!/usr/bin/env python3
"""生成给用户看的预览页（N 段首尾连播 + 每段镜头表 + 需要确认的事项），然后用 Artifact 发布。

  python3 preview_page.py --project <工程> [--data work/preview.json]

work/preview.json（总控写；没有就只用段落标题生成骨架）：
{
  "title": "第 N 期 B-roll", "eyebrow": "第 N 期 · <话题> · B-roll", "h1": "真实网页当主角，<em>推拉自然</em>",
  "lead": "一句话说明：预览带口播对节奏；成片 4K、不含口播；头像和字幕位置空着。",
  "asks": ["<b>访问量</b>：口播说……画面写……", "..."],          ← 事实口径、隐私处理、示意图、稿子与录音不一致处
  "notes": [["怎么做的", "..."], ["声音", "……还没逐条试听"]],
  "beats": {"seg0": [["0–8s", "画面在讲什么<span class=\\"tag\\">卡名</span>"], ...]}   ← 取自各章节 agent 回复里的镜头表
}
输出 preview/index.html + preview/v/segN.mp4（拷自 out/preview/）。
发布前两道检查（不过就不生成，除非显式加放行参数）：
  - 隐私：out/privacy-scan.json（mosaic.py --scan 写的）必须比 public/ 里所有图片新、且没有未处理的二维码命中；
    第 3 期是用户自己在预览里发现二维码的——预览页是隐私的第二道关，不是第一道。放行：--privacy-ok（写明为什么）
  - 新鲜度：预览视频必须比它依赖的代码 / lib / 数据 / 图片新（只看 SegN.tsx 不够：lib 或截图改了预览也过期）。
发布：Artifact(file_path=<工程>/preview/index.html, files={"v/seg0.mp4": "<工程>/preview/v/seg0.mp4", ...})；
改版重发同一个 file_path，链接不变。没有 Artifact 工具时：cd preview && python3 -m http.server 给本地地址。
"""
import argparse
import json
import glob
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', required=True)
    ap.add_argument('--data')
    ap.add_argument('--privacy-ok', help='跳过隐私戳检查（必须写理由，例如 "人工复核过，命中是误报"）')
    a = ap.parse_args()
    P = os.path.abspath(a.project)
    T = json.load(open(os.path.join(P, 'src', 'data', 'timing.json')))
    dp = a.data or os.path.join(P, 'work', 'preview.json')
    D = json.load(open(dp)) if os.path.exists(dp) else {}
    fps = T['fps']
    # 隐私第二道关
    imgs = [f for ext in ('jpg', 'jpeg', 'png', 'webp') for f in glob.glob(os.path.join(P, 'public', '**', f'*.{ext}'), recursive=True)]
    stamp_p = os.path.join(P, 'out', 'privacy-scan.json')
    stamp = json.load(open(stamp_p)) if os.path.exists(stamp_p) else None
    newest = max([os.path.getmtime(f) for f in imgs], default=0)
    problem = None
    if stamp is None:
        problem = '还没扫过二维码（out/privacy-scan.json 不存在）'
    elif stamp['time'] < newest - 1:
        problem = '有图片比上次扫描新：' + ', '.join(os.path.relpath(f, P) for f in imgs if os.path.getmtime(f) > stamp['time'] + 1)[:300]
    elif stamp.get('hits'):
        problem = '上次扫描还有二维码没处理：' + ', '.join(stamp['hits'])
    if problem and not a.privacy_ok:
        raise SystemExit('✗ 隐私检查没过，不生成预览页：' + problem + '\n  先跑：uv run --with opencv-python-headless --with pillow --with numpy python <skill>/scripts/mosaic.py --project . --scan\n  并用 Read 人眼过一遍截图（邮箱/Key/消费额/不该露的名字扫不出来）')
    if problem:
        print('⚠ 隐私检查被放行：', a.privacy_ok)
    os.makedirs(os.path.join(P, 'preview', 'v'), exist_ok=True)
    segs, stale, files = [], [], {}
    for k, s in T['segments'].items():
        src = os.path.join(P, 'out', 'preview', f'{k}.mp4')
        code = os.path.join(P, 'src', 'segs', f'Seg{k[3:]}.tsx')
        if os.path.exists(src):
            deps = [code] + glob.glob(os.path.join(P, 'src', 'segs', f'seg{k[3:]}', '**', '*'), recursive=True) \
                + glob.glob(os.path.join(P, 'src', 'lib', '*')) + [os.path.join(P, 'src', 'data', x) for x in ('timing.json', 'tokens.json', 'pages.json', 'mix.json')] \
                + glob.glob(os.path.join(P, 'public', 'st', '*')) + glob.glob(os.path.join(P, 'public', f'seg{k[3:]}', '**', '*'), recursive=True)
            if any(os.path.isfile(d) and os.path.getmtime(d) > os.path.getmtime(src) for d in deps):
                stale.append(k)
            shutil.copy2(src, os.path.join(P, 'preview', 'v', f'{k}.mp4'))
            files[f'v/{k}.mp4'] = os.path.join(P, 'preview', 'v', f'{k}.mp4')
        f0, f1 = s['from'], s['from'] + s['frames']
        t = lambda f: f'{f // (60 * fps):02d}:{f // fps % 60:02d}.{round((f % fps) * 1000 / fps):03d}'
        segs.append({'k': k, 't': s['title'], 'd': f'{t(f0)}–{t(f1)}', 's': s['seconds'], 'beats': D.get('beats', {}).get(k, [])})
    data = {'segs': segs, 'eyebrow': D.get('eyebrow', ''), 'h1': D.get('h1', 'B-roll 预览'), 'lead': D.get('lead', ''),
            'asks': D.get('asks', []), 'notes': D.get('notes', [])}
    html = open(os.path.join(HERE, '..', 'assets', 'preview', 'index.html')).read()
    try:  # 浅色配色跟本期 tokens 走
        c = json.load(open(os.path.join(P, 'src', 'data', 'tokens.json')))['color']
        line = (f"--bg:{c['bg']}; --surface:{c['surface']}; --ink:{c['ink']}; --muted:{c['muted']}; --line:{c['line']}; "
                f"--blue:{c['accent']}; --pale:{c['pale']}; --amber:{c['warn']}; --amber-bg:{c['warnBg']}; --green:{c['good']};")
        i = html.index('/*__TOKENS__*/')
        html = html[:i] + line + html[html.index('\n', i):]
    except Exception as e:
        print('（tokens 没注入预览页配色：', e, '）')
    html = html.replace('__TITLE__', D.get('title', 'B-roll 预览')).replace('/*__DATA__*/{}', json.dumps(data, ensure_ascii=False))
    open(os.path.join(P, 'preview', 'index.html'), 'w').write(html)
    print('preview/index.html 已生成；Artifact files 参数：')
    print(json.dumps(files, ensure_ascii=False, indent=1))
    if stale:
        print('⚠ 这些段的代码比预览视频新，先重渲预览：', ' '.join(stale))
    missing = [s['k'] for s in segs if f"v/{s['k']}.mp4" not in files]
    if missing:
        print('⚠ 缺预览视频：', ' '.join(missing), '（node scripts/preview.mjs segN --conc=4）')


if __name__ == '__main__':
    main()
