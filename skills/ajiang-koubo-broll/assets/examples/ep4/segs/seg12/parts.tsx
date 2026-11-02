import React from 'react';
import { At, BrandMark, Bracket, C, E, F, LevelCells, alpha, tw, useSec } from '../../lib';

// seg12 私有组件：转播记分牌风格的「花费」条形 MG。
// 三根条共用一个刻度、按真实花费画（lb-table 花费列：$18.81 / $6.40 / $1.42）；标签只写口播说过的数（18.8 / 6.4 / 1.4）。

export const CL = 'Claude-Opus-5.5';
export const GP = 'OpenAI-GPT-6-Astra';
export const DS = 'DeepSeek-Flash-1017';

export const X0 = 150; // 条形起点（舞台 x）
export const PX = 1300 / 18.81; // 每 1 美金多少 px：Claude 那根 = 1300px（画面宽 68%）
export const USD = { cl: 18.81, gp: 6.4, ds: 1.42 } as const; // 真实花费，条长按它画
export const xOf = (usd: number) => X0 + usd * PX;
export const AXIS = [0, 5, 10, 15, 20];
const FAR = 1e6;

/** 计价条：底色 + 每 1 美金一道细刻线（计价表格子）。hot 0..1 = 正在讲（酸性绿）的程度，否则浅灰。 */
export const MeterBar: React.FC<{ x: number; y: number; w: number; h: number; hot: number }> = ({ x, y, w, h, hot }) => {
  if (w <= 0.5) return null;
  const grid = `repeating-linear-gradient(90deg, transparent 0 ${PX - 3}px, ${alpha(C.bg, 0.42)} ${PX - 3}px ${PX}px)`;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: C.ink2, backgroundImage: grid }} />
      {hot > 0.001 && <div style={{ position: 'absolute', inset: 0, backgroundColor: C.accent, backgroundImage: grid, opacity: hot }} />}
    </div>
  );
};

/** 刻度：$0 / $5 / $10 / $15 / $20。gy0–gy1 画竖向发丝网格；labelY 放刻度字。lit(usd) 0..1 = 这个刻度被条头越过（字变酸性绿）。 */
export const Axis: React.FC<{ gy0: number; gy1: number; labelY: number; t0: number; lit?: (usd: number) => number; o?: number }> = ({ gy0, gy1, labelY, t0, lit, o = 1 }) => {
  const t = useSec();
  return (
    <>
      {AXIS.map((v, i) => {
        const p = tw(t, t0 + i * 0.05, 0.45, E.out);
        const l = lit ? lit(v) : 0;
        return (
          <React.Fragment key={v}>
            <div style={{ position: 'absolute', left: xOf(v), top: gy0, width: 1, height: (gy1 - gy0) * p, background: alpha(C.ink, 0.09), opacity: o }} />
            <div style={{ position: 'absolute', left: xOf(v), top: labelY, transform: `translate(-50%, ${(1 - p) * 10}px)`, opacity: p * o,
              fontFamily: F.mono, fontSize: 24, fontWeight: 600, letterSpacing: 1, color: l > 0.5 ? C.accent : C.muted, whiteSpace: 'nowrap' }}>${v}</div>
          </React.Fragment>
        );
      })}
    </>
  );
};

/** 金额大字：小号货币符号 + 大号数字（转播比分牌写法）。 */
export const Money: React.FC<{ cur: string; value: string; size: number; color: string; curColor?: string; curScale?: number; style?: React.CSSProperties }> = ({ cur, value, size, color, curColor, curScale = 0.5, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'flex-start', whiteSpace: 'nowrap', fontFamily: F.display, fontWeight: 800, lineHeight: 1, ...style }}>
    <span style={{ fontSize: size * curScale, color: curColor ?? color, marginTop: size * 0.13, marginRight: size * 0.03 }}>{cur}</span>
    <span style={{ fontSize: size, color, letterSpacing: -size * 0.015, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

// ───────── 对比记分牌（镜头 B、D 共用同一个组件、同一横向刻度 PX；竖向版式按行数各给一套） ─────────
export type BoardL = {
  cl: number; gp: number; ds: number; // 每行页眉顶（BrandMark）
  logo: number; boff: number; bh: number; val: number; // 品牌标高 / 页眉顶→条顶 / 条高 / 金额字号
  laneGap: number; laneH: number; // ×3 括号带：Claude 条底 → 带顶 / 带高
  labelGap: number; // 最后一行条底 → 刻度字
};
/** 镜头 B：两行（Claude / GPT），放大一档撑满正文区 */
export const L2: BoardL = { cl: 262, gp: 572, ds: 572, logo: 80, boff: 104, bh: 88, val: 124, laneGap: 28, laneH: 54, labelGap: 26 };
/** 镜头 D：三行（加 DeepSeek） */
export const L3: BoardL = { cl: 206, gp: 456, ds: 706, logo: 64, boff: 84, bh: 68, val: 104, laneGap: 26, laneH: 44, labelGap: 22 };
export const CELLS = { x: 944, y: 742, w: 112, h: 96, gap: 14 }; // DeepSeek 6 关格（L3）

export type BoardT = {
  gpIn: number; gpBar: number; gpLand: number; // GPT 页眉入场 / 条开始长 / 条和数字到位
  lane: number; x3: number; laneOut: number; // ×3：三段虚线依次画出 / 「×3」落位 / 整条带收起
  dsIn: number; dsBar: number; dsLand: number; ynIn: number; ynLand: number; // DeepSeek 页眉 / 条 / ≈ ¥10
  dim: number; cellsIn: number; cellT: number[]; frame: number; // 其余两行压暗 / 6 关格 / 取景框
};

export const Board: React.FC<{ T: BoardT; L: BoardL; rows: 2 | 3 }> = ({ T, L, rows }) => {
  const t = useSec();
  const barY = (r: number) => r + L.boff;
  const BH = L.bh;
  const lastBar = barY(rows === 3 ? L.ds : L.gp) + BH;
  const lane = { y: barY(L.cl) + BH + L.laneGap, h: L.laneH };
  // 「正在讲」：Claude → GPT（gpIn）→ DeepSeek（dsIn），0.35s 交叉
  const toGp = tw(t, T.gpIn, 0.35, E.inOut);
  const toDs = tw(t, T.dsIn, 0.35, E.inOut);
  const hot = { cl: 1 - toGp, gp: toGp * (1 - toDs), ds: toDs };
  const dimP = tw(t, T.dim, 0.5, E.inOut);
  const rowO = 1 - 0.7 * dimP; // Claude / GPT 两行压暗到 0.3
  const pGp = tw(t, T.gpBar, Math.max(0.01, T.gpLand - T.gpBar), E.out);
  const pDs = tw(t, T.dsBar, Math.max(0.01, T.dsLand - T.dsBar), E.out);
  const pYn = tw(t, T.ynIn + 0.1, Math.max(0.01, T.ynLand - T.ynIn - 0.1), E.out);
  const valTop = (r: number) => barY(r) + BH / 2 - L.val * 0.54; // 金额数字在条中线上居中
  const valColor = (h: number) => (h > 0.5 ? C.accent : C.ink);
  const laneO = 1 - tw(t, T.laneOut, 0.35, E.in);
  const track = (r: number) => (
    <div style={{ position: 'absolute', left: X0, top: barY(r), width: xOf(20) - X0, height: BH, background: alpha(C.surface2, 0.75), border: `1px solid ${C.line}`, boxSizing: 'border-box' }} />
  );
  return (
    <>
      <Axis gy0={barY(L.cl) - 14} gy1={lastBar + 12} labelY={lastBar + L.labelGap} t0={-FAR} o={1 - 0.5 * dimP} />

      {/* ── Claude（已在镜头 A 讲完：条满、数字到位）── */}
      <div style={{ position: 'absolute', inset: 0, opacity: rowO }}>
        {track(L.cl)}
        <div style={{ position: 'absolute', left: X0, top: L.cl }}><BrandMark racer={CL} h={L.logo} /></div>
        <MeterBar x={X0} y={barY(L.cl)} w={USD.cl * PX} h={BH} hot={hot.cl} />
        <div style={{ position: 'absolute', left: xOf(USD.cl) + 26, top: valTop(L.cl) }}>
          <Money cur="$" value="18.8" size={L.val} color={valColor(hot.cl)} />
        </div>
      </div>

      {/* ── ×3 括号带：GPT 的花费连摆三段 ≈ Claude 那一根 ── */}
      {t >= T.lane && laneO > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: laneO }}>
          {[0, 1, 2].map((i) => {
            const st = T.lane + [0, 0.2, 0.34][i];
            const p = tw(t, st, 0.26, E.out);
            const x = xOf(USD.gp * i), w = USD.gp * PX;
            if (p <= 0) return null;
            return (
              <div key={i} style={{ position: 'absolute', left: x + 3, top: lane.y, width: w - 6, height: lane.h, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>
                <div style={{ position: 'absolute', inset: 0, border: `2px dashed ${C.accent}`, background: alpha(C.accent, 0.1), boxSizing: 'border-box' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: Math.round(lane.h * 0.52), fontWeight: 600, color: C.accent, letterSpacing: 1 }}>$6.4</div>
              </div>
            );
          })}
          {/* 「差不多」：第三段的末端和 Claude 条尾上下对齐的竖向虚线 */}
          <div style={{ position: 'absolute', left: xOf(USD.cl) - 1, top: barY(L.cl) + BH, width: 0, height: lane.y + lane.h - barY(L.cl) - BH, borderLeft: `2px dashed ${alpha(C.ink, 0.6 * tw(t, T.x3 - 0.1, 0.25))}` }} />
          <At x={xOf(USD.gp * 3) + 30} y={lane.y + lane.h / 2 - L.val * 0.5} t0={T.x3} dy={14}>
            <span style={{ fontFamily: F.display, fontWeight: 800, fontStyle: 'italic', fontSize: L.val * 1.08, lineHeight: 1, color: C.accent, letterSpacing: -2 }}>×3</span>
          </At>
        </div>
      )}

      {/* ── GPT ── */}
      <div style={{ position: 'absolute', inset: 0, opacity: rowO }}>
        {track(L.gp)}
        {t >= T.gpIn - 0.05 && <At x={X0} y={L.gp} t0={T.gpIn} dy={14}><BrandMark racer={GP} h={L.logo} /></At>}
        <MeterBar x={X0} y={barY(L.gp)} w={USD.gp * PX * pGp} h={BH} hot={hot.gp} />
        {t >= T.gpBar - 0.05 && (
          <div style={{ position: 'absolute', left: xOf(USD.gp * pGp) + 26, top: valTop(L.gp), opacity: tw(t, T.gpBar - 0.05, 0.2) }}>
            <Money cur="$" value={(6.4 * pGp).toFixed(1)} size={L.val} color={valColor(hot.gp)} />
          </div>
        )}
      </div>

      {/* ── DeepSeek ── */}
      {rows === 3 && track(L.ds)}
      {rows === 3 && t >= T.dsIn - 0.05 && (
        <>
          <At x={X0} y={L.ds - 6} t0={T.dsIn} dy={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 30, height: 76 }}>
              <span style={{ fontFamily: F.display, fontWeight: 800, fontStyle: 'italic', fontSize: 76, lineHeight: 1, color: C.ink, letterSpacing: -1 }}>4TH</span>
              <BrandMark racer={DS} h={L.logo} />
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, marginLeft: 10 }}>
                <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 76, lineHeight: 1, color: C.ink }}>20.7</span>
                <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 34, color: C.muted }}>分</span>
              </span>
            </div>
          </At>
          <MeterBar x={X0} y={barY(L.ds)} w={USD.ds * PX * pDs} h={BH} hot={hot.ds} />
          {t >= T.dsBar - 0.05 && (
            <div style={{ position: 'absolute', left: xOf(USD.ds * pDs) + 26, top: valTop(L.ds), opacity: tw(t, T.dsBar - 0.05, 0.2) }}>
              <Money cur="$" value={(1.42 * pDs).toFixed(1)} size={L.val} color={valColor(hot.ds)} />
            </div>
          )}
          {t >= T.ynIn - 0.05 && (
            <At x={xOf(USD.ds) + 230} y={barY(L.ds) + BH / 2 - 40} t0={T.ynIn} dy={10}>
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 14, whiteSpace: 'nowrap' }}>
                <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 52, color: C.muted }}>≈</span>
                <Money cur="¥" value={String(Math.round(10 * pYn))} size={80} color={C.ink} curColor={C.ink2} curScale={0.56} />
              </div>
            </At>
          )}
          {/* 推箱子 6 关：✕✕✓✓✕✕（真实） */}
          {t >= T.cellsIn - 0.05 && (
            <>
              <At x={CELLS.x} y={CELLS.y - 44} t0={T.cellsIn} dy={8}>
                <div style={{ fontFamily: F.sans, fontSize: 26, color: C.muted, letterSpacing: 6, whiteSpace: 'nowrap' }}>推箱子 · 6 道题</div>
              </At>
              <At x={CELLS.x} y={CELLS.y} t0={T.cellsIn + 0.05} dy={12}>
                <LevelCells results={[false, false, true, true, false, false]} times={T.cellT} w={CELLS.w} h={CELLS.h} gap={CELLS.gap} />
              </At>
              <Bracket x={CELLS.x} y={CELLS.y} w={CELLS.w * 6 + CELLS.gap * 5} h={CELLS.h} t0={T.frame} pad={12} arm={30} />
            </>
          )}
        </>
      )}
    </>
  );
};

