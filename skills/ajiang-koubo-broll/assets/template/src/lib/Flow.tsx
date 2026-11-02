import React from 'react';
import { C } from './tokens';
import { E, clamp, lerp, tw } from './anim';
import { useSec } from './time';

/**
 * 连线：三次贝塞尔（或直线）从 a 到 b。bend 让曲线拱起（正数向“左手边”拱）。
 * curve() 返回 {d, at(p)}，at 用于让小包/元素沿线移动。
 */
export type Pt = [number, number];
export type Curve = { d: string; at: (p: number) => Pt; a: Pt; b: Pt };
export const curve = (a: Pt, b: Pt, bend = 0, mode: 'arc' | 'h' | 'v' = 'arc'): Curve => {
  let c1: Pt, c2: Pt;
  if (mode === 'h') {
    const mx = (a[0] + b[0]) / 2;
    c1 = [mx, a[1]]; c2 = [mx, b[1]];
  } else if (mode === 'v') {
    const my = (a[1] + b[1]) / 2;
    c1 = [a[0], my]; c2 = [b[0], my];
  } else {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    c1 = [a[0] + dx / 3 + nx * bend, a[1] + dy / 3 + ny * bend];
    c2 = [a[0] + (2 * dx) / 3 + nx * bend, a[1] + (2 * dy) / 3 + ny * bend];
  }
  const at = (p: number): Pt => {
    const u = 1 - p;
    return [
      u * u * u * a[0] + 3 * u * u * p * c1[0] + 3 * u * p * p * c2[0] + p * p * p * b[0],
      u * u * u * a[1] + 3 * u * u * p * c1[1] + 3 * u * p * p * c2[1] + p * p * p * b[1],
    ];
  };
  return { d: `M${a[0]} ${a[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${b[0]} ${b[1]}`, at, a, b };
};

/** 画出一条线（draw-on），dash 给虚线，arrow 画箭头，t1 淡出。整张 SVG 铺满父层坐标。 */
export const Wire: React.FC<{ c: Curve; t0: number; dur?: number; t1?: number; color?: string; width?: number; dash?: number; arrow?: boolean; opacity?: number }> = ({ c, t0, dur = 0.7, t1, color = C.faint, width = 2.5, dash, arrow, opacity = 1 }) => {
  const t = useSec();
  const p = tw(t, t0, dur, E.inOut);
  const o = (t1 != null ? 1 - tw(t, t1, 0.35, E.in) : 1) * opacity;
  if (p <= 0 || o <= 0) return null;
  const end = c.at(Math.max(0.001, p)), pre = c.at(Math.max(0, p - 0.02));
  const ang = Math.atan2(end[1] - pre[1], end[0] - pre[0]);
  const ah = 9 + width * 2;
  const mask = `${p} 1`;
  const mid = `m${Math.round(t0 * 1000)}_${c.d.length}_${Math.round(c.a[0])}`;
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o, pointerEvents: 'none' }} width={1} height={1}>
      {dash ? (
        <>
          <defs>
            <mask id={mid} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={8000} height={8000}>
              <path d={c.d} fill="none" stroke="#fff" strokeWidth={width + 4} pathLength={1} strokeDasharray={mask} />
            </mask>
          </defs>
          <path d={c.d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={`${dash} ${dash * 0.9}`} strokeLinecap="round" mask={`url(#${mid})`} />
        </>
      ) : (
        <path d={c.d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={mask} />
      )}
      {arrow && (
        <path d={`M${end[0] - ah * Math.cos(ang - 0.45)} ${end[1] - ah * Math.sin(ang - 0.45)} L${end[0]} ${end[1]} L${end[0] - ah * Math.cos(ang + 0.45)} ${end[1] - ah * Math.sin(ang + 0.45)}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
};

/** 沿线移动的元素（请求包、Key、数据）。t0 出发，dur 秒到达；children 以自身中心对准线上的点。 */
export const Along: React.FC<{ c: Curve; t0: number; dur?: number; hideAt?: number; ease?: (x: number) => number; children: React.ReactNode }> = ({ c, t0, dur = 1.2, hideAt, ease = E.inOut, children }) => {
  const t = useSec();
  if (t < t0 - 0.2) return null;
  if (hideAt != null && t > hideAt + 0.3) return null;
  const p = ease(clamp((t - t0) / dur));
  const [x, y] = c.at(p);
  const o = Math.min(tw(t, t0 - 0.2, 0.2), hideAt != null ? 1 - tw(t, hideAt, 0.25) : 1);
  return <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', opacity: o, zIndex: 5 }}>{children}</div>;
};

/** 线上的流动光点（表示“正在传输”），循环；适合常驻的连接线。 */
export const Flowing: React.FC<{ c: Curve; t0: number; t1?: number; color?: string; n?: number; period?: number; r?: number; glow?: boolean }> = ({ c, t0, t1, color = C.accent, n = 3, period = 1.6, r = 5, glow = false }) => {
  const t = useSec();
  if (t < t0 || (t1 != null && t > t1)) return null;
  const o = Math.min(tw(t, t0, 0.3), t1 != null ? 1 - tw(t, t1 - 0.3, 0.3) : 1);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const p = ((t - t0) / period + i / n) % 1;
        const [x, y] = c.at(p);
        const a = Math.sin(Math.PI * p);
        return <div key={i} style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, background: color, opacity: o * a, boxShadow: glow ? `0 0 ${r * 2}px ${color}` : undefined }} />;
      })}
    </>
  );
};

/** 两点之间的直线插值（不画线，只给位置），方便手写简单移动 */
export const mix2 = (a: Pt, b: Pt, p: number): Pt => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];
