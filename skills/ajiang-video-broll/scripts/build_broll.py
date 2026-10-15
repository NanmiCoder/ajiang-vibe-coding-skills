#!/usr/bin/env python3
"""把 broll/scenes.js 构建成预览页和 Remotion 引擎（同一份场景代码）。

  python3 build_broll.py <工程> [--theme sketch[:ochre]] [--preview | --remotion | --both]
                         [--title 标题] [--lead 说明] [--notes notes.html]

输入
  broll/scenes.js        var SEGS = {seg0:{label, scenes:[{name, cue|from, until|to, build(), update?, sfx?}]}, …}
                         场景用 BrollCore.H 的小工具写，资源路径写 __BASE__xxx（= broll/assets/xxx）
  broll/assets/          场景用到的图片、logo、svg（会同步到 preview/assets 和 public/broll）
  src/segments.json      时间唯一数据源；cue/until 按字幕原文查
  src/broll/theme.lock.json  {"theme": "paper-signal", "variant": "signal"}（--theme 会改写它）
  src/broll/clips.json   extract_clips.py 写的素材帧数
  broll/overlay.json     （可选）实测头像圆和字幕行，1920 坐标

输出
  --preview  preview/index.html + preview/files.json（Artifact 发布：file_path=preview/index.html，root=preview，files=files.json 的内容）
  --remotion src/broll/engine.js、style.ts、theme.json、timeline-<seg>.json；public/broll/ 同步 assets
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..'))
ENGINE = os.path.join(SKILL, 'assets', 'engine')
THEMES = os.path.join(SKILL, 'assets', 'themes')

# 414 期实测：头像圆 x1523–1858 y55–395，字幕一行 x410–1510 y905–965（1920 坐标）
DEFAULT_OVERLAY = {'avatar': {'x': 1523, 'y': 55, 'w': 335, 'h': 340}, 'subtitle': {'x': 410, 'y': 905, 'w': 1100, 'h': 60}}


def rd(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def wr(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


def load_themes():
    out = {}
    for d in sorted(os.listdir(THEMES)):
        j = os.path.join(THEMES, d, 'theme.json')
        if os.path.exists(j):
            t = json.loads(rd(j))
            t['_css'] = rd(os.path.join(THEMES, d, 'theme.css')) if os.path.exists(os.path.join(THEMES, d, 'theme.css')) else ''
            out[t['id']] = t
    return out


def parse_theme_arg(s, themes):
    tid, _, var = s.partition(':')
    if tid not in themes:
        sys.exit(f'没有主题 {tid}；可选：{", ".join(themes)}')
    vs = themes[tid]['variants']
    if not var:
        var = next((k for k, v in vs.items() if v.get('default')), next(iter(vs)))
    if var not in vs:
        sys.exit(f'主题 {tid} 没有变体 {var}；可选：{", ".join(vs)}')
    return tid, var


def strip_comments(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def scope_css(css, cls):
    """给主题 css 的每条顶层规则加 .th-<id> 前缀（主题 css 里不写 @media）。"""
    out = []
    for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', strip_comments(css)):
        sels = [f'.{cls} {s.strip()}' for s in sel.split(',') if s.strip()]
        out.append(','.join(sels) + '{' + body.strip() + '}')
    return '\n'.join(out)


def font_specs(theme):
    """theme.fonts → [(family, weight, italic)]，italic 主题同时取正体和斜体。"""
    specs = []
    for f in theme.get('fonts', {}).values():
        for w in f['weights']:
            specs.append((f['family'], int(w), False))
            if f.get('italic'):
                specs.append((f['family'], int(w), True))
    return sorted(set(specs))


def google_link(themes):
    fams = {}
    for t in themes.values():
        for fam, w, it in font_specs(t):
            fams.setdefault(fam, set()).add((1 if it else 0, w))
    parts = []
    for fam, tuples in sorted(fams.items()):
        q = fam.replace(' ', '+')
        if any(i for i, _ in tuples):
            parts.append(f'family={q}:ital,wght@' + ';'.join(f'{i},{w}' for i, w in sorted(tuples)))
        else:
            parts.append(f'family={q}:wght@' + ';'.join(str(w) for _, w in sorted(tuples)))
    return f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{"&".join(parts)}&display=swap">'


def layouts_src(ids):
    """默认版式 + 指定模板自己的 layouts.js（每套模板的构图和动效编排在这里）"""
    parts = [rd(os.path.join(ENGINE, 'layouts-default.js'))]
    for tid in ids:
        lp = os.path.join(THEMES, tid, 'layouts.js')
        if os.path.exists(lp):
            parts.append(f'/* ── 模板 {tid} ── */\n' + rd(lp))
    return '\n'.join(parts)


def segdata(segs_json):
    return {s['key']: {k: s[k] for k in ('key', 'title', 'frames', 'srt', 'cues')} for s in segs_json['segments']}


NODE_HARNESS = r"""
const fs = require('fs');
const [core, layouts, scenes, dataPath] = process.argv.slice(1);
globalThis.window = undefined;
const src = fs.readFileSync(core, 'utf8') + '\n' + fs.readFileSync(layouts, 'utf8') + '\n' + fs.readFileSync(scenes, 'utf8') + '\n;globalThis.__SEGS = SEGS;';
new Function(src)();
const D = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const out = {};
for (const k of Object.keys(__SEGS)) {
  if (!D.segdata[k]) throw new Error('scenes.js 里的 ' + k + ' 不在 segments.json 里');
  const s = BrollCore.resolve(__SEGS[k], D.segdata[k], D.fps);
  let prev = -1;
  for (const sc of s.scenes) {
    if (sc.from < prev - 1e-6) throw new Error(k + ' 场景顺序不对：' + sc.name);
    if (sc.to <= sc.from) throw new Error(k + ' 场景 ' + sc.name + ' 的 to ≤ from（' + sc.from + ' → ' + sc.to + '）');
    prev = sc.from;
  }
  s.scenes.forEach((sc, i) => { const nx = s.scenes[i + 1]; if (nx && nx.from - sc.to > 0.05) process.stderr.write('！' + k + ' 场景「' + sc.name + '」和下一场景之间空了 ' + (nx.from - sc.to).toFixed(2) + 's（只剩底纹）\n'); });
  const th = {id: D.theme}, ex = BrollCore.expand(s, th);  // use+data 的场景按模板展开，音效时间也跟着模板走
  out[k] = {label: s.label, dur: s.dur, scenes: ex.scenes.map(sc => ({name: sc.name, from: sc.from, to: sc.to, mood: sc.mood || null, use: sc.use || null, sfx: sc.sfx || []})),
            events: BrollCore.timeline(ex)};
}
process.stdout.write(JSON.stringify(out));
"""


def node_resolve(root, data):
    tmp = os.path.join(root, 'src', 'broll', '.resolve-data.json')
    wr(tmp, json.dumps(data, ensure_ascii=False))
    lay = os.path.join(root, 'src', 'broll', '.layouts.js')
    wr(lay, layouts_src([data.get('theme')] if data.get('theme') else []))
    r = subprocess.run(['node', '-e', NODE_HARNESS, os.path.join(ENGINE, 'broll-core.js'), lay, os.path.join(root, 'broll', 'scenes.js'), tmp],
                       capture_output=True, text=True)
    os.remove(tmp); os.remove(lay)
    if r.returncode:
        sys.exit('scenes.js 解析失败：\n' + r.stderr[-2000:])
    if r.stderr.strip():
        print(r.stderr.strip())
    return json.loads(r.stdout)


def sync_dir(src, dst, skip=()):
    """把 src 里的文件同步到 dst（只拷新的或变了的），返回同步的相对路径列表。skip = 跳过的顶层子目录。"""
    rels = []
    if not os.path.isdir(src):
        return rels
    for d, ds, fs in os.walk(src):
        if d == src:
            ds[:] = [x for x in ds if x not in skip]
        for f in fs:
            if f.startswith('.'):
                continue
            s = os.path.join(d, f)
            rel = os.path.relpath(s, src)
            t = os.path.join(dst, rel)
            if not os.path.exists(t) or os.path.getmtime(t) < os.path.getmtime(s) or os.path.getsize(t) != os.path.getsize(s):
                os.makedirs(os.path.dirname(t), exist_ok=True)
                shutil.copy2(s, t)
            rels.append(rel)
    return rels


def is_silent(wav):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', wav, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True)
    m = re.search(r'max_volume:\s*(-?[\d.]+|-inf)', r.stderr)
    return (not m) or m.group(1) == '-inf' or float(m.group(1)) < -80


def to_mp3(src, dst):
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '2', '-b:a', '160k', dst], check=True)


def build_preview(root, a, themes, lock, sj, resolved):
    pv = os.path.join(root, 'preview')
    pa = os.path.join(pv, 'assets')
    sync_dir(os.path.join(root, 'broll', 'assets'), pa)
    audio = {}
    for s in sj['segments']:
        k = s['key']
        if k not in resolved:
            continue
        audio[k] = {}
        v = os.path.join(root, 'public', 'footage', f'{k}.wav')
        if os.path.exists(v):
            to_mp3(v, os.path.join(pa, 'audio', f'{k}-voice.mp3'))
            audio[k]['voice'] = f'assets/audio/{k}-voice.mp3'
        m = os.path.join(root, 'public', 'audio', f'mix-{k}.wav')
        if os.path.exists(m) and not is_silent(m):
            to_mp3(m, os.path.join(pa, 'audio', f'{k}-mix.mp3'))
            audio[k]['mix'] = f'assets/audio/{k}-mix.mp3'
    ov_path = os.path.join(root, 'broll', 'overlay.json')
    overlay = json.loads(rd(ov_path)) if os.path.exists(ov_path) else DEFAULT_OVERLAY
    clean = {tid: {k: v for k, v in t.items() if not k.startswith('_')} for tid, t in themes.items()}
    data = {
        'title': a.title or '', 'lead': a.lead or '', 'notes': rd(a.notes) if a.notes else '',
        'fps': sj['fps'], 'size': '4K' if sj['width'] >= 3840 else f"{sj['height']}p",
        'lock': lock, 'themes': clean, 'segdata': segdata(sj), 'audio': audio, 'overlay': overlay,
    }
    html = rd(os.path.join(ENGINE, 'preview-shell.html'))
    theme_css = '\n'.join(f'/* {tid} */\n' + scope_css(t['_css'], 'th-' + tid) for tid, t in themes.items())
    rep = {
        '__TITLE__': (a.title or 'B-roll 预览').replace('<', '&lt;'),
        '<!--__FONTS_LINK__-->': google_link(themes),
        '/*__BASE_CSS__*/': strip_comments(rd(os.path.join(ENGINE, 'base.css'))),
        '/*__THEME_CSS__*/': theme_css,
        '/*__CORE__*/': rd(os.path.join(ENGINE, 'broll-core.js')) + '\n' + layouts_src(list(themes)),
        '/*__SCENES__*/': rd(os.path.join(root, 'broll', 'scenes.js')),
        '/*__DATA__*/{}': json.dumps(data, ensure_ascii=False).replace('</', '<\\/'),
    }
    for k, v in rep.items():
        if k not in html:
            sys.exit(f'preview-shell.html 缺少占位符 {k}')
        html = html.replace(k, v)
    wr(os.path.join(pv, 'index.html'), html)
    files = {}
    for d, _, fs in os.walk(pa):
        for f in fs:
            if not f.startswith('.'):
                rel = os.path.relpath(os.path.join(d, f), pv)
                files[rel] = rel
    wr(os.path.join(pv, 'files.json'), json.dumps(dict(sorted(files.items())), ensure_ascii=False, indent=1))
    size = sum(os.path.getsize(os.path.join(pv, p)) for p in files) / 1e6
    print(f'预览页：{os.path.join(pv, "index.html")}（{len(files)} 个资源，{size:.1f} MB）')
    print(f'  本地看：cd "{pv}" && python3 -m http.server 8765 → http://localhost:8765/#s=0&t=3')
    print(f'  发布：Artifact file_path=preview/index.html  root=preview  files=preview/files.json 的内容')


def build_remotion(root, themes, lock, sj, resolved):
    th = themes[lock['theme']]
    sb = os.path.join(root, 'src', 'broll')
    sync_dir(os.path.join(root, 'broll', 'assets'), os.path.join(root, 'public', 'broll'), skip=('clips',))
    clips_p = os.path.join(sb, 'clips.json')
    clips = json.loads(rd(clips_p)) if os.path.exists(clips_p) else {}
    fonts_p = os.path.join(sb, 'fonts.json')
    fonts = json.loads(rd(fonts_p)) if os.path.exists(fonts_p) else []
    if not fonts:
        print('！src/broll/fonts.json 为空：先跑 scripts/fetch_fonts.py，否则渲染会回退系统字体')
    probes = []
    for fam, w, it in font_specs(th):
        probes.append(f'{"italic " if it else ""}{w} 40px "{fam}"')
    vars_ = th['vars'] | th['variants'][lock['variant']].get('vars', {})
    clean = {k: v for k, v in th.items() if not k.startswith('_')}
    data = {'fps': sj['fps'], 'segdata': segdata(sj), 'clips': clips}
    js = ('/* 由 scripts/build_broll.py 生成，不要手改。改 broll/scenes.js 后重跑。 */\n'
          + rd(os.path.join(ENGINE, 'broll-core.js')) + '\n'
          + layouts_src([lock['theme']]) + '\n'
          + rd(os.path.join(root, 'broll', 'scenes.js')) + '\n'
          + f'var __DATA = {json.dumps(data, ensure_ascii=False)};\n'
          + f'var __THEME = {json.dumps(clean, ensure_ascii=False)};\n'
          + 'Object.keys(SEGS).forEach(function (k) { BrollCore.resolve(SEGS[k], __DATA.segdata[k], __DATA.fps); });\n'
          + f'export const VARIANT = {json.dumps(lock["variant"])};\n'
          + 'export const THEME = __THEME;\n'
          + 'export const VARS = BrollCore.themeVars(__THEME, VARIANT);\n'
          + f'export const BG = {json.dumps(vars_["--bg"])};\n'
          + f'export const FONT_PROBES = {json.dumps(probes, ensure_ascii=False)};\n'
          + 'export const SEGMENTS = SEGS;\n'
          + 'export function createBroll(host, key, base) {\n'
          + "  if (!SEGS[key]) throw new Error('scenes.js 里没有 ' + key);\n"
          + "  return BrollCore.create(host, SEGS[key], {base: base, mode: 'remotion', fps: __DATA.fps, theme: __THEME, clips: __DATA.clips});\n}\n")
    wr(os.path.join(sb, 'engine.js'), js)
    face = ''.join(f'@font-face{{font-family:"{f["family"]}";font-weight:{f["weight"]};font-style:{f["style"]};font-display:block;src:url(__BASE__fonts/{f["file"]}) format("woff2")}}\n' for f in fonts)
    css = face + strip_comments(rd(os.path.join(ENGINE, 'base.css'))) + '\n' + strip_comments(th['_css'])
    wr(os.path.join(sb, 'style.ts'), '// 由 scripts/build_broll.py 生成，不要手改。\nexport const CSS = ' + json.dumps(css, ensure_ascii=False) + ';\n')
    wr(os.path.join(sb, 'theme.json'), json.dumps(clean, ensure_ascii=False, indent=2))
    for k, r in resolved.items():
        sfxmap = th['sound']['sfx']
        ev = [[t, e, g, sc, sfxmap.get(e, e)] for t, e, g, sc in r['events']]
        unknown = sorted({e for _, e, *_ in r['events'] if e not in sfxmap})
        if unknown:
            print(f'！{k} 的音效事件不在主题 {th["id"]} 的 sound.sfx 里，按原名处理：{", ".join(unknown)}')
        wr(os.path.join(sb, f'timeline-{k}.json'), json.dumps({
            'seg': k, 'fps': sj['fps'], 'dur': r['dur'], 'frames': next(s['frames'] for s in sj['segments'] if s['key'] == k),
            'theme': lock['theme'], 'variant': lock['variant'], 'bgm': th['sound']['bgm'], 'levels': th['sound']['levels'],
            'scenes': r['scenes'], 'events': ev,
            '_doc': 'events = [段内秒, 语义事件, 增益, 场景名, 主题音色]；scenes[].mood 可写 {chord, energy, drums} 覆盖配乐'}, ensure_ascii=False, indent=1))
    print(f'Remotion：src/broll/engine.js / style.ts / timeline-*.json（主题 {lock["theme"]}:{lock["variant"]}，{len(fonts)} 个字体，{len(clips)} 个素材）')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('project')
    p.add_argument('--theme', help='主题[:变体]，例如 sketch:ochre；会写进 src/broll/theme.lock.json')
    g = p.add_mutually_exclusive_group()
    g.add_argument('--preview', action='store_true')
    g.add_argument('--remotion', action='store_true')
    g.add_argument('--both', action='store_true')
    p.add_argument('--title')
    p.add_argument('--lead')
    p.add_argument('--notes', help='一段 HTML，放在预览页底部（区间说明、真实素材来源、示意性画面）')
    a = p.parse_args()
    root = os.path.abspath(a.project)
    themes = load_themes()
    lock_p = os.path.join(root, 'src', 'broll', 'theme.lock.json')
    if a.theme:
        tid, var = parse_theme_arg(a.theme, themes)
        lock = {'theme': tid, 'variant': var}
        wr(lock_p, json.dumps(lock, indent=1))
    elif os.path.exists(lock_p):
        lock = json.loads(rd(lock_p))
        parse_theme_arg(f"{lock['theme']}:{lock['variant']}", themes)
    else:
        sys.exit('还没选主题：加 --theme sketch:ochre（可选：' + ', '.join(themes) + '）')
    if not os.path.exists(os.path.join(root, 'broll', 'scenes.js')):
        sys.exit('没有 broll/scenes.js：先跑 init_project.py --theme … 生成起步文件')
    sj = json.loads(rd(os.path.join(root, 'src', 'segments.json')))
    resolved = node_resolve(root, {'fps': sj['fps'], 'segdata': segdata(sj), 'theme': lock['theme']})
    for k, r in resolved.items():
        print(f'  {k} {r["label"]} {r["dur"]:.2f}s：' + ' | '.join(f'{s["name"]} {s["from"]:.2f}–{s["to"]:.2f}' for s in r['scenes']))
    do_p = a.preview or a.both or not (a.remotion)
    do_r = a.remotion or a.both
    if do_p:
        build_preview(root, a, themes, lock, sj, resolved)
    if do_r:
        build_remotion(root, themes, lock, sj, resolved)


if __name__ == '__main__':
    main()
