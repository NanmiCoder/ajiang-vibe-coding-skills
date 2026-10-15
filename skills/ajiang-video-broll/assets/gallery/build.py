"""主题库页面：把 skill 里的主题、引擎拼成 <out>/index.html，并写 Artifact 的 files 列表。

用法：python3 build.py <out 目录>
  1. 本脚本把 page/app/demo 和演示截图拷到 <out>，生成 index.html、files.json
  2. <venv>/python ../../scripts/theme_demo_audio.py <out>/assets/audio  生成试听音频
  3. 再跑一次本脚本（files.json 会带上音频），用 Artifact 发布：file_path=<out>/index.html, root=<out>, files=files.json 里的列表
主题自动从 assets/themes/ 读取（_ 开头的目录跳过），按 group（chosen / candidate / legacy）和 rank 排序。"""
import json, os, re, shutil
import sys
SRC = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(SRC)
_args = [x for x in sys.argv[1:] if not x.startswith('--')]
HERE = os.path.abspath(_args[0]) if _args else SRC + '/_out'
os.makedirs(HERE + '/assets', exist_ok=True)
for f in ('page.html', 'app.js', 'demo.js'):
    shutil.copy(f'{SRC}/{f}', f'{HERE}/{f}')
for d in ('st', 'oi'):
    shutil.copytree(f'{SRC}/assets/{d}', f'{HERE}/assets/{d}', dirs_exist_ok=True)
GROUP_RANK = {'chosen': 0, 'kept': 1, 'candidate': 2, 'legacy': 3}
_ids = [d for d in sorted(os.listdir(f'{SKILL}/themes')) if not d.startswith(('_', '.')) and os.path.exists(f'{SKILL}/themes/{d}/theme.json')]
_meta = {d: json.load(open(f'{SKILL}/themes/{d}/theme.json', encoding='utf-8')) for d in _ids}
# 旧预设（legacy）还是通用版式，不放进主题库让用户挑；加 --all 才显示
_ids = [d for d in _ids if _meta[d].get('group') != 'legacy' or '--all' in sys.argv]
ORDER = sorted(_ids, key=lambda d: (GROUP_RANK.get(_meta[d].get('group', 'candidate'), 1), _meta[d].get('rank', 99), d))

def scope(css, tid):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out = []
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sels = []
        for s in m.group(1).split(','):
            s = s.strip()
            if not s: continue
            sels.append(re.sub(r'^\.stage', f'.stage[data-skin="{tid}"]', s) if s.startswith('.stage') else f'.stage[data-skin="{tid}"] {s}')
        out.append(','.join(sels) + '{' + m.group(2).strip() + '}')
    return '\n'.join(out)

themes = {t: json.load(open(f'{SKILL}/themes/{t}/theme.json', encoding='utf-8')) for t in ORDER}
theme_css = '\n'.join(scope(open(f'{SKILL}/themes/{t}/theme.css', encoding='utf-8').read(), t) for t in ORDER)
base_css = open(f'{SKILL}/engine/base.css', encoding='utf-8').read()
shutil.copy(f'{SKILL}/engine/broll-core.js', f'{HERE}/broll-core.js')
# 版式：默认 + 每套模板自己的 layouts.js，拼成一个文件
lay = [open(f'{SKILL}/engine/layouts-default.js', encoding='utf-8').read()]
for t in ORDER:
    lp = f'{SKILL}/themes/{t}/layouts.js'
    if os.path.exists(lp): lay.append(f'/* ── {t} ── */\n' + open(lp, encoding='utf-8').read())
open(f'{HERE}/layouts.js', 'w', encoding='utf-8').write('\n'.join(lay))
# 每套模板的演示音效时间表（版式不同，卡点不同）→ assets/audio/<id>/timeline.json，theme_demo_audio.py 会读
import subprocess
js = f'''global.window=globalThis;require({json.dumps(HERE + '/broll-core.js')});require({json.dumps(HERE + '/layouts.js')});
eval(require('fs').readFileSync({json.dumps(HERE + '/demo.js')},'utf8'));
var T={json.dumps({t: {'id': t} for t in ORDER})},o={{}};for(var k in T)o[k]=BrollCore.timeline(DEMO,T[k]);console.log(JSON.stringify(o));'''
tls = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)
for t, tl in tls.items():
    os.makedirs(f'{HERE}/assets/audio/{t}', exist_ok=True)
    json.dump(tl, open(f'{HERE}/assets/audio/{t}/timeline.json', 'w'), ensure_ascii=False)

page = open(f'{HERE}/page.html', encoding='utf-8').read()
fam = {}
for t in themes.values():
    for f in t.get('fonts', {}).values():
        e = fam.setdefault(f['family'], {'w': set(), 'i': False}); e['w'].update(f['weights']); e['i'] |= bool(f.get('italic'))
fam.setdefault('Noto Sans SC', {'w': set(), 'i': False})['w'].update([400, 500, 700, 900])
fam.setdefault('Geist Mono', {'w': set(), 'i': False})['w'].update([400, 500])
def spec(n, e):
    w = sorted(e['w'])
    if e['i']: return n.replace(' ', '+') + ':ital,wght@' + ';'.join([f'0,{x}' for x in w] + [f'1,{x}' for x in w])
    return n.replace(' ', '+') + ':wght@' + ';'.join(map(str, w))
link = 'https://fonts.googleapis.com/css2?' + '&'.join('family=' + spec(n, e) for n, e in sorted(fam.items())) + '&display=swap'
page = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com/css2\?[^"]*">', '<link rel="stylesheet" href="' + link + '">', page)
page = page.replace('/*BASE_CSS*/', base_css).replace('/*THEME_CSS*/', theme_css)
page = page.replace('/*THEMES_JSON*/', 'var THEMES = ' + json.dumps(themes, ensure_ascii=False) + ';')
page = page.replace('/*APP_JS*/', open(f'{HERE}/app.js', encoding='utf-8').read())
open(f'{HERE}/index.html', 'w', encoding='utf-8').write(page)

files = {'broll-core.js': 'broll-core.js', 'demo.js': 'demo.js', 'layouts.js': 'layouts.js'}
for root, _, fs in os.walk(f'{HERE}/assets'):
    for f in fs:
        if f.startswith('.'): continue
        rel = os.path.relpath(os.path.join(root, f), HERE)
        files[rel] = rel
json.dump(files, open(f'{HERE}/files.json', 'w'), ensure_ascii=False, indent=0)
print('index.html', len(page), 'bytes;', len(files), 'files')
