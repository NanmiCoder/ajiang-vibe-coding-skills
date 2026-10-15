import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {easeInOut, easeOut, enter, entryBlur, leave} from '../anim';
import {A, B, font, ink, line, showTitle} from '../theme';
import {segments} from '../segments';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export type Focus = 'both' | 'L' | 'R' | 'none' | 'warm';

/**
 * 整屏舞台：石墨底 + 两团缓慢漂移的阵营光 + 点阵 + 颗粒 + 暗角。
 * focus 控制哪边的光更亮，用 keys 在段内做插值切换。
 */
export const Stage: React.FC<{
  focus?: {at: number; f: Focus}[];
  /** Studio 预览时垫口播：传段 key（读 public/footage/<key>.wav），渲染成片时不传 */
  voiceKey?: string;
  children: React.ReactNode;
}> = ({focus = [{at: 0, f: 'both'}], voiceKey, children}) => {
  const frame = useCurrentFrame();
  const level = (side: 'L' | 'R') => {
    const val = (f: Focus) => (f === 'both' ? 0.75 : f === side ? 1 : f === 'none' ? 0.18 : f === 'warm' ? (side === 'L' ? 0.9 : 0.25) : 0.22);
    let v = val(focus[0].f);
    for (let i = 1; i < focus.length; i++) {
      const k = focus[i];
      const t = interpolate(frame, [k.at, k.at + 24], [0, 1], {...clamp, easing: easeInOut});
      v = v + (val(k.f) - v) * t;
    }
    return v;
  };
  const l = level('L');
  const r = level('R');
  const drift = (p: number, amp: number) => Math.sin(frame / 90 + p) * amp;

  return (
    <AbsoluteFill style={{backgroundColor: ink[950], overflow: 'hidden'}}>
      {voiceKey ? <Audio src={staticFile(`footage/${voiceKey}.wav`)} /> : null}
      {/* 阵营光 */}
      <div
        style={{
          position: 'absolute',
          left: -900 + drift(0, 60),
          top: 400 + drift(1.3, 80),
          width: 3000,
          height: 2400,
          background: `radial-gradient(closest-side, rgba(${A.rgb},0.30), rgba(${A.rgb},0.10) 45%, rgba(0,0,0,0) 100%)`,
          opacity: l,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -1000 + drift(2.1, 60),
          top: 600 + drift(0.4, 80),
          width: 3000,
          height: 2400,
          background: `radial-gradient(closest-side, rgba(${B.rgb},0.30), rgba(${B.rgb},0.09) 45%, rgba(0,0,0,0) 100%)`,
          opacity: r,
        }}
      />
      {/* 点阵，边缘渐隐 */}
      <div
        style={{
          position: 'absolute',
          inset: -64,
          backgroundImage: 'radial-gradient(rgba(243,240,234,0.16) 2.4px, transparent 2.6px)',
          backgroundSize: '64px 64px',
          translate: `${(frame * 0.25) % 64}px ${(frame * 0.12) % 64}px`,
          WebkitMaskImage: 'radial-gradient(ellipse 70% 65% at 45% 50%, #000 20%, transparent 85%)',
          maskImage: 'radial-gradient(ellipse 70% 65% at 45% 50%, #000 20%, transparent 85%)',
          opacity: 0.55,
        }}
      />
      {/* 暗角 */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 80% at 50% 45%, rgba(0,0,0,0) 55%, rgba(5,5,4,0.75) 100%)'}} />
      <AbsoluteFill
        style={{
          fontFamily: font.cn,
          color: ink[50],
          WebkitFontSmoothing: 'antialiased',
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {children}
      </AbsoluteFill>
      {/* 颗粒 */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('noise.png')})`,
          backgroundSize: '512px 512px',
          backgroundPosition: `${(frame * 137) % 512}px ${(frame * 251) % 512}px`,
          opacity: 0.05,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

/** 顶部"网页 PPT"导航条：左侧节目标题，右侧章节进度（止于头像区左边界）。 */
const CHAPTERS = segments.map((s) => s.chip ?? s.title);
export const Chrome: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const e = enter(frame, 0, 24);
  const prog = frame / (durationInFrames - 1);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 220,
          top: 132,
          width: 2680,
          height: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 40,
          opacity: e,
          translate: `0px ${(1 - e) * -24}px`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <span style={{width: 22, height: 22, borderRadius: 11, background: A[500]}} />
          <span style={{width: 22, height: 22, borderRadius: 11, background: B[500], marginLeft: -8}} />
        </div>
        <span style={{fontFamily: font.mono, fontSize: 36, letterSpacing: '0.12em', color: ink[300]}}>
          {showTitle}
        </span>
        <div style={{marginLeft: 'auto', display: 'flex', gap: 14}}>
          {CHAPTERS.map((c, i) => (
            <span
              key={c}
              style={{
                fontFamily: font.mono,
                fontSize: 32,
                letterSpacing: '0.08em',
                padding: '10px 26px',
                borderRadius: 999,
                color: i === index ? ink[950] : i < index ? ink[300] : ink[600],
                background: i === index ? ink[50] : 'transparent',
                boxShadow: i === index ? 'none' : `inset 0 0 0 2px ${i < index ? 'rgba(243,240,234,0.18)' : line}`,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      {/* 段内进度线（字幕带上方） */}
      <div style={{position: 'absolute', left: 220, right: 220, top: 1712, height: 4, borderRadius: 2, background: line, opacity: e}}>
        <div
          style={{
            height: '100%',
            width: `${prog * 100}%`,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${A[500]}, ${B[500]})`,
            opacity: 0.8,
          }}
        />
      </div>
    </>
  );
};

/**
 * 段内一个"页面"。在 [from, to) 显示，入场由子元素自己负责，
 * 退场时整页上移、模糊、淡出（EXIT 帧）。帧号都用段内绝对帧。
 */
export const EXIT = 14;
export const Scene: React.FC<{
  from: number;
  to: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({from, to, style, children}) => {
  const f = useCurrentFrame();
  if (f < from || f >= to + EXIT) return null;
  const l = leave(f, to, EXIT);
  return (
    <AbsoluteFill
      style={{
        opacity: 1 - l,
        translate: `0px ${-60 * l}px`,
        filter: l > 0 ? `blur(${l * 16}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** 逐字入场：每个字从下方带模糊升起 */
export const SplitText: React.FC<{
  text: string;
  at: number;
  stagger?: number;
  dy?: number;
  style?: React.CSSProperties;
  charStyle?: (i: number, ch: string) => React.CSSProperties | undefined;
}> = ({text, at, stagger = 2, dy = 0.6, style, charStyle}) => {
  const f = useCurrentFrame();
  const chars = Array.from(text);
  return (
    <span style={{display: 'inline-block', whiteSpace: 'pre', ...style}}>
      {chars.map((ch, i) => {
        const t = at + i * stagger;
        const e = enter(f, t, 20);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: e,
              translate: `0px ${(1 - e) * dy}em`,
              filter: `blur(${entryBlur(f, t, 14)}px)`,
              ...charStyle?.(i, ch),
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};

/** 转场光条：品牌渐变细线从左扫到右再收走 */
export const Sweep: React.FC<{at: number; y?: number}> = ({at, y = 1060}) => {
  const f = useCurrentFrame();
  const a = interpolate(f, [at, at + 14], [0, 1], {...clamp, easing: easeOut});
  const b = interpolate(f, [at + 8, at + 24], [0, 1], {...clamp, easing: easeInOut});
  if (f < at || f > at + 26) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${b * 100}%`,
        width: `${(a - b) * 100}%`,
        top: y,
        height: 6,
        borderRadius: 3,
        background: `linear-gradient(90deg, rgba(${A.rgb},0), ${A[500]} 30%, ${A[300]} 70%, ${ink[50]})`,
        boxShadow: `0 0 40px rgba(${A.rgb},0.5)`,
      }}
    />
  );
};

/** 慢推镜：整页在 [from, to] 内从 1 推到 s */
export const Drift: React.FC<{from: number; to: number; s?: number; origin?: string; children: React.ReactNode}> = ({
  from,
  to,
  s = 1.03,
  origin = '40% 50%',
  children,
}) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [from, to], [1, s], clamp);
  return <AbsoluteFill style={{scale: `${k}`, transformOrigin: origin}}>{children}</AbsoluteFill>;
};
