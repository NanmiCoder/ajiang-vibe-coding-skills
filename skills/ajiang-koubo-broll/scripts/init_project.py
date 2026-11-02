#!/usr/bin/env python3
"""一条命令建好整片 B-roll 工程（Remotion 4 + 统一组件库），之后只剩「截素材、定 tokens、做第一章（= 样板）、写 BRIEF、派章节 agent」。

  # 先列字幕，读懂内容、定章节（写 chapters.json）
  python3 init_project.py list --srt 精剪.srt

  # 建工程（母版可以是精剪 mp4，也可以是纯口播音频 mp3/wav/m4a + SRT）
  python3 init_project.py --out <期目录>/broll --srt 精剪.srt --master 精剪.mp4 --chapters chapters.json \\
      [--asr 精剪后的 asr.json | --transcribe --prompt "简体中文。<专名词表>"] [--fps 60] \\
      [--env shared | --env local | --env <目录> | --link-node-modules <已有 node_modules>] [--chrome-from <dir>] [--git] [--force]

chapters.json：[{"title": "开场模拟掉包", "start": 1, "brief": "可选：这一章讲什么"}, {"title": "检测报告露馅", "start": 23}, ...]
  start = 字幕条号（从这条开口处切；第一章总是从 0 帧开始，最后一章到成片结尾，首尾相接铺满整片），
          也可写 "f12445"（帧号）或 "00:03:27,417"（SRT 时间）。章数不设上限（按 20–55 秒一章由内容决定）；
          同时跑的 agent 数由主控按 CPU 核数 / 2 控制，多的排队补派。

做的事（重复执行是安全的）：
  1. 拷模板 assets/template → <out>。已存在的文件一律不覆盖；--force 只把 src/lib 和 scripts 升级到模板最新版。
     src/segs/*、src/data/{tokens,pages,mix}.json、BRIEF.md 永远不覆盖（重跑 / --force 都不会清掉人工数据）。
  2. SRT × 章节 → 段落；ASR 逐字对齐 → src/data/timing.json（唯一时间数据源，say('seg3','词') 读它）
     没有 ASR 时 --transcribe 调 ajiang-koubo-cut 的 speech.py（faster-whisper）转写精剪成片
  3. src/data/meta.json（帧率、输出尺寸、口播响度、安全区）、替换对照表.txt
  4. 每段：src/segs/SegN.tsx 占位（已存在不动）、src/entries/segN.tsx 独立入口；样板入口 src/entries/sample.tsx（= seg0）；src/index.tsx 汇总
  5. public/audio：每段口播切片 voice-segN.wav（预览用，不进成片）、静音配乐占位 bgm-segN.wav（bgm.py 之前跑预览也不会 404）
  6. node_modules：默认软链到共享环境 $AJIANG_BROLL_CACHE（默认 ~/.cache/ajiang-koubo-broll）/env-<package.json+lock 哈希>，
     首次用模板自带的 package-lock.json `npm ci`，补跑 esbuild postinstall 并实测转译，再查依赖清单（含 @remotion/fonts）
  7. tsc 检查；--git 时 git init + 一次提交（可选的快照，方便按段回滚）
"""
import argparse
import glob
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
TEMPLATE = os.path.join(SKILL, 'assets', 'template')
sys.path.insert(0, HERE)
from timing_lib import parse_srt, probe, build_segments, align_chars, write_table, srt_time  # noqa: E402

# ajiang-koubo-cut 的转写脚本：先找同级安装的 skill（npx skills add 会把两个 skill 装在同一个 skills 目录），
# 再找环境变量 AJIANG_KOUBO_CUT（指向 skill 目录），最后找 ~/.claude/skills。
CUT_SPEECH = next((c for c in (os.path.join(os.path.dirname(SKILL), 'ajiang-koubo-cut', 'scripts', 'speech.py'),
                               os.path.join(os.path.expanduser(os.environ.get('AJIANG_KOUBO_CUT', '~/.claude/skills/ajiang-koubo-cut')), 'scripts', 'speech.py'))
                   if os.path.exists(c)), os.path.expanduser('~/.claude/skills/ajiang-koubo-cut/scripts/speech.py'))
CACHE_ROOT = os.path.expanduser(os.environ.get('AJIANG_BROLL_CACHE', '~/.cache/ajiang-koubo-broll'))
NEED = ['remotion', '@remotion/bundler', '@remotion/renderer', '@remotion/cli', '@remotion/fonts', 'react', 'react-dom', 'typescript', '@types/react', 'esbuild']
DEFAULT_SAFE = {'avatar': {'x': 1690, 'y': 30, 'w': 200, 'h': 200}, 'subtitle': {'x': 360, 'y': 966, 'w': 1200, 'h': 64}, 'textBottom': 930}


def run(cmd, **kw):
    print('$', ' '.join(str(c) for c in cmd), flush=True)
    return subprocess.run(cmd, check=True, **kw)


def cmd_list(a):
    cues = parse_srt(a.srt)
    total = 0
    print(f'# 共 {len(cues)} 条。列：条号 | SRT 起点 | 时长 | 文本')
    for c in cues:
        print(f"{c['n']:>4} | {srt_time(c['startMs'])} | {(c['endMs'] - c['startMs']) / 1000:4.1f}s | {c['text']}")
        total = max(total, c['endMs'])
    print(f'# 末条结束 {srt_time(total)}')


def copy_template(out, force):
    fresh = not os.path.exists(os.path.join(out, 'src', 'lib'))
    for root, dirs, files in os.walk(TEMPLATE):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'out')]
        rel = os.path.relpath(root, TEMPLATE)
        dst_dir = os.path.join(out, rel)
        os.makedirs(dst_dir, exist_ok=True)
        for f in files:
            if f in ('.DS_Store',):
                continue
            src, dst = os.path.join(root, f), os.path.join(dst_dir, f)
            relf = os.path.normpath(os.path.join(rel, f))
            # 新文件一律拷；已存在的只有 --force 时覆盖 src/lib 和 scripts（升级组件库）。src/segs、src/data、BRIEF 永不覆盖。
            if not os.path.exists(dst) or (force and relf.startswith(('src/lib', 'scripts'))):
                shutil.copy2(src, dst)
    for d in ('src/entries', 'src/data', 'public/st', 'public/logo', 'public/audio', 'out/qa', 'work'):
        os.makedirs(os.path.join(out, d), exist_ok=True)
    return fresh


def get_asr(a, out, video):
    if a.asr:
        return json.load(open(a.asr))
    cache = os.path.join(out, 'work', 'asr.json')
    if os.path.exists(cache) and not a.retranscribe:
        print('复用已有转写', cache)
        return json.load(open(cache))
    if not a.transcribe:
        raise SystemExit('没有逐字时间：给 --asr <精剪成片的 asr.json>，或加 --transcribe 现场转写（约为片长的 1/3–1/2 时间）')
    if not os.path.exists(CUT_SPEECH):
        raise SystemExit(f'找不到 {CUT_SPEECH}（ajiang-koubo-cut 的转写脚本）。装好该 skill，或自己用 faster-whisper 出带 words 的 json 再传 --asr')
    prompt = a.prompt or '简体中文。'
    cmd = ['uv', 'run', '--with', 'faster-whisper', '--with', 'numpy', 'python', CUT_SPEECH, 'transcribe', video, '--out', cache, '--prompt', prompt]
    if not shutil.which('uv'):
        cmd = [sys.executable, CUT_SPEECH, 'transcribe', video, '--out', cache, '--prompt', prompt]
    run(cmd)
    return json.load(open(cache))


def voice_lufs(video):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', video, '-vn', '-af', 'loudnorm=print_format=summary', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    m = re.search(r'Input Integrated:\s+([-\d.]+)', r)
    return float(m.group(1)) if m else None


STUB = """import React from 'react';
import {{ Headline, Kicker, Sfx, Shot }} from '../lib';

// {key} · {title}（{seconds}s，字幕 #{c0}–#{c1}）—— 负责这一章的 agent 改写本文件；私有组件放 src/segs/{key}/。
// 时间一律用 say('{key}', '词') / cue('{key}', '字幕原文') 锚到口播，不手写秒数。
// 段首段尾握手：0.3–0.5s 内容入场；最后一个 Shot 用 exit='fade'、to ≈ 段长 + outDur/2 − 0.1，最后 2–4 帧是纯空舞台。
export const sfx: Sfx[] = [];

const Seg{n}: React.FC = () => (
  <Shot from={{0}} to={{{seconds} + 0.3}} enter="fade" exit="fade">
    <Kicker text="{key} · 占位" x={{140}} y={{120}} t0={{0.1}} size={{26}} />
    <Headline text={{{title_json}}} x={{960}} y={{460}} align="center" size={{96}} t0={{0.2}} />
  </Shot>
);
export default Seg{n};
"""

ENTRY = """import React from 'react';
import {{ Composition, registerRoot }} from 'remotion';
import Content, {{ sfx }} from '../segs/Seg{n}';
import {{ makeSeg }} from '../lib/Seg';

// 每段独立入口：still/preview 只打包这一段，9 个 agent 并行渲染互不干扰。由 init_project.py 生成，别手改。
const Comp = makeSeg('{key}', Content, sfx);
registerRoot(() => <Composition id="{key}" component={{Comp}} durationInFrames={{{frames}}} fps={{{fps}}} width={{1920}} height={{1080}} />);
"""

SAMPLE_ENTRY = """import React from 'react';
import {{ Composition, registerRoot }} from 'remotion';
import Sample from '../segs/Sample';
import {{ sfx }} from '../segs/Seg0';
import {{ makeSeg }} from '../lib/Seg';

// 风格样板 = 第一章：Sample.tsx 只重导出 Seg0（第 4 期起），时长和音效跟 seg0 一致。
const Comp = makeSeg('seg0', Sample, sfx);
registerRoot(() => <Composition id="sample" component={{Comp}} durationInFrames={{{frames}}} fps={{{fps}}} width={{1920}} height={{1080}} />);
"""


def write_code(out, segs, fps):
    imports, comps = [], []
    for s in segs:
        n, key = s['key'][3:], s['key']
        p = os.path.join(out, 'src', 'segs', f'Seg{n}.tsx')
        if not os.path.exists(p):
            open(p, 'w').write(STUB.format(key=key, n=n, title=s['title'], title_json=json.dumps(s['title'], ensure_ascii=False), seconds=s['seconds'], c0=s['cues'][0]['n'], c1=s['cues'][-1]['n']))
        open(os.path.join(out, 'src', 'entries', f'{key}.tsx'), 'w').write(ENTRY.format(key=key, n=n, frames=s['frames'], fps=fps))
        imports.append(f"import S{n}, {{ sfx as x{n} }} from './segs/Seg{n}';")
        comps.append(f'    <Composition id="{key}" component={{makeSeg(\'{key}\', S{n}, x{n})}} durationInFrames={{{s["frames"]}}} fps={{{fps}}} width={{1920}} height={{1080}} />')
    open(os.path.join(out, 'src', 'entries', 'sample.tsx'), 'w').write(SAMPLE_ENTRY.format(fps=fps, frames=segs[0]['frames']))
    open(os.path.join(out, 'src', 'index.tsx'), 'w').write(
        "import React from 'react';\nimport { Composition, registerRoot } from 'remotion';\nimport { makeSeg } from './lib/Seg';\nimport Sample from './segs/Sample';\n"
        + '\n'.join(imports)
        + "\n\n// 全部段落（render.mjs / reaudio.mjs / Studio 用）。由 init_project.py 生成，别手改。\nregisterRoot(() => (\n  <>\n"
        + '\n'.join(comps)
        + f"\n    <Composition id=\"sample\" component={{makeSeg('seg0', Sample, x{segs[0]['key'][3:]})}} durationInFrames={{{segs[0]['frames']}}} fps={{{fps}}} width={{1920}} height={{1080}} />\n  </>\n));\n")
    # 已不存在的段：清掉旧入口（章节数变少时）
    keys = {s['key'] for s in segs}
    for f in os.listdir(os.path.join(out, 'src', 'entries')):
        if f.startswith('seg') and f[:-4] not in keys:
            os.remove(os.path.join(out, 'src', 'entries', f))


def write_audio(out, segs, fps, video, force):
    for s in segs:
        ss, d = s['from'] / fps, s['frames'] / fps
        v = os.path.join(out, 'public', 'audio', f"voice-{s['key']}.wav")
        b = os.path.join(out, 'public', 'audio', f"bgm-{s['key']}.wav")
        if force or not os.path.exists(v):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{ss:.6f}', '-t', f'{d:.6f}', '-i', video, '-vn', '-ac', '2', '-ar', '48000', v], check=True)
        if not os.path.exists(b):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-t', f'{d:.6f}', '-i', 'anullsrc=r=48000:cl=stereo', b], check=True)


# ---------- node_modules ----------
def env_ok(nm):
    missing = [p for p in NEED if not os.path.exists(os.path.join(nm, p, 'package.json'))]
    return missing


def esbuild_ok(nm):
    r = subprocess.run(['node', '-e', "require('esbuild').transformSync('let a: number = 1', {loader: 'ts'}); console.log('esbuild ok')"],
                       cwd=os.path.dirname(nm), capture_output=True, text=True)
    return r.returncode == 0


def ensure_env(env_dir):
    nm = os.path.join(env_dir, 'node_modules')
    if os.path.isdir(nm) and not env_ok(nm) and esbuild_ok(nm):
        print('共享环境已就绪（依赖清单齐全、esbuild 可用）：', nm)
        return nm
    os.makedirs(env_dir, exist_ok=True)
    shutil.copy2(os.path.join(TEMPLATE, 'package.json'), os.path.join(env_dir, 'package.json'))
    lock = os.path.join(TEMPLATE, 'package-lock.json')
    if os.path.exists(lock):
        shutil.copy2(lock, os.path.join(env_dir, 'package-lock.json'))
        run(['npm', 'ci', '--no-audit', '--no-fund'], cwd=env_dir)
    else:
        run(['npm', 'install', '--no-audit', '--no-fund'], cwd=env_dir)
    # npm 11 默认拦截依赖的 install scripts（会打印 "npm warn install-scripts esbuild ... postinstall"）。
    # esbuild 的 postinstall 只是校验/链接平台二进制；补跑一次，再实测能不能转译。
    esb = os.path.join(nm, 'esbuild', 'install.js')
    if os.path.exists(esb):
        subprocess.run(['node', esb], cwd=env_dir)
    if not esbuild_ok(nm):
        raise SystemExit(f'esbuild 不可用：cd {env_dir} && npm install-scripts approve esbuild && npm rebuild esbuild')
    missing = env_ok(nm)
    if missing:
        raise SystemExit(f'依赖不全：{missing}')
    print('依赖清单检查通过：', ', '.join(NEED))
    return nm


def ensure_chrome(nm, extra):
    """Remotion 第一次渲染会往 node_modules/.remotion 下载 Chrome Headless Shell（约 170MB，网慢时十几分钟；
    试跑时一次卡在 19MB/171MB）。同版本的已经在别处下过就直接克隆过来。"""
    f = os.path.join(nm, '@remotion', 'renderer', 'dist', 'browser', 'get-chrome-download-url.js')
    m = re.search(r"TESTED_VERSION = '([^']+)'", open(f).read()) if os.path.exists(f) else None
    if not m:
        return
    want = m.group(1)
    dst = os.path.join(nm, '.remotion', 'chrome-headless-shell')
    ver = lambda d: open(os.path.join(d, 'VERSION')).read().strip() if os.path.exists(os.path.join(d, 'VERSION')) else ''
    if ver(dst).startswith(want):
        return
    cands = list(extra) + glob.glob(os.path.join(CACHE_ROOT, 'env-*', 'node_modules', '.remotion', 'chrome-headless-shell')) \
        + glob.glob(os.path.expanduser('~/.cache/ajiang-koubo-broll/env-*/node_modules/.remotion/chrome-headless-shell'))
    for c in cands:
        if os.path.realpath(c) != os.path.realpath(dst) and ver(c).startswith(want):
            shutil.rmtree(dst, ignore_errors=True)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if subprocess.run(['cp', '-cR', c, dst]).returncode != 0:  # APFS 克隆，秒级、不占空间
                shutil.copytree(c, dst, symlinks=True)
            print(f'Chrome Headless Shell {want} ← {c}')
            return
    print(f'提示：第一次渲染会下载 Chrome Headless Shell {want}（约 170MB）。机器上已有同版本时用 --chrome-from <…/node_modules/.remotion/chrome-headless-shell> 省掉下载')


def link_node_modules(out, target):
    nm = os.path.join(out, 'node_modules')
    if os.path.islink(nm):
        os.remove(nm)
    elif os.path.exists(nm):
        print('工程里已有真实 node_modules，保留不动')
        return
    os.symlink(os.path.realpath(target), nm)
    print('node_modules →', os.path.realpath(target))


def setup_node(out, a):
    h = hashlib.sha1(open(os.path.join(TEMPLATE, 'package.json'), 'rb').read())
    lock = os.path.join(TEMPLATE, 'package-lock.json')
    if os.path.exists(lock):
        h.update(open(lock, 'rb').read())
    tpl_hash = h.hexdigest()[:10]
    if a.link_node_modules:
        missing = env_ok(a.link_node_modules)
        if missing:
            raise SystemExit(f'{a.link_node_modules} 缺依赖 {missing}（第 3 期的 broll-v3 能跑是因为软链到的旧工程刚好装了 @remotion/fonts）')
        if not esbuild_ok(a.link_node_modules):
            raise SystemExit(f'{a.link_node_modules} 里 esbuild 不可用')
        link_node_modules(out, a.link_node_modules)
        # 不往别人的 node_modules 里写 Chrome（那可能是上一期工程）；没有就让第一次渲染自己下载，或改用 --env shared
        print('（--link-node-modules：不改动被链接的目录；缺 Chrome 时第一次渲染会自己下载）')
    elif a.env == 'local':
        run(['npm', 'install', '--no-audit', '--no-fund'], cwd=out)
        esb = os.path.join(out, 'node_modules', 'esbuild', 'install.js')
        if os.path.exists(esb):
            subprocess.run(['node', esb], cwd=out)
    elif a.env == 'none':
        print('跳过 node_modules（--env none）')
    else:
        env_dir = a.env if a.env not in ('shared',) else os.path.join(CACHE_ROOT, f'env-{tpl_hash}')
        nm = ensure_env(os.path.abspath(env_dir))
        ensure_chrome(nm, a.chrome_from)
        link_node_modules(out, nm)


def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'list':
        p = argparse.ArgumentParser()
        p.add_argument('cmd')
        p.add_argument('--srt', required=True)
        cmd_list(p.parse_args())
        return
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--out', required=True)
    p.add_argument('--srt', required=True, help='精剪成片的 SRT（和视频同一时间轴）')
    p.add_argument('--master', '--video', dest='master', required=True, help='精剪成片 mp4，或纯口播音频 mp3/wav/m4a（取帧率/总帧数/口播切片/口播响度）')
    p.add_argument('--fps', type=int, help='纯音频母版的帧率（默认 60）；视频母版是非整数帧率时，问过用户后用它指定')
    p.add_argument('--chapters', required=True, help='chapters.json')
    p.add_argument('--asr', help='精剪成片的 faster-whisper 转写（segments[].words[]）；ajiang-koubo-cut 的 work/edited-asr.json 就是')
    p.add_argument('--transcribe', action='store_true', help='没有 ASR 时现场转写（调 ajiang-koubo-cut/scripts/speech.py）')
    p.add_argument('--retranscribe', action='store_true')
    p.add_argument('--prompt', help='转写提示词：简体中文。<本期专名词表>')
    p.add_argument('--scale', type=float, default=2, help='成片 = 1920×1080 × scale（默认 2 → 4K）')
    p.add_argument('--safe', help='安全区 JSON（默认右上角头像圆 + 底部一行字幕，见 meta.json）')
    p.add_argument('--env', default='shared', help='shared（默认，~/.cache 共享一份）| local（工程内 npm install）| none | <目录>')
    p.add_argument('--link-node-modules', help='直接软链已有 node_modules（要求同版本、含 @remotion/fonts）')
    p.add_argument('--chrome-from', action='append', default=[], help='已下载的同版本 chrome-headless-shell 目录（省掉首次渲染的 170MB 下载）')
    p.add_argument('--force', action='store_true', help='覆盖 src/lib 和 scripts 为模板最新版（不动 segs）；并重切口播')
    p.add_argument('--no-tsc', action='store_true')
    p.add_argument('--git', action='store_true', help='git init + 提交一次快照（可选；章节 agent 不碰 git）')
    a = p.parse_args()

    out = os.path.abspath(a.out)
    video, srt = os.path.abspath(a.master), os.path.abspath(a.srt)
    info = probe(video, a.fps)
    if info['audio_only']:
        print(f"母版是纯音频（{info['duration']:.2f}s），按 {info['fps']}fps 换算帧号（--fps 可改）")
    elif not a.fps and (abs(info['fps'] - round(info['fps'])) > 0.01 or abs(info['avg_fps'] - info['fps']) > 0.05):
        raise SystemExit(f"母版帧率 {info['fps']:.3f}（平均 {info['avg_fps']:.3f}）不是恒定整数帧率：停下来问用户按多少 fps 做（再用 --fps 指定），或先转 CFR")
    fps = round(info['fps'])
    cues = parse_srt(srt)
    chapters = json.load(open(a.chapters, encoding='utf-8'))
    segs = build_segments(cues, chapters, fps, info['frames'])
    for s_ in segs:
        if s_['seconds'] < 15 or s_['seconds'] > 60:
            print(f"⚠ {s_['key']}「{s_['title']}」{s_['seconds']:.1f}s：建议每章 20–55 秒（<15s 并进相邻章，>60s 拆开）")

    fresh = copy_template(out, a.force)
    shutil.copy2(a.chapters, os.path.join(out, 'work', 'chapters.json'))
    asr = get_asr(a, out, video)
    timing, hit, total, med = align_chars(segs, asr, fps)
    json.dump(timing, open(os.path.join(out, 'src', 'data', 'timing.json'), 'w'), ensure_ascii=False)
    rate = hit / max(total, 1)
    print(f'timing.json：{len(segs)} 段，逐字命中 {hit}/{total}（{rate:.0%}），ASR−SRT 中位偏移 {med:+.2f}s' if med is not None else f'逐字命中 {hit}/{total}')
    if rate < 0.6:
        print('⚠ 命中率低于 60%：ASR 多半不是这条精剪成片的转写（比如用了原始录音的 asr.json）。say() 会退化成按字幕均分。')

    meta_p = os.path.join(out, 'src', 'data', 'meta.json')
    old = json.load(open(meta_p)) if os.path.exists(meta_p) else {}
    lufs = old.get('voiceLUFS') if not fresh and old.get('master') == video and old.get('voiceLUFS') else voice_lufs(video)
    meta = {
        'fps': fps, 'design': {'w': 1920, 'h': 1080},
        'output': {'w': round(1920 * a.scale), 'h': round(1080 * a.scale), 'scale': a.scale},
        'master': video, 'masterAudioOnly': info['audio_only'], 'masterSize': [info['width'], info['height']], 'masterFrames': info['frames'], 'srt': srt,
        'voiceLUFS': lufs, 'bgmBelowVoice': 16,
        'safe': json.loads(a.safe) if a.safe else old.get('safe', DEFAULT_SAFE),
        'segments': [{k: s[k] for k in ('key', 'title', 'from', 'to', 'frames', 'outName', 'cueRange')} for s in segs],
    }
    json.dump(meta, open(meta_p, 'w'), ensure_ascii=False, indent=1)
    write_table(segs, fps, os.path.basename(srt), os.path.join(out, '替换对照表.txt'))
    write_code(out, segs, fps)
    write_audio(out, segs, fps, video, a.force)
    setup_node(out, a)

    if not a.no_tsc and os.path.exists(os.path.join(out, 'node_modules')):
        r = subprocess.run(['npx', 'tsc', '-p', '.'], cwd=out, capture_output=True, text=True)
        print('tsc 通过' if r.returncode == 0 else 'tsc 报错：\n' + (r.stdout + r.stderr)[-3000:])
    if a.git:
        if not os.path.isdir(os.path.join(out, '.git')):
            subprocess.run(['git', 'init', '-q'], cwd=out)
        subprocess.run(['git', 'add', '-A'], cwd=out)
        subprocess.run(['git', '-c', 'user.name=broll', '-c', 'user.email=broll@localhost', 'commit', '-qm', 'init_project'], cwd=out)
    print(f'\n工程：{out}')
    for s in segs:
        print(f"  {s['key']:>5}  {s['srt'][0]} → {s['srt'][1]}  {s['seconds']:6.2f}s  字幕#{s['cueRange'][0]}-{s['cueRange'][1]}  {s['title']}")
    print(f"口播响度 {lufs} LUFS；成片 {meta['output']['w']}×{meta['output']['h']}@{fps}")
    try:
        if json.load(open(os.path.join(out, 'src', 'data', 'tokens.json'))).get('_default'):
            print('⚠ src/data/tokens.json 还是模板默认值：extract_tokens.py 抽本期产品的 tokens')
    except Exception:
        pass
    try:
        if 'ajiang-placeholder' in open(os.path.join(out, 'public', 'logo', 'wordmark.svg')).read():
            print('⚠ public/logo/wordmark.svg 还是占位字标：extract_tokens.py --wordmark 抽官网字标，或换成产品名的文字 svg')
    except Exception:
        pass
    print('下一步：找产品源码和主视觉 → capture.py 截网页（入库即 mosaic.py --scan）→ extract_tokens.py → fetch_logos.py --dark → 写四张表（悬念 / 逐句镜头 / 口径 / 用词）→ 主控亲自做 src/segs/Seg0.tsx（第一章 = 样板，Sample 只重导出它）→ node scripts/still.mjs seg0 … → 停，发第一章给用户确认一次 → 填 BRIEF.md → 派其余章节 agent')


if __name__ == '__main__':
    main()
