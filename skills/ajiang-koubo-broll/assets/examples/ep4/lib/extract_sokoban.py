"""把 arena 回放原始数据（/api 下载的 run-*.json）压成 Remotion 用的 src/data/sokoban.json。
每关：初始棋盘、最优步数、8 个模型的每次工具调用（相对开赛秒数、提交的走法、实际执行的每一步 走/推/撞、
这一次是否结束了一个机会：通关/死局(含致命一步)/重开/步数用完、被拒原因），以及每次请求的生成 token。
用法：python3 extract_sokoban.py <采集目录（含 cap-*/tmp/run-*.json）> <工程>/src/data/sokoban.json"""
import json, glob, os, sys
W = sys.argv[1] if len(sys.argv) > 1 else 'broll-work'  # 第 4 期是 <期目录>/broll-work（公开版去掉了本机绝对路径）
RUNS = {1: '3f40ada6-bfb2-474a-bdf8-49ca4f1da807', 2: '4656a5f3-6974-4f7f-8e68-e88398b20270', 3: '2722d18d-1bf8-4aa7-9f21-bb866a1f6f1c',
        4: '337918ce-7b58-4d31-955e-f49066d4c72a', 5: 'c2e4fcfb-fd57-43eb-a39e-15aac0217884', 6: '05dc3753-4b6f-4943-a440-127b1a7be668'}
KIND = {'walk': 'w', 'push': 'p', 'blocked': 'b'}
out = {}
for lv, rid in RUNS.items():
    path = next(iter(glob.glob(f'{W}/cap-*/tmp/run-{rid}.json')))
    d = json.load(open(path))['run']
    t0 = d.get('startedAt') or d['createdAt']
    names = {r['id']: r['name'] for r in d['racers']}
    racers = {}
    for r in d['racers']:
        racers[r['name']] = {'calls': [], 'usage': [], 'finished': None}
    for e in d['events']:
        nm = names.get(e.get('racer'))
        if e['type'] == 'sokoban.call':
            c = {'n': e['call'], 't': round((e['t'] - t0) / 1000, 2), 'tool': e['input'].get('tool'), 'sent': e['input'].get('moves', ''),
                 'moves': ''.join(s['move'] for s in e['steps']), 'kinds': ''.join(KIND[s['kind']] for s in e['steps'])}
            if e.get('error'): c['error'] = e['error']
            if e.get('ended'):
                en = e['ended']; c['ended'] = {'chance': en['chance'], 'end': en['end'], 'steps': en['steps']}
                if en.get('fatal'): c['ended']['fatal'] = en['fatal']
            racers[nm]['calls'].append(c)
        elif e['type'] == 'racer.usage':
            u = e.get('usage') or {}
            racers[nm]['usage'].append({'t': round((e['t'] - t0) / 1000, 2), 'out': u.get('output'), 'reasoning': u.get('reasoning')})
        elif e['type'] == 'racer.finished':
            racers[nm]['finished'] = {k: e.get(k) for k in ('phase', 'solved', 'stars', 'chance', 'steps', 'deadlocks', 'restarts', 'calls', 'durationMs')}
            racers[nm]['finished']['outputTokens'] = (e.get('usage') or {}).get('output')
            racers[nm]['finished']['cost'] = (e.get('usage') or {}).get('cost')
    out[str(lv)] = {'runId': rid, 'optimal': d['private'].get('distance'), 'puzzle': d['private'].get('puzzle'), 'initial': d['initial'], 'racers': racers}
dst = sys.argv[2] if len(sys.argv) > 2 else 'broll/src/data/sokoban.json'  # 第 4 期是 <期目录>/broll/src/data/sokoban.json
json.dump(out, open(dst, 'w'), ensure_ascii=False, separators=(',', ':'))
print(os.path.getsize(dst), 'bytes')
for lv, L in out.items():
    print(f"L{lv} 最优{L['optimal']} {L['initial']['rows']}x{L['initial']['cols']} 箱{len(L['initial']['boxes'])}")
    for nm, R in L['racers'].items():
        f = R['finished'] or {}
        ends = [c['ended']['end'] + (('@' + str(c['ended']['steps'])) if c['ended']['end'] != 'solved' else '') for c in R['calls'] if c.get('ended')]
        print(f"   {nm:22s} calls={len(R['calls']):3d} solved={f.get('solved')} chance={f.get('chance')} steps={f.get('steps')} ends={ends}")
