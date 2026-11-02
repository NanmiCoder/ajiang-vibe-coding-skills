#!/bin/bash
# 4K 排队渲染：验收过一段就排一段，渲染和别的段的修改同时进行，最后不用等一次性全片渲。
#
# 启动（常驻，后台跑；可以在任何目录启动，脚本自己 cd 到工程根目录）：
#   mkdir -p out/logs && nohup bash scripts/queue.sh --conc 6 > out/logs/queue.log 2>&1 &
# 排一段：往 out/render-queue.txt 追加段名，一行一个，可以一次追加多行
#   echo seg3 >> out/render-queue.txt
#   echo 'seg3!' >> out/render-queue.txt      # 段名后加 ! = 强制重渲，不做“是否已是最新”的判断
# 退出：touch out/render-queue.stop          # 队列取空后退出（正在渲的那段会渲完）；下次启动前删掉这个文件
# 看进度：tail -f out/logs/queue.log；每段详细日志 out/logs/render-<段>.log，成功有 DONE 行，失败打印 FAIL
#
# --conc N：Remotion 渲染并发，默认 6。有章节 agent 在跑 still / preview 时 ≤6（不然机器卡死、agent 超时）；
#           没有别的活时可以 8–10。
# 跳过已是最新的段：渲之前跑 python3 <skill>/scripts/affected.py --project . --stale，
#   它给每个“缺成片 / 比源文件旧”的段打一行「✗ segN 原因」；这一段不在里面、且无配乐版不比带配乐版旧，就跳过不渲。
#   affected.py 只看修改时间、只认它自己的依赖规则（src/lib、src/data 的 timing/pages/mix/tokens、段代码、段里引用的 public 文件）；
#   改了它看不到的东西（meta.json 的 output、render.mjs 参数、lib 里间接引用的素材）要用「段名!」强制重渲。
#   skill 目录默认 ~/.claude/skills/ajiang-koubo-broll，装在别处时设环境变量 BROLL_SKILL。

CONC=6
while [ $# -gt 0 ]; do
  case "$1" in
    --conc) CONC="$2"; shift 2 ;;
    --conc=*) CONC="${1#--conc=}"; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "未知参数 $1（只支持 --conc N）"; exit 2 ;;
  esac
done
case "$CONC" in ''|*[!0-9]*) echo "--conc 要是数字：$CONC"; exit 2 ;; esac

cd "$(dirname "$0")/.." || exit 1
SKILL_DIR="${BROLL_SKILL:-$HOME/.claude/skills/ajiang-koubo-broll}"
AFFECTED="$SKILL_DIR/scripts/affected.py"
[ -f "$AFFECTED" ] || echo "! 找不到 ${AFFECTED}，不判断是否已是最新，排到的段都渲（设 BROLL_SKILL 指向 skill 目录）"
Q=out/render-queue.txt
mkdir -p out/logs
touch "$Q"
echo "QUEUE START $(date +%T) conc=$CONC"

# 0 = 成片已是最新（跳过）；1 = 要渲；2 = 段名不在 timing.json
fresh() {
  python3 - "$1" "$AFFECTED" <<'PY'
import json, os, subprocess, sys
k, aff = sys.argv[1], sys.argv[2]
T = json.load(open('src/data/timing.json', encoding='utf-8'))['segments']
if k not in T:
    print(f'{k} 不在 timing.json 里')
    sys.exit(2)
if not os.path.isfile(aff):
    print('（没有 affected.py，不判断）')
    sys.exit(1)
r = subprocess.run([sys.executable, aff, '--project', '.', '--stale'], capture_output=True, text=True)
if '全部成片都比源文件新' not in r.stdout and '要重渲' not in r.stdout:
    print('affected.py 没给出结论（' + (r.stderr.strip().splitlines() or ['?'])[-1] + '），照常渲')
    sys.exit(1)
for line in r.stdout.splitlines():
    p = line.split()
    if len(p) >= 2 and p[0] == '✗' and p[1] == k:
        print(line.strip())
        sys.exit(1)
name = T[k]['outName'] + '.mp4'
a, b = os.path.join('out/final', name), os.path.join('out/final-nobgm', name)
if not os.path.exists(b) or os.path.getmtime(b) < os.path.getmtime(a):
    print('无配乐版缺失或比带配乐版旧（上次可能渲到一半）')
    sys.exit(1)
print('成片已是最新')
PY
}

while true; do
  line=$(head -1 "$Q" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  if [ -z "$line" ]; then
    if [ -s "$Q" ]; then tail -n +2 "$Q" > "$Q.tmp" && mv "$Q.tmp" "$Q"; continue; fi  # 跳过空行
    [ -f out/render-queue.stop ] && { echo "QUEUE END $(date +%T)"; exit 0; }
    sleep 15
    continue
  fi
  tail -n +2 "$Q" > "$Q.tmp" && mv "$Q.tmp" "$Q"
  case "$line" in \#*) continue ;; esac
  k="${line%!}"
  if [ "$k" = "$line" ]; then
    why=$(fresh "$k"); rc=$?
    if [ $rc -eq 0 ]; then echo "-- $k 跳过：$why"; continue; fi
    if [ $rc -eq 2 ]; then echo "-- $k 跳过：$why"; continue; fi
    echo "== $k $(date +%T) ${why}"
  else
    echo "== $k $(date +%T) 强制重渲"
  fi
  if node scripts/render.mjs "$k" --conc="$CONC" > "out/logs/render-$k.log" 2>&1; then
    grep DONE "out/logs/render-$k.log"
  else
    echo "FAIL $k (see out/logs/render-$k.log)"
  fi
done
