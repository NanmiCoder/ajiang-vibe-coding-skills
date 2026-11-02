import React from 'react';
import { C } from './tokens';
import { E, inOut, tw } from './anim';
import { useSec } from './time';

/** 焦点框：圆角矩形描边从左上角画一圈（0.55s），t1 淡出。坐标系 = 父层。 */
export const Ring: React.FC<{ x: number; y: number; w: number; h: number; r?: number; t0: number; t1?: number; color?: string; width?: number; pad?: number }> = ({ x, y, w, h, r = 12, t0, t1, color = C.accent, width = 3, pad = 6 }) => {
  const t = useSec();
  if (t < t0) return null;
  const p = tw(t, t0, 0.55, E.inOut);
  const o = t1 != null ? 1 - tw(t, t1, 0.35, E.in) : 1;
  if (o <= 0) return null;
  const X = x - pad, Y = y - pad, Wd = w + pad * 2, Ht = h + pad * 2;
  return (
    <svg style={{ position: 'absolute', left: X - 10, top: Y - 10, overflow: 'visible', opacity: o }} width={Wd + 20} height={Ht + 20}>
      <rect x={10} y={10} width={Wd} height={Ht} rx={r} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={width + 7} pathLength={1} strokeDasharray={`${p} 1`} />
      <rect x={10} y={10} width={Wd} height={Ht} rx={r} fill="none" stroke={color} strokeWidth={width} pathLength={1} strokeDasharray={`${p} 1`} strokeLinecap="round" />
    </svg>
  );
};

/**
 * 聚光：压暗矩形以外的区域（Screen Studio 的 highlight）。放在窗口页面层里只压暗页面；放在舞台层压暗整屏。
 * dim 压暗强度。t0 进、t1 出，各 0.45s。
 */
export const Spot: React.FC<{ x: number; y: number; w: number; h: number; r?: number; t0: number; t1?: number; dim?: number }> = ({ x, y, w, h, r = 14, t0, t1, dim = 0.42 }) => {
  const t = useSec();
  const p = inOut(t, t0, t1 ?? 1e9, 0.45, 0.45);
  if (p <= 0) return null;
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, boxShadow: `0 0 0 6000px rgba(24,28,38,${dim * p})`, pointerEvents: 'none', zIndex: 20 }} />;
};

/** 马克笔高亮：从左往右刷出一块浅蓝底（放在文字下层）。 */
export const Marker: React.FC<{ x: number; y: number; w: number; h: number; t0: number; t1?: number; color?: string; dur?: number }> = ({ x, y, w, h, t0, t1, color = C.tint, dur = 0.45 }) => {
  const t = useSec();
  const p = tw(t, t0, dur, E.inOut);
  const o = t1 != null ? 1 - tw(t, t1, 0.3, E.in) : 1;
  if (p <= 0 || o <= 0) return null;
  return <div style={{ position: 'absolute', left: x, top: y, width: w * p, height: h, background: color, borderRadius: 4, opacity: o * 0.9, mixBlendMode: 'multiply' }} />;
};

/** 删除线：从左到右划过（否定、作废）。 */
export const Strike: React.FC<{ x: number; y: number; w: number; t0: number; color?: string; width?: number; dur?: number }> = ({ x, y, w, t0, color = C.ink, width = 4, dur = 0.35 }) => {
  const t = useSec();
  const p = tw(t, t0, dur, E.inOut);
  if (p <= 0) return null;
  return <div style={{ position: 'absolute', left: x, top: y - width / 2, width: w * p, height: width, background: color, borderRadius: width }} />;
};

/** 下划线（关键词点睛）：从左到右描出，略有笔触感。 */
export const Underline: React.FC<{ x: number; y: number; w: number; t0: number; color?: string; width?: number }> = ({ x, y, w, t0, color = C.accent, width = 6 }) => {
  const t = useSec();
  const p = tw(t, t0, 0.5, E.inOut);
  if (p <= 0) return null;
  return (
    <svg style={{ position: 'absolute', left: x, top: y - 10, overflow: 'visible' }} width={w} height={20}>
      <path d={`M2 12 Q ${w * 0.5} 6 ${w - 2} 9`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
    </svg>
  );
};
