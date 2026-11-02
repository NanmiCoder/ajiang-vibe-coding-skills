#!/usr/bin/env python3
"""列出 video-shotcraft 的镜头卡（名字 | 一句话 | 适用 | 时长），分章时给每章挑 1–2 张「主角卡」用。
  python3 <skill>/scripts/list_cards.py [关键词 ...]      # 例：list_cards.py 对比 报告 翻牌
卡全文：~/.claude/skills/video-shotcraft/references/shots/<类>/<卡>.md（装在别处时设环境变量 VIDEO_SHOTCRAFT 指向仓库目录）；准确实现：demos/<类>/<卡>/*.tsx
"""
import glob, os, re, sys
root = os.path.join(os.path.expanduser(os.environ.get('VIDEO_SHOTCRAFT', '~/.claude/skills/video-shotcraft')), 'references', 'shots')  # 装在别处时设 VIDEO_SHOTCRAFT
kw = sys.argv[1:]
for f in sorted(glob.glob(os.path.join(root, '*', '*.md'))):
    if 'ATTRIBUTION' in f:
        continue
    s = open(f, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---', s, re.S)
    fm = m.group(1) if m else ''
    g = lambda k: (re.search(r'^' + k + r':\s*(.*)$', fm, re.M) or [None, ''])[1].strip()
    line = f"{os.path.basename(os.path.dirname(f))}/{os.path.basename(f)[:-3]} | {g('一句话')} | {g('适用')} | {g('时长')}"
    if not kw or any(k in line for k in kw):
        print(line)
