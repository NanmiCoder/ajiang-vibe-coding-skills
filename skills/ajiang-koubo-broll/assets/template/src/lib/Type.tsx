import React from 'react';
import { C, F } from './tokens';
import { E, clamp, lerp, tw } from './anim';
import { useSec } from './time';

// 把 "花着*顶配模型*的钱" 拆成 [{s,accent}]；*...* 标强调色 C.accent，~...~ 标 C.bad（只给本期的“坏结论”，如掉包/不一致）。
type Run = { s: string; tone: 'ink' | 'accent' | 'red' };
const parse = (src: string): Run[] => {
  const out: Run[] = [];
  const re = /\*([^*]+)\*|~([^~]+)~|([^*~]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m[1]) out.push({ s: m[1], tone: 'accent' });
    else if (m[2]) out.push({ s: m[2], tone: 'red' });
    else out.push({ s: m[3], tone: 'ink' });
  }
  return out;
};
// 拆成动画单位：中文逐字、拉丁词/数字整块
const units = (s: string) => s.match(/[A-Za-z0-9.+\-_/#%·]+|\s+|./gu) ?? [];

/**
 * 标题 / 大字：逐字（拉丁整词）上浮 + 去模糊 + 淡入，统一嗓音。
 * text 支持 *强调*（C.accent）和 ~坏结论~（C.bad），\n 换行。align 默认左对齐（x 为左边）；center 时 x 为中心线。
 * t1 给了就整体退场（淡出 + 上移）。
 */
export const Headline: React.FC<{
  text: string; x: number; y: number; size?: number; weight?: number; t0: number; t1?: number;
  align?: 'left' | 'center' | 'right'; color?: string; accent?: string; stagger?: number; lh?: number; w?: number;
  mono?: boolean; tracking?: number; style?: React.CSSProperties;
}> = ({ text, x, y, size = 76, weight = 600, t0, t1, align = 'left', color = C.ink, accent = C.accent, stagger, lh = 1.18, w = 1600, mono, tracking, style }) => {
  const t = useSec();
  if (t < t0 - 0.05) return null;
  const q = t1 != null ? tw(t, t1, 0.45, E.in) : 0;
  if (q >= 1) return null;
  const lines = text.split('\n');
  const total = lines.reduce((n, l) => n + parse(l).reduce((a, r) => a + units(r.s).length, 0), 0);
  const st = stagger ?? clamp(0.5 / Math.max(total, 1), 0.012, 0.035);
  let idx = 0;
  const left = align === 'left' ? x : align === 'center' ? x - w / 2 : x - w;
  return (
    <div style={{ position: 'absolute', left, top: y, width: w, textAlign: align, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: weight, lineHeight: lh, letterSpacing: tracking ?? (size >= 60 ? -0.02 * size : 0), color, opacity: 1 - q, transform: `translateY(${-q * 14}px)`, filter: q > 0.01 ? `blur(${q * 6}px)` : undefined, whiteSpace: 'pre', ...style }}>
      {lines.map((line, li) => (
        <div key={li}>
          {parse(line).map((run, ri) => (
            <span key={ri} style={{ color: run.tone === 'accent' ? accent : run.tone === 'red' ? C.bad : color }}>
              {units(run.s).map((u, ui) => {
                const p = tw(t, t0 + idx++ * st, 0.55);
                return (
                  <span key={ui} style={{ display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 0.32}em)`, filter: p < 0.99 ? `blur(${(1 - p) * 9}px)` : undefined, whiteSpace: 'pre' }}>{u}</span>
                );
              })}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

/** 眉题 / 小节标签：蓝色小方块 + 等宽小字，像站点的 section label。 */
export const Kicker: React.FC<{ text: string; x: number; y: number; t0: number; t1?: number; color?: string; size?: number }> = ({ text, x, y, t0, t1, color = C.muted, size = 24 }) => {
  const t = useSec();
  const p = tw(t, t0, 0.5);
  const q = t1 != null ? tw(t, t1, 0.35, E.in) : 0;
  if (p <= 0 || q >= 1) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 12, opacity: p * (1 - q), transform: `translateX(${(1 - p) * -12}px)` }}>
      <div style={{ width: size * 0.45, height: size * 0.45, borderRadius: 3, background: C.accent }} />
      <div style={{ fontFamily: F.mono, fontSize: size, fontWeight: 500, letterSpacing: '0.06em', color, whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  );
};

/** 打字机文本（终端、输入框、提示词）。cps 每秒字数；caret 是否显示光标。 */
export const Typed: React.FC<{ text: string; t0: number; cps?: number; caret?: boolean; caretColor?: string; style?: React.CSSProperties }> = ({ text, t0, cps = 22, caret = true, caretColor = C.accent, style }) => {
  const t = useSec();
  const n = Math.max(0, Math.min(text.length, Math.floor((t - t0) * cps)));
  const done = n >= text.length;
  const blink = Math.floor(t * 2.2) % 2 === 0;
  return (
    <span style={{ whiteSpace: 'pre-wrap', ...style }}>
      {text.slice(0, n)}
      {caret && t >= t0 - 0.3 && (!done || blink) && <span style={{ display: 'inline-block', width: '0.08em', minWidth: 2, height: '1.05em', background: caretColor, verticalAlign: '-0.15em', marginLeft: 2 }} />}
    </span>
  );
};

/** 数字从 a 滚到 b（ease-out），fmt 自定义格式（默认千分位）。 */
export const Count: React.FC<{ from?: number; to: number; t0: number; dur?: number; fmt?: (n: number) => string; style?: React.CSSProperties }> = ({ from = 0, to, t0, dur = 1.2, fmt, style }) => {
  const t = useSec();
  const v = lerp(from, to, tw(t, t0, dur, E.out));
  const s = fmt ? fmt(v) : Math.round(v).toLocaleString('en-US');
  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{s}</span>;
};
