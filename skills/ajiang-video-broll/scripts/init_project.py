#!/usr/bin/env python3
"""初始化（或更新）一个包装工程。

  python3 init_project.py --srt 视频.srt --out <工程目录> \
      --seg "00:00:00-00:16:00=开场" --seg "03:23:06-03:32:15=Case01耳机官网|01" ... \
      [--video 母版.mov] [--proxy] [--no-install] [--theme sketch:ochre] [--from <上一期工程>]

做的事：
  1. 复制 assets/starter 到 <工程目录>（已存在的工程只更新数据，不覆盖源码）
  2. 生成 src/segments.json 和 替换对照表.txt（scripts/srt_segments.py build）
  3. 从母版切出每段的口播 public/footage/<key>.wav（Studio 里对口型用，不进成片）
  4. --proxy：生成整条 1080p 代理 public/footage/master-proxy.mp4，供 Full 合成预览（4K 母版要几分钟）
  5. npm install（含 esbuild 的 postinstall 补跑）并下载字体子集
  --theme 主题[:变体]：走 broll 路线（推荐）。写 src/broll/theme.lock.json，拷 Broll.tsx，
          把每段登记成 makeBroll，生成 broll/scenes.js 起步文件和静音占位混音，最后跑 build_broll.py --both
  --from <上一期/上一段工程>：用户说“同样的方式”时用。软链 node_modules（不再 npm i），
          拷字体子集和主题锁（没给 --theme 时沿用上一个工程的主题）
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

ENGINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'engine')

HERE = os.path.dirname(os.path.abspath(__file__))
STARTER = os.path.join(HERE, '..', 'assets', 'starter')


def run(cmd, **kw):
    print('$', ' '.join(cmd))
    subprocess.run(cmd, check=True, **kw)


SCENES_STARTER = """/* B-roll 场景（1920×1080 设计坐标，×2 = 4K）。预览页和成片共用这一份。
   版面铺满，只避开实测的头像圆和那一行字幕（broll/overlay.json，默认 414 期实测值）。
   时间：cue = 这句字幕开口时进场景（lead 可提前）；until = 那句开口时结束；不写 to 就接到下一场景。
   动画：H.A(类型, 场景内秒, 时长)；类型 fade up mask pop slam stamp drop lift spin wipe wipeY bar draw type flicker rgb。
   声音：sfx:[[场景内秒, 语义事件, 增益]]，事件 enter card deal stamp check key reveal type count draw mark
         transition slide hit scan shot warn —— 由主题的 sound.sfx 换成具体音色，换主题声音跟着换。
   资源：__BASE__xxx = broll/assets/xxx；视频用 H.clip(name, off, inp)（先跑 extract_clips.py）。 */
var H = BrollCore.H, A = H.A, pos = H.pos, box = H.box;

var SEGS = {
%s
};
"""

SEG_STARTER = """  %(key)s: {
    label: '%(label)s',
    scenes: [
      {
        name: '开场', cue: '%(cue)s',
        sfx: [[0.2, 'enter', .5], [1.0, 'stamp', .5]],
        build: function () {
          return H.title('%(kick)s', '%(title)s', .1, 96) +
            '<div class="abs body muted"' + A('up', .5) + ' style="' + pos(90, 330) + 'max-width:1100px">' + '%(cue)s' + '</div>' +
            H.stamp('示例', 1.0, 1200, 560, 64, -8);
        }
      }
    ]
  }"""


def setup_broll(out, data, theme_arg):
    """broll 路线：主题锁、Broll.tsx、段登记、scenes.js 起步文件、静音占位混音。"""
    sb = os.path.join(out, 'src', 'broll')
    os.makedirs(sb, exist_ok=True)
    os.makedirs(os.path.join(out, 'broll', 'assets'), exist_ok=True)
    if theme_arg:
        tid, _, var = theme_arg.partition(':')
        if not os.path.exists(os.path.join(HERE, '..', 'assets', 'themes', tid, 'theme.json')):
            sys.exit(f'没有主题 {tid}（看 assets/themes/）')
        th = json.load(open(os.path.join(HERE, '..', 'assets', 'themes', tid, 'theme.json'), encoding='utf-8'))
        var = var or next((k for k, v in th['variants'].items() if v.get('default')), next(iter(th['variants'])))
        json.dump({'theme': tid, 'variant': var}, open(os.path.join(sb, 'theme.lock.json'), 'w'), indent=1)
    shutil.copy2(os.path.join(ENGINE, 'Broll.tsx'), os.path.join(sb, 'Broll.tsx'))
    for name, body in (('fonts.json', '[]'), ('clips.json', '{}')):
        if not os.path.exists(os.path.join(sb, name)):
            open(os.path.join(sb, name), 'w').write(body)
    if not os.path.exists(os.path.join(out, 'src', 'fonts.json')):  # starter 的 fonts.ts 要它
        open(os.path.join(out, 'src', 'fonts.json'), 'w').write('[]')
    keys = [s['key'] for s in data['segments']]
    reg = "import React from 'react';\nimport {makeBroll} from '../broll/Broll';\n\n" \
          "// broll 路线：每段画面都来自 broll/scenes.js 里同名的 key（由 init_project.py 生成）\n" \
          "export type SegProps = {voice?: boolean};\n\nexport const registry: Record<string, React.FC<SegProps>> = {\n" + \
          ''.join(f"  {k}: makeBroll('{k}'),\n" for k in keys) + '};\n'
    open(os.path.join(out, 'src', 'segments', 'index.ts'), 'w', encoding='utf-8').write(reg)
    sc = os.path.join(out, 'broll', 'scenes.js')
    if not os.path.exists(sc):
        q = lambda x: x.replace('\\', '').replace("'", "’")
        segs = ',\n'.join(SEG_STARTER % {'key': s['key'], 'label': q(s['title']), 'cue': q(s['cues'][0]['text'] if s['cues'] else ''),
                                         'kick': f"PART {s['index'] + 1:02d}", 'title': q(s['title'])} for s in data['segments'])
        open(sc, 'w', encoding='utf-8').write(SCENES_STARTER % segs)
        print('已生成起步场景', sc)
    ad = os.path.join(out, 'public', 'audio')
    os.makedirs(ad, exist_ok=True)
    for s in data['segments']:
        w = os.path.join(ad, f"mix-{s['key']}.wav")
        if not os.path.exists(w):  # 静音占位：还没做声音时 Studio / still 也能跑
            run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', f"{s['frames'] / data['fps']:.6f}", w])


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--srt', required=True)
    p.add_argument('--video')
    p.add_argument('--fps', type=float)
    p.add_argument('--out', required=True, help='工程目录（建议用英文名，例如 <视频目录>/mg-remotion）')
    p.add_argument('--seg', action='append', required=True)
    p.add_argument('--proxy', action='store_true')
    p.add_argument('--no-install', action='store_true')
    p.add_argument('--theme', help='broll 路线的主题[:变体]，例如 paper-signal:signal / riso-print')
    p.add_argument('--from', dest='src_project', help='复用上一个工程的 node_modules、字体和主题')
    a = p.parse_args()

    out = os.path.abspath(a.out)
    fresh = not os.path.exists(os.path.join(out, 'package.json'))
    if fresh:
        if os.path.exists(out) and [f for f in os.listdir(out) if f != '.DS_Store']:
            sys.exit(f'{out} 不是空目录也不是已有工程，换一个目录')
        shutil.copytree(STARTER, out, dirs_exist_ok=True)
        print('已复制 starter →', out)
    else:
        print('已有工程，只更新数据：', out)

    cmd = [sys.executable, os.path.join(HERE, 'srt_segments.py'), 'build', '--srt', a.srt,
           '--out', os.path.join(out, 'src', 'segments.json'), '--table', os.path.join(out, '替换对照表.txt')]
    if a.video:
        cmd += ['--video', a.video]
    if a.fps:
        cmd += ['--fps', str(a.fps)]
    for s in a.seg:
        cmd += ['--seg', s]
    run(cmd)

    data = json.load(open(os.path.join(out, 'src', 'segments.json'), encoding='utf-8'))
    master = data['master']
    os.makedirs(os.path.join(out, 'public', 'footage'), exist_ok=True)
    if master:
        fps = data['fps']
        for s in data['segments']:
            dst = os.path.join(out, 'public', 'footage', f"{s['key']}.wav")
            run(['ffmpeg', '-v', 'error', '-y', '-ss', f"{s['from'] / fps:.6f}", '-i', master, '-t', f"{s['frames'] / fps:.6f}",
                 '-vn', '-ac', '2', '-ar', '48000', dst])
        if a.proxy:
            run(['ffmpeg', '-v', 'error', '-y', '-i', master, '-vf', 'scale=1920:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
                 '-g', '30', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
                 os.path.join(out, 'public', 'footage', 'master-proxy.mp4')])
    else:
        print('没找到母版视频：跳过口播切片。Studio 预览不会有人声。')

    prev = os.path.abspath(a.src_project) if a.src_project else None
    if prev:
        nm = os.path.join(out, 'node_modules')
        if not os.path.exists(nm) and os.path.isdir(os.path.join(prev, 'node_modules')):
            os.symlink(os.path.realpath(os.path.join(prev, 'node_modules')), nm)
            print('已软链 node_modules →', os.path.realpath(os.path.join(prev, 'node_modules')))
        for rel in ('src/broll/fonts.json', 'public/broll/fonts') + (() if a.theme else ('src/broll/theme.lock.json',)):
            s_, d_ = os.path.join(prev, rel), os.path.join(out, rel)
            if os.path.exists(s_) and not os.path.exists(d_):
                os.makedirs(os.path.dirname(d_), exist_ok=True)
                (shutil.copytree if os.path.isdir(s_) else shutil.copy2)(s_, d_)
                print('已从上一个工程拷贝', rel)
    lock_p = os.path.join(out, 'src', 'broll', 'theme.lock.json')
    broll = bool(a.theme) or os.path.exists(lock_p)
    if broll:
        setup_broll(out, data, a.theme)

    if not a.no_install and fresh and not prev:
        run(['npm', 'i'], cwd=out)
        esb = os.path.join(out, 'node_modules', 'esbuild', 'install.js')
        if os.path.exists(esb):  # npm 的 allowScripts 可能拦掉 esbuild 的 postinstall
            run(['node', esb], cwd=out)
    if broll:
        if not a.no_install:
            run([sys.executable, os.path.join(HERE, 'fetch_fonts.py'), out])
        run([sys.executable, os.path.join(HERE, 'build_broll.py'), out, '--both'])
        print('\n完成（broll 路线）。下一步：')
        print(f'  写 {os.path.join(out, "broll", "scenes.js")}，素材放 broll/assets/，视频用 extract_clips.py')
        print(f'  python3 {os.path.join(HERE, "build_broll.py")} {out} --preview   # 出预览页，发 Artifact 给用户选主题、确认')
        return
    if not a.no_install:
        run(['node', 'scripts/fetch-fonts.mjs'], cwd=out)

    print('\n完成。下一步：')
    print(f'  python3 {os.path.join(HERE, "make_audio.py")} {out}     # 生成音效和配乐（需要 numpy/scipy/soundfile）')
    print(f'  cd {out} && npm run dev                                   # Studio 预览（未写的段显示占位页）')


if __name__ == '__main__':
    main()
