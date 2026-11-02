#!/usr/bin/env python3
"""从 lobehub 拉品牌 logo（SVG）到 <工程>/public/logo/。

  python3 fetch_logos.py --project <工程> claude openai gemini deepseek grok qwen ...          # 每个 id 拉三种变体
  python3 fetch_logos.py --project <工程> --dark claude openai grok deepseek                   # 深色舞台：再给单色版生成 -white
  python3 fetch_logos.py --project <工程> claude-color openai-text                            # 旧用法：带变体后缀的 id 只拉那一个

变体（文件名 = <id><后缀>.svg）
  <id>.svg         单色图标，fill="currentColor"（Img 里显示成黑色）
  <id>-color.svg   彩色图标（品牌色写死）。不是每家都有：第 4 期实测 openai、grok、xai、anthropic 没有 -color
  <id>-text.svg    单色字标（品牌名文字），也是 currentColor
  不存在的变体会打印「不存在（跳过）」，不算失败。其它后缀（-text-cn / -brand / -brand-color）要用就把带后缀的 id 直接传进来。

--dark（深色舞台用）
  只给单色图标和 -text / -text-cn 字标生成 <原名>-white.svg：currentColor 和黑色填充换成 tokens.json 的 color.ink
  （tokens.json 读不到、或 ink 是深色时用 #F4F6F0）。彩色版（-color / -brand*）一律不动、不生成 -white
  （第 4 期误生成过 kimi-color-white.svg）。单色 svg 里如果写死了别的颜色，也不自动反白，打印出来手改。

id 怎么查
  图标目录：https://lobehub.com/icons （搜品牌名，详情页能看到有哪些变体）
  使用说明：https://lobehub.com/icons/skill.md （CDN 地址规则、变体后缀）；本机也可以看 lobe-icons skill 的 reference/providers.md
组件里用 <Logo id="claude-color"/> / <Logo id="openai-white"/>，或 lib/UI.tsx 里 LOGOS 的别名（claude / gpt / gemini …）。
"""
import argparse
import json
import os
import re
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

CDNS = [
    'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/{}.svg',
    'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/{}.svg',  # unpkg 连不上时的国内镜像
]
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
DEFAULT_VARIANTS = ['', '-color', '-text']
EXPLICIT = ('-brand-color', '-text-cn', '-color', '-text', '-brand')  # 长的在前
MONO = ('', '-text', '-text-cn')  # 只有这些生成 -white
FALLBACK_INK = '#F4F6F0'


class Missing(Exception):
    pass


def split_variant(i):
    for suf in EXPLICIT:
        if i.endswith(suf) and len(i) > len(suf):
            return i[:-len(suf)], suf
    return i, None


def fetch(name):
    """→ bytes；CDN 明确 404 抛 Missing，其它错误换下一个 CDN。"""
    err = None
    for cdn in CDNS:
        try:
            req = urllib.request.Request(cdn.format(name), headers={'User-Agent': UA})
            data = urllib.request.urlopen(req, timeout=20).read()
            if b'<svg' not in data[:400]:
                raise ValueError('返回的不是 svg')
            return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise Missing(name)
            err = e
        except Exception as e:  # 超时 / 连不上 → 换镜像
            err = e
    raise RuntimeError(f'{name}: {err}')


def ink_color(project):
    p = os.path.join(project, 'src', 'data', 'tokens.json')
    try:
        t = json.load(open(p, encoding='utf-8'))
        ink = t['color']['ink']
        r, g, b = (int(ink[k:k + 2], 16) for k in (1, 3, 5))
        if (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.6:
            print(f'! tokens.json 的 ink={ink} 是深色（还没抽本期 tokens，或不是深色主题）：-white 用 {FALLBACK_INK}')
            return FALLBACK_INK
        return ink
    except Exception:
        print(f'! 读不到 {p} 的 color.ink：-white 用 {FALLBACK_INK}')
        return FALLBACK_INK


BLACK = r'(?:#000|#000000|black|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\))'


def whiten(svg, ink):
    """单色 svg → 浅色版；写死了别的颜色返回 None。"""
    colors = re.findall(r'(?:fill|stroke|stop-color|color)\s*[:=]\s*["\']?\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|[a-zA-Z]+)', svg)
    other = {c for c in colors if not re.fullmatch(BLACK + r'|currentColor|none|transparent|inherit|#fff|#ffffff|white', c, re.I)}
    if other:
        return None
    out = re.sub(r'currentColor', ink, svg)
    out = re.sub(r'((?:fill|stroke)\s*=\s*["\'])' + BLACK + r'(["\'])', r'\g<1>' + ink + r'\2', out, flags=re.I)
    out = re.sub(r'((?:fill|stroke)\s*:\s*)' + BLACK + r'\b', r'\g<1>' + ink, out, flags=re.I)
    head = re.search(r'<svg\b[^>]*>', out)
    if head and not re.search(r'\sfill\s*=', head.group(0)) and ink not in out:
        # 没有任何填充声明的 svg 默认是黑色：在根节点补一个 fill
        out = out[:head.start()] + head.group(0).replace('<svg', f'<svg fill="{ink}"', 1) + out[head.end():]
    return out


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--project', required=True)
    p.add_argument('--dark', action='store_true', help='给单色图标和 -text 字标生成 -white 版（彩色版不动）')
    p.add_argument('ids', nargs='+')
    a = p.parse_args()
    d = os.path.join(a.project, 'public', 'logo')
    os.makedirs(d, exist_ok=True)
    ink = ink_color(a.project) if a.dark else None

    jobs = []  # (原始 id, 文件名, 变体后缀)
    for i in a.ids:
        base, suf = split_variant(i)
        for v in ([suf] if suf is not None else DEFAULT_VARIANTS):
            jobs.append((i, base + v, v))

    def run(job):
        try:
            return job, fetch(job[1]), None
        except Missing:
            return job, None, 'missing'
        except Exception as e:
            return job, None, str(e)

    with ThreadPoolExecutor(8) as ex:
        results = list(ex.map(run, jobs))

    failed, empty = 0, []
    by_id = {}
    for (i, name, v), data, err in results:
        by_id.setdefault(i, []).append((name, v, data, err))
    for i, rows in by_id.items():
        got, notes = [], []
        for name, v, data, err in rows:
            if err == 'missing':
                notes.append(f'{name} 不存在（跳过）')
                continue
            if err:
                notes.append(f'{name} 下载失败：{err}')
                failed += 1
                continue
            open(os.path.join(d, name + '.svg'), 'wb').write(data)
            got.append(name + '.svg')
            if not a.dark:
                continue
            if v not in MONO:
                notes.append(f'{name} 是彩色版，不生成 -white')
                continue
            w = whiten(data.decode('utf-8'), ink)
            if w is None:
                notes.append(f'{name} 里写死了别的颜色，没自动反白（手改）')
                continue
            open(os.path.join(d, name + '-white.svg'), 'w', encoding='utf-8').write(w)
            got.append(name + '-white.svg')
        if not got:
            empty.append(i)
        print(('✓ ' if got else '✗ ') + i + '：' + ('  '.join(got) or '一个都没拉到（查 https://lobehub.com/icons 换 id）'))
        for n in notes:
            print('    · ' + n)
    print(f'→ {d}' + (f'（-white 用 {ink}）' if a.dark else ''))
    if failed:
        raise SystemExit(f'{failed} 个文件下载失败（网络问题，重跑一次）')
    if empty:
        raise SystemExit('这些 id 一个变体都没有：' + ' '.join(empty))


if __name__ == '__main__':
    main()
