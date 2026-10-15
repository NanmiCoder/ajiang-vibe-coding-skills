#!/usr/bin/env python3
"""按场景里实际用到的字，下载主题字体的 Google Fonts 子集（渲染时不联网）。改了上屏文案要重跑。

  python3 fetch_fonts.py <工程>

扫描 broll/scenes.js + 主题 chrome 里的字（再加 ASCII 和常用标点），对主题 fonts 里每个
family × weight（italic 主题再加斜体）请求 css2?…&text=…，写：
  public/broll/fonts/<family>-<weight>[i].woff2
  src/broll/fonts.json   [{family, weight, style, file}]（build_broll.py 用它写 @font-face）
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
EXTRA = '×→←↑↓·“”‘’，。、：；！？（）《》—…▍✓✗①②③④⑤¥%°'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    root = os.path.abspath(sys.argv[1])
    sb = os.path.join(root, 'src', 'broll')
    lock = json.load(open(os.path.join(sb, 'theme.lock.json'), encoding='utf-8'))
    th = json.load(open(os.path.join(HERE, '..', 'assets', 'themes', lock['theme'], 'theme.json'), encoding='utf-8'))
    text = open(os.path.join(root, 'broll', 'scenes.js'), encoding='utf-8').read() + th.get('chrome', '')
    sj = os.path.join(root, 'src', 'segments.json')
    if os.path.exists(sj):  # 段标题会出现在页签里
        text += ''.join(s['title'] for s in json.load(open(sj, encoding='utf-8'))['segments'])
    chars = {c for c in text if ord(c) >= 32} | {chr(i) for i in range(32, 127)} | set(EXTRA)
    subset = ''.join(sorted(chars))
    out = os.path.join(root, 'public', 'broll', 'fonts')
    os.makedirs(out, exist_ok=True)
    specs = set()
    for f in th['fonts'].values():
        for w in f['weights']:
            specs.add((f['family'], int(w), False))
            if f.get('italic'):
                specs.add((f['family'], int(w), True))
    manifest = []
    for fam, w, it in sorted(specs):
        axis = f'ital,wght@1,{w}' if it else f'wght@{w}'
        url = (f'https://fonts.googleapis.com/css2?family={urllib.parse.quote(fam)}:{axis}'
               f'&text={urllib.parse.quote(subset)}&display=block')
        css = get(url).decode()
        m = re.search(r'url\((https:[^)]+)\)', css)
        if not m:
            sys.exit(f'没拿到 {fam} {w} 的字体地址：\n{css[:300]}')
        buf = get(m.group(1))
        name = f"{re.sub(r'[^a-z0-9]+', '-', fam.lower()).strip('-')}-{w}{'i' if it else ''}.woff2"
        with open(os.path.join(out, name), 'wb') as fh:
            fh.write(buf)
        manifest.append({'family': fam, 'weight': str(w), 'style': 'italic' if it else 'normal', 'file': name})
        print(f'{name} {len(buf) // 1024} KB')
    json.dump(manifest, open(os.path.join(sb, 'fonts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(subset)} 个字 → {len(manifest)} 个子集；改了文案后重跑，再跑 build_broll.py --remotion')


if __name__ == '__main__':
    main()
