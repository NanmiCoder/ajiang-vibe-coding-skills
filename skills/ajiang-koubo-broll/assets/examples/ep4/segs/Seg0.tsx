import React from 'react';
import {
  At, Backdrop, C, Cam, Eyebrow, F, HazardBand, Headline, Host, Keys, LevelCells, LifeBar, Lines, Roulette, Sfx, Shot, SokoBoard, Stopwatch, Tag, Window,
  E, alpha, clamp, lerp, say, stepAt, track, tw, useSec,
} from '../lib';


// seg0 · 开场悬念（27.0s，字幕 #1–#15）—— 主控写的，全片风格样板。
// 气质：电竞转播式冷开场。产品自己的舞台主视觉铺底、巨大的产品字体标题、真实棋盘带透视立在舞台前、转播 HUD（方向键 / 生命条 / 秒表 / 记分牌）。
// 悬念：推箱子的名次和身份一律不露（91.6 是谁留到 seg11，0 分是谁留到 seg8）；魔方是前两期的事，排行榜可以完整放。
// 每句口播一个画面落点；标题在说出口前 0.1–0.2s 出；推到位停 ≥1s。
const K = 'seg0';
const s = (w: string, off = 0, nth = 0) => say(K, w, off, nth);


// ── 镜头 A（0–8.3s）：推箱子 · 3 次机会 · 推错一步 · 重来 · 多快 ──
const BOARD = { x: 1000, y: 210, size: 600 };
const ShotA: React.FC = () => {
  const t = useSec();
  const DS = track(1, 'DeepSeek-Flash-1017');
  const CL = track(1, 'Claude-Opus-5.5');
  const dead = DS.ends[0].at;
  const tLives = s('3') - 0.25;
  const tPush = s('推错');
  const tDead = s('一步') + 0.2;
  const tReset = s('重来');
  const tFast = s('多少') - 0.1;
  const fast = t >= tFast;
  const at = fast
    ? stepAt([{ t: tFast, f: 0 }, { t: 8.1, f: 34 }], t)
    : stepAt([{ t: 0.7, f: 0 }, { t: tPush - 0.1, f: dead - 1 }, { t: tPush + 0.15, f: dead - 1 }, { t: tDead, f: dead }, { t: tReset, f: dead }, { t: tReset + 0.45, f: 0 }], t);
  const T = fast ? CL : DS;
  const fi = Math.min(Math.ceil(at), T.last);
  const moving = !fast && t < tReset && at % 1 > 0.02;
  const move = moving ? T.info[fi]?.move : undefined;
  const pulse = moving ? Math.sin(Math.PI * (at % 1)) : 0;
  const rewinding = t >= tReset && t < tReset + 0.5;
  const lives = t < tDead ? 3 : 2;
  const tilt = lerp(24, 9, tw(t, 0.2, 2.6, E.out));
  const rise = tw(t, 0.15, 0.9, E.out);
  return (
    <>
      <Backdrop src="sokoban/arena-sokoban.webp" cx={1020} t0={0} t1={8.4} z0={1.0} z1={1.09} />
      <Cam moves={[{ t: 0, x: 960, y: 540, z: 1.0 }, { t: 0.1, x: 960, y: 540, z: 1.035, d: 8 }]}>
        {/* 真实棋盘：立在舞台前，带透视，慢慢放平 */}
        <div style={{ position: 'absolute', left: BOARD.x, top: BOARD.y + (1 - rise) * 120, width: BOARD.size, height: BOARD.size, opacity: rise, perspective: 1800 }}>
          <div style={{ position: 'absolute', left: -30, right: -30, bottom: -46, height: 70, background: `radial-gradient(closest-side, ${alpha('#000000', 0.7)}, transparent)` }} />
          <div style={{ transform: `rotateX(${tilt}deg) rotateY(-6deg)`, transformOrigin: '50% 100%' }}>
            <SokoBoard lv={1} racer={fast ? 'Claude-Opus-5.5' : 'DeepSeek-Flash-1017'} at={at} size={BOARD.size} stamp={false} />
          </div>
        </div>
        {rewinding && <At x={BOARD.x + 18} y={BOARD.y + 18} t0={tReset} dy={6}><Tag tone="bad" size={30}>◀◀ 重来</Tag></At>}
        {fast && t < 8.25 && <At x={BOARD.x + 18} y={BOARD.y + 18} t0={tFast} dy={6}><Tag tone="ink" size={30}>▶▶</Tag></At>}
      </Cam>
      {/* 左栏：转播标题 + HUD（在 Cam 外，推拉时不被裁） */}
      <At x={134} y={186} t0={0.3} dy={8}><Eyebrow text="ModelDial Arena · Sokoban" size={24} /></At>
      <Headline text="推箱子" x={124} y={222} size={170} weight={800} t0={s('推箱子') - 0.15} tracking={6} />
      <Lines y={440} size={58} items={[
        { t: s('如果'), text: '如果让 *你* 来做' },
        { t: s('只给'), text: '只给你 *3 次机会*' },
        { t: tPush, text: '推错一步，~直接重来~' },
        { t: s('多少'), text: '你能在 *多少时间* 内做完？', end: 7.85 },
      ]} />
      {t >= tLives - 0.05 && (
        <>
          <At x={134} y={560} t0={tLives} dy={6}><div style={{ fontFamily: F.sans, fontSize: 26, color: C.muted, letterSpacing: 6 }}>剩余机会 · LIFE</div></At>
          <LifeBar x={150} y={604} left={lives} t0={tLives + 0.05} h={50} breakAt={tDead} />
        </>
      )}
      <Keys x={150} y={700} move={move} pulse={pulse} size={80} o={tw(t, s('如果') - 0.1, 0.4) * (1 - tw(t, tFast - 0.25, 0.25))} />
      {fast && <At x={134} y={720} t0={tFast} dy={10}><Stopwatch t0={tFast} rate={43} size={104} /></At>}
      <HazardBand t0={tDead} t1={tReset - 0.08} y={700} />
    </>
  );
};

// ── 镜头 D（8.2–12.5s）：前两期 · 魔方（魔方主视觉 + 主持人 → 真实魔方排行榜）──
const ShotCube: React.FC = () => {
  const t = useSec();
  const tCube = s('前两期');
  const tRank = s('各个') - 0.2;
  const k = 1.25;
  const W = { x: 230, y: 250, w: 1600, h: 44 + 720 * k };
  const p = tw(t, tRank, 0.8, E.out);
  return (
    <>
      <Backdrop src="sokoban/arena-cube.webp" cx={1100} t0={8.0} t1={12.6} z0={1.04} z1={1.1} />
      <Host src="sokoban/host.webp" x={1180} y={150} h={980} t0={tCube} t1={tRank - 0.1} />
      <At x={134} y={186} t0={tCube} t1={tRank - 0.3} dy={8}><Eyebrow text="Cube · 前两期" size={24} /></At>
      <Headline text="前两期 · *魔方*" x={124} y={222} size={150} weight={800} t0={tCube - 0.1} t1={tRank - 0.3} />
      {/* 真实魔方排行榜：带透视滑入，镜头沿名次往下扫 */}
      <div style={{ position: 'absolute', inset: 0, opacity: p, perspective: 2000 }}>
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - p) * 500}px) rotateY(${lerp(-18, -7, p)}deg) rotateX(4deg)`, transformOrigin: '30% 50%' }}>
          <Cam moves={[{ t: tRank, x: 1060, y: 560, z: 0.92 }, { t: tRank + 0.6, x: 1000, y: 820, z: 1.08, d: 3.2 }]}>
            <Window {...W} src="st/s-cube-table.jpg" pageW={1280} url="arena.modeldial.com/#/leaderboard/cube" />
          </Cam>
        </div>
      </div>
      <Lines y={74} items={[{ t: s('各个'), text: '各个模型还能考个 *七八十分*', end: 12.2 }]} />
    </>
  );
};

// ── 镜头 E1（12.4–14.5s）：但这一次 · 推箱子 ──
const ShotSoko: React.FC = () => {
  const tSoko = s('推箱子', 0, 1) - 0.15;
  return (
    <>
      <Backdrop src="sokoban/arena-sokoban.webp" cx={980} t0={12.3} t1={14.6} z0={1.12} z1={1.18} />
      <Host src="sokoban/host-sokoban.webp" x={1120} y={110} h={1000} t0={tSoko} t1={14.2} />
      <At x={134} y={186} t0={tSoko} dy={8}><Eyebrow text="Sokoban · 这一次" size={24} /></At>
      <Headline text="这一次：*推箱子*" x={124} y={222} size={150} weight={800} t0={tSoko} t1={14.15} />
    </>
  );
};

// ── 镜头 E2（14.3–17.8s）：难度一下子就上来了 · 区分度非常明显（真实战绩矩阵，行名匿名）──
// 8 行 × 6 关的真实结果（✓ = 通关，✕ = 没过 / 被拦截 / 超时），先乱序翻牌，再按总分重排并拉出总分条。
const ROWS: { r: boolean[]; v: number }[] = [
  { r: [false, false, true, true, false, false], v: 20.7 },
  { r: [false, false, false, false, false, false], v: 0 },
  { r: [true, true, true, true, true, true], v: 89.9 },
  { r: [false, false, false, true, false, false], v: 15.5 },
  { r: [true, true, true, true, true, true], v: 91.6 },
  { r: [false, false, false, true, false, false], v: 10.0 },
  { r: [false, false, false, true, false, false], v: 16.1 },
  { r: [false, true, false, true, false, true], v: 40.6 },
];
const ShotMatrix: React.FC = () => {
  const t = useSec();
  const tHard = s('难度');
  const tSort = s('区分度') - 0.25;
  const order = ROWS.map((x, i) => ({ v: x.v, i })).sort((a, b) => b.v - a.v).map((o) => o.i);
  const RH = 78, Y0 = 250;
  const sp = tw(t, tSort, 0.7, E.inOut);
  return (
    <>
      <Backdrop src="sokoban/arena-sokoban.webp" cx={980} t0={14.0} t1={18} z0={1.18} z1={1.22} dim={0.9} style={{ opacity: 0.45 }} />
      <Lines y={74} items={[
        { t: tHard, text: '难度 *一下子就上来了*' },
        { t: s('区分度'), text: '模型的区分度 *非常明显*', end: 17.5 },
      ]} />
      <At x={150} y={190} t0={tHard - 0.1} dy={6}>
        <div style={{ display: 'flex', gap: 12, fontFamily: F.mono, fontSize: 24, color: C.muted, letterSpacing: 2 }}>
          <span style={{ width: 236 }}>8 个模型</span>
          {['01', '02', '03', '04', '05', '06'].map((x) => <span key={x} style={{ width: 86, textAlign: 'center' }}>{x}</span>)}
          <span style={{ marginLeft: 40, opacity: tw(t, tSort, 0.4) }}>总分 / 100</span>
        </div>
      </At>
      {ROWS.map((row, i) => {
        const y = lerp(Y0 + i * RH, Y0 + order.indexOf(i) * RH, sp);
        const tIn = tHard - 0.25 + i * 0.05;
        const cellT = row.r.map((_, j) => tHard + 0.05 + (i + j) * 0.055);
        const bar = tw(t, tSort + 0.3 + order.indexOf(i) * 0.05, 0.7, E.out);
        const best = row.v > 90, worst = row.v === 0;
        return (
          <At key={i} x={150} y={y} t0={tIn} dy={14}>
            <div style={{ position: 'relative', width: 1620, height: RH - 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 236, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, background: `repeating-linear-gradient(135deg, ${C.line} 0 3px, ${C.surface2} 3px 7px)` }} />
                <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 34, color: C.faint }}>???</span>
              </div>
              <LevelCells results={row.r} times={cellT} w={86} h={62} gap={12} />
              <div style={{ marginLeft: 40, width: 640, height: 30, background: C.surface2, position: 'relative', opacity: tw(t, tSort, 0.3) }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(row.v / 100) * 100 * bar}%`, background: best ? C.accent : worst ? C.bad : C.ink2 }} />
              </div>
              <span style={{ marginLeft: 18, fontFamily: F.display, fontWeight: 800, fontSize: 46, width: 110, color: best ? C.accent : worst ? C.bad : C.ink, opacity: tw(t, tSort + 0.5, 0.3) }}>{(row.v * bar).toFixed(1)}</span>
            </div>
          </At>
        );
      })}
    </>
  );
};

// ── 镜头 F（17.7–19.5s）：同样的 6 道题（6 关真实题面扇形飞入）──
const ShotSix: React.FC = () => {
  const t = useSec();
  const t0 = s('同样') - 0.15;
  const delays = [0, 0.12, 0.22, 0.3, 0.36, 0.4];
  return (
    <>
      <Backdrop src="sokoban/arena-sokoban.webp" cx={980} t0={17.6} t1={19.6} z0={1.2} z1={1.26} dim={0.9} style={{ opacity: 0.5 }} />
      <Lines y={74} items={[{ t: s('同样'), text: '同样的 *6 道题*', end: 19.15 }]} />
      <div style={{ position: 'absolute', inset: 0, perspective: 2200 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const p = tw(t, t0 + delays[i], 0.6, E.out);
          const ang = (i - 2.5) * 9;
          const x = 960 + (i - 2.5) * 290 - 135;
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: 330 + Math.abs(i - 2.5) * 22, opacity: p, transform: `translateY(${(1 - p) * 160}px) translateZ(${(1 - p) * -600}px) rotateY(${-ang}deg)` }}>
              <SokoBoard lv={i + 1} racer="Claude-Opus-5.5" at={0} size={270} stamp={false} />
              <div style={{ marginTop: 22, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontStyle: 'italic', fontSize: 46, color: i >= 4 ? C.bad : i >= 2 ? C.ink : C.accent }}>0{i + 1}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── 镜头 G / H：转播记分牌（1ST 91.6 / 8TH 0）。身份位 = logo 老虎机，停在「?」──
const Scorecard: React.FC<{ rank: string; win: boolean; tIn: number; tStop: number; cells: boolean[]; cellT: number[]; score: number; tScore: number; tCount?: number; lines: { t: number; text: string; end?: number }[]; lifeLeft?: number }> = ({ rank, win, tIn, tStop, cells, cellT, score, tScore, tCount, lines, lifeLeft }) => {
  const t = useSec();
  const col = win ? C.accent : C.bad;
  const c0 = tCount ?? tScore - 0.75;
  const v = score * tw(t, c0, tScore - c0, E.out);
  return (
    <>
      <Backdrop src="sokoban/arena-sokoban.webp" cx={win ? 1100 : 760} t0={tIn - 0.3} t1={tIn + 4.5} z0={1.25} z1={1.32} dim={0.95} style={{ opacity: 0.55 }} />
      <Lines y={74} items={lines} />
      <At x={124} y={170} t0={tIn} dy={20}>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontStyle: 'italic', fontSize: 250, lineHeight: 1, color: col, letterSpacing: -4 }}>{rank}</div>
      </At>
      <At x={150} y={440} t0={tIn + 0.1} dy={10}><Roulette t0={tIn + 0.1} tStop={tStop} h={70} tone={win ? 'win' : 'lose'} seed={win ? 0 : 3} /></At>
      <At x={150} y={620} t0={tIn + 0.2} dy={10}>
        <div style={{ fontFamily: F.sans, fontSize: 26, color: C.muted, letterSpacing: 6, marginBottom: 14 }}>6 道题</div>
        <LevelCells results={cells} times={cellT} w={104} h={84} gap={14} />
      </At>
      {lifeLeft != null && (
        <>
          <At x={150} y={820} t0={tIn + 0.3} dy={6}><div style={{ fontFamily: F.sans, fontSize: 24, color: C.muted, letterSpacing: 6 }}>一条命 · LIFE</div></At>
          <LifeBar x={410} y={812} left={lifeLeft} t0={tIn + 0.35} h={36} />
        </>
      )}
      <div style={{ position: 'absolute', left: 900, top: 250, width: 960, textAlign: 'right' }}>
        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 470, lineHeight: 1, color: col, letterSpacing: -10, opacity: tw(t, c0 - 0.05, 0.3), fontVariantNumeric: 'tabular-nums' }}>{score === 0 ? '0' : v.toFixed(1)}</span>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 64, color: C.muted, marginTop: -40, opacity: tw(t, tScore, 0.3) }}>/ 100 分</div>
      </div>
    </>
  );
};

const ShotTop: React.FC = () => {
  const tTop = s('最强') - 0.1;
  const tAll = s('全部通关');
  const times = [0, 0.3, 0.55, 0.75, 0.9, 1.0].map((f) => lerp(tTop + 0.4, tAll + 0.6, f));
  return (
    <Scorecard rank="1ST" win tIn={tTop} tStop={s('一条命') + 0.2} cells={[true, true, true, true, true, true]} cellT={times} score={91.6} tScore={s('91.6') + 0.35} tCount={tAll - 0.2} lifeLeft={3}
      lines={[{ t: s('最强'), text: '最强的模型：*一条命全部通关*' }, { t: s('91.6'), text: '得到了 *91.6* 分', end: 23.05 }]} />
  );
};
const ShotLow: React.FC = () => {
  const tLow = s('垫底') - 0.1;
  const tNone = s('一道都没过');
  const times = [0, 0.3, 0.55, 0.75, 0.9, 1.0].map((f) => lerp(tLow + 0.6, tNone + 0.5, f));
  return (
    <Scorecard rank="8TH" win={false} tIn={tLow} tStop={s('模型', 0, 3) + 0.35} cells={[false, false, false, false, false, false]} cellT={times} score={0} tScore={s('0分') + 0.05}
      lines={[{ t: s('垫底'), text: '而垫底的模型：~6 道题一道都没过~' }, { t: s('0分'), text: '直接拿了 ~0 分~', end: 26.45 }]} />
  );
};

export const sfx: Sfx[] = [
  { t: say(K, '推箱子') - 0.1, k: 'whoosh', v: 0.45 },
  { t: say(K, '3') - 0.2, k: 'swish', v: 0.5 },
  { t: say(K, '一步') + 0.2, k: 'alert', v: 0.5 },
  { t: say(K, '重来'), k: 'whoosh', v: 0.35 },
  { t: say(K, '前两期'), k: 'swish', v: 0.4 },
  { t: say(K, '推箱子', 0, 1) - 0.1, k: 'swish', v: 0.4 },
  { t: say(K, '难度') + 0.1, k: 'paper', v: 0.4 },
  { t: say(K, '同样') - 0.1, k: 'whoosh', v: 0.35 },
  { t: say(K, '一条命') + 0.2, k: 'click', v: 0.5 },
  { t: say(K, '91.6') + 0.35, k: 'chime', v: 0.45 },
  { t: say(K, '0分') + 0.05, k: 'tick', v: 0.6 },
];

const Seg0: React.FC = () => (
  <>
    <Shot from={0} to={8.55} enter="none" exit="left">
      <ShotA />
    </Shot>
    <Shot from={7.75} to={12.75} enter="left" exit="left">
      <ShotCube />
    </Shot>
    <Shot from={11.95} to={14.75} enter="left" exit="up">
      <ShotSoko />
    </Shot>
    <Shot from={13.95} to={18.05} enter="up" exit="zoomIn">
      <ShotMatrix />
    </Shot>
    <Shot from={17.25} to={19.7} enter="zoomIn" exit="fade" dur={0.5}>
      <ShotSix />
    </Shot>
    <Shot from={19.2} to={23.6} enter="fade" exit="left" dur={0.5}>
      <ShotTop />
    </Shot>
    <Shot from={22.8} to={27.3} enter="left" exit="fade" outDur={0.8}>
      <ShotLow />
    </Shot>
  </>
);
export default Seg0;
