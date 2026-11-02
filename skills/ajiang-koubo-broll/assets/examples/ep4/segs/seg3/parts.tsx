import React from 'react';
import { C, F, alpha, Cutout, E, Tag, clamp, lerp, tw, useSec } from '../../lib';
import type { Track } from '../../lib';

// seg3 私有组件：思考记录的美金遮挡、完整路线（63 个方向格，按 5 次调用分行）、思考 / 动手时间轴、三星。
// 颜色全部来自 tokens；遮挡块用截图自己的像素（不写死颜色）。

/**
 * 截图里的美金数遮挡（悬念：花费留到 seg12）。每块 = 从同一张截图别处复制一块像素盖上去：
 * 请求分隔行用“$ 之后的空隙 + 分隔线”盖住「· $x.xx」，看起来就是分隔线直接接在 Token 数后面；表头用右侧空白盖住。
 * 坐标全部是页面 CSS px（截图像素 / 2），由 out/tmp/seg3 里的量取脚本测得。
 */
export type Patch = { tx: number; ty: number; w: number; h: number; sx: number };
export const DollarMask: React.FC<{ src: string; patches: Patch[] }> = ({ src, patches }) => (
  <>
    {patches.map((p, i) => (
      <div key={i} style={{ position: 'absolute', left: p.tx, top: p.ty, zIndex: 5 }}>
        <Cutout src={src} sx={p.sx * 2} sy={p.ty * 2} sw={p.w * 2} sh={p.h * 2} w={p.w} radius={0} />
      </div>
    ))}
  </>
);
export const MASK_CLAUDE: Patch[] = [
  { tx: 764, ty: 12, w: 62, h: 22, sx: 900 }, // 表头「· $2.75」
  { tx: 884.5, ty: 78, w: 67, h: 18, sx: 941.5 }, // 第 1 次请求「· $2.14」
  { tx: 870, ty: 254, w: 67, h: 18, sx: 927.5 },
  { tx: 888, ty: 384, w: 67, h: 18, sx: 945 },
  { tx: 888, ty: 512, w: 67, h: 18, sx: 945 },
  { tx: 888, ty: 642, w: 67, h: 18, sx: 945 },
];
export const MASK_GPT: Patch[] = [
  { tx: 757, ty: 12, w: 62, h: 22, sx: 900 }, // 表头「· $1.08」
  { tx: 891.5, ty: 146, w: 67, h: 19, sx: 948.5 }, // 第 1 次请求「· $0.98」
  { tx: 888, ty: 322, w: 67, h: 19, sx: 945.5 },
  { tx: 888, ty: 499, w: 67, h: 19, sx: 945.5 },
  { tx: 884.5, ty: 628, w: 67, h: 19, sx: 941.5 },
];

// ── 方向格 ──
const ROT: Record<string, number> = { U: 0, R: 90, D: 180, L: 270 };
export const Arrow: React.FC<{ m: string; size: number; color: string }> = ({ m, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', transform: `rotate(${ROT[m] ?? 0}deg)` }}>
    <path d="M12 20V5.5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** 一位选手一关的走法按调用分组：[{from, to, moves[]}]（全部来自 track()，不手编）。 */
export const callRows = (T: Track) =>
  T.calls.map((c) => ({ n: c.n, from: c.from, to: c.to, moves: Array.from({ length: c.to - c.from }, (_, i) => T.info[c.from + i + 1].move ?? 'U') }));

/**
 * 完整路线面板：每次调用一行，一格一步。
 *  计算阶段（tFill0→tFill1）：格子越来越快地填满（模型在脑子里把整条路线算出来）。
 *  执行阶段（at = 棋盘帧位置）：走过的格子变酸性绿，正在走的那格描边，当前这一行的「调用 N」点亮。
 *  tLabels 起行首出现「调用 1…5」；之前第一行行首是「开局」，最后一格后面是「通关」。
 */
export const RoutePanel: React.FC<{
  x: number; y: number; T: Track; at: number; acting: boolean;
  tFill0: number; tFill1: number; tStart: number; tLabels: number; tDone: number;
  cs?: number; gap?: number; rowGap?: number; labelW?: number;
}> = ({ x, y, T, at, acting, tFill0, tFill1, tStart, tLabels, tDone, cs = 34, gap = 5, rowGap = 14, labelW = 110 }) => {
  const t = useSec();
  const rows = callRows(T);
  const total = rows.reduce((a, r) => a + r.moves.length, 0);
  let gi = 0;
  const startP = tw(t, tStart, 0.3);
  const lab = (i: number) => tw(t, tLabels + i * 0.07, 0.35);
  const lastRow = rows[rows.length - 1];
  const endX = x + labelW + lastRow.moves.length * (cs + gap) + 6;
  const endY = y + (rows.length - 1) * (cs + rowGap);
  const doneP = tw(t, tDone, 0.25);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {rows.map((r, k) => {
        const ry = y + k * (cs + rowGap);
        const active = acting && at > r.from && at <= r.to + 0.001 && !(k < rows.length - 1 && at >= r.to);
        const done = acting && at >= r.to;
        const lp = lab(k);
        return (
          <React.Fragment key={k}>
            {/* 行首：开局（计算阶段）→ 调用 k（执行阶段） */}
            {k === 0 && lp < 1 && (
              <div style={{ position: 'absolute', left: x, top: ry + cs / 2 - 17, opacity: startP * (1 - lp) }}>
                <Tag tone="ink" size={24}>开局</Tag>
              </div>
            )}
            <div style={{ position: 'absolute', left: x, top: ry, height: cs, display: 'flex', alignItems: 'center', opacity: lp, transform: `translateX(${(1 - lp) * -14}px)`,
              fontFamily: F.mono, fontSize: 24, fontWeight: 600, letterSpacing: 1, color: active ? C.accent : done ? C.ink2 : C.muted, whiteSpace: 'nowrap' }}>
              调用 {r.n}
            </div>
            {r.moves.map((m, j) => {
              const i = gi++;
              // 计算阶段：第 i 格出现的时刻（加速：u = ((i+1)/total)^(1/1.8)）
              const ti = tFill0 + Math.pow((i + 1) / total, 1 / 1.8) * (tFill1 - tFill0);
              const shown = tw(t, ti - 0.1, 0.16);
              const slot = tw(t, tFill0 - 0.35 + (i / total) * 0.3, 0.3);
              const f = i + 1; // 走完这一步时的帧
              const ex = acting && at >= f;
              const cur = acting && at > f - 1 && at < f;
              const bg = ex ? C.accent : C.surface2;
              const bd = cur ? C.accent : ex ? C.accent : shown > 0.5 ? C.line : alpha(C.ink, 0.06);
              const gc = ex ? C.bg : cur ? C.accent : acting ? C.muted : C.ink2;
              return (
                <div key={j} style={{ position: 'absolute', left: x + labelW + j * (cs + gap), top: ry, width: cs, height: cs, boxSizing: 'border-box', opacity: slot,
                  background: bg, border: `${cur ? 2 : 1}px solid ${bd}`, display: 'grid', placeItems: 'center' }}>
                  <div style={{ opacity: shown, transform: `scale(${lerp(0.6, 1, shown)})` }}>
                    <Arrow m={m} size={cs * 0.62} color={gc} />
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
      {/* 路线终点：通关（推完那一刻点亮） */}
      <div style={{ position: 'absolute', left: endX, top: endY + cs / 2 - 17, opacity: tw(t, tFill0 + 0.3, 0.3) }}>
        <Tag tone={doneP > 0.5 ? 'accent' : 'dim'} size={24}>通关</Tag>
      </div>
    </div>
  );
};

/**
 * 思考 / 动手时间轴：一根按真实耗时比例画的条——很长的「思考」+ 很短的「动手」。
 * thinkP 0..1 = 思考段填充进度；actP 0..1 = 动手段进度（= 棋盘走到第几步 / 总步数）。
 */
export const ThinkAct: React.FC<{ x: number; y: number; w: number; frac: number; thinkP: number; actP: number; acting: boolean; h?: number }> = ({ x, y, w, frac, thinkP, actP, acting, h = 40 }) => {
  const wt = w * frac, wa = w - wt;
  const head = acting ? wt + wa * actP : wt * thinkP;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w }}>
      <div style={{ position: 'relative', height: 44 }}>
        <span style={{ position: 'absolute', left: 0, top: 0, fontFamily: F.sans, fontWeight: 700, fontSize: 32, color: C.ink, letterSpacing: 2 }}>思考</span>
        <span style={{ position: 'absolute', right: 0, top: 0, fontFamily: F.sans, fontWeight: 700, fontSize: 32, color: acting ? C.accent : C.faint, letterSpacing: 2 }}>动手</span>
      </div>
      <div style={{ position: 'relative', marginTop: 12, width: w, height: h, background: C.surface2, boxShadow: `inset 0 0 0 1px ${C.line}` }}>
        {/* 思考段：斜纹填充（还没动手） */}
        <div style={{ position: 'absolute', left: 0, top: 0, height: h, width: wt * clamp(thinkP),
          background: `repeating-linear-gradient(135deg, ${alpha(C.ink, 0.34)} 0 6px, ${alpha(C.ink, 0.16)} 6px 12px)` }} />
        {/* 动手段：酸性绿实心 */}
        <div style={{ position: 'absolute', left: wt, top: 0, height: h, width: Math.max(0, wa * clamp(actP)), background: C.accent }} />
        {/* 动手段的槽位（一直可见，表示它有多短） */}
        <div style={{ position: 'absolute', left: wt, top: -6, width: wa, height: h + 12, boxShadow: `inset 0 0 0 1.5px ${acting ? C.accent : alpha(C.ink, 0.35)}` }} />
        {/* 播放头 */}
        <div style={{ position: 'absolute', left: head - 1, top: -10, width: 2, height: h + 20, background: C.ink, opacity: thinkP > 0 ? 1 : 0 }} />
      </div>
    </div>
  );
};

/** 三星（产品回放页「3 星」的大号版）：依次弹出，带一点过冲。 */
export const Stars: React.FC<{ x: number; y: number; size: number; gap: number; times: number[] }> = ({ x, y, size, gap, times }) => {
  const t = useSec();
  return (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', gap }}>
      {times.map((t0, i) => {
        const p = tw(t, t0, 0.5, E.back);
        const o = tw(t, t0, 0.15);
        return (
          <div key={i} style={{ width: size, height: size, opacity: o, transform: `scale(${lerp(0.5, 1, p)}) rotate(${(1 - p) * -18}deg)` }}>
            <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
              <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8l-6.2 3.2L7 14.2 2 9.3l6.9-1z" fill={C.accent} stroke={C.accent} strokeWidth={1} strokeLinejoin="round" />
            </svg>
          </div>
        );
      })}
    </div>
  );
};
