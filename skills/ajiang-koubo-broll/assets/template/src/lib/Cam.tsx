import React from 'react';
import { AbsoluteFill } from 'remotion';
import { E, clamp, lerp } from './anim';
import { useSec } from './time';

/**
 * Screen Studio 式镜头。children 用舞台坐标（1920×1080）摆放；镜头看向 (x,y)、放大 z 倍。
 * moves：第一项是初始机位；之后每一项表示「从 t 秒开始、用 d 秒推到这个机位」。
 *   rx/ry 是可选的轻微 3D 倾斜（度），只在叙事需要“空间感”时用，信息密集画面保持正视。
 * 推拉一律用同一条曲线（E.cam），缩放在对数空间插值，速度感自然。
 */
export type CamMove = { t: number; x: number; y: number; z: number; d?: number; rx?: number; ry?: number };

export const camAt = (moves: CamMove[], t: number) => {
  let cur = { x: moves[0].x, y: moves[0].y, z: moves[0].z, rx: moves[0].rx ?? 0, ry: moves[0].ry ?? 0 };
  for (let i = 1; i < moves.length; i++) {
    const m = moves[i];
    if (t <= m.t) break;
    const d = m.d ?? 1.1;
    const p = E.cam(clamp((t - m.t) / d));
    const nx = { x: m.x, y: m.y, z: m.z, rx: m.rx ?? 0, ry: m.ry ?? 0 };
    cur = {
      x: lerp(cur.x, nx.x, p),
      y: lerp(cur.y, nx.y, p),
      z: Math.exp(lerp(Math.log(cur.z), Math.log(nx.z), p)),
      rx: lerp(cur.rx, nx.rx, p),
      ry: lerp(cur.ry, nx.ry, p),
    };
  }
  return cur;
};

export const Cam: React.FC<{ moves: CamMove[]; children: React.ReactNode; persp?: number; style?: React.CSSProperties }> = ({ moves, children, persp = 2400, style }) => {
  const t = useSec();
  const c = camAt(moves, t);
  const has3D = Math.abs(c.rx) > 0.01 || Math.abs(c.ry) > 0.01;
  const inner = (
    <div
      style={{
        position: 'absolute', left: 0, top: 0, width: 1920, height: 1080,
        transformOrigin: '0 0',
        transform: `translate(${960 - c.x * c.z}px, ${540 - c.y * c.z}px) scale(${c.z})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
  if (!has3D) return <AbsoluteFill style={{ overflow: 'hidden' }}>{inner}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', perspective: persp, perspectiveOrigin: '50% 50%' }}>
      <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: `rotateX(${c.rx}deg) rotateY(${c.ry}deg)` }}>{inner}</AbsoluteFill>
    </AbsoluteFill>
  );
};
