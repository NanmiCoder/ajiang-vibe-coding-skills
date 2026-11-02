import React from 'react';
import { AbsoluteFill } from 'remotion';
import { E, clamp, lerp } from './anim';
import { useSec } from './time';

/**
 * 镜头容器 + 全片统一的转场语法。镜头在 [from, to] 内挂载；时间不重置（children 里继续用段内秒）。
 * 相邻两镜头重叠 dur 秒（默认 0.8）：上一镜头 to = 下一镜头 from + dur。outDur 单独设退场时长（默认 = dur）。
 * 段尾：最后一个 Shot 用 exit='fade'，to ≈ 段长 + outDur/2 − 0.1（fade 在退场窗口前 50% 就淡完），保证最后 2–4 帧是空舞台。
 *
 * 转场只有这几种，按「两镜之间的关系」选，不按喜好：
 *  - 'fade'   柔切：淡入 + 轻微去模糊/放大。默认，同一话题换画面。
 *  - 'left'   横推：新镜头从右推入、旧镜头向左推出（像镜头横摇）。叙事向前推进（下一步、下一个对象）。
 *  - 'up'     上推：新镜头从下推入。换一个层级（从结论到原因、从页面到原理）。
 *  - 'zoomIn' 推入：旧镜头放大淡出、新镜头从略小放大到位——“走进去看细节”。
 *  - 'zoomOut' 拉出：反向——“退一步看全局”。
 *  - 'none'   不做（由镜头内部的 Cam 推拉自己完成衔接，最自然，优先考虑）。
 * 进场用 enter，退场用 exit；成对使用（A.exit='left' 配 B.enter='left'）。
 */
export type Tx = 'fade' | 'left' | 'up' | 'zoomIn' | 'zoomOut' | 'none';

const style = (kind: Tx, p: number, dir: 'in' | 'out'): React.CSSProperties => {
  // p: 0 = 完全不可见（进场起点 / 退场终点），1 = 完全可见
  const q = 1 - p;
  switch (kind) {
    case 'fade':
      return { opacity: p, transform: dir === 'in' ? `scale(${lerp(1.025, 1, p)})` : `scale(${lerp(0.985, 1, p)})`, filter: q > 0.01 ? `blur(${q * 10}px)` : undefined };
    case 'left':
      return { transform: `translateX(${dir === 'in' ? q * 1920 : -q * 1920}px)` };
    case 'up':
      return { transform: `translateY(${dir === 'in' ? q * 1080 : -q * 1080}px)` };
    case 'zoomIn':
      return dir === 'in'
        ? { opacity: p, transform: `scale(${lerp(0.86, 1, p)})`, filter: q > 0.01 ? `blur(${q * 8}px)` : undefined }
        : { opacity: p, transform: `scale(${lerp(1.18, 1, p)})`, filter: q > 0.01 ? `blur(${q * 10}px)` : undefined };
    case 'zoomOut':
      return dir === 'in'
        ? { opacity: p, transform: `scale(${lerp(1.14, 1, p)})`, filter: q > 0.01 ? `blur(${q * 8}px)` : undefined }
        : { opacity: p, transform: `scale(${lerp(0.88, 1, p)})`, filter: q > 0.01 ? `blur(${q * 10}px)` : undefined };
    default:
      return {};
  }
};

// 透明度类转场（fade / zoomIn / zoomOut）走「先离场、再进场」：旧镜头在重叠窗口前 50% 淡完，
// 新镜头从 40% 开始淡入——两层字不会半透明叠在一起（审片反馈：叠化出现双重字）。
const FADING: Tx[] = ['fade', 'zoomIn', 'zoomOut'];
export const Shot: React.FC<{ from: number; to: number; enter?: Tx; exit?: Tx; dur?: number; outDur?: number; z?: number; children: React.ReactNode }> = ({ from, to, enter = 'fade', exit = 'fade', dur = 0.8, outDur, z, children }) => {
  const t = useSec();
  if (t < from || t > to) return null;
  const ease = enter === 'left' || enter === 'up' ? E.inOut : E.out;
  const lin = clamp((t - from) / dur);
  const pin = enter === 'none' ? 1 : ease(lin);
  const easeO = exit === 'left' || exit === 'up' ? E.inOut : E.in;
  const od = outDur ?? dur;
  const linO = clamp((t - (to - od)) / od);
  const pout = exit === 'none' ? 1 : 1 - easeO(linO);
  let s: React.CSSProperties = {};
  if (pin < 1) {
    s = style(enter, pin, 'in');
    if (FADING.includes(enter)) s.opacity = E.inOut(clamp((lin - 0.4) / 0.6));
  } else if (pout < 1) {
    s = style(exit, pout, 'out');
    if (FADING.includes(exit)) s.opacity = 1 - E.inOut(clamp(linO / 0.5));
  }
  if (s.opacity === 0) return null;
  return <AbsoluteFill style={{ ...s, zIndex: z }}>{children}</AbsoluteFill>;
};
