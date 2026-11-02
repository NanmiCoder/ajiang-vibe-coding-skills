#!/usr/bin/env python3
"""拷到交付目录 + 替换对照表 + 音乐与音效来源 + 剪映贴法。先跑 check.py 全部通过再交付。

  python3 deliver.py --project <工程> --to <精剪交付目录>/B-roll成片

交付目录结构（第 3 期用户认可的样子）：
  <to>/<序号>_<标题>_<SRT起>~<SRT止>_字幕a-b.mp4     带配乐 + 音效，不含口播
  <to>/无配乐版/<同名>.mp4                           只有音效（用户想自己配乐时整段替换）
  <to>/替换对照表.txt  音乐与音效来源.txt  剪映贴法.txt
  <to>/B-roll全片_4K_配乐音效_不含口播.mp4   全部分段按 meta.json 顺序拼成一整条（concat demuxer，画面 -c copy，音频重编 AAC 320k）
  <to>/预览_B-roll加口播_1080p.mp4           全片缩到 1920×1080 + meta.master 的口播混进去（只用来快速过一遍）
  全片两条默认生成（--no-full 关掉）；校验全片视频帧数 = meta.masterFrames。剪映贴法.txt 末尾自动写上这两条的用法。
"""
import argparse
import json
import os
import shutil
import subprocess

FULL = 'B-roll全片_4K_配乐音效_不含口播.mp4'
PREVIEW = '预览_B-roll加口播_1080p.mp4'

GUIDE = """剪映贴法（{n} 段首尾相接，正好铺满整条精剪 00:00 → {end}）

1. 工程设置：画布 16:9，帧率 {fps}fps（B-roll 是 {fps}fps，工程同帧率，段与段的接缝才对得上帧）。
2. 轨道：口播精剪视频留在主轨。把这 {n} 个分段文件（数字开头的）全选，拖到它上面一条画中画轨，从 0 秒开始、首尾吸附。
   文件名以 0–{last} 开头，按顺序拖进去就是对的。放好后对一下「替换对照表.txt」：比如第 1 段应该从 {s1} 开始。
3. 画面：每段都铺满整个 16:9 画面，口播原画会被完全盖住。
4. 头像：把口播视频再复制一层放在最上面，加圆形蒙版，缩小放到右上角（B-roll 在那块一直留空：
   1920×1080 坐标里大约 x{ax}–{ax2}、y{ay}–{ay2} 的圆）。
5. 字幕：导入「{srt}」。B-roll 底部留了一行字幕位置（约 y{sy}–{sy2}）。
6. 声音：口播用原轨。B-roll 自带配乐和音效（整体比口播低约 {below} LU），直接保留；
   想自己配乐就用「无配乐版/」里的同名文件替换（只有音效）。音效嫌吵就把 B-roll 轨音量拉低。
"""

GUIDE_FULL = """
7. 一整条全片（可选，代替第 2 步的 {n} 段）：「{full}」是这 {n} 段按顺序拼好的一条
   （{w}×{h} {fps}fps，{frames} 帧 = 精剪全长 {end}，带配乐 + 音效、不含口播）。从 0 秒拖到画中画轨就和分段效果一样；
   分段和全片二选一，别两样都拖。要换某一段时还是用分段文件盖上去。
"""
GUIDE_PREVIEW = """
8. 先看效果：「{preview}」= 全片缩到 1920×1080，再把口播原声混进去（口播 + 配乐 + 音效）。
   只用来快速过一遍画面和口播对不对得上，不要拖进剪映工程（画质是预览级，声音里已经有口播，会和主轨口播叠成两层）。
"""


def frames_of(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets',
                        '-of', 'csv=p=0', p], capture_output=True, text=True)
    return int(r.stdout.strip() or 0)


def build_full(P, D, M, T):
    """(a) 4K 全片：concat demuxer 拼 out/final 分段，画面 -c copy、音频重编 AAC 320k，校验帧数 = meta.masterFrames；
    (b) 1080p 预览：(a) 缩到 1920×1080 + meta.master 的口播，amix 不归一化，以全片长度为准。返回实际生成的文件名。"""
    segs = M.get('segments') or list(T['segments'].values())
    srcs = [os.path.join(P, 'out', 'final', s['outName'] + '.mp4') for s in segs]
    tmp = os.path.join(P, 'out', 'tmp')
    os.makedirs(tmp, exist_ok=True)
    lst = os.path.join(tmp, 'concat-full.txt')
    with open(lst, 'w', encoding='utf-8') as f:
        for p in srcs:
            f.write("file '" + p.replace("'", "'\\''") + "'\n")
    full = os.path.join(D, FULL)
    print(f'拼全片：{len(srcs)} 段 → {FULL}')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-map', '0:v', '-map', '0:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', full], check=True)
    want = M.get('masterFrames') or sum(s['frames'] for s in segs)
    got = frames_of(full)
    if got != want:
        raise SystemExit(f'全片帧数 {got} ≠ meta.masterFrames {want}：分段有缺帧/多帧，先跑 check.py 查是哪段（全片留在 {full} 供排查）')
    print(f'  ✓ 全片 {got} 帧 = masterFrames {want}')
    made = [FULL]
    master = M.get('master')
    if not master or not os.path.exists(master):
        print(f'  ! 没有口播母版（meta.master={master!r}），跳过 {PREVIEW}')
        return made
    print(f'出预览：{PREVIEW}（4K 解码 + 1080p 编码，6 分钟的片约几分钟）')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', full, '-i', master, '-filter_complex',
                    '[0:v]scale=1920:1080:flags=lanczos[v];[0:a][1:a]amix=inputs=2:normalize=0:duration=first[a]',
                    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', os.path.join(D, PREVIEW)], check=True)
    pf = frames_of(os.path.join(D, PREVIEW))
    print(f'  ✓ 预览 {pf} 帧' + ('' if pf == got else f'（≠ 全片 {got}，检查口播母版）'))
    return made + [PREVIEW]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', default='.')
    ap.add_argument('--to', required=True)
    ap.add_argument('--skip-check', action='store_true')
    ap.add_argument('--dry-run', action='store_true', help='只写三个说明文件，不拷视频（先看文字对不对）')
    ap.add_argument('--overwrite', action='store_true', help='交付目录里已有 mp4 时允许覆盖（必须先问过用户）')
    ap.add_argument('--no-full', action='store_true', help=f'不生成 {FULL} 和 {PREVIEW}')
    a = ap.parse_args()
    P = os.path.abspath(a.project)
    if not a.skip_check and not a.dry_run:
        r = subprocess.run(['python3', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'check.py'), '--project', P])
        if r.returncode != 0:
            raise SystemExit('check.py 没通过，先修（或确认后 --skip-check）')
    T = json.load(open(os.path.join(P, 'src', 'data', 'timing.json')))
    M = json.load(open(os.path.join(P, 'src', 'data', 'meta.json')))
    segs = list(T['segments'].values())
    fps = T['fps']
    D = os.path.abspath(a.to)
    old_mp4 = [f for f in os.listdir(D) if f.endswith('.mp4')] if os.path.isdir(D) else []
    if old_mp4 and not a.overwrite and not a.dry_run:
        raise SystemExit(f'交付目录已有 {len(old_mp4)} 个 mp4（{D}）：这是停点——先问用户覆盖还是另建目录（如 B-roll成片-v2），确认后加 --overwrite')
    os.makedirs(os.path.join(D, '无配乐版'), exist_ok=True)
    missing = [f"{sub}/{s['outName']}.mp4" for s in segs for sub in ('out/final', 'out/final-nobgm') if not os.path.exists(os.path.join(P, sub, s['outName'] + '.mp4'))]
    if missing and not a.dry_run:
        raise SystemExit('缺成片：\n  ' + '\n  '.join(missing))
    for s in ([] if a.dry_run else segs):
        for sub, dst in (('out/final', D), ('out/final-nobgm', os.path.join(D, '无配乐版'))):
            src = os.path.join(P, sub, s['outName'] + '.mp4')
            out = os.path.join(dst, s['outName'] + '.mp4')
            shutil.copy2(src, out)
            assert os.path.getsize(src) == os.path.getsize(out), out
    full_made = [] if a.no_full or a.dry_run else build_full(P, D, M, T)
    if a.dry_run and not a.no_full:
        full_made = [FULL, PREVIEW] if M.get('master') else [FULL]  # dry-run 只看说明文字
    shutil.copy2(os.path.join(P, '替换对照表.txt'), os.path.join(D, '替换对照表.txt'))
    cp = os.path.join(P, 'src', 'data', 'credits.json')
    cr = json.load(open(cp)) if os.path.exists(cp) else {}
    lines = []
    if cr.get('bgm'):
        lines.append('配乐：' + cr['bgm'])
    fc = os.path.join(P, 'public', 'sfx', 'src', 'FREESOUND-CREDITS.md')
    lines.append('音效：Freesound（来源与许可见下；CC0 无需署名，CC BY 需在简介署名）。chime / alert 的音调部分为本地合成。')
    if os.path.exists(fc):
        rp = os.path.join(P, 'public', 'sfx', 'recipe.json')
        used = {r.get('src') for k, r in json.load(open(rp)).items() if isinstance(r, dict)} if os.path.exists(rp) else None
        blocks = open(fc).read().split('~~~text')
        for b in blocks[1:]:
            b = b.split('~~~')[0].strip()
            if used is None or b.split(' ')[0] in used:
                lines.append('  ' + b.replace('\n', '\n  '))
    for k, v in cr.items():
        if k != 'bgm':
            lines.append(f'{k}：{v}')
    lines.append('无配乐版/：同一画面，音频只有音效，方便自己配乐。')
    open(os.path.join(D, '音乐与音效来源.txt'), 'w').write('\n'.join(lines))
    end = segs[-1]['from'] + segs[-1]['frames']
    av, sb = M['safe']['avatar'], M['safe']['subtitle']
    t = lambda f: f'{f // (60 * fps):02d}:{f // fps % 60:02d}.{round((f % fps) * 1000 / fps):03d}'
    open(os.path.join(D, '剪映贴法.txt'), 'w').write(GUIDE.format(
        n=len(segs), end=t(end), fps=fps, last=len(segs) - 1, s1=t(segs[1]['from']) if len(segs) > 1 else '00:00.000',
        ax=av['x'], ax2=av['x'] + av['w'], ay=av['y'], ay2=av['y'] + av['h'], sy=sb['y'], sy2=sb['y'] + sb['h'],
        srt=os.path.basename(M.get('srt', '精剪.srt')), below=M.get('bgmBelowVoice', 16)) +
        (GUIDE_FULL.format(n=len(segs), full=FULL, w=M['output']['w'], h=M['output']['h'], fps=fps,
                           frames=M.get('masterFrames') or end, end=t(end)) if FULL in full_made else '') +
        (GUIDE_PREVIEW.format(preview=PREVIEW) if PREVIEW in full_made else ''))
    print(('（dry-run，只写了说明文件）' if a.dry_run else f'已交付 {len(segs)}×2 个分段' + (' + ' + ' + '.join(full_made) if full_made else '')) + f' → {D}')
    print('回复用户时：列文件、说明验证了什么（帧数/命名/响度/段尾/接缝亮度/全片帧数/二维码抽帧）、没验证什么（没有逐条试听）。')


if __name__ == '__main__':
    main()
