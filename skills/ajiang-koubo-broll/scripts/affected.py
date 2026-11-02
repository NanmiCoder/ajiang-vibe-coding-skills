#!/usr/bin/env python3
"""改了什么 → 哪几段要重渲（画面）/ 只重做音轨。失败恢复和用户最后的小改都先跑它，别动不动全片重渲。

  python3 <skill>/scripts/affected.py --project . public/st/user-report.jpg        # 改了某张图
  python3 <skill>/scripts/affected.py --project . src/segs/seg3/Live.tsx src/data/mix.json
  python3 <skill>/scripts/affected.py --project . --stale                           # 按修改时间找出比源文件旧的成片（交付前必跑）

规则
  src/lib/**、src/data/{timing,pages,tokens,meta}.json、public/fonts/**  → 全部段落重渲画面
  src/data/mix.json、public/sfx/**、public/audio/bgm-*                   → 全部段落只重做音轨（scripts/reaudio.mjs）
  src/segs/SegN.tsx、src/segs/segN/**、public/segN/**                    → 只重渲 segN
  public/ 下其它文件（截图、logo、用户图）                                → 代码里引用了它的段（lib 里引用 → 全部）
"""
import glob
import json
import os
import re
import sys

# 在工程根目录跑；也可以 --project <工程> 从别处跑
if '--project' in sys.argv:
    _i = sys.argv.index('--project')
    os.chdir(sys.argv[_i + 1])
    del sys.argv[_i:_i + 2]

T = json.load(open('src/data/timing.json', encoding='utf-8'))['segments']
KEYS = list(T.keys())
ASSET_RE = re.compile(r"""['"`]([\w\-./]+\.(?:jpg|jpeg|png|webp|svg|gif|mp4|webm|wav|mp3))['"`]""")


def seg_files(k):
    n = k[3:]
    return [f'src/segs/Seg{n}.tsx'] + glob.glob(f'src/segs/seg{n}/**/*', recursive=True) + glob.glob(f'public/seg{n}/**/*', recursive=True)


def code_of(files):
    out = ''
    for f in files:
        if os.path.isfile(f) and f.endswith(('.ts', '.tsx', '.js', '.json')):
            out += open(f, encoding='utf-8', errors='ignore').read()
    return out


LIB_CODE = code_of(glob.glob('src/lib/*'))


def refs(k):
    """这一段代码里引用到的 public 资源（相对 public/ 的路径）"""
    return set(ASSET_RE.findall(code_of(seg_files(k))))


def classify(path):
    p = os.path.relpath(path).replace(os.sep, '/')
    if p.startswith('src/lib/') or p in ('src/data/timing.json', 'src/data/pages.json', 'src/data/tokens.json', 'src/data/meta.json') or p.startswith('public/fonts/'):
        return set(KEYS), set()
    if p == 'src/data/mix.json' or p.startswith('public/sfx/') or re.match(r'public/audio/bgm', p):
        return set(), set(KEYS)
    m = re.match(r'src/segs/(?:Seg|seg)(\d+)', p) or re.match(r'public/seg(\d+)/', p)
    if m:
        return {f'seg{m.group(1)}'}, set()
    if p.startswith('public/'):
        rel = p[len('public/'):]
        base = os.path.basename(rel)
        if rel in LIB_CODE or base in LIB_CODE:
            return set(KEYS), set()
        return {k for k in KEYS if any(r == rel or os.path.basename(r) == base for r in refs(k))}, set()
    return set(), set()


def deps(k):
    fs = glob.glob('src/lib/*') + ['src/data/timing.json', 'src/data/pages.json', 'src/data/mix.json', 'src/data/tokens.json'] + seg_files(k)
    fs += ['public/' + r for r in refs(k)]
    return [f for f in fs if os.path.isfile(f)]


def stale():
    rows = []
    for k in KEYS:
        out = f"out/final/{T[k]['outName']}.mp4"
        if not os.path.exists(out):
            rows.append((k, '缺成片'))
            continue
        t = os.path.getmtime(out)
        newer = [f for f in deps(k) if os.path.getmtime(f) > t]
        if newer:
            rows.append((k, '比源文件旧：' + ', '.join(sorted(newer)[:4]) + (' …' if len(newer) > 4 else '')))
    return rows


if __name__ == '__main__':
    args = sys.argv[1:]
    if '--stale' in args:
        rows = stale()
        for k, why in rows:
            print(f'  ✗ {k} {why}')
        print('全部成片都比源文件新' if not rows else f'要重渲：node scripts/render.mjs {" ".join(k for k, _ in rows)}')
        sys.exit(1 if rows else 0)
    video, audio = set(), set()
    for a in args:
        v, au = classify(a)
        video |= v
        audio |= au
    audio -= video  # 重渲画面时音轨会一起重做
    order = lambda s: sorted(s, key=KEYS.index)
    print('重渲画面：', ' '.join(order(video)) or '无')
    print('只重做音轨：', ' '.join(order(audio)) or '无')
    if video:
        print(f'  node scripts/render.mjs {" ".join(order(video))}')
    if audio:
        print(f'  node scripts/reaudio.mjs {" ".join(order(audio))}')
