#!/usr/bin/env python3
"""主控的派工台账 out/ledger.json —— 上下文压缩后靠它接着指挥（agent ID 丢了就没法 SendMessage 续派）。

  python3 <skill>/scripts/ledger.py --project . set seg3 agent=ab19d94f01eba1585 round=1 status=working
  python3 <skill>/scripts/ledger.py --project . set seg3 status=done note="R2 已改：字号/取景"
  python3 <skill>/scripts/ledger.py --project . set reviewer agent=a0b3c25a35f1649ef status=working
  python3 <skill>/scripts/ledger.py --project . show
  python3 <skill>/scripts/ledger.py --project . audit        # git 里本轮改了哪些文件、有没有越界（章节 agent 碰了 lib/scripts/别人的段）

status 用：queued（排队）/ working / done（本轮交稿）/ fixing（续派中）/ blocked（卡住要主控处理）/ final（锁定）
set 后面只能是 key=value：写 status=done，不要写 --status done（会报错，不写入）。
"""
import json
import os
import re
import subprocess
import sys

# 在工程根目录跑；也可以 --project <工程> 从别处跑
if '--project' in sys.argv:
    _i = sys.argv.index('--project')
    os.chdir(sys.argv[_i + 1])
    del sys.argv[_i:_i + 2]
import time

P = 'out/ledger.json'


def load():
    return json.load(open(P, encoding='utf-8')) if os.path.exists(P) else {'items': {}}


def save(d):
    os.makedirs('out', exist_ok=True)
    d['updated'] = time.strftime('%Y-%m-%d %H:%M:%S')
    json.dump(d, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def show(d):
    print(f"台账 {P}（更新于 {d.get('updated', '-')}）")
    for k, v in d['items'].items():
        print(f"  {k:<9} round {v.get('round', '-'):<2} {v.get('status', '-'):<8} agent={v.get('agent', '-')}  {v.get('note', '')}")


MAIN_OWNED = ('src/segs/Sample.tsx', 'src/lib/', 'src/data/', 'src/index.tsx', 'src/entries/', 'scripts/', 'public/st/', 'public/logo/', 'public/fonts/',
              'public/sfx/', 'public/audio/', 'public/gen/', 'BRIEF.md', 'preview/', 'package.json', 'tsconfig.json', 'remotion.config.ts')


def audit():
    r = subprocess.run(['git', '-c', 'core.quotePath=false', 'status', '--porcelain', '-uall'], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit('不是 git 仓库：init_project.py 会 git init；没有的话先 git init && git add -A && git commit -m base')
    files = [l[3:].strip().strip('"') for l in r.stdout.splitlines() if l.strip()]
    by_owner, main = {}, []
    for f in files:
        m = re.match(r'(?:src/segs/(?:Seg|seg)|public/seg)(\d+)', f)
        if m:
            by_owner.setdefault('seg' + m.group(1), []).append(f)
        elif f.startswith(MAIN_OWNED):
            main.append(f)
        else:
            by_owner.setdefault('?', []).append(f)
    for k, fs in sorted(by_owner.items()):
        print(f"  {k}: {len(fs)} 个文件" + ('  ← 归属不明，查是谁写的' if k == '?' else ''))
    if main:
        print('  主控区域有改动（章节 agent 不该碰；不是你自己改的就是越界）：')
        for f in main:
            print('    ', f)
    print('确认无误后：git add -A && git commit -m "<轮次>"（只有主控提交）')


if __name__ == '__main__':
    a = sys.argv[1:]
    d = load()
    if not a or a[0] == 'show':
        show(d)
    elif a[0] == 'set' and len(a) >= 3:
        # 只收 key=value。第 4 期 `set seg8 --status done` 把 "--status": "" 和 "done": "" 存成了键
        bad, i = [], 2
        while i < len(a):
            kv = a[i]
            k, eq, v = kv.partition('=')
            if k.startswith('-') or not eq or not k:
                key = k.lstrip('-') or '<键>'
                nxt = a[i + 1] if i + 1 < len(a) and '=' not in a[i + 1] and not a[i + 1].startswith('-') else None
                if not eq and nxt is not None:  # `--status done` / `status done`：下一个参数当成它的值
                    bad.append(f'  {kv} {nxt} → 写成 {key}={nxt}')
                    i += 1
                else:
                    bad.append(f'  {kv} → 写成 {key}={v if eq else "<值>"}')
            i += 1
        if bad or a[1].startswith('-'):
            sys.exit('ledger.py set 只收 key=value（不带 --，等号两边不留空格），没有写入：\n' + '\n'.join(bad) +
                     ('\n  段名不能以 - 开头' if a[1].startswith('-') else '') +
                     f'\n正确写法：python3 ledger.py --project . set {a[1].lstrip("-") or "seg8"} status=done note="R2 已改"')
        it = d['items'].setdefault(a[1], {})
        for kv in a[2:]:
            k, _, v = kv.partition('=')
            it[k] = int(v) if v.isdigit() else v
        save(d)
        show(d)
    elif a[0] == 'audit':
        audit()
    else:
        print(__doc__)
