#!/usr/bin/env python3
"""缺素材时用 Codex CLI 的内置 image_gen 生图（并行、校验、坏图重试），可选黑底 → 透明（AE Unmult 做法）。

  python3 codex_image.py --project <工程> --spec work/gen.json [--jobs 5] [--alpha]
  python3 codex_image.py --project <工程> --name pelican-bike --subject "a toy pelican riding a bicycle, side view" --style "<风格>" [--ref 参考.png]

gen.json：{"style": "<统一风格串>", "items": {"pelican-bike": "a toy pelican riding a bicycle, side view", ...}, "refs": ["可选参考图"]}
输出：<工程>/work/gen/<name>.png（原图）→ 校验能打开 → 拷成 public/gen/<name>.webp（1024，组件里 staticFile('gen/<name>.webp')）；
      --alpha 时改成黑底 → 透明（Unmult），只给深色舞台用。
风格串里写 {surface} 会替换成本期 tokens 的 surface 色（默认风格就是「纯 surface 色底」，图放进 Card 里看不出底）。

命令本体（第 3 期实测可用，单张约 70s；并发 5 稳定）：
  codex exec --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox -C <输出目录> [-i 参考图] \\
    "Use your built-in image_gen tool to generate ONE image and save it in the current directory as <name>.png. \\
     Subject: <主体>. Style: <风格>. Do nothing else; reply with the saved file path."
坑：codex 偶尔报「generated, but couldn't save the complete file」、存出打不开的 png（第 3 期 22 张里 1 张：fingerprint；
    robot-chat 那次 UnidentifiedImageError 是生成还没跑完就去读了半截文件），所以每张都用 PIL 校验，坏的自动重试一次。

什么时候该用（别滥用）：
  - 该用：页面上没有、又必须有「具体物件」才讲得清的画面（例：口播说「画一只鹈鹕骑自行车」）；产品没有的插图、示意物件。
  - 不该用：装饰性 3D 道具、氛围图。第 3 期 v2 生成了 22 个深蓝发光 3D 道具铺满全片，用户「非常不满意」——v3 全部弃用。
  - logo / 品牌图标不要生成：用 fetch_logos.py（lobehub）或官网 svg。人像/封面不归这个 skill。
  - 风格串跟本期 tokens 走（浅底就要求 "isolated on pure white background, soft contact shadow"，不要黑底发光）。
    只有确实要叠在深色/复杂背景上时才用黑底 + --alpha。
"""
import argparse
import concurrent.futures as cf
import json
import os
import subprocess

PROMPT = ('Use your built-in image_gen tool to generate ONE image and save it in the current directory as {name}.png. '
          'Subject: {subject}. Style: {style}. Do nothing else; reply with the saved file path.')


def valid(p):
    try:
        from PIL import Image
        with Image.open(p) as im:
            im.verify()
        return True
    except Exception:
        return False


def gen_one(outdir, name, subject, style, refs, timeout):
    png = os.path.join(outdir, name + '.png')
    for attempt in (1, 2):
        if os.path.exists(png) and valid(png):
            return name, 'ok'
        if os.path.exists(png):
            os.remove(png)
        cmd = ['codex', 'exec', '--skip-git-repo-check', '--dangerously-bypass-approvals-and-sandbox', '-C', outdir]
        for r in refs:
            cmd += ['-i', r]
        cmd.append(PROMPT.format(name=name, subject=subject, style=style))
        with open(os.path.join(outdir, f'log-{name}.txt'), 'w') as log:
            try:
                subprocess.run(cmd, stdout=log, stderr=subprocess.STDOUT, timeout=timeout)
            except subprocess.TimeoutExpired:
                pass
    return name, 'ok' if os.path.exists(png) and valid(png) else 'FAILED（看 log-%s.txt）' % name


def unmult(src, dst, size=1024):
    import numpy as np
    from PIL import Image
    im = Image.open(src).convert('RGB').resize((size, size), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255.0
    al = a.max(axis=2)
    al = np.clip((al - 0.035) / 0.965, 0, 1)  # 压掉底噪
    al = np.clip(al * 1.35, 0, 1)  # 实体部分更实
    rgb = np.where(al[..., None] > 1e-4, np.clip(a / np.maximum(al[..., None], 1e-4), 0, 1), 0)
    o = np.concatenate([rgb, al[..., None]], axis=2)
    Image.fromarray((o * 255).astype(np.uint8), 'RGBA').save(dst, quality=92, method=5)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', required=True)
    ap.add_argument('--spec')
    ap.add_argument('--name')
    ap.add_argument('--subject')
    ap.add_argument('--style', default='clean product illustration, soft studio light, isolated on a solid {surface} background, soft contact shadow, no text, no letters, no logo, 1:1 square')
    ap.add_argument('--ref', action='append', default=[])
    ap.add_argument('--jobs', type=int, default=5)
    ap.add_argument('--timeout', type=int, default=300)
    ap.add_argument('--alpha', action='store_true', help='黑底 → 透明 webp（只给要叠在深色/复杂背景上的物件用）')
    a = ap.parse_args()
    P = os.path.abspath(a.project)
    outdir = os.path.join(P, 'work', 'gen')
    os.makedirs(outdir, exist_ok=True)
    if a.spec:
        spec = json.load(open(a.spec))
        style, items, refs = spec.get('style', a.style), spec['items'], spec.get('refs', []) + a.ref
    else:
        style, items, refs = a.style, {a.name: a.subject}, a.ref
    refs = [os.path.abspath(r) for r in refs]
    try:
        surface = json.load(open(os.path.join(P, 'src', 'data', 'tokens.json')))['color']['surface']
    except Exception:
        surface = '#FFFFFF'
    style = style.replace('{surface}', surface)
    with cf.ThreadPoolExecutor(a.jobs) as ex:
        for name, st in ex.map(lambda kv: gen_one(outdir, kv[0], kv[1], style, refs, a.timeout), items.items()):
            print(f'{st:6s} {name}')
            if st == 'ok':
                os.makedirs(os.path.join(P, 'public', 'gen'), exist_ok=True)
                dst = os.path.join(P, 'public', 'gen', name + '.webp')
                if a.alpha:
                    unmult(os.path.join(outdir, name + '.png'), dst)
                else:
                    from PIL import Image
                    Image.open(os.path.join(outdir, name + '.png')).convert('RGB').resize((1024, 1024), Image.LANCZOS).save(dst, quality=92, method=5)
                print(f'       → public/gen/{name}.webp')
    print(f'原图在 {outdir}；用 Read 逐张看一遍再用（风格不统一的重生成，不要在旧图上改）')


if __name__ == '__main__':
    main()
