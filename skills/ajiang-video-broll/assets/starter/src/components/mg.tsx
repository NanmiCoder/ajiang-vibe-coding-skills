import React from 'react';
import {Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {draw, easeInOut, easeOut, enter, entryBlur, pop} from '../anim';
import {A, B, brands, font, ink, line, line2, Side, sideAccent, signal} from '../theme';
import {SplitText} from './stage';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* ───────── 声音 ───────── */

// 轻量卡点音效（public/audio/sfx，由 skill 的 scripts/make_audio.py 生成）
export type SfxName = 'tick' | 'pop' | 'air' | 'swipe' | 'tap' | 'ding' | 'chime' | 'alert' | 'type';

// 母版口播约 -27 LUFS。总增益让配乐落在口播下方约 14 dB，音效只做轻点缀，
// 叠回时间线时不会盖过人声。要整体调响或调轻，只改这两个数。
export const SFX_GAIN = 0.35;
export const BGM_GAIN = 0.15;

/** 在 at 帧触发一个音效 */
export const Sfx: React.FC<{name: SfxName; at: number; vol?: number}> = ({name, at, vol = 0.6}) => (
  <Sequence from={Math.max(0, at)} name={`sfx ${name}`} layout="none">
    <Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={vol * SFX_GAIN} />
  </Sequence>
);

/** 每段的配乐，头尾各做短淡入淡出 */
export const Bgm: React.FC<{src: string; vol?: number; frames: number}> = ({src, vol = 0.3, frames}) => (
  <Audio
    src={staticFile(`audio/${src}`)}
    volume={(f) => interpolate(f, [0, 6, frames - 24, frames - 1], [0, vol * BGM_GAIN, vol * BGM_GAIN, 0], clamp)}
  />
);

/* ───────── 文字 ───────── */

/** 打字机：逐字显示 + 光标 */
export const Typewriter: React.FC<{text: string; at: number; cps?: number; style?: React.CSSProperties; cursor?: boolean}> = ({
  text,
  at,
  cps = 1.2,
  style,
  cursor = true,
}) => {
  const f = useCurrentFrame();
  const chars = Array.from(text);
  const n = Math.max(0, Math.min(chars.length, Math.floor((f - at) * cps)));
  const done = n >= chars.length;
  const blink = done ? Math.floor((f - at) / 12) % 2 === 0 : true;
  if (f < at) return null;
  return (
    <span style={{whiteSpace: 'pre', ...style}}>
      {chars.slice(0, n).join('')}
      {cursor ? (
        <span style={{display: 'inline-block', width: '0.08em', height: '1em', marginLeft: '0.06em', verticalAlign: '-0.12em', background: 'currentColor', opacity: blink ? 0.9 : 0}} />
      ) : null}
    </span>
  );
};

/** 单行遮罩上升 */
export const MaskUp: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties; d?: number}> = ({at, children, style, d = 22}) => {
  const f = useCurrentFrame();
  const e = enter(f, at, d);
  return (
    <div style={{overflow: 'hidden', paddingBottom: '0.06em', ...style}}>
      <div style={{translate: `0px ${(1 - e) * 115}%`}}>{children}</div>
    </div>
  );
};

/** 等宽小标签 */
export const Tag: React.FC<{children: React.ReactNode; color?: string; style?: React.CSSProperties}> = ({children, color = ink[300], style}) => (
  <span style={{fontFamily: font.mono, fontSize: 44, letterSpacing: '0.14em', textTransform: 'uppercase', color, fontWeight: 500, ...style}}>{children}</span>
);

/* ───────── 图形 ───────── */

export const Mark: React.FC<{side: Side; size: number; style?: React.CSSProperties}> = ({side, size, style}) => (
  <Img
    src={staticFile(`brand/${brands[side].mark}`)}
    style={{width: size, height: size, objectFit: 'contain', flex: 'none', ...style}}
  />
);

export const BrandImg: React.FC<{name: string; size: number; style?: React.CSSProperties}> = ({name, size, style}) => (
  <Img src={staticFile(`brand/${name}`)} style={{width: size, height: size, objectFit: 'contain', flex: 'none', ...style}} />
);

/** 从中心扩散的圆环（落点强调） */
export const Ring: React.FC<{at: number; x: number; y: number; r?: number; color?: string; width?: number}> = ({
  at,
  x,
  y,
  r = 300,
  color = A[500],
  width = 6,
}) => {
  const f = useCurrentFrame();
  if (f < at || f > at + 40) return null;
  const t = interpolate(f, [at, at + 36], [0, 1], {...clamp, easing: easeOut});
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        border: `${width * (1 - t) + 1}px solid ${color}`,
        scale: `${0.2 + 0.8 * t}`,
        opacity: 1 - t,
      }}
    />
  );
};

/** 放射线爆点 */
export const Burst: React.FC<{at: number; x: number; y: number; r0?: number; r1?: number; n?: number; color?: string}> = ({
  at,
  x,
  y,
  r0 = 220,
  r1 = 520,
  n = 14,
  color = ink[50],
}) => {
  const f = useCurrentFrame();
  if (f < at || f > at + 26) return null;
  const a = interpolate(f, [at, at + 14], [0, 1], {...clamp, easing: easeOut});
  const b = interpolate(f, [at + 6, at + 24], [0, 1], {...clamp, easing: easeInOut});
  return (
    <svg style={{position: 'absolute', left: x - r1, top: y - r1, width: r1 * 2, height: r1 * 2, overflow: 'visible'}}>
      {Array.from({length: n}, (_, i) => {
        const ang = (i / n) * Math.PI * 2 + 0.2;
        const ra = r0 + (r1 - r0) * b;
        const rb = r0 + (r1 - r0) * a;
        return (
          <line
            key={i}
            x1={r1 + Math.cos(ang) * ra}
            y1={r1 + Math.sin(ang) * ra}
            x2={r1 + Math.cos(ang) * rb}
            y2={r1 + Math.sin(ang) * rb}
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
};

/** 抖动：落点时整页震一下 */
export const useShake = (at: number, amp = 10, d = 10) => {
  const f = useCurrentFrame();
  if (f < at || f > at + d) return '0px 0px';
  const k = 1 - (f - at) / d;
  return `${Math.sin((f - at) * 2.7) * amp * k}px ${Math.cos((f - at) * 3.3) * amp * k}px`;
};

/** 玻璃卡片 */
export const Card: React.FC<{
  style?: React.CSSProperties;
  glow?: Side | 'warn' | 'pass' | null;
  glowAmt?: number;
  children?: React.ReactNode;
}> = ({style, glow = null, glowAmt = 1, children}) => {
  const gc =
    glow === 'L' ? `rgba(${A.rgb},` : glow === 'R' ? `rgba(${B.rgb},` : glow === 'warn' ? 'rgba(227,169,69,' : glow === 'pass' ? 'rgba(157,190,143,' : null;
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 48,
        background: 'linear-gradient(180deg, rgba(29,28,26,0.92), rgba(21,20,19,0.92))',
        boxShadow: [
          `inset 0 0 0 2px ${gc ? `${gc}${0.25 + 0.45 * glowAmt})` : line2}`,
          'inset 0 2px 0 rgba(243,240,234,0.07)',
          gc ? `0 40px 160px -40px ${gc}${0.55 * glowAmt})` : '0 40px 120px -50px rgba(0,0,0,0.8)',
        ].join(', '),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** 模型名牌 */
export const ModelTitle: React.FC<{side: Side; size?: number; logo?: number; tag?: boolean}> = ({side, size = 96, logo, tag = true}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.38, whiteSpace: 'nowrap'}}>
    <Mark side={side} size={logo ?? size * 1.35} />
    <div>
      {tag ? <Tag color={sideAccent(side)[300]} style={{fontSize: size * 0.42}}>{brands[side].maker}</Tag> : null}
      <div style={{fontFamily: font.sans, fontWeight: 600, fontSize: size, letterSpacing: '-0.025em', lineHeight: 1.08}}>
        {brands[side].name}
      </div>
    </div>
  </div>
);

/** 弹出的状态块 */
export const Pill: React.FC<{at: number; tone: 'pass' | 'warn' | 'ink' | 'mute' | 'L' | 'R'; children: React.ReactNode; size?: number; style?: React.CSSProperties}> = ({
  at,
  tone,
  children,
  size = 64,
  style,
}) => {
  const f = useCurrentFrame();
  const p = pop(f, at);
  const c = {
    pass: [signal.pass, signal.passTint],
    warn: [signal.warn, signal.warnTint],
    ink: [ink[950], ink[50]],
    mute: [ink[300], 'rgba(243,240,234,0.06)'],
    L: [A[300], A.tint],
    R: [B[300], B.tint],
  }[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.25,
        fontFamily: font.cn,
        fontWeight: 700,
        fontSize: size,
        padding: `${size * 0.18}px ${size * 0.55}px`,
        borderRadius: size * 0.32,
        color: c[0],
        background: c[1],
        opacity: Math.min(1, p * 1.5),
        scale: `${0.5 + 0.5 * p}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const Check: React.FC<{size?: number; color?: string; at?: number}> = ({size = 64, color = signal.pass, at}) => {
  const f = useCurrentFrame();
  const t = at === undefined ? 1 : draw(f, at, 14);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4.5 12.5l5 5 10-11" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={24} strokeDashoffset={24 * (1 - t)} />
    </svg>
  );
};

/** 案例开场：巨大的衬线编号 + 逐字标题，in~collapse 之间是全屏大字，之后缩到左上角当页眉 */
export const CaseIntro: React.FC<{
  num: string;
  title: string;
  sub: string;
  at: number;
  collapse: number;
}> = ({num, title, sub, at, collapse}) => {
  const f = useCurrentFrame();
  const c = interpolate(f, [collapse, collapse + 22], [0, 1], {...clamp, easing: easeInOut});
  const numE = enter(f, at, 24);
  // 大字布局 → 页眉布局
  const x = 220;
  const y = 980 - 690 * c;
  const s = 1 - 0.62 * c;
  return (
    <div style={{position: 'absolute', left: x, top: y, transformOrigin: 'left top', scale: `${s}`, display: 'flex', alignItems: 'flex-end', gap: 80, whiteSpace: 'nowrap'}}>
      <span
        style={{
          fontFamily: font.serif,
          fontStyle: 'italic',
          fontSize: 520,
          lineHeight: 0.78,
          color: ink[50],
          opacity: numE,
          translate: `${(1 - numE) * -80}px 0px`,
          filter: `blur(${entryBlur(f, at, 20)}px)`,
        }}
      >
        {num}
      </span>
      <div style={{paddingBottom: 30}}>
        <MaskUp at={at + 6} style={{opacity: 1 - c, height: 80 * (1 - c)}}>
          <Tag style={{fontSize: 52}}>{sub}</Tag>
        </MaskUp>
        <div style={{fontFamily: font.cn, fontWeight: 900, fontSize: 230, letterSpacing: '-0.01em', lineHeight: 1.1, marginTop: 20}}>
          <SplitText text={title} at={at + 8} stagger={2} />
        </div>
      </div>
    </div>
  );
};
