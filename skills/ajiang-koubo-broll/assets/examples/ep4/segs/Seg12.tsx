import React from 'react';
import {
  At, Backdrop, BrandMark, Bracket, C, Cam, E, Eyebrow, F, LevelCells, Lines, Sfx, Shot, Window,
  alpha, bezier, lerp, say, segInfo, tw, useSec,
} from '../lib';
import { Axis, Board, BoardT, CL, L2, L3, MeterBar, Money, PX, USD, X0, xOf } from './seg12/parts';

// seg12 · 跑分的代价（21.25s，字幕 #220–#232）。照 seg0 的舞台、组件、标题位置做；无主角卡，转播记分牌风格的花费条形 MG。
// 镜头 A（0–7.95）   Claude 的账单：BrandMark 大号 + 一根很长的计价条（「非常非常的贵」）→ 6 关全绿（跑完 6 道题）→ $18.8 大数字 → ≈ ¥135。
// 镜头 B（7.15–12.0）zoomOut 退一步：同一刻度的对比记分牌，GPT 一根 $6.4 → 两根之间 ×3 括号带（GPT 连摆三段 ≈ Claude 一根）。
// 镜头 C（11.2–15.0）zoomIn 走进真实榜单 lb-table：4TH DeepSeek（排名第四）→ 镜头推到右侧「总分 20.7」和「花费」列（真实证据）。
// 镜头 D（14.2–段尾）zoomOut 回记分牌：DeepSeek 一根很短的 $1.4、≈ ¥10、20.7 分 → 其余两行压暗，推箱子 6 关 ✕✕✓✓✕✕。
// 三根条按真实花费（$18.81 / $6.40 / $1.42）同一刻度画；画面上的数只写口播说过的（18.8 / 135 / 6.4 / 三倍 / 20.7 / 1.4 / 10），截图原样数字只作证据纹理。
const K = 'seg12';
const s = (w: string, off = 0, nth = 0) => say(K, w, off, nth);
const LEN = segInfo(K).seconds; // 21.25
const FAR = 1e6;

// 转场窗口（相邻镜头重叠 0.8s）
const AB = 7.15; // A → B（zoomOut：从 Claude 一家的账单退一步看对比）
const BC = 11.3; // B → C（zoomIn：走进真实榜单）
const CD = 14.5; // C → D（zoomOut：退回记分牌）
const END = LEN + 0.32; // 最后一个 Shot 的 to（fade 在 LEN−0.08 淡完，最后 4–5 帧纯空舞台）

// ───────── 镜头 A：Claude 的账单 ─────────
const A = { cellsX: 1010, cellsY: 248, numY: 336, barY: 776, barH: 72 };
const SWEEP = bezier(0.3, 0, 0.12, 1); // 条一路往右走，「贵」字时到头

const ShotBill: React.FC = () => {
  const t = useSec();
  const tName = s('Claude') - 0.15;
  const tSweep = s('非常') - 0.06;
  const tFull = s('贵') + 0.22;
  const tSix = s('跑完') - 0.1;
  const cellT = [0, 0.14, 0.26, 0.35, 0.42, 0.47].map((d) => s('6') - 0.4 + d);
  const tUsd = s('花了') + 0.02;
  const tUsdLand = s('18.8') + 0.5; // 「18.8」说完时到位
  const tCny = s('人民币') - 0.05;
  const tCnyLand = s('135') + 0.43; // 「135」说完时到位
  const sweep = tw(t, tSweep, tFull - tSweep, SWEEP);
  const head = USD.cl * sweep;
  const usd = 18.8 * tw(t, tUsd + 0.08, tUsdLand - tUsd - 0.08, E.out);
  const cny = 135 * tw(t, tCny + 0.18, tCnyLand - tCny - 0.18, E.out);
  const track = tw(t, 0.45, 0.6, E.out);
  return (
    <>
      <Cam moves={[{ t: 0, x: 960, y: 540, z: 1.0 }, { t: 0.1, x: 960, y: 540, z: 1.03, d: 7.8 }]}>
        <At x={152} y={176} t0={0.3} dy={8}><Eyebrow text="Sokoban · Cost 花费" size={24} /></At>
        <At x={150} y={214} t0={tName} dy={16}><BrandMark racer={CL} h={110} /></At>
        {/* 跑完这 6 道题：6 关全部通关（真实） */}
        <At x={A.cellsX} y={A.cellsY - 44} t0={tSix} dy={8}>
          <div style={{ fontFamily: F.sans, fontSize: 26, color: C.muted, letterSpacing: 6, whiteSpace: 'nowrap' }}>跑完 6 道题</div>
        </At>
        <At x={A.cellsX} y={A.cellsY} t0={tSix + 0.05} dy={12}>
          <LevelCells results={[true, true, true, true, true, true]} times={cellT} w={100} h={80} gap={14} />
        </At>
        {/* $18.8 大数字（Count 在「18.8」说完时到位）+ ≈ ¥135。到位前是转播记分牌的空位「$00.0」（seg7 CLEAR 同款 7% 墨色） */}
        <div style={{ position: 'absolute', left: 136, top: A.numY, opacity: tw(t, tSweep, 0.5) * (1 - tw(t, tUsd, 0.2)) }}>
          <Money cur="$" value="00.0" size={400} color={alpha(C.ink, 0.07)} curScale={0.4} />
        </div>
        {t >= tUsd - 0.05 && (
          <At x={136} y={A.numY} t0={tUsd} dy={20}>
            <Money cur="$" value={usd.toFixed(1)} size={400} color={C.accent} curScale={0.4} />
          </At>
        )}
        {t >= tCny - 0.05 && (
          <At x={1040} y={A.numY + 160} t0={tCny} dy={16}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 20, whiteSpace: 'nowrap' }}>
              <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 96, color: C.muted, lineHeight: 1 }}>≈</span>
              <Money cur="¥" value={String(Math.round(cny))} size={230} color={C.ink} curColor={C.ink2} curScale={0.46} />
            </div>
          </At>
        )}
        {/* 一根很长的计价条：同一刻度（$20 = 1382px），「非常非常的贵」时一路扫到 $18.8 */}
        <At x={152} y={A.barY - 44} t0={0.5} dy={6}>
          <div style={{ fontFamily: F.mono, fontSize: 24, fontWeight: 600, color: C.muted, letterSpacing: 5, whiteSpace: 'nowrap' }}>花费 · USD</div>
        </At>
        <div style={{ position: 'absolute', left: X0, top: A.barY, width: (xOf(20) - X0) * track, height: A.barH, background: C.surface2, border: `1px solid ${C.line}`, boxSizing: 'border-box', opacity: track }} />
        <MeterBar x={X0} y={A.barY} w={head * PX} h={A.barH} hot={1} />
        <Axis gy0={A.barY - 10} gy1={A.barY + A.barH + 10} labelY={A.barY + A.barH + 20} t0={0.5} lit={(v) => (sweep > 0 && head >= v - 0.01 ? 1 : 0)} />
      </Cam>
      <Lines items={[
        { t: 0.42, text: '唯一的缺点：Claude *非常非常的贵*' },
        { t: s('18.8') + 0.05, text: '跑完 6 道题，花了 *18.8 美金*' },
        { t: s('135') - 0.02, text: '差不多人民币 *135 块钱*' },
      ]} />
    </>
  );
};

// ───────── 镜头 B：Claude vs GPT（同一刻度）· ×3 ─────────
const TB: BoardT = {
  gpIn: s('GPT') - 0.12, gpBar: s('6.4') - 0.3, gpLand: s('6.4') + 0.34,
  lane: s('也就') + 0.1, x3: s('三倍') - 0.1, laneOut: FAR,
  dsIn: FAR, dsBar: FAR, dsLand: FAR, ynIn: FAR, ynLand: FAR,
  dim: FAR, cellsIn: FAR, cellT: [], frame: FAR,
};
const ShotVersus: React.FC = () => (
  <>
    <Cam moves={[{ t: AB, x: 960, y: 540, z: 1.0 }, { t: AB + 0.05, x: 960, y: 540, z: 1.025, d: 4.8 }]}>
      <Board T={TB} L={L2} rows={2} />
    </Cam>
    <Lines items={[
      { t: s('6.4') - 0.25, text: 'GPT 这边是 *6.4 美金*' },
      { t: s('三倍') - 0.1, text: '也就差不多 *三倍*' },
    ]} />
  </>
);

// ───────── 镜头 C：真实榜单（lb-table）· 排名第四 · 20.7 · 花费列 ─────────
// 页面坐标（CSS px，grid.py 量过）：4TH x152–195 y476–500，DeepSeek-Flash-1017 至 x375；DeepSeek 总分「20.7」x1007–1065 y476–502；
// 花费列 x1365–1442，四行（Claude $18.81 … DeepSeek $1.42）y150–506。
const WIN = { x: 160, y: 68, w: 1600, h: 944 };
const PG = (px: number, py: number) => ({ x: WIN.x + px, y: WIN.y + 44 + py });
const Z1 = 1.45, Z2 = 1.75;
const ShotProof: React.FC = () => {
  const tFour = s('第四') - 0.02;
  const tPan = s('DeepSeek') + 0.23;
  const t207 = s('20.7') + 0.05;
  const tCost = t207 + 0.35;
  const c1 = { x: PG(798, 0).x, y: 433 }; // 整张表（名次 → 花费）、前 4 行
  const c2 = { x: PG(1100, 0).x, y: 437 }; // 推近右侧：总分 → 花费
  return (
    <>
      <Cam moves={[{ t: BC, x: c1.x, y: c1.y, z: 1.38 }, { t: BC + 0.05, x: c1.x, y: c1.y, z: Z1, d: 1.2 }, { t: tPan, x: c2.x, y: c2.y, z: Z2, d: 0.95 }]}>
        <Window {...WIN} src="st/lb-table.jpg" url="arena.modeldial.com">
          <Bracket x={148} y={471} w={232} h={34} t0={tFour} t1={tPan - 0.1} pad={8} arm={22} scale={1 / Z1} label="排名第四" />
          <Bracket x={1002} y={471} w={68} h={36} t0={t207} pad={8} arm={20} scale={1 / Z2} label="总分" />
          {/* 推近后模型名那一列出画：在「总分」标签左边补一枚 DeepSeek 品牌标，认得出这一行是谁（页面坐标，按 1/Z2 缩回屏幕原大） */}
          <At x={0} y={437} t0={t207 + 0.08} dy={6} style={{ left: undefined, right: 1600 - 991, transformOrigin: '100% 0' }}>
            <div style={{ transform: `scale(${1 / Z2})`, transformOrigin: '100% 0', display: 'flex', alignItems: 'center', height: 54, padding: '0 18px', boxSizing: 'border-box',
              background: alpha(C.bg, 0.92), border: `1px solid ${alpha(C.accent, 0.55)}`, clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}>
              <BrandMark racer="DeepSeek-Flash-1017" h={40} />
            </div>
          </At>
          <Bracket x={1360} y={146} w={88} h={364} t0={tCost} pad={8} arm={22} scale={1 / Z2} label="花费" labelSide="bottom" />
        </Window>
      </Cam>
      {/* 标题行压暗带（只压顶部给逐句标题让位，盖住页面导航）+ 底部字幕带压暗（第 5 行起只当纹理）；不是聚光 */}
      <div style={{ position: 'absolute', left: 0, top: 880, width: 1920, height: 200, background: `linear-gradient(0deg, ${alpha(C.bg, 0.9)} 0%, ${alpha(C.bg, 0.7)} 45%, ${alpha(C.bg, 0)} 100%)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 236, background: `linear-gradient(180deg, ${alpha(C.bg, 0.99)} 0%, ${alpha(C.bg, 0.96)} 60%, ${alpha(C.bg, 0)} 100%)` }} />
      <Lines items={[
        { t: s('排名'), text: '而排名第四的 *DeepSeek*' },
        { t: s('20.7') - 0.02, text: '拿了 *20.7 分*' },
      ]} />
    </>
  );
};

// ───────── 镜头 D：DeepSeek 加入记分牌 · $1.4 · ≈ ¥10 · 推箱子 6 关 ─────────
const TD: BoardT = {
  gpIn: -FAR, gpBar: -FAR, gpLand: -FAR + 1,
  lane: FAR, x3: FAR, laneOut: FAR,
  dsIn: CD + 0.25, dsBar: s('1.4') - 0.4, dsLand: s('1.4') + 0.25, ynIn: s('10') - 0.35, ynLand: s('10') + 0.12,
  dim: s('但是') + 0.1, cellsIn: s('但是') + 0.24,
  cellT: [0, 0.13, 0.24, 0.33, 0.4, 0.46].map((d) => s('推箱子') - 0.05 + d),
  frame: s('表现') + 0.36,
};
const ShotDeep: React.FC = () => (
  <>
    <Cam moves={[{ t: CD, x: 960, y: 540, z: 1.0 }, { t: CD + 0.05, x: 960, y: 540, z: 1.03, d: LEN - CD }]}>
      <Board T={TD} L={L3} rows={3} />
    </Cam>
    <Lines items={[
      { t: s('1.4') - 0.16, text: '它全程只花了 *1.4 美金*' },
      { t: s('10') - 0.08, text: '大概是 *10 块钱*' },
      { t: s('推箱子') - 0.1, text: '但在 *推箱子* 这道题上' },
      { t: s('表现') + 0.3, text: '表现就一般了' },
    ]} />
  </>
);

// 舞台主视觉：全段共用一层（压到 0.5 当远景），转场时背景不闪黑
const Stage12: React.FC = () => {
  const t = useSec();
  const o = tw(t, 0.04, 0.4, E.out) * 0.5 * (1 - tw(t, END - 0.8, 0.4, E.in));
  return <Backdrop src="sokoban/arena-sokoban.webp" cx={lerp(940, 1060, t / LEN)} t0={0} t1={LEN} z0={1.18} z1={1.28} dim={0.95} style={{ opacity: o }} />;
};

export const sfx: Sfx[] = [
  { t: s('非常') - 0.05, k: 'swish', v: 0.45 }, // 计价条一路扫过去
  { t: s('18.8') + 0.5, k: 'chime', v: 0.45 }, // $18.8 到位
  { t: s('135') + 0.43, k: 'tick', v: 0.45 }, // ≈ ¥135 到位
  { t: s('6.4') - 0.3, k: 'swish', v: 0.4 }, // GPT 条长出来
  { t: s('三倍') - 0.1, k: 'pop', v: 0.45 }, // ×3 落位
  { t: s('20.7') + 0.05, k: 'tick', v: 0.4 }, // 取景框咬住 20.7
  { t: s('1.4') + 0.25, k: 'pop', v: 0.42 }, // $1.4 到位
  { t: s('推箱子') - 0.05, k: 'paper', v: 0.4 }, // 6 关翻牌
];

const Seg12: React.FC = () => (
  <>
    <Stage12 />
    <Shot from={0} to={AB + 0.8} enter="none" exit="zoomOut">
      <ShotBill />
    </Shot>
    <Shot from={AB} to={BC + 0.8} enter="zoomOut" exit="zoomIn">
      <ShotVersus />
    </Shot>
    <Shot from={BC} to={CD + 0.8} enter="zoomIn" exit="zoomOut">
      <ShotProof />
    </Shot>
    <Shot from={CD} to={END} enter="zoomOut" exit="fade" outDur={0.8}>
      <ShotDeep />
    </Shot>
  </>
);
export default Seg12;
