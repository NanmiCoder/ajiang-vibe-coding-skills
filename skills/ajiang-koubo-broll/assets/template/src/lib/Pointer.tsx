import React from 'react';
import { C, alpha } from './tokens';
import { E, clamp, lerp, tw } from './anim';
import { useSec } from './time';

/**
 * macOS 光标。keys：[{t, x, y, click?}]，t = 到达时间；从上一个点出发的时长按距离自动算（0.45–0.95s），
 * 路径带一点弧度。click=true 在到达时按下并留一圈涟漪。坐标系 = 它所在的父层（舞台层或页面层）。
 * hideAt：淡出时间。scale：光标大小（在页面坐标里用时，按窗口缩放调大，一般 1/k）。
 */
export type PtrKey = { t: number; x: number; y: number; click?: boolean };

export const Pointer: React.FC<{ keys: PtrKey[]; hideAt?: number; scale?: number; ripple?: boolean }> = ({ keys, hideAt, scale = 1, ripple = true }) => {
  const t = useSec();
  const k0 = keys[0];
  if (t < k0.t - 0.35) return null;
  if (hideAt != null && t > hideAt + 0.35) return null;
  let x = k0.x, y = k0.y;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const dur = clamp(0.45 + dist / 2400, 0.45, 0.95);
    const t0 = Math.max(a.t + 0.05, b.t - dur);
    if (t <= t0) break;
    const p = E.inOut(clamp((t - t0) / (b.t - t0)));
    const bend = Math.min(70, dist * 0.12) * Math.sin(Math.PI * p);
    const nx = -(b.y - a.y) / (dist || 1), ny = (b.x - a.x) / (dist || 1);
    x = lerp(a.x, b.x, p) + nx * bend;
    y = lerp(a.y, b.y, p) + ny * bend;
  }
  let press = 1;
  const ripples: { x: number; y: number; p: number }[] = [];
  for (const kk of keys) {
    if (!kk.click) continue;
    const d = t - kk.t;
    if (d >= 0 && d < 0.22) press = Math.min(press, 1 - 0.16 * Math.sin((d / 0.22) * Math.PI));
    if (ripple && d >= 0 && d < 0.7) ripples.push({ x: kk.x, y: kk.y, p: d / 0.7 });
  }
  const op = Math.min(tw(t, k0.t - 0.35, 0.3), hideAt != null ? 1 - tw(t, hideAt, 0.3) : 1);
  return (
    <>
      {ripples.map((r, i) => (
        <div key={i} style={{ position: 'absolute', left: r.x, top: r.y, width: 0, height: 0 }}>
          <div style={{ position: 'absolute', left: -32 * scale, top: -32 * scale, width: 64 * scale, height: 64 * scale, borderRadius: '50%', border: `${2.5 * scale}px solid ${C.accent}`, background: alpha(C.accent, 0.1), opacity: (1 - r.p) * 0.9, transform: `scale(${0.3 + E.out(r.p) * 0.9})` }} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: x, top: y, opacity: op, transform: `scale(${scale * press})`, transformOrigin: '0 0', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.28))', zIndex: 50 }}>
        <svg width="26" height="34" viewBox="0 0 26 34" style={{ position: 'absolute', left: -3, top: -2 }}>
          <path d="M3 2 L3 26 L9.2 20.6 L13.4 30.4 L17.6 28.6 L13.4 19 L21.6 19 Z" fill="#111" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  );
};
