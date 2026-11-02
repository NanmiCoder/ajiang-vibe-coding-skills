import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, F, R, SH } from './tokens';
import { E, rise, tw } from './anim';
import { useSec } from './time';

/**
 * 品牌 logo（lobehub 图标，保留品牌色）：id 可以是下面的别名，也可以直接写 public/logo/ 里的文件名（不带 .svg）。
 * 下载：python3 <skill>/scripts/fetch_logos.py --project . claude-color openai …（id 查 https://lobehub.com/icons）。
 */
export const LOGOS: Record<string, string> = {
  claude: 'claude-color', anthropic: 'claude-color', openai: 'openai', gpt: 'openai', gemini: 'gemini-color', google: 'gemini-color',
  deepseek: 'deepseek-color', grok: 'grok', xai: 'grok', qwen: 'qwen-color', glm: 'zhipu-color', zhipu: 'zhipu-color',
  kimi: 'kimi-color', minimax: 'minimax-color', meta: 'meta-color', muse: 'meta-color', seed: 'bytedance-color', doubao: 'doubao-color',
  step: 'stepfun-color', hunyuan: 'hunyuan-color', mimo: 'xiaomimimo', github: 'github',
};
export type LogoId = string;
export const Logo: React.FC<{ id: LogoId; size?: number; style?: React.CSSProperties }> = ({ id, size = 32, style }) => (
  <Img src={staticFile(`logo/${LOGOS[id] ?? id}.svg`)} style={{ height: size, width: size, objectFit: 'contain', display: 'block', ...style }} />
);
/** 产品字标：public/logo/wordmark.svg（深色字）/ wordmark-white.svg（从官网 HTML 的 <svg> 或品牌资源包取，见 references/assets.md） */
export const Wordmark: React.FC<{ h?: number; white?: boolean; style?: React.CSSProperties }> = ({ h = 40, white, style }) => (
  <Img src={staticFile(`logo/${white ? 'wordmark-white' : 'wordmark'}.svg`)} style={{ height: h, width: 'auto', display: 'block', ...style }} />
);

// 线性图标（lucide 同款笔画，24 网格）
const ICONS: Record<string, React.ReactNode> = {
  check: <path d="M20 6 9 17l-5-5" />,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  lock: <><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  key: <><path d="M2.6 17.4A2 2 0 0 0 2 18.8V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.2a2 2 0 0 0 1.4-.6l.8-.8a6.5 6.5 0 1 0-4-4z" /><circle cx="16.5" cy="7.5" r=".6" fill="currentColor" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  copy: <><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>,
  clipboard: <><rect width="8" height="4" x="8" y="2" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></>,
  database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" /></>,
  server: <><rect width="20" height="8" x="2" y="2" rx="2" /><rect width="20" height="8" x="2" y="14" rx="2" /><path d="M6 6h.01M6 18h.01" /></>,
  file: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8M16 13H8M16 17H8" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><path d="M10 11v6M14 11v6" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></>,
  chat: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
  terminal: <><path d="m4 17 6-6-6-6" /><path d="M12 19h8" /></>,
  arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  shield: <><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>,
  refresh: <><path d="M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16" /><path d="M8 16H3v5" /></>,
  play: <path d="M6 3 20 12 6 21Z" />,
  thumb: <><path d="M7 10v12" /><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8a2 2 0 0 1-1.9 1.4H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z" /></>,
  star: <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8l-6.2 3.2L7 14.2 2 9.3l6.9-1z" />,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
  stethoscope: <><path d="M11 2v2M5 2v2" /><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" /><path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="10" r="2" /></>,
  gauge: <><path d="m12 14 4-4" /><path d="M3.3 19a10 10 0 1 1 17.4 0" /></>,
  dice: <><rect width="18" height="18" x="3" y="3" rx="3" /><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>,
  laptop: <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.3 2.6a1 1 0 0 1-.9 1.4H3.6a1 1 0 0 1-.9-1.4L4 16" />,
  shuffle: <><path d="m18 14 4 4-4 4" /><path d="m18 2 4 4-4 4" /><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" /><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" /><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" /></>,
  cpu: <><rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" /></>,
  ban: <><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></>,
  zap: <path d="M4 14a1 1 0 0 1-.8-1.6l9.9-10.2a.5.5 0 0 1 .9.5l-1.9 6A1 1 0 0 0 13 10h7a1 1 0 0 1 .8 1.6l-9.9 10.2a.5.5 0 0 1-.9-.5l1.9-6A1 1 0 0 0 11 14z" />,
  down: <><path d="M22 17 13.5 8.5l-5 5L2 7" /><path d="M16 17h6v-6" /></>,
  up: <><path d="M22 7 13.5 15.5l-5-5L2 17" /><path d="M16 7h6v6" /></>,
  alert: <><path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3" /><path d="M12 9v4M12 17h.01" /></>,
  route: <><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  sparkle: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M9 8.5h6M9 12h6M12 8.5V17" /></>,
};
export type IconName = keyof typeof ICONS;
export const Icon: React.FC<{ name: IconName | string; size?: number; color?: string; stroke?: number; style?: React.CSSProperties }> = ({ name, size = 24, color = 'currentColor', stroke = 2, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: 'none', ...style }}>
    {ICONS[name] ?? null}
  </svg>
);

/**
 * 卡片：白底、发丝边、带色相的柔阴影（站点卡片同款）。t0 给了就用标准入场（rise），t1 退场。
 */
export const Card: React.FC<{ x: number; y: number; w: number; h?: number; t0?: number; t1?: number; pad?: number; radius?: number; shadow?: string; bg?: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, t0, t1, pad = 28, radius = R.lg, shadow = SH.md, bg = C.surface, style, children }) => {
  const t = useSec();
  if (t0 != null && t < t0 - 0.02) return null;
  const st = t0 != null ? rise(t, t0, { t1, dy: 26 }) : {};
  if (st.opacity === 0 && t0 != null && t1 != null && t > t1) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, padding: pad, boxSizing: 'border-box', background: bg, borderRadius: radius, boxShadow: shadow, border: `1px solid ${C.line}`, ...st, ...style }}>
      {children}
    </div>
  );
};

// 语义色调：accent = 唯一强调色；good / bad / warn 只表示结论（一致 / 掉包或不一致 / 相近），不当装饰。
type Tone = 'accent' | 'good' | 'bad' | 'warn' | 'ink' | 'white' | 'gray';
const TONES: Record<Tone, { bg: string; fg: string; bd: string }> = {
  accent: { bg: C.pale, fg: C.accent, bd: C.accentBd },
  good: { bg: C.goodBg, fg: C.good, bd: C.goodBd },
  bad: { bg: C.badBg, fg: C.bad, bd: C.badBd },
  warn: { bg: C.warnBg, fg: C.warn, bd: C.warnBd },
  ink: { bg: C.ink, fg: C.surface, bd: C.ink },
  white: { bg: C.surface, fg: C.ink, bd: C.line },
  gray: { bg: C.surface2, fg: C.ink2, bd: C.line },
};
/** 胶囊标签。size：字号。icon 可选（Icon 名）。 */
export const Chip: React.FC<{ children: React.ReactNode; tone?: Tone; size?: number; icon?: string; mono?: boolean; style?: React.CSSProperties }> = ({ children, tone = 'accent', size = 24, icon, mono, style }) => {
  const c = TONES[tone];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.4, padding: `${size * 0.32}px ${size * 0.72}px`, borderRadius: 999, background: c.bg, color: c.fg, border: `1px solid ${c.bd}`, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: 600, lineHeight: 1.15, whiteSpace: 'nowrap', ...style }}>
      {icon && <Icon name={icon} size={size * 0.95} stroke={2.2} />}
      {children}
    </div>
  );
};

/** 结论胶囊：good / warn / bad 三态，文字按本期语义改（默认 一致 / 相近 / 不一致）。 */
export const Verdict: React.FC<{ kind: 'match' | 'near' | 'mismatch'; label?: string; size?: number; style?: React.CSSProperties }> = ({ kind, label, size = 26, style }) => {
  const map = { match: ['一致', 'good'], near: ['相近', 'warn'], mismatch: ['不一致', 'bad'] } as const;
  const [txt0, tone] = map[kind];
  const txt = label ?? txt0;
  return (
    <Chip tone={tone} size={size} style={style}>
      <span style={{ width: size * 0.36, height: size * 0.36, borderRadius: '50%', background: TONES[tone].fg, display: 'inline-block' }} />
      {txt}
    </Chip>
  );
};

/** 模型名胶囊：logo + 等宽型号（报告卡里的写法，如 claude-opus-5-5）。 */
export const ModelTag: React.FC<{ logo?: LogoId; name: string; size?: number; tone?: Tone; style?: React.CSSProperties }> = ({ logo, name, size = 26, tone = 'white', style }) => {
  const c = TONES[tone];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.45, padding: `${size * 0.36}px ${size * 0.62}px`, borderRadius: size * 0.5, background: c.bg, border: `1px solid ${c.bd}`, color: c.fg, fontFamily: F.mono, fontSize: size, fontWeight: 500, whiteSpace: 'nowrap', boxShadow: tone === 'white' ? SH.sm : undefined, ...style }}>
      {logo && <Logo id={logo} size={size * 1.05} />}
      {name}
    </div>
  );
};

/** 绝对定位 + 标准入场的容器（任何元素都可以用它入场/退场）。from 是入场方向的位移。 */
export const At: React.FC<{ x: number; y: number; t0: number; t1?: number; dy?: number; dur?: number; scale?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, t0, t1, dy, dur, scale, style, children }) => {
  const t = useSec();
  if (t < t0 - 0.02) return null;
  if (t1 != null && t > t1 + 0.6) return null;
  return <div style={{ position: 'absolute', left: x, top: y, ...rise(t, t0, { t1, dy, dur, scale }), ...style }}>{children}</div>;
};

/** 弹出（给“落地”的小元素：胶囊、印章式结论）。带一点过冲，不夸张。 */
export const Pop: React.FC<{ x: number; y: number; t0: number; t1?: number; origin?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, t0, t1, origin = '50% 50%', style, children }) => {
  const t = useSec();
  if (t < t0) return null;
  const p = tw(t, t0, 0.5, E.back);
  const o = tw(t, t0, 0.18) * (t1 != null ? 1 - tw(t, t1, 0.3, E.in) : 1);
  if (o <= 0 && t1 != null && t > t1) return null;
  return <div style={{ position: 'absolute', left: x, top: y, opacity: o, transform: `scale(${0.82 + 0.18 * p})`, transformOrigin: origin, ...style }}>{children}</div>;
};

/**
 * 截图切片（元素级抠图）：从一张截图里裁出一块当独立元素用（可以被抬起、放大、飞走）。
 * sx/sy/sw/sh 是源图「像素」坐标；w 是显示宽度（高度按比例）。radius/shadow 可选。
 * 例：报告卡里的散点图、映射规则那一行、首页的访问量数字。
 */
export const Cutout: React.FC<{ src: string; sx: number; sy: number; sw: number; sh: number; w: number; radius?: number; shadow?: string; border?: boolean; style?: React.CSSProperties }> = ({ src, sx, sy, sw, sh, w, radius = 12, shadow, border, style }) => {
  const k = w / sw;
  return (
    <div style={{ position: 'relative', width: w, height: sh * k, overflow: 'hidden', borderRadius: radius, boxShadow: shadow, border: border ? `1px solid ${C.line}` : undefined, background: C.surface, ...style }}>
      <Img src={staticFile(src)} style={{ position: 'absolute', left: -sx * k, top: -sy * k, width: 'auto', height: 'auto', transformOrigin: '0 0', transform: `scale(${k})`, maxWidth: 'none' }} />
    </div>
  );
};
