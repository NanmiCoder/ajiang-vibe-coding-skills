import React from 'react';
import {
  At, Backdrop, BrandMark, Bracket, C, Cam, Cutout, Eyebrow, F, LEVELS, LifeBar, Lines, Lives, Sfx, Shot, Tag, Window,
  E, alpha, clamp, lerp, rise, say, stepAt, track, tw, useSec,
} from '../lib';
import { DollarMask, MASK_CLAUDE, MASK_GPT, RoutePanel, Stars, ThinkAct } from './seg3/parts';
import { SokoBoardFix } from './seg3/Board';

// seg3 · 两强怎么过的（36.3s，字幕 #53–#71）
// Claude：思考记录推近「输出 106.6k」→ 完整路线在脑子里一次算完（63 格按 5 次调用分行，越算越快）+ 思考 / 动手时间轴（真实耗时比例）
//         → 5 次调用分段快放，路线逐格点亮，调用计数 1→5 → 第一次机会通关 · 三星。
// GPT：两家思考 Token 对比条 → 思考记录推近「输出 18.7k」「已核对出一条 63 步的完整路线」→ 拉远看 4 次调用、直接通关 → 魔方榜 GPT 第一行。
// 悬念：不出现推箱子总分 / 名次 / 排行榜；思考记录里的美金数用截图自身像素盖掉（花费留到 seg12）。
const K = 'seg3';
const s = (w: string, off = 0, nth = 0) => say(K, w, off, nth);
const CL = 'Claude-Opus-5.5';
const GPT = 'OpenAI-GPT-6-Astra';

// 思考记录窗口（两张截图共用同一几何；k = 1：页面 CSS px = 舞台 px）
const WIN = { x: 160, y: 150, w: 1600, h: 44 + 770 }; // 只露到抽屉底边（CSS 770），回放页底部的进度条 / 按钮不入画
const pg = (px: number, py: number) => ({ x: WIN.x + px, y: WIN.y + 44 + py });
const ZT = 2.55; // 推近档位：13px 的轨迹小字 → 屏幕上约 33px

// ── 镜头 1（0–4.3s）：Claude 的思考记录 · 输出 106.6k ──
const ShotClaudeTrace: React.FC = () => {
  const t = useSec();
  const tPush = s('十多万') - 0.3;
  const row = pg(846, 86.5);
  const camY = row.y - 70 / ZT; // 「第 1 次请求」那一行落在屏幕 y≈610，浏览器标题栏留在标题行下方
  return (
    <>
      <Cam moves={[
        { t: 0, x: 815, y: 375, z: 1.56 },
        { t: 0.05, x: 815, y: 375, z: 1.62, d: 2.2 },
        { t: tPush, x: 960, y: camY, z: ZT, d: 1.15 },
        { t: tPush + 1.15, x: 960, y: camY, z: ZT * 1.025, d: 2.4 },
      ]}>
        <div style={{ position: 'absolute', inset: 0, ...rise(t, 0.3, { dy: 40, dur: 0.7 }) }}>
          <Window {...WIN} src="st/trace-l1-claude.jpg">
            <DollarMask src="st/trace-l1-claude.jpg" patches={MASK_CLAUDE} />
            <Bracket x={810} y={81} w={73} h={11} t0={s('万') + 0.05} scale={1.25 / ZT} pad={14} arm={24} label="十多万 · 思考 Token" />
          </Window>
        </div>
      </Cam>
      {/* 名牌：推近前在左侧 */}
      <At x={134} y={330} t0={0.4} t1={tPush - 0.35} dy={8}><Eyebrow text="Trace · 调用轨迹" /></At>
      <At x={130} y={378} t0={0.5} t1={tPush - 0.35} dy={10}><BrandMark racer={CL} h={84} /></At>
      <At x={134} y={494} t0={0.6} t1={tPush - 0.35} dy={8}><div style={{ fontFamily: F.mono, fontSize: 28, color: C.muted, letterSpacing: 1 }}>第 1 关 · 思考记录</div></At>
      <Lines items={[
        { t: 0.42, text: 'Claude Opus 5.5 *先在后台*' },
        { t: s('十多万'), text: '用了 *十多万* 思考 Token', end: 3.45 },
      ]} />
    </>
  );
};

// ── 镜头 2（3.6–19.1s）：完整路线一次算完 → 5 次调用一口气推完 → 第一次机会满分 ──
const BX = 1160, BY = 292, BS = 540; // 棋盘
const LX = 140, LW = 972; // 左栏
const ROUTE_Y = 512, CS = 38, GAP = 6, RGAP = 14, LABW = 92;
const ShotClaudeRun: React.FC = () => {
  const t = useSec();
  const T = track(1, CL);
  const R = LEVELS['1'].racers[CL];
  const frac = R.calls[0].t / R.calls[R.calls.length - 1].t; // 第一次调用前全在思考（真实耗时比例）
  const tIn = s('把') - 0.05;
  const tFill0 = s('开局') + 0.05, tFill1 = s('算出来');
  // 执行：5 次调用越来越快（每步 0.11→0.05s），最后一步落在“推完”
  const DT = [0.11, 0.085, 0.062, 0.05, 0.065], PAUSE = 0.12;
  const dur = T.calls.reduce((a, c, k) => a + (c.to - c.from) * DT[k], 0) + PAUSE * (T.calls.length - 1);
  const tEnd = s('推完') + 0.1;
  const tAct = tEnd - dur;
  const play: { t: number; f: number }[] = [{ t: tAct, f: 0 }];
  let cur = tAct;
  T.calls.forEach((c, k) => {
    cur += (c.to - c.from) * DT[k];
    play.push({ t: cur, f: c.to });
    if (k < T.calls.length - 1) { cur += PAUSE; play.push({ t: cur, f: c.to }); }
  });
  const at = stepAt(play, t);
  const acting = t >= tAct;
  const callN = acting ? T.calls.filter((c) => at > c.from + 0.001).length : 0;
  const u = clamp((t - tFill0) / (tFill1 - tFill0));
  const thinkP = Math.pow(u, 1.8);
  const tOut = s('那第一次') - 0.05; // 左栏换成结果
  const tResult = s('第一次') - 0.1;
  const solved = t >= tEnd;
  const bp = tw(t, tIn + 0.1, 1.0, E.out);
  const routeW = 20 * (CS + GAP) - GAP;
  const routeH = 5 * (CS + RGAP) - RGAP;
  const barY = 270 + 56; // ThinkAct 条的顶边
  return (
    <>
      <Backdrop src="sokoban/arena-sokoban.webp" cx={980} t0={3.5} t1={18.8} z0={1.1} z1={1.17} dim={0.9} style={{ opacity: 0.45 }} />
      <Cam moves={[{ t: 3.5, x: 960, y: 540, z: 1.0 }, { t: 3.6, x: 960, y: 540, z: 1.04, d: 15 }]}>
        {/* 右：真实棋盘（带一点透视，像立在舞台上的物件） */}
        <div style={{ position: 'absolute', left: BX, top: BY - 70 + (1 - bp) * 90, width: BS, opacity: bp, perspective: 2000 }}>
          <div style={{ transform: `rotateY(${lerp(-16, -6, bp)}deg) rotateX(${lerp(12, 4, bp)}deg)`, transformOrigin: '50% 100%' }}>
            <div style={{ height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <BrandMark racer={CL} h={42} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Tag tone={solved ? 'accent' : 'ink'} size={24}>{solved ? '通关' : '第 1 次机会'}</Tag>
                <Lives left={3} h={22} />
              </div>
            </div>
            <SokoBoardFix lv={1} racer={CL} at={at} size={BS} bannerAt={tEnd} />
          </div>
          <div style={{ position: 'absolute', left: -30, right: -30, bottom: -40, height: 60, background: `radial-gradient(closest-side, ${alpha(C.bg, 0.85)}, transparent)`, zIndex: -1 }} />
        </div>

        {/* 左：时间轴 + 完整路线（结果出来后退场） */}
        <At x={0} y={0} t0={tIn + 0.15} t1={tOut} dy={16}>
          <ThinkAct x={LX} y={270} w={LW} frac={frac} thinkP={thinkP} actP={acting ? at / T.last : 0} acting={acting} />
          <div style={{ position: 'absolute', left: LX, top: ROUTE_Y - 70, width: LW, height: 48, display: 'flex', alignItems: 'center', gap: 22 }}>
            <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 32, color: C.ink, letterSpacing: 2 }}>完整路线</span>
            <div style={{ opacity: tw(t, s('Pi') - 0.3, 0.35), transform: `translateY(${(1 - tw(t, s('Pi') - 0.3, 0.35)) * 10}px)` }}>
              <Tag tone="ink" size={24} mono>Pi Agent · move</Tag>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 10, opacity: tw(t, tAct - 0.3, 0.3) }}>
              <span style={{ fontFamily: F.sans, fontSize: 26, color: C.muted, letterSpacing: 2 }}>调用</span>
              <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 64, lineHeight: 0.8, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{callN}</span>
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 36, lineHeight: 0.8, color: C.muted }}>/ {T.calls.length}</span>
            </div>
          </div>
          <RoutePanel x={LX} y={ROUTE_Y} T={T} at={at} acting={acting} tFill0={tFill0} tFill1={tFill1} tStart={tIn + 0.3}
            tLabels={s('连续') - 0.05} tDone={tEnd} cs={CS} gap={GAP} rowGap={RGAP} labelW={LABW} />
        </At>
        {/* 取景框：讲到哪咬到哪 */}
        <Bracket x={LX} y={barY} w={LW * frac} h={40} t0={s('脑袋') - 0.3} t1={s('算完之后') - 0.2} label="全在脑袋里" labelSide="bottom" />
        <Bracket x={LX + LABW} y={ROUTE_Y} w={routeW} h={routeH} t0={s('算出来') + 0.05} t1={s('连续') - 0.25} label="一次性 · 全部算出来" labelSide="bottom" />
        <Bracket x={LX} y={ROUTE_Y} w={LABW - 14} h={routeH} t0={s('五次')} t1={tOut - 0.3} label="5 次移动调用" labelSide="bottom" arm={20} />
        <Bracket x={LX + LW * frac} y={barY} w={LW * (1 - frac)} h={40} t0={s('十几秒')} t1={tOut - 0.3} arm={12} pad={10} />
        {t >= s('十几秒') + 0.15 && t < tOut + 0.2 && (
          <div style={{ position: 'absolute', left: LX + LW - 410, top: 266, width: 300, display: 'flex', justifyContent: 'flex-end', opacity: tw(t, s('十几秒') + 0.15, 0.3) * (1 - tw(t, tOut - 0.3, 0.3)) }}>
            <Tag tone="accent" size={26}>十几秒</Tag>
          </div>
        )}

        {/* 左：结果（第一次机会 · 三星满分） */}
        <At x={LX} y={262} t0={tResult} dy={10}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
            <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 40, color: C.ink, letterSpacing: 2 }}>第 1 次机会</span>
            <span style={{ fontFamily: F.mono, fontSize: 24, color: C.muted, letterSpacing: 3 }}>LIFE 3 / 3</span>
          </div>
        </At>
        {t >= tResult && <LifeBar x={LX + 12} y={332} left={3} t0={tResult + 0.1} h={56} />}
        <Stars x={LX - 6} y={470} size={150} gap={36} times={[s('满分') - 0.18, s('满分') - 0.04, s('满分') + 0.1]} />
        <At x={LX} y={660} t0={s('通过') - 0.1} dy={10}>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontStyle: 'italic', fontSize: 150, lineHeight: 1, color: C.accent, letterSpacing: -2 }}>CLEAR</div>
        </At>
      </Cam>
      <Lines items={[
        { t: s('把', 0.15), text: '开局到通关的 *完整路线*' },
        { t: s('全部'), text: '全部在它的 *脑袋里*' },
        { t: s('一次性'), text: '*一次性* 全部算出来' },
        { t: s('算完之后', 0.15), text: '算完之后，连续调用 *Pi Agent*' }, // 逐字表里首字偏早约 0.2s（口播静音段实测）
        { t: s('给它'), text: '给它的 *五次* 移动工具' },
        { t: s('在十几秒', 0.2), text: '*十几秒* 内一口气推完' },
        { t: s('那第一次', 0.15), text: '第一次机会，*直接满分通过*', end: 18.45 },
      ]} />
    </>
  );
};

// ── 镜头 3（18.3–22.6s）：两家思考 Token 对比（动手前那一次请求的输出）──
const ShotTokens: React.FC = () => {
  const t = useSec();
  const tGrow = s('更省') - 0.25;
  const MAX = 106.6;
  const rows = [
    { racer: CL, name: 'Claude Opus 5.5', v: 106.6, y: 340, t0: 18.5, grow: 18.7, acc: false },
    { racer: GPT, name: 'GPT-6 Astra', v: 18.7, y: 560, t0: s('GPT') - 0.15, grow: tGrow, acc: true },
  ];
  const BAR = { x: 410, w: 880, h: 58 };
  return (
    <>
      <Backdrop src="sokoban/arena-sokoban.webp" cx={980} t0={18.2} t1={22.7} z0={1.18} z1={1.22} dim={0.9} style={{ opacity: 0.45 }} />
      <Cam moves={[{ t: 18.2, x: 960, y: 540, z: 1.0 }, { t: 18.3, x: 960, y: 540, z: 1.035, d: 4.4 }]}>
        <At x={150} y={232} t0={18.45} dy={6}><Eyebrow text="Level 01 · 动手前的思考 Token" /></At>
        {rows.map((r) => {
          const p = tw(t, r.grow, 0.9, E.out);
          return (
            <At key={r.racer} x={150} y={r.y} t0={r.t0} dy={14}>
              <div style={{ position: 'relative', width: 1640, height: 150 }}>
                <div style={{ position: 'absolute', left: 0, top: 18 }}><BrandMark racer={r.racer} h={56} /></div>
                <div style={{ position: 'absolute', left: 2, top: 96, fontFamily: F.mono, fontSize: 26, color: C.muted, letterSpacing: 1 }}>{r.name}</div>
                <div style={{ position: 'absolute', left: BAR.x, top: 30, width: BAR.w, height: BAR.h, background: alpha(C.ink, 0.06), boxShadow: `inset 0 0 0 1px ${C.line}` }}>
                  <div style={{ width: (r.v / MAX) * BAR.w * p, height: '100%', background: r.acc ? C.accent : C.ink2 }} />
                </div>
                <div style={{ position: 'absolute', right: 0, top: 0, opacity: tw(t, r.grow - 0.05, 0.3), fontFamily: F.display, fontWeight: 800, fontSize: 118, lineHeight: 1, color: r.acc ? C.accent : C.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>
                  {(r.v * p).toFixed(1)}k
                </div>
              </div>
            </At>
          );
        })}
        <At x={1790 - 300} y={700} t0={s('2万')} dy={8}>
          <div style={{ width: 300, display: 'flex', justifyContent: 'flex-end' }}><Tag tone="accent" size={30}>不到 2 万</Tag></div>
        </At>
        <At x={152} y={800} t0={18.8} dy={6}>
          <div style={{ fontFamily: F.sans, fontSize: 24, color: C.muted, letterSpacing: 1 }}>数据：两家第 1 关调用轨迹 ·「第 1 次请求」的输出</div>
        </At>
      </Cam>
      <Lines items={[{ t: s('GPT'), text: 'GPT-6 Astra 这边 *更省*', end: s('只用了') - 0.42 }]} />
    </>
  );
};

// ── 镜头 4（21.8–28.9s）：GPT 的思考记录 · 18.7k · 动手前算完路线 · 4 次调用 ──
const ShotGptTrace: React.FC = () => {
  const t = useSec();
  const T = track(1, GPT);
  const tBack = s('调用了四次') - 0.35;
  const ZB = 1.15;
  const camXB = pg(430, 0).x - (980 - 960) / ZB; // 拉远：抽屉左缘落在屏幕 x=980（左半边给大号计数）
  const camYB = pg(0, 171).y - (230 - 540) / ZB; // 第 1 张调用卡顶边落在 y=230，4 张卡整列入画
  const badgeT = T.calls.map((_, i) => s('四次') + 0.15 - (T.calls.length - 1 - i) * 0.14);
  const nShown = badgeT.filter((x) => t >= x).length;
  const cardY = [171, 348, 525, 654];
  return (
    <>
      <Cam moves={[
        { t: 21.8, x: 960, y: 300, z: ZT },
        { t: 21.9, x: 960, y: 300, z: ZT * 1.03, d: 4.2 },
        { t: tBack, x: camXB, y: camYB, z: ZB, d: 1.1 },
        { t: tBack + 1.1, x: camXB, y: camYB, z: ZB * 1.02, d: 2 },
      ]}>
        <Window {...WIN} src="st/trace-l1-gpt.jpg">
          <DollarMask src="st/trace-l1-gpt.jpg" patches={MASK_GPT} />
          <Bracket x={824.5} y={149} w={65.5} h={10.5} t0={s('思考', 0, 1) - 0.1} t1={tBack - 0.1} scale={1.25 / ZT} pad={14} arm={24} label="不到 2 万 · 思考 Token" />
          <Bracket x={449} y={122} w={246} h={12} t0={s('算完了')} t1={tBack - 0.1} scale={1.25 / ZT} pad={12} label="动手前 · 算完整条路线" labelSide="bottom" />
          {/* 4 次调用：每张调用卡左侧一枚序号 */}
          {cardY.map((y, i) => {
            const p = tw(t, badgeT[i], 0.4, E.back);
            if (t < badgeT[i]) return null;
            return (
              <div key={i} style={{ position: 'absolute', left: 366, top: y + 48.5 - 26, width: 52, height: 52, opacity: tw(t, badgeT[i], 0.12), transform: `scale(${lerp(0.7, 1, p)})`,
                display: 'grid', placeItems: 'center', background: C.accent, fontFamily: F.display, fontWeight: 800, fontSize: 40, color: C.bg }}>{i + 1}</div>
            );
          })}
          <Bracket x={460.5} y={707} w={182.5} h={11} t0={s('直接通关')} scale={1.15 / ZB} pad={10} label="直接通关" labelSide="bottom" />
        </Window>
      </Cam>
      {/* 拉远后右侧大号计数：4 次工具调用 */}
      <At x={140} y={236} t0={tBack + 0.2} dy={8}><BrandMark racer={GPT} h={52} /></At>
      <At x={136} y={330} t0={badgeT[0] - 0.05} dy={12}>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 320, lineHeight: 0.86, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{Math.max(1, nShown)}</div>
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 52, color: C.ink, marginTop: 18, letterSpacing: 2 }}>次工具调用</div>
      </At>
      <Lines items={[
        { t: s('同样'), text: '同样在 *动手前* 算完整条路线' },
        { t: s('调用了四次'), text: '调用 *四次* 工具，直接通关', end: 28.3 },
      ]} />
    </>
  );
};

// ── 镜头 5（28.2–36.6s）：跟测魔方一样 · 巨少的 Token · 智商非常高 ──
// 魔方榜整页全片只在 seg0 出；这里只抠 GPT 那一行做成横条卡直接落位：
// 左块 = 名次 + 模型名（页面 CSS x 36–330），右块 = 总分 + 效率（x 900–1075），两块之间跳过 6 题分项列；
// 两块都含表头（y 121–152）+ 行（y 153–232），底色和页面相同，拼起来就是一条完整的行。
const CUBE = 'st/s-cube-table.jpg';
const SEG_A = { x0: 36, x1: 330 }, SEG_B = { x0: 900, x1: 1075 }, ROW = { y0: 121, y1: 232 };
const CARD = { x: 240, y: 404, w: 1440 };
const KK = CARD.w / (SEG_A.x1 - SEG_A.x0 + SEG_B.x1 - SEG_B.x0); // ≈3.07：页面 12.8px 小字 → 39px
const WA = (SEG_A.x1 - SEG_A.x0) * KK;
const cardH = (ROW.y1 - ROW.y0) * KK;
const inB = (px: number, py: number) => ({ x: CARD.x + WA + (px - SEG_B.x0) * KK, y: CARD.y + (py - ROW.y0) * KK });
const ShotCube: React.FC = () => {
  const t = useSec();
  const tCard = s('跟我们') + 0.05;
  // GPT 名牌：先大号出场（“那 GPT-6 Astra 这边”），出卡时缩成卡片的表头
  const m = tw(t, tCard - 0.15, 0.6, E.cam);
  const tok = inB(990, 176), tokB = inB(1052, 212);
  const sc = inB(919.4, 175.6), scB = inB(974.2, 198.4);
  return (
    <>
      <Backdrop src="sokoban/arena-cube.webp" cx={1100} t0={28.0} t1={36.6} z0={1.08} z1={1.15} dim={0.9} style={{ opacity: 0.5 }} />
      <Cam moves={[{ t: 28.1, x: 960, y: 540, z: 1.0 }, { t: 28.2, x: 960, y: 540, z: 1.035, d: 8 }]}>
        <At x={CARD.x} y={0} t0={28.4} dy={10}>
          <div style={{ position: 'absolute', left: 0, top: lerp(410, 300, m), transformOrigin: '0 0', transform: `scale(${lerp(2.0, 1, m)})` }}>
            <BrandMark racer={GPT} h={56} />
          </div>
          <div style={{ position: 'absolute', left: 4, top: 540, opacity: 1 - m, fontFamily: F.mono, fontSize: 30, color: C.muted, letterSpacing: 1, whiteSpace: 'nowrap' }}>OpenAI-GPT-6-Astra</div>
          <div style={{ position: 'absolute', left: 250, top: 316, opacity: tw(t, tCard + 0.2, 0.4) }}><Eyebrow text="Cube · 前两期魔方榜 · 第 1 行" /></div>
        </At>
        {/* 横条卡：只露 GPT 这一行 */}
        <At x={CARD.x} y={CARD.y} t0={tCard} dy={44} dur={0.55}>
          <div style={{ position: 'relative', width: CARD.w, height: cardH, background: C.surface, boxShadow: `0 0 0 1px ${C.line}, 0 30px 60px -20px ${alpha(C.bg, 0.9)}` }}>
            <div style={{ position: 'absolute', left: 0, top: 0 }}>
              <Cutout src={CUBE} sx={SEG_A.x0 * 2.5} sy={ROW.y0 * 2.5} sw={(SEG_A.x1 - SEG_A.x0) * 2.5} sh={(ROW.y1 - ROW.y0) * 2.5} w={WA} radius={0} />
            </div>
            <div style={{ position: 'absolute', left: WA, top: 0 }}>
              <Cutout src={CUBE} sx={SEG_B.x0 * 2.5} sy={ROW.y0 * 2.5} sw={(SEG_B.x1 - SEG_B.x0) * 2.5} sh={(ROW.y1 - ROW.y0) * 2.5} w={CARD.w - WA} radius={0} />
            </div>
            <div style={{ position: 'absolute', left: 0, top: -3, width: 180, height: 3, background: C.accent }} />
          </div>
        </At>
        <Bracket x={tok.x} y={tok.y} w={tokB.x - tok.x} h={tokB.y - tok.y} t0={s('巨少')} scale={1.2} pad={12} label="巨少的 Token" labelSide="bottom" />
        <Bracket x={sc.x} y={sc.y} w={scB.x - sc.x} h={scB.y - sc.y} t0={s('非常高') - 0.1} scale={1.2} pad={12} label="智商非常高" />
      </Cam>
      <Lines items={[
        { t: s('GPT', 0, 1), text: '那 GPT-6 Astra 这边' },
        { t: s('跟我们'), text: '跟之前测 *魔方* 一样' },
        { t: s('花了'), text: '花了 *巨少* 的 Token' },
        { t: s('完成了'), text: '完成了 *智商非常高* 的事情', end: 35.85 },
      ]} />
    </>
  );
};

export const sfx: Sfx[] = [
  { t: 0.3, k: 'swish', v: 0.4 },
  { t: s('十多万') - 0.3, k: 'whoosh', v: 0.4 },
  { t: s('开局') + 1.4, k: 'type', v: 0.35, dur: 3.0 },
  { t: s('算出来'), k: 'chime', v: 0.4 },
  { t: s('连续') + 0.6, k: 'click', v: 0.45 },
  { t: s('五次'), k: 'tick', v: 0.4 },
  { t: s('推完') + 0.1, k: 'chime', v: 0.5 },
  { t: s('满分') - 0.18, k: 'pop', v: 0.45 },
  { t: 18.35, k: 'swish', v: 0.4 },
  { t: s('2万'), k: 'tick', v: 0.35 },
  { t: s('同样') + 0.9, k: 'click', v: 0.35 },
  { t: s('调用了四次') - 0.35, k: 'whoosh', v: 0.3 },
  { t: 28.2, k: 'swish', v: 0.4 },
  { t: s('跟我们') + 0.05, k: 'pop', v: 0.4 },
  { t: s('巨少'), k: 'click', v: 0.4 },
  { t: s('非常高') - 0.1, k: 'chime', v: 0.45 },
];

const Seg3: React.FC = () => (
  <>
    <Shot from={0} to={4.35} enter="none" exit="up">
      <ShotClaudeTrace />
    </Shot>
    <Shot from={3.55} to={19.1} enter="up" exit="left">
      <ShotClaudeRun />
    </Shot>
    <Shot from={18.3} to={22.6} enter="left" exit="zoomIn">
      <ShotTokens />
    </Shot>
    <Shot from={21.8} to={28.95} enter="zoomIn" exit="left">
      <ShotGptTrace />
    </Shot>
    <Shot from={28.15} to={36.6} enter="left" exit="fade" outDur={0.8}>
      <ShotCube />
    </Shot>
    {/* #65 这一句跨「对比条 → GPT 思考记录」的推入转场，标题放在镜头外，转场时不重打 */}
    <Lines items={[{ t: s('只用了'), text: '只用了 *不到 2 万* 思考 Token', end: s('同样') - 0.42 }]} />
  </>
);
export default Seg3;
