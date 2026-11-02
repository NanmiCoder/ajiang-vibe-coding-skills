import React from 'react';
import { C, E, F, clamp, lerp, spring, tw, useSec } from '../../lib';

// seg1 私有组件：scanline-annotate-focus 卡的「取景框咬合 + 机器标签」语法，按本片浅色 tokens 重新蒙皮。
// 去掉了扫描线 / 余晖 / 暗场；机器色 = ModelDial 蓝（全片唯一强调色），页面内容（报告卡、截图）保持原色。
// 所有组件都在「父层坐标」里画；k = 当前镜头下 1 个父层单位在屏幕上的像素数（用来把描边、臂长、字号换算成屏幕恒定值）。

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// 卡片原值（30fps）：spring damping 15 / stiffness 210 → ω≈14.5 rad/s、ζ≈0.52（一次可见过冲，略收进 bbox 再回）
const SPRING_W = 14.49;
const SPRING_Z = 0.518;

/**
 * 四角取景框：从外扩 76px 处按弹簧收拢到 bbox；臂长 40→26px 晚 0.1s 收一档；对准瞬间框内一次极淡的蓝色对焦闪。
 * x/y/w/h 是目标 bbox（父层单位，已含 12–16px 留边）。t1 淡出。
 */
export const Bracket: React.FC<{ x: number; y: number; w: number; h: number; t0: number; t1?: number; k: number; color?: string; r?: number }> = ({ x, y, w, h, t0, t1, k, color = C.accent, r = 8 }) => {
  const t = useSec();
  if (t < t0) return null;
  const out = t1 != null ? tw(t, t1, 0.35, E.in) : 0;
  if (out >= 1) return null;
  const s = spring(t, t0, SPRING_W, SPRING_Z);
  const pad = (76 * (1 - s)) / k;
  const op = clamp((t - t0) / 0.1) * (1 - out);
  const arm = (40 - 14 * tw(t, t0 + 0.1, 0.4, E.out)) / k;
  const flash = tw(t, t0 + 0.1, 0.1) * (1 - tw(t, t0 + 0.2, 0.4));
  const X = x - pad, Y = y - pad, Wd = w + pad * 2, Ht = h + pad * 2;
  const d = [
    `M${X} ${Y + arm}V${Y}H${X + arm}`,
    `M${X + Wd - arm} ${Y}H${X + Wd}V${Y + arm}`,
    `M${X + Wd} ${Y + Ht - arm}V${Y + Ht}H${X + Wd - arm}`,
    `M${X + arm} ${Y + Ht}H${X}V${Y + Ht - arm}`,
  ].join('');
  return (
    <>
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r / k, background: rgba(color, 0.075 * flash), boxShadow: `inset 0 0 0 ${2 / k}px ${rgba(color, 0.4 * flash)}`, opacity: 1 - out, pointerEvents: 'none' }} />
      <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: op, pointerEvents: 'none' }}>
        <path d={d} fill="none" stroke={color} strokeWidth={3.5 / k} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );
};

/**
 * 机器标签：蓝底白字小签（设计工具选中标签的惯例），逐字打出，签条宽度随字长出（带白色块光标）。
 * head（粗）在 t0 打出；detail（细）在 detailAt 接着打（让结论词跟口播同时出现）。
 * detail 也可以是函数（如实时计数），这时不打字，直接显示。
 * anchor：x 是签条的左边（'left'）或右边（'right'）；y 是签条顶边。fs = 屏幕字号。
 */
export const Tag: React.FC<{
  x: number; y: number; t0: number; t1?: number; k: number;
  head: string; detail?: string | ((t: number) => string); detailAt?: number;
  anchor?: 'left' | 'right'; fs?: number; cps?: number; color?: string;
}> = ({ x, y, t0, t1, k, head, detail, detailAt, anchor = 'left', fs = 31, cps = 34, color = C.accent }) => {
  const t = useSec();
  if (t < t0) return null;
  const out = t1 != null ? tw(t, t1, 0.3, E.in) : 0;
  if (out >= 1) return null;
  const rise = tw(t, t0, 0.4, E.out);
  const pop = tw(t, t0, 0.13, E.out);
  const nh = Math.min(head.length, Math.floor((t - t0) * cps) + 1);
  let det = '';
  let typingDet = false;
  if (detail != null && detailAt != null && t >= detailAt) {
    if (typeof detail === 'function') det = detail(t);
    else {
      const full = ` · ${detail}`;
      const nd = Math.min(full.length, Math.floor((t - detailAt) * cps) + 1);
      det = full.slice(0, nd);
      typingDet = nd < full.length;
    }
  }
  const typing = nh < head.length || typingDet;
  const u = 1 / k; // 1 屏幕像素
  const H = fs * 1.6;
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, height: H * u,
        transform: `translate(${anchor === 'right' ? '-100%' : '0'}, ${(1 - rise) * 8 * u}px)`,
        opacity: pop * (1 - out),
        display: 'flex', alignItems: 'center', padding: `0 ${16 * u}px 0 ${15 * u}px`, boxSizing: 'border-box',
        borderRadius: 10 * u, background: color,
        boxShadow: `0 ${10 * u}px ${22 * u}px ${-10 * u}px rgba(20,40,120,.55), inset 0 ${u}px 0 rgba(255,255,255,.22)`,
        fontFamily: F.mono, fontSize: fs * u, lineHeight: 1, color: '#fff', whiteSpace: 'pre', letterSpacing: 0,
        pointerEvents: 'none', zIndex: 30,
      }}
    >
      <span style={{ fontWeight: 700 }}>{head.slice(0, nh)}</span>
      {det && <span style={{ fontWeight: 500, color: 'rgba(255,255,255,.9)', fontVariantNumeric: 'tabular-nums' }}>{det}</span>}
      {typing && <span style={{ display: 'inline-block', width: fs * 0.42 * u, height: fs * 0.95 * u, marginLeft: 2 * u, background: 'rgba(255,255,255,.85)' }} />}
    </div>
  );
};

/** 关键帧插值一个矩形（镜头式缓动，和 Cam 同一条曲线） */
export type Rect = { x: number; y: number; w: number; h: number; r?: number };
export type RectKey = Rect & { t: number; d?: number };
export const rectAt = (ks: RectKey[], t: number): Rect => {
  let cur: Rect = { ...ks[0], r: ks[0].r ?? 20 };
  for (let i = 1; i < ks.length; i++) {
    const m = ks[i];
    if (t <= m.t) break;
    const p = E.cam(clamp((t - m.t) / (m.d ?? 1.1)));
    cur = { x: lerp(cur.x, m.x, p), y: lerp(cur.y, m.y, p), w: lerp(cur.w, m.w, p), h: lerp(cur.h, m.h, p), r: lerp(cur.r ?? 20, m.r ?? 20, p) };
  }
  return cur;
};

/**
 * 浅色聚光（Screen Studio highlight 的浅色版）：焦点矩形以外蒙一层站点底色的白纱，而不是压暗。
 * 放在会裁切的容器里（报告卡 / 窗口页面层），白纱就不会溢出到舞台上。
 */
export const Veil: React.FC<{ keys: RectKey[]; t0: number; t1?: number; a?: number; dur?: number }> = ({ keys, t0, t1, a = 0.66, dur = 0.5 }) => {
  const t = useSec();
  const p = tw(t, t0, dur, E.inOut) * (t1 != null ? 1 - tw(t, t1, dur, E.inOut) : 1);
  if (p <= 0) return null;
  const R = rectAt(keys, t);
  return <div style={{ position: 'absolute', left: R.x, top: R.y, width: R.w, height: R.h, borderRadius: R.r, boxShadow: `0 0 0 6000px rgba(247,248,250,${a * p})`, pointerEvents: 'none', zIndex: 10 }} />;
};

/** 小号加载圈（按钮点下后的“正在检测”） */
export const Spinner: React.FC<{ x: number; y: number; r: number; t0: number; t1?: number; color?: string; width?: number }> = ({ x, y, r, t0, t1, color = C.accent, width = 3 }) => {
  const t = useSec();
  if (t < t0) return null;
  const o = tw(t, t0, 0.2) * (t1 != null ? 1 - tw(t, t1, 0.25) : 1);
  if (o <= 0) return null;
  const a = (t - t0) * 420;
  const C2 = 2 * Math.PI * r;
  return (
    <svg width={r * 2 + width * 2} height={r * 2 + width * 2} style={{ position: 'absolute', left: x - r - width, top: y - r - width, overflow: 'visible', opacity: o }}>
      <circle cx={r + width} cy={r + width} r={r} fill="none" stroke={rgba(color, 0.18)} strokeWidth={width} />
      <circle cx={r + width} cy={r + width} r={r} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${C2 * 0.28} ${C2}`} transform={`rotate(${a} ${r + width} ${r + width})`} />
    </svg>
  );
};

export { rgba };
