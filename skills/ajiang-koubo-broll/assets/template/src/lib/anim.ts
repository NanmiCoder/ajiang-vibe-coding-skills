// 时间一律用「段内秒」，不用帧号。全部是纯函数，逐帧可复现（禁 Math.random / Date）。

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// 三次贝塞尔缓动（与 CSS cubic-bezier 同义）
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      const d = dx(t);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(clamp(t));
  };
};

// 品牌动效嗓音：专业信赖（不弹的推移/淡入）+ 落位时一点点过冲。
export const E = {
  out: bezier(0.16, 1, 0.3, 1), // 入场：快起慢收
  inOut: bezier(0.65, 0, 0.35, 1), // 转场 / 物体位移
  cam: bezier(0.42, 0, 0.18, 1), // 镜头推拉（Screen Studio 手感：起步柔、落位长）
  in: bezier(0.55, 0, 0.75, 0.3), // 退场加速
  back: bezier(0.34, 1.32, 0.64, 1), // 落位带轻微过冲（只给需要“落地”的元素）
  linear: (x: number) => x,
};

/** t 时刻、从 t0 开始、持续 dur 秒的进度 0..1 */
export const tw = (t: number, t0: number, dur: number, ease: (x: number) => number = E.out) =>
  ease(clamp((t - t0) / Math.max(dur, 1e-6)));

/** 进出两段：t0 起 inDur 进场，t1 起 outDur 退场；返回 0..1..0 */
export const inOut = (t: number, t0: number, t1: number, inDur = 0.5, outDur = 0.4) =>
  t1 > t0 ? Math.min(tw(t, t0, inDur), 1 - tw(t, t1, outDur, E.in)) : tw(t, t0, inDur);

/** 闭式阻尼弹簧：0→1，k 越大越快，z<1 有过冲。dt 秒 */
export const spring = (t: number, t0: number, k = 14, z = 0.72) => {
  const x = t - t0;
  if (x <= 0) return 0;
  const w = k, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x));
};

/** 多关键帧插值：keys = [[t, v], ...]，段间用 ease */
export const keys = (t: number, ks: [number, number][], ease: (x: number) => number = E.inOut) => {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [ta, va] = ks[i], [tb, vb] = ks[i + 1];
    if (t <= tb) return lerp(va, vb, ease(clamp((t - ta) / Math.max(tb - ta, 1e-6))));
  }
  return ks[ks.length - 1][1];
};

/** 确定性伪随机 */
export const rand = (seed: number) => {
  let s = (seed * 2654435761) >>> 0;
  s = (s ^ (s >>> 15)) * 2246822507;
  s = (s ^ (s >>> 13)) * 3266489909;
  return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
};

/**
 * 标准入场样式：上浮 + 去模糊 + 淡入（blur-slide）。全片文字/卡片默认都用它，保证同一个嗓音。
 * dy 上浮距离，dur 时长。可选 t1 退场（淡出 + 轻微上移 + 模糊）。
 */
export const rise = (t: number, t0: number, o: { dy?: number; dur?: number; blur?: number; t1?: number; outDur?: number; scale?: number } = {}): React.CSSProperties => {
  const dy = o.dy ?? 22, dur = o.dur ?? 0.6, bl = o.blur ?? 8;
  const p = tw(t, t0, dur);
  const q = o.t1 != null ? tw(t, o.t1, o.outDur ?? 0.4, E.in) : 0;
  const s0 = o.scale ?? 1;
  const sc = lerp(s0, 1, p);
  return {
    opacity: p * (1 - q),
    transform: `translate3d(0, ${(1 - p) * dy - q * 10}px, 0)${sc !== 1 ? ` scale(${sc})` : ''}`,
    filter: (1 - p) * bl + q * 6 > 0.05 ? `blur(${(1 - p) * bl + q * 6}px)` : undefined,
  };
};

/** 淡入淡出（不位移） */
export const fade = (t: number, t0: number, t1?: number, dur = 0.4): React.CSSProperties => ({
  opacity: t1 != null ? inOut(t, t0, t1, dur, dur) : tw(t, t0, dur),
});
