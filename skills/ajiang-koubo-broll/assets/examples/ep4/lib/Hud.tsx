import React from 'react';
import { C, F, alpha } from './tokens';
import { rise, spring } from './anim';
import { useSec } from './time';

/**
 * ModelDial Arena 的组件语言（取自 arena.modeldial.com）：深色面板 + 1px 发丝边 + 切角（右上 / 左下斜切），
 * 酸性绿只给「强调 / 通关 / 第一名」，红色 #FF3D6E 只给「死局 / 失败 / 0 分」。不发光、不加渐变。
 */
const cutPoly = (c: number, tr = true, bl = true) =>
  `polygon(0 0, ${tr ? `calc(100% - ${c}px) 0, 100% ${c}px` : '100% 0'}, 100% 100%, ${bl ? `${c}px 100%, 0 calc(100% - ${c}px)` : '0 100%'})`;

/**
 * 切角面板（榜单卡 / 棋盘面板同款）。border 默认发丝线，强调时传 C.accent；top 给一条顶部色条（模型品牌色或 accent）。
 * t0 给了就标准入场（rise）。内容区是普通 div，自己排版。
 */
export const Panel: React.FC<{
  x?: number; y?: number; w: number; h?: number; cut?: number; tr?: boolean; bl?: boolean;
  border?: string; bg?: string; top?: string; topW?: number; pad?: number; t0?: number; t1?: number;
  style?: React.CSSProperties; children?: React.ReactNode;
}> = ({ x, y, w, h, cut = 18, tr = true, bl = false, border = C.line, bg = C.surface, top, topW = 120, pad = 28, t0, t1, style, children }) => {
  const t = useSec();
  if (t0 != null && t < t0 - 0.02) return null;
  const st = t0 != null ? rise(t, t0, { t1, dy: 22 }) : {};
  const poly = cutPoly(cut, tr, bl);
  const abs: React.CSSProperties = x != null && y != null ? { position: 'absolute', left: x, top: y } : { position: 'relative' };
  return (
    <div style={{ ...abs, width: w, height: h, ...st, ...style }}>
      <div style={{ position: 'absolute', inset: 0, background: border, clipPath: poly }} />
      <div style={{ position: 'absolute', inset: 1, background: bg, clipPath: cutPoly(Math.max(1, cut - 0.6), tr, bl) }} />
      {top && <div style={{ position: 'absolute', left: 0, top: 0, width: topW, height: 3, background: top }} />}
      <div style={{ position: 'relative', padding: pad, boxSizing: 'border-box', width: '100%', height: '100%' }}>{children}</div>
    </div>
  );
};

type HudTone = 'accent' | 'bad' | 'warn' | 'ink' | 'dim';
const HT: Record<HudTone, { bg: string; fg: string; bd: string }> = {
  accent: { bg: C.accent, fg: C.bg, bd: C.accent },
  bad: { bg: alpha(C.bad, 0.16), fg: C.bad, bd: alpha(C.bad, 0.5) },
  warn: { bg: alpha(C.warn, 0.14), fg: C.warn, bd: alpha(C.warn, 0.45) },
  ink: { bg: C.surface2, fg: C.ink, bd: C.line },
  dim: { bg: 'transparent', fg: C.muted, bd: C.line },
};
/** 斜切标签（「调用失败」「思考中」「1ST」同款平行四边形）。 */
export const Tag: React.FC<{ children: React.ReactNode; tone?: HudTone; size?: number; mono?: boolean; style?: React.CSSProperties }> = ({ children, tone = 'ink', size = 24, mono, style }) => {
  const c = HT[tone];
  const s = size * 0.42;
  const poly = `polygon(${s}px 0, 100% 0, calc(100% - ${s}px) 100%, 0 100%)`;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}>
      <div style={{ position: 'absolute', inset: 0, background: c.bd, clipPath: poly }} />
      <div style={{ position: 'absolute', inset: 1, background: tone === 'accent' ? c.bg : C.bg, clipPath: poly }} />
      <div style={{ position: 'absolute', inset: 1, background: c.bg, clipPath: poly }} />
      <span style={{ position: 'relative', padding: `${size * 0.26}px ${size * 0.9}px`, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: 600, lineHeight: 1.1, color: c.fg, whiteSpace: 'nowrap', letterSpacing: 0.5 }}>{children}</span>
    </div>
  );
};

/** 英文眉标（产品的「SOKOBAN · LEADERBOARD」样式：等宽大写、宽字距、酸性绿）。 */
export const Eyebrow: React.FC<{ text: string; size?: number; color?: string; style?: React.CSSProperties }> = ({ text, size = 24, color = C.accent, style }) => (
  <div style={{ fontFamily: F.mono, fontSize: size, fontWeight: 600, letterSpacing: size * 0.22, color, textTransform: 'uppercase', whiteSpace: 'nowrap', ...style }}>{text}</div>
);

/**
 * 取景框（镜头卡 scanline-annotate-focus 的本片版）：四个 L 形角从外侧弹簧收拢到目标框，可带一枚标签。
 * 坐标系 = 父层（放在 Window children 里就是页面 CSS px）。tone：accent = 正在讲 / 好结论，bad = 死局 / 0 分。
 * 用来替代整屏压暗：讲到哪一格就把框咬到哪一格。scale：在页面层里用时传 1/k，保证线宽和标签在屏幕上一样大。
 */
export const Bracket: React.FC<{ x: number; y: number; w: number; h: number; t0: number; t1?: number; label?: string; tone?: 'accent' | 'bad'; pad?: number; arm?: number; scale?: number; labelSide?: 'top' | 'bottom' }> = ({ x, y, w, h, t0, t1, label, tone = 'accent', pad = 8, arm = 26, scale = 1, labelSide = 'top' }) => {
  const t = useSec();
  if (t < t0) return null;
  const col = tone === 'bad' ? C.bad : C.accent;
  const sp = spring(t, t0, 15, 0.62);
  const o = Math.min(1, (t - t0) / 0.12) * (t1 != null ? 1 - Math.min(1, Math.max(0, (t - t1) / 0.3)) : 1);
  if (o <= 0) return null;
  const off = (1 - sp) * 28 * scale;
  const X = x - pad * scale, Y = y - pad * scale, Wd = w + pad * 2 * scale, Ht = h + pad * 2 * scale;
  const a = arm * scale, lw = 3 * scale;
  const corner = (cx: number, cy: number, sx: number, sy: number) => (
    <div style={{ position: 'absolute', left: cx + sx * off - (sx > 0 ? a : 0), top: cy + sy * off - (sy > 0 ? a : 0), width: a, height: a,
      borderLeft: sx < 0 ? `${lw}px solid ${col}` : undefined, borderRight: sx > 0 ? `${lw}px solid ${col}` : undefined,
      borderTop: sy < 0 ? `${lw}px solid ${col}` : undefined, borderBottom: sy > 0 ? `${lw}px solid ${col}` : undefined, boxSizing: 'border-box' }} />
  );
  const lp = Math.min(1, Math.max(0, (t - t0 - 0.15) / 0.3));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity: o, pointerEvents: 'none', zIndex: 30 }}>
      {corner(X, Y, -1, -1)}{corner(X + Wd, Y, 1, -1)}{corner(X, Y + Ht, -1, 1)}{corner(X + Wd, Y + Ht, 1, 1)}
      {label && lp > 0 && (
        <div style={{ position: 'absolute', left: X, top: labelSide === 'top' ? Y - 44 * scale : Y + Ht + 10 * scale, transformOrigin: '0 0', transform: `scale(${scale})`, opacity: lp }}>
          <Tag tone={tone === 'bad' ? 'bad' : 'accent'} size={24}>{label}</Tag>
        </div>
      )}
    </div>
  );
};
