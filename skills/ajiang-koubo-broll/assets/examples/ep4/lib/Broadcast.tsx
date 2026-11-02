import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, F, alpha } from './tokens';
import { E, clamp, lerp, tw } from './anim';
import { useSec } from './time';
import { BrandMark, RACER_NAMES } from './Sokoban';
import { Headline } from './Type';

// 转播组件（主控在 seg0 定稿后收进 lib，全片共用）：电竞转播式画面语言。颜色全部来自 tokens / 产品原图；不发光、不粒子、不震屏。
// 产品主视觉：public/sokoban/arena-sokoban.webp（推箱子舞台 1920×640）、arena-cube.webp（魔方舞台）、host-sokoban.webp / host.webp（主持人立绘 768×1152，透明）。

/** 逐句标题（全片统一位置 x=130 y=74 字号 64）：一句一个，上一句在下一句出现前 0.62s 开始离场（0.45s 退完），零重叠。text 支持 *强调* 和 ~坏结论~。 */
export const Lines: React.FC<{ items: { t: number; text: string; end?: number }[]; x?: number; y?: number; size?: number }> = ({ items, x = 130, y = 74, size = 64 }) => (
  <>
    {items.map((it, i) => {
      const next = items[i + 1];
      return <Headline key={i} text={it.text} x={x} y={y} size={size} t0={it.t - 0.12} t1={it.end ?? (next ? next.t - 0.62 : undefined)} />;
    })}
  </>
);

/** 全屏主视觉（产品自己的舞台图）+ 慢推。src 1920×640，按高度 cover；cx = 想放在画面中心的原图 x。 */
export const Backdrop: React.FC<{ src: string; cx: number; t0: number; t1: number; z0?: number; z1?: number; dim?: number; fin?: number; style?: React.CSSProperties }> = ({ src, cx, t0, t1, z0 = 1, z1 = 1.07, dim = 0.35, fin, style }) => {
  const t = useSec();
  const k = 1080 / 640;
  const z = lerp(z0, z1, clamp((t - t0) / Math.max(t1 - t0, 0.01)));
  const w = 1920 * k * z, h = 1080 * z;
  // fin：段首从空舞台淡入的秒数（上一段收在空舞台，硬切亮舞台会闪）
  const fo = fin ? clamp((t - t0) / fin) : 1;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style, opacity: Number(style?.opacity ?? 1) * fo }}>
      <Img src={staticFile(src)} style={{ position: 'absolute', width: w, height: h, left: 960 - cx * k * z, top: 540 - h / 2, maxWidth: 'none' }} />
      {/* 左侧压暗给标题，底部压暗给字幕；只压舞台图，不是整屏聚光 */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${alpha(C.bg, 0.92)} 0%, ${alpha(C.bg, 0.55)} 38%, ${alpha(C.bg, dim * 0.4)} 70%), linear-gradient(0deg, ${alpha(C.bg, 0.85)} 0%, ${alpha(C.bg, 0)} 30%)` }} />
    </div>
  );
};

/** 立绘（产品的主持人形象，透明 PNG/WebP 768×1152）从右侧滑入。 */
export const Host: React.FC<{ src: string; x: number; y: number; h: number; t0: number; t1?: number; flip?: boolean }> = ({ src, x, y, h, t0, t1, flip }) => {
  const t = useSec();
  const p = tw(t, t0, 0.7, E.out);
  const q = t1 != null ? tw(t, t1, 0.35, E.in) : 0;
  if (p <= 0 || q >= 1) return null;
  return (
    <Img src={staticFile(src)} style={{ position: 'absolute', left: x + (1 - p) * 220 + q * 120, top: y, height: h, width: (h * 768) / 1152, opacity: p * (1 - q), transform: flip ? 'scaleX(-1)' : undefined, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,.6))' }} />
  );
};

/** 方向键 HUD：当前这一步的方向亮起（酸性绿），其余暗。move = 'U'|'D'|'L'|'R'|undefined；pulse 0..1 = 按下程度。 */
export const Keys: React.FC<{ x: number; y: number; move?: string; pulse: number; size?: number; o?: number }> = ({ x, y, move, pulse, size = 84, o = 1 }) => {
  const g = 12;
  const pos: Record<string, [number, number, string]> = { U: [1, 0, '↑'], L: [0, 1, '←'], D: [1, 1, '↓'], R: [2, 1, '→'] };
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: size * 3 + g * 2, height: size * 2 + g, opacity: o }}>
      {Object.entries(pos).map(([k, [cx, cy, ch]]) => {
        const on = move === k ? pulse : 0;
        return (
          <div key={k} style={{ position: 'absolute', left: cx * (size + g), top: cy * (size + g) + on * 4, width: size, height: size, display: 'grid', placeItems: 'center',
            background: on > 0.01 ? alpha(C.accent, 0.25 + 0.75 * on) : C.surface2, border: `1px solid ${on > 0.01 ? C.accent : C.line}`, boxSizing: 'border-box',
            clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
            fontFamily: F.display, fontWeight: 800, fontSize: size * 0.5, color: on > 0.5 ? C.bg : C.muted }}>
            {ch}
          </div>
        );
      })}
    </div>
  );
};

/** 生命条（回放页 sk-lives 放大版）：left 格亮，其余危险红斜纹；t0 起逐格滑入。 */
export const LifeBar: React.FC<{ x: number; y: number; left: number; t0: number; h?: number; breakAt?: number }> = ({ x, y, left, t0, h = 54, breakAt }) => {
  const t = useSec();
  return (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', gap: h * 0.28 }}>
      {[0, 1, 2].map((i) => {
        const p = tw(t, t0 + i * 0.09, 0.4, E.out);
        const on = i < left;
        const br = breakAt != null && i === left ? tw(t, breakAt, 0.25) : 1;
        return (
          <div key={i} style={{ width: h * 2.1, height: h, opacity: p, transform: `translateX(${(1 - p) * -40}px) skewX(-18deg)`,
            background: on ? C.accent : `repeating-linear-gradient(135deg, ${alpha(C.bad, 0.75)} 0 5px, ${alpha(C.bad, 0.18)} 5px 11px)`,
            outline: !on && br < 1 ? `3px solid ${alpha(C.bad, 1 - br)}` : undefined }} />
        );
      })}
    </div>
  );
};

/** 全屏危险红横幅（产品「DEADLOCK 死局」转播图形的大号版）：t0 起 0.2s 从左擦入，t1 起 0.2s 向右擦出。全片只用这一次。 */
export const HazardBand: React.FC<{ t0: number; t1: number; y?: number }> = ({ t0, t1, y = 540 }) => {
  const t = useSec();
  const a = tw(t, t0, 0.2, E.out), b = tw(t, t1, 0.2, E.in);
  if (a <= 0 || b >= 1) return null;
  const ink = C.bg;
  return (
    <div style={{ position: 'absolute', left: -300, top: y - 95, width: 2520, height: 190, transform: 'rotate(-4deg)', zIndex: 50,
      clipPath: `inset(0 ${(1 - a) * 100}% 0 ${b * 100}%)`, background: C.bad, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 70,
      boxShadow: `0 0 0 6px ${alpha(ink, 0.92)}` }}>
      <span style={{ fontFamily: F.display, fontWeight: 800, fontStyle: 'italic', fontSize: 92, color: alpha(C.ink, 0.72), letterSpacing: 4 }}>DEADLOCK</span>
      <span style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 120, color: C.ink, letterSpacing: 20 }}>死局</span>
      <span style={{ padding: '8px 26px', background: ink, color: C.ink, fontFamily: F.sans, fontWeight: 800, fontSize: 40, clipPath: 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)' }}>推错一步</span>
      <span style={{ fontFamily: F.display, fontWeight: 800, fontStyle: 'italic', fontSize: 92, color: alpha(C.ink, 0.72), letterSpacing: 4 }}>DEADLOCK</span>
    </div>
  );
};

/** logo 老虎机：8 家参赛 logo 在身份位里飞转、越转越慢，tStop 停在「?」上（悬念：用 logo，但不揭晓是谁）。 */
export const Roulette: React.FC<{ t0: number; tStop: number; h: number; tone?: 'win' | 'lose'; seed?: number }> = ({ t0, tStop, h, tone = 'win', seed = 0 }) => {
  const t = useSec();
  if (t < t0) return null;
  const names = RACER_NAMES;
  // 转速从 18 个/秒降到 4 个/秒（ease-out），到 tStop 落到问号
  const dur = tStop - t0;
  const u = clamp((t - t0) / dur);
  const pos = (18 * dur) * (u - 0.5 * u * u * 0.78); // 积分：速度线性下降
  const stopped = t >= tStop;
  const idx = (Math.floor(pos) + seed) % names.length;
  const frac = pos - Math.floor(pos);
  const col = tone === 'win' ? C.accent : C.bad;
  const lock = tw(t, tStop, 0.25, E.out);
  return (
    <div style={{ position: 'relative', width: h * 6.2, height: h * 1.6, overflow: 'hidden', borderTop: `2px solid ${alpha(col, 0.6)}`, borderBottom: `2px solid ${alpha(col, 0.6)}` }}>
      {!stopped && [0, 1].map((j) => {
        const n = names[(idx + j) % names.length];
        const yy = (j - frac) * h * 1.6;
        return (
          <div key={j} style={{ position: 'absolute', left: h * 0.3, top: yy + h * 0.3, opacity: 1 - Math.abs(j - frac) * 0.6, filter: `blur(${(1 - u) * 3}px)` }}>
            <BrandMark racer={n} h={h} />
          </div>
        );
      })}
      {stopped && (
        <div style={{ position: 'absolute', left: h * 0.3, top: h * 0.3 + (1 - lock) * -20, opacity: lock, display: 'flex', alignItems: 'center', gap: h * 0.32 }}>
          <div style={{ width: h, height: h, display: 'grid', placeItems: 'center', background: alpha(col, 0.16), border: `2px solid ${col}`, boxSizing: 'border-box', fontFamily: F.display, fontWeight: 800, fontSize: h * 0.8, color: col }}>?</div>
          <div style={{ display: 'flex', gap: h * 0.12 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ width: h * 0.42, height: h * 0.72, background: C.surface2, border: `1px solid ${C.line}` }} />)}
          </div>
        </div>
      )}
    </div>
  );
};

/** 6 关结果格（转播记分牌样式）：ok = 通关（酸性绿 ✓），否则死局（危险红斜纹 ✕）；times = 每格翻面时间。 */
export const LevelCells: React.FC<{ results: boolean[]; times: number[]; w?: number; h?: number; gap?: number }> = ({ results, times, w = 92, h = 70, gap = 12 }) => {
  const t = useSec();
  return (
    <div style={{ display: 'flex', gap }}>
      {results.map((ok, i) => {
        const p = tw(t, times[i], 0.22, E.out);
        const flipped = p > 0.5;
        return (
          <div key={i} style={{ width: w, height: h, transform: `scaleY(${Math.abs(Math.cos(Math.PI * p)) * 0.92 + 0.08})`, boxSizing: 'border-box', display: 'grid', placeItems: 'center',
            background: !flipped ? C.surface2 : ok ? C.accent : `repeating-linear-gradient(135deg, ${alpha(C.bad, 0.7)} 0 5px, ${alpha(C.bad, 0.2)} 5px 11px)`,
            border: `1px solid ${flipped ? 'transparent' : C.line}`, fontFamily: F.display, fontWeight: 800, fontSize: h * 0.5, color: ok ? C.bg : C.ink }}>
            {flipped ? (ok ? '✓' : '✕') : <span style={{ color: C.faint, fontSize: h * 0.32 }}>0{i + 1}</span>}
          </div>
        );
      })}
    </div>
  );
};

/** 秒表（00:00.00），从 t0 起按 rate 倍速走。 */
export const Stopwatch: React.FC<{ t0: number; rate?: number; size?: number; color?: string }> = ({ t0, rate = 37, size = 110, color = C.ink }) => {
  const t = useSec();
  const v = Math.max(0, (t - t0) * rate);
  const mm = Math.floor(v / 60), ss = Math.floor(v % 60), cs = Math.floor((v * 100) % 100);
  const f = (n: number) => String(n).padStart(2, '0');
  return <span style={{ fontFamily: F.mono, fontWeight: 600, fontSize: size, color, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' }}>{f(mm)}:{f(ss)}<span style={{ fontSize: size * 0.6, color: C.muted }}>.{f(cs)}</span></span>;
};
