#!/usr/bin/env python3
"""从产品网站自己的 CSS 抽设计 tokens，生成 tokens.json 草稿（主 agent 必须看一眼再用）。

用法：
  python3 extract_tokens.py https://产品网址 --out <工程>/src/data/tokens.json [--fonts <工程>/public/fonts] [--wordmark <工程>/public/logo]
  python3 extract_tokens.py --css a.css b.css --out ...        # 已经下载好的 CSS（curl 要带浏览器 UA：curl -A 'Mozilla/5.0 …'）

做什么：
  1. 抓首页 HTML → 同站样式表 + <style> 块（所有请求都带浏览器 UA，不带会被部分站点/CDN 拒）；
  2. 列出 CSS 自定义属性、出现最多的颜色、字体族、圆角；颜色支持 #hex（含 8 位透明度）/ rgb() / hsl() / oklch() / shadcn 裸 HSL；
  3. 按变量名猜语义（bg / surface / surface2 / ink / ink2 / muted / faint / line / accent / good / bad / warn）：
     - 普通命名：--bg、--background、--text、--accent、--primary …
     - Tailwind v4 主题变量：--color-bg、--color-panel、--color-ink、--color-accent、--color-danger …（去掉 color- 前缀再匹配）
     - shadcn：--background / --foreground / --card / --muted-foreground / --border / --destructive（--muted 是底色，不当文字色）
     - 半透明的线条/面板色按底色混成实色；accent 必须是有彩度的颜色（灰色的 --primary / --accent 会被跳过）
     缺的从 accent 和底色推导（浅色底：pale/tint = accent 混白；深色底：自动切深色舞台参数）；
  4. 字体：优先读 Tailwind v4 的 --font-sans / --font-display / --font-mono（也认 --font-body / --font-heading / --font-code），
     没有再取出现最多的 font-family；中文字体（Noto Sans SC 之类）跳过，中文一律走系统字体回退（PingFang SC），
     不做 Google Fonts text= 子集（418 期踩过“只剩 12 个字形”的坑）。
     --fonts 给了：sans / display / mono 里在 Google Fonts 上的拉丁字体逐个字重下载 latin 子集 woff2，写进 font.files；
     不在 Google Fonts 上的（站点自带字体）打印出来，从站点 assets 手动拿 woff2 放进 public/fonts 再写 font.files。
猜不准的情况（CSS-in-JS、变量名是 --tw-* 之外的哈希名、颜色几百个）：改用 references/tokens-from-product.md
里 ego-browser 读 computed style 的办法，把读到的值手填进 tokens.json。
"""
import argparse, colorsys, json, math, os, re, sys, urllib.error, urllib.parse, urllib.request
from collections import Counter

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def get(url):
    return fetch(url).decode('utf-8', 'ignore')


def _num(s, scale=1.0):
    """'50%' → 0.5*scale…；'0.5' → 0.5"""
    s = s.strip()
    return float(s[:-1]) / 100 * scale if s.endswith('%') else float(s)


def _alpha(s):
    if not s:
        return 1.0
    return float(s[:-1]) / 100 if s.endswith('%') else float(s)


def _srgb(lin):
    v = max(0.0, min(1.0, lin))
    return 12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055


def parse_color(c):
    """→ ('#RRGGBB', alpha) 或 None"""
    c = c.strip().lower()
    m = re.fullmatch(r'#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})', c)
    if m:
        h = m.group(1)
        if len(h) in (3, 4):
            h = ''.join(x * 2 for x in h)
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return '#' + h[:6].upper(), a
    m = re.fullmatch(r'rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)', c)
    if m:
        r, g, b = (round(_num(m.group(i), 255)) for i in (1, 2, 3))
        return '#%02X%02X%02X' % (min(r, 255), min(g, 255), min(b, 255)), _alpha(m.group(4))
    m = re.fullmatch(r'(?:hsla?\(\s*)?([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)?', c)  # hsl() 和 shadcn 的裸 HSL「220 14% 96%」
    if m:
        h, s, l = float(m.group(1)) / 360, float(m.group(2)) / 100, float(m.group(3)) / 100
        r, g, b = colorsys.hls_to_rgb(h % 1, l, s)
        return '#%02X%02X%02X' % (round(r * 255), round(g * 255), round(b * 255)), _alpha(m.group(4))
    m = re.fullmatch(r'oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?(?:\s*/\s*([\d.]+%?))?\s*\)', c)
    if m:
        L, C, H = _num(m.group(1)), _num(m.group(2), 0.4), math.radians(float(m.group(3)))
        A, B = C * math.cos(H), C * math.sin(H)
        l_, m_, s_ = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, (L - 0.0894841775 * A - 1.2914855480 * B) ** 3
        rgb_ = (4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
                -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
                -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_)
        return '#%02X%02X%02X' % tuple(round(_srgb(v) * 255) for v in rgb_), _alpha(m.group(4))
    if c in ('white', 'black'):
        return ('#FFFFFF' if c == 'white' else '#000000'), 1.0
    return None


def hex6(c):
    """不透明色 → '#RRGGBB'；半透明（<0.9）不当 token，返回 None"""
    p = parse_color(c)
    return p[0] if p and p[1] >= 0.9 else None


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def mix(a, b, t):  # t=0 → a, t=1 → b
    A, B = rgb(a), rgb(b)
    return '#%02X%02X%02X' % tuple(round(A[i] + (B[i] - A[i]) * t) for i in range(3))


def lum(h):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(x) for x in rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def sat(h):
    r, g, b = (x / 255 for x in rgb(h))
    return colorsys.rgb_to_hls(r, g, b)[2]


# 语义 → (变量名完全等于其一, 变量名以其一开头)。变量名先去掉 -- 和 Tailwind v4 的 color- 前缀再比。
SEM = {
    'bg': (['bg', 'background', 'page', 'canvas', 'body', 'base', 'bg-base', 'bg-page', 'bg-primary', 'background-primary', 'surface-0', 'bg-0'],
           [r'(bg|background)\b']),
    'surface': (['surface', 'panel', 'card', 'paper', 'elevated', 'surface-1', 'panel-1', 'card-1', 'bg-elevated', 'bg-secondary', 'bg-1', 'bg-2', 'background-secondary', 'popover'],
                [r'(surface|panel|card)\b']),
    'surface2': (['surface-2', 'panel-2', 'card-2', 'surface2', 'panel2', 'bg-3', 'bg-tertiary'], []),
    'ink': (['ink', 'text', 'fg', 'foreground', 'text-primary', 'fg-primary', 'ink-1', 'text-1', 'content', 'heading'],
            [r'(text|fg|foreground|ink)\b(?!.*(muted|soft|dim|faint|subtle|secondary|tertiary|2|3))']),
    'ink2': (['soft', 'ink-2', 'ink-soft', 'text-soft'], []),
    'muted': (['muted-foreground', 'text-muted', 'fg-muted', 'ink-muted', 'muted', 'text-secondary', 'fg-secondary', 'secondary-foreground', 'text-2', 'fg-2', 'subtle'],
              [r'(muted|secondary|subtle)\b']),
    'faint': (['dim', 'faint', 'text-dim', 'text-faint', 'text-tertiary', 'fg-tertiary', 'text-3', 'fg-3', 'placeholder'], []),
    'line': (['line', 'border', 'rule', 'divider', 'stroke', 'hairline', 'input'], [r'(line|border|stroke|divider)\b']),
    'accent': (['accent', 'primary', 'brand', 'highlight'], [r'(accent|primary|brand)\b', r'(blue|indigo)\b']),
    'good': (['good', 'success', 'ok', 'positive', 'pass'], [r'(success|good|positive|green)\b']),
    'bad': (['bad', 'danger', 'error', 'negative', 'destructive', 'fail'], [r'(danger|error|destructive|negative|red)\b']),
    'warn': (['warn', 'warning', 'caution', 'amber'], [r'(warn|warning|caution|amber|yellow)\b']),
}
TRANSLUCENT_OK = {'line', 'surface', 'surface2', 'muted', 'faint', 'ink2'}  # 这些半透明时按底色混成实色
FONT_ROLE = {'sans': ['sans', 'body', 'base', 'ui', 'text', 'default', 'primary'],
             'display': ['display', 'heading', 'headings', 'title', 'headline', 'brand'],
             'mono': ['mono', 'code', 'monospace']}
GENERIC = {'inherit', 'initial', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
           'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded', 'segoe ui', 'helvetica neue', 'helvetica', 'arial', 'roboto',
           'apple color emoji', 'segoe ui emoji', 'segoe ui symbol', 'noto color emoji', 'menlo', 'monaco', 'consolas', 'courier new', 'sf mono'}
CJK = re.compile(r'\b(sc|tc|hk|jp|kr|cjk)\b|pingfang|yahei|hiragino|heiti|songti|source han|harmonyos|simsun|simhei|微软|苹方|思源', re.I)


def first_family(stack):
    for f in stack.split(','):
        f = f.strip().strip('"\'').strip()
        if f and not f.startswith('var(') and f.lower() not in GENERIC and not CJK.search(f):
            return f
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('url', nargs='?')
    ap.add_argument('--css', nargs='*')
    ap.add_argument('--out', required=True)
    ap.add_argument('--fonts')
    ap.add_argument('--wordmark', help='把首页 logo 链接里的 <svg> 存成 <目录>/wordmark.svg（lib 的 <Wordmark/> 读它）')
    a = ap.parse_args()

    css = ''
    html = ''
    if a.url:
        html = get(a.url)
        css += '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', html, re.S))
        host = urllib.parse.urlparse(a.url).netloc
        hrefs = re.findall(r'<link[^>]+rel=["\']?stylesheet["\']?[^>]*>', html)
        for tag in hrefs[:10]:
            m = re.search(r'href=["\']([^"\']+)', tag)
            if not m:
                continue
            u = urllib.parse.urljoin(a.url, m.group(1))
            if urllib.parse.urlparse(u).netloc != host:
                continue
            try:
                css += '\n' + get(u)
                print('css', u, file=sys.stderr)
            except Exception as e:
                print('skip', u, e, file=sys.stderr)
    for f in a.css or []:
        css += '\n' + open(f, encoding='utf-8', errors='ignore').read()
    if not css.strip():
        sys.exit('没有拿到任何 CSS（站点拒绝时确认请求带了浏览器 UA，或手动下载 CSS 后用 --css）')

    var = {}
    for k, v in re.findall(r'(--[A-Za-z0-9_-]+)\s*:\s*([^;}]+)', css):
        var.setdefault(k, v.strip())  # 第一次出现的（一般是 :root / @theme 的默认主题）

    def deref(v, depth=0):
        m = re.fullmatch(r'var\((--[A-Za-z0-9_-]+)(?:\s*,\s*([^)]*))?\)', v.strip())
        if m and depth < 6:
            return deref(var.get(m.group(1), m.group(2) or v), depth + 1)
        return v

    colors = Counter(h for h in (hex6(c) for c in re.findall(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)', css)) if h)
    fonts = Counter(deref(f.strip()) for f in re.findall(r'font-family\s*:\s*([^;}]+)', css))
    radii = Counter(r.strip() for r in re.findall(r'border-radius\s*:\s*([^;}]+)', css))

    # 候选颜色变量：(去前缀的名字, 原名, '#RRGGBB', alpha)；--tw-* 是 Tailwind 内部变量，跳过
    cands = []
    for k, v in var.items():
        if k.startswith(('--tw-', '--lightningcss')):
            continue
        p = parse_color(deref(v))
        if not p:
            continue
        n = re.sub(r'^(colors?|clr|theme)-', '', k[2:].lower())
        cands.append((n, k, p[0], p[1]))

    def ok_for(key, h, al):
        if al < 0.9 and key not in TRANSLUCENT_OK:
            return False
        if key == 'accent' and (sat(h) < 0.25 or lum(h) > 0.92 or lum(h) < 0.01):
            return False  # shadcn 的 --accent / --primary 常是灰色，不当强调色
        return True

    found = {}
    for key, (exact, prefix) in SEM.items():
        hit = None
        for e in exact:
            hit = next(((h, al, k) for n, k, h, al in cands if n == e and ok_for(key, h, al)), None)
            if hit:
                break
        if not hit:
            for p in prefix:
                hit = next(((h, al, k) for n, k, h, al in cands if re.match(p, n) and ok_for(key, h, al)), None)
                if hit:
                    break
        if hit:
            found[key] = hit

    top = [c for c, _ in colors.most_common(40)]
    if 'bg' in found:
        bg = found['bg'][0]
    else:
        scheme_dark = re.search(r':root[^{]*\{[^}]*color-scheme\s*:\s*dark', css)
        bg = next((c for c in top if (lum(c) < 0.03 if scheme_dark else lum(c) > 0.85)), '#0B0B0F' if scheme_dark else '#F7F8FA')
    dark = lum(bg) < 0.25

    def F(key, default):
        if key not in found:
            return default
        h, al, _ = found[key]
        return h if al >= 0.9 else mix(bg, h, al)  # 半透明 → 按底色混成实色

    surface = F('surface', '#FFFFFF' if not dark else mix(bg, '#FFFFFF', 0.06))
    ink = F('ink', next((c for c in top if (lum(c) < 0.08) != dark), '#20242C' if not dark else '#F2F3F5'))
    muted = F('muted', mix(ink, bg, 0.45))
    line = F('line', mix(bg, ink, 0.1))
    accent = F('accent', next((c for c in top if sat(c) > 0.45 and 0.05 < lum(c) < (0.9 if dark else 0.6)), '#345DE3'))
    good = F('good', '#247557' if not dark else '#3DD68C')
    bad = F('bad', '#C8473E' if not dark else '#FF5C5C')
    warn = F('warn', '#9A6420' if not dark else '#FFC53D')
    W = '#FFFFFF' if not dark else bg
    soft = lambda c, t: mix(c, W, t)
    tok = {
        'source': f'extract_tokens.py ← {a.url or a.css}（草稿：主 agent 对照真实截图校对后再用）',
        'dark': dark,
        'color': {
            'bg': bg, 'bg2': mix(bg, ink, 0.04), 'surface': surface, 'surface2': F('surface2', mix(surface, bg, 0.5)),
            'line': line, 'line2': mix(line, surface, 0.4),
            'ink': ink, 'ink2': F('ink2', mix(ink, muted, 0.4)), 'muted': muted, 'faint': F('faint', mix(muted, bg, 0.4)),
            'accent': accent, 'accentDeep': mix(accent, '#000000' if not dark else '#FFFFFF', 0.15),
            'pale': soft(accent, 0.92), 'tint': soft(accent, 0.84), 'accentBd': soft(accent, 0.8),
            'good': good, 'goodBg': soft(good, 0.88), 'goodBd': soft(good, 0.78),
            'bad': bad, 'badBg': soft(bad, 0.88), 'badBd': soft(bad, 0.78),
            'warn': warn, 'warnBg': soft(warn, 0.88), 'warnBd': soft(warn, 0.78),
            'chrome': mix(bg, ink, 0.03) if not dark else mix(surface, '#FFFFFF', 0.04),
            'chromeField': mix(bg, ink, 0.07) if not dark else mix(surface, '#FFFFFF', 0.09),
        },
        'stage': ({'top': mix(bg, '#FFFFFF', 0.3), 'bottom': mix(bg, ink, 0.02),
                   'lightA': '255,255,255', 'lightAOpacity': 0.95,
                   'lightB': ','.join(str(x) for x in rgb(soft(accent, 0.82))), 'lightBOpacity': 0.85,
                   'dot': ','.join(str(x) for x in rgb(ink)), 'dotOpacity': 0.16}
                  if not dark else
                  {'top': mix(bg, '#FFFFFF', 0.03), 'bottom': bg,
                   'lightA': '255,255,255', 'lightAOpacity': 0.05,
                   'lightB': ','.join(str(x) for x in rgb(accent)), 'lightBOpacity': 0.10,
                   'dot': '255,255,255', 'dotOpacity': 0.07}),
        'shadowTint': ','.join(str(x) for x in rgb(mix(accent, '#000000', 0.55))) if not dark else '0,0,0',
        'font': {'sans': "Geist, 'PingFang SC', 'Hiragino Sans GB', sans-serif",
                 'mono': "'Geist Mono', 'SF Mono', Menlo, monospace", 'files': []},
        'radius': {'sm': 10, 'md': 16, 'lg': 22, 'xl': 28},
        '_evidence': {
            'matched_vars': {k: {'value': F(k, v[0]), 'var': v[2], **({'alpha': round(v[1], 3)} if v[1] < 0.9 else {})} for k, v in found.items()},
            'top_colors': colors.most_common(16),
            'top_fonts': fonts.most_common(6),
            'top_radius': radii.most_common(6),
            'vars_sample': dict([(k, v) for k, v in var.items() if k.startswith(('--color-', '--font-'))][:40] +
                                [(k, v) for k, v in var.items() if not k.startswith(('--tw-', '--color-', '--font-'))][:40]),
        },
    }

    # 字体：Tailwind v4 的 --font-sans / --font-display / --font-mono 优先，其次出现最多的 font-family
    fam = {}
    font_vars = {}
    for k, v in var.items():
        m = re.fullmatch(r'--font(?:-family)?-([a-z]+)', k.lower())
        if not m:
            continue
        for role, names in FONT_ROLE.items():
            if m.group(1) in names and role not in fam:
                f = first_family(deref(v))
                if f:
                    fam[role], font_vars[role] = f, k
    if 'sans' not in fam:
        for f, _ in fonts.most_common(10):
            first = first_family(f)
            if first and first not in fam.values():
                fam['sans'] = first
                break
    if fam.get('sans'):
        tok['font']['sans'] = f"'{fam['sans']}', 'PingFang SC', 'Hiragino Sans GB', sans-serif"
    if fam.get('display') and fam['display'] != fam.get('sans'):
        tok['font']['display'] = f"'{fam['display']}', '{fam.get('sans', 'Geist')}', 'PingFang SC', sans-serif"
    if fam.get('mono'):
        tok['font']['mono'] = f"'{fam['mono']}', 'SF Mono', Menlo, monospace"
    tok['_evidence']['font_vars'] = font_vars

    missing_fonts = []
    if a.fonts:
        os.makedirs(a.fonts, exist_ok=True)
        weights = {'sans': (300, 400, 500, 600, 700, 800), 'display': (400, 500, 600, 700, 800), 'mono': (400, 500, 600, 700)}
        for role in ('sans', 'display', 'mono'):
            f = fam.get(role)
            if not f or f in ('Geist', 'Geist Mono') or any(x[0] == f for x in tok['font']['files']):
                continue  # Geist / Geist Mono 模板 public/fonts 里自带
            got = 0
            for w in weights[role]:
                try:  # 逐个字重请求：一次要多个字重时只要有一个不存在，Google Fonts 整个请求 400
                    cssf = get(f'https://fonts.googleapis.com/css2?family={urllib.parse.quote(f)}:wght@{w}&display=block')
                except urllib.error.HTTPError:
                    continue
                except Exception as e:
                    print(f'{f} {w}: {e}', file=sys.stderr)
                    continue
                for sub, body in re.findall(r'/\* (.*?) \*/\s*@font-face \{(.*?)\}', cssf, re.S):
                    if sub.strip() != 'latin':
                        continue
                    url = re.search(r'url\((.*?)\)', body).group(1)
                    fn = f"{f.replace(' ', '')}-{w}.woff2"
                    open(os.path.join(a.fonts, fn), 'wb').write(fetch(url))
                    tok['font']['files'].append([f, str(w), fn])
                    got += 1
            if got:
                print(f'fonts: {f} × {got} → {a.fonts}', file=sys.stderr)
            else:
                missing_fonts.append(f)
        for f in missing_fonts:
            n = len(re.findall(r'@font-face\s*\{[^}]*font-family\s*:\s*["\']?' + re.escape(f), css))
            print(f'{f} 不在 Google Fonts：' + (f'站点 CSS 里有 {n} 条 @font-face，从站点 assets 拿 woff2 放进 {a.fonts} 再写 font.files'
                                              if n else '字体回退到系统字体，或手动放 woff2 到 public/fonts 再写 font.files'), file=sys.stderr)
    # 模板自带 Geist / Geist Mono：字体栈里用到了就登记
    stacks = ' '.join(v for k, v in tok['font'].items() if k != 'files')
    if 'Geist,' in stacks or "'Geist'" in stacks:
        tok['font']['files'] += [['Geist', w, f'Geist-{w}.woff2'] for w in ('300', '400', '500', '600', '700', '800')]
    if 'Geist Mono' in stacks:
        tok['font']['files'] += [['Geist Mono', w, f'GeistMono-{w}.woff2'] for w in ('400', '500', '600', '700')]
    if fam.get('sans') and fam['sans'] != 'Geist' and not any(x[0] == fam['sans'] for x in tok['font']['files']):
        tok['font']['sans'] = f"'{fam['sans']}', Geist, 'PingFang SC', 'Hiragino Sans GB', sans-serif"  # 没下到这个字体时 Geist 兜底
        if not any(x[0] == 'Geist' for x in tok['font']['files']):
            tok['font']['files'] += [['Geist', w, f'Geist-{w}.woff2'] for w in ('300', '400', '500', '600', '700', '800')]

    if a.wordmark and a.url:
        m = re.search(r'<a[^>]+href=["\'](?:/|' + re.escape(a.url.rstrip('/')) + r'/?)["\'][^>]*>(.*?)</a>', html, re.S)
        svg = re.search(r'<svg.*?</svg>', m.group(1) if m else html, re.S)
        if svg:
            sv = svg.group(0)
            head, rest = sv.split('>', 1)
            head = re.sub(r'\s(width|height)="[^"]*"', '', head)  # 去掉 em 单位的宽高，只留 viewBox
            sv = head + '>' + rest
            if 'xmlns=' not in sv:
                sv = sv.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"', 1)
            os.makedirs(a.wordmark, exist_ok=True)
            open(os.path.join(a.wordmark, 'wordmark.svg'), 'w').write(sv.replace('currentColor', tok['color']['ink']))
            open(os.path.join(a.wordmark, 'wordmark-white.svg'), 'w').write(sv.replace('currentColor', '#FFFFFF'))
            print('字标 →', os.path.join(a.wordmark, 'wordmark.svg'), '+ wordmark-white.svg（Read 一下确认是字标不是图标；写死颜色的 svg 白色版要手改）', file=sys.stderr)
        else:
            print('没找到首页链接里的 <svg> 字标：从截图里 Cutout，或问用户要 logo 文件', file=sys.stderr)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(tok, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps({k: tok['color'][k] for k in ('bg', 'surface', 'ink', 'muted', 'line', 'accent', 'good', 'bad', 'warn')}, ensure_ascii=False))
    print('匹配到的变量：', {k: v[2] for k, v in found.items()} or '无（全靠猜：一定要对照截图校对）')
    print(f'dark={dark}  font.sans={tok["font"]["sans"]}' + (f'  font.display={tok["font"]["display"]}' if 'display' in tok['font'] else '') +
          f'  font.mono={tok["font"]["mono"]}  → {a.out}')


if __name__ == '__main__':
    main()
