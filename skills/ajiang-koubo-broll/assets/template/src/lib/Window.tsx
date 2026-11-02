import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, F, SH } from './tokens';
import { E, clamp, lerp } from './anim';
import { useSec } from './time';
import pagesJson from '../data/pages.json';

/**
 * 真实网页截图登记表 src/data/pages.json（<skill>/scripts/capture.py 用 ego-browser 以 CDP dpr=2 采集时自动写入）：
 *   { 'st/x.jpg': { w, h, url, els: { 'button:开始': [x, y, w, h], ... }, note } }
 * w/h 是页面 CSS 尺寸（= 2x 截图像素 / 2）；els 是关键元素的页面坐标。Window 的 children、焦点框、光标都按「页面 CSS px」定位。
 */
export type PageInfo = { w: number; h: number; url: string; els?: Record<string, [number, number, number, number]>; note?: string };
export const PAGES = pagesJson as unknown as Record<string, PageInfo>;
export type PageSrc = string;

/** 取页面里某个已量好的元素框 [x, y, w, h]（页面 CSS px）。名字不存在时抛错，避免静默错位。 */
export const el = (src: string, name: string): [number, number, number, number] => {
  const b = PAGES[src]?.els?.[name];
  if (!b) throw new Error(`pages.json 里没有 ${src} 的元素「${name}」`);
  return b;
};

export type ScrollMove = { t: number; y: number; d?: number };
export const scrollAt = (moves: ScrollMove[] | number | undefined, t: number) => {
  if (moves == null) return 0;
  if (typeof moves === 'number') return moves;
  let y = moves[0].y;
  for (let i = 1; i < moves.length; i++) {
    const m = moves[i];
    if (t <= m.t) break;
    y = lerp(y, m.y, E.cam(clamp((t - m.t) / (m.d ?? 1.0))));
  }
  return y;
};

export type WinGeom = { x: number; y: number; w: number; h: number; pageW: number; bar: number };
export const TITLE_BAR = 44;

/** 页面坐标 → 舞台坐标（给 Cam 对焦、给舞台层光标用） */
export const pageToStage = (g: WinGeom, px: number, py: number, scrollY = 0) => {
  const k = g.w / g.pageW;
  return { x: g.x + px * k, y: g.y + g.bar + (py - scrollY) * k };
};

/** 让页面里的某一行 py 出现在窗口内容区的竖直位置 frac（0 顶 / 0.5 中）所需的滚动值 */
export const scrollFor = (g: WinGeom, py: number, frac = 0.5) => {
  const k = g.w / g.pageW;
  const viewH = (g.h - g.bar) / k;
  return Math.max(0, py - viewH * frac);
};

export const winGeom = (o: { x: number; y: number; w: number; h: number; src?: string; pageW?: number; chrome?: 'browser' | 'app' | 'none' }): WinGeom => ({
  x: o.x, y: o.y, w: o.w, h: o.h,
  pageW: o.pageW ?? ((o.src && PAGES[o.src]?.w) || 1585),
  bar: o.chrome === 'none' ? 0 : TITLE_BAR,
});

const Lights = () => (
  <div style={{ display: 'flex', gap: 8, position: 'absolute', left: 18, top: 16 }}>
    {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
      <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c, boxShadow: 'inset 0 0 0 .5px rgba(0,0,0,.12)' }} />
    ))}
  </div>
);

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="11" x="4" y="11" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

/**
 * 浏览器窗口（macOS 风）。src 是 PAGES 里的截图；scroll 是页面滚动（数字或 [{t,y,d}]）。
 * layers：同一页面的状态切换 [{t, src}]（0.3s 交叉淡化），例如空表单 → 已填表单。
 * children：页面坐标系的覆盖层（会跟着页面一起滚动、一起被镜头放大）。
 * chrome='app' 只有红绿灯 + 标题（用于终端 / 客户端窗口）；'none' 无标题栏。
 * url 可覆盖地址栏文字；typed 让地址栏文字从 typedAt 开始逐字打出。
 */
export const Window: React.FC<{
  x: number; y: number; w: number; h: number;
  src?: PageSrc | string; pageW?: number;
  scroll?: ScrollMove[] | number;
  layers?: { t: number; src: string }[]; layerDur?: number; // 状态切换的交叉时长（默认 0.3s；版面会移位时用 0.12 或 0 硬切，避免重影）
  url?: string; typedAt?: number; cps?: number; // 地址栏打字速度（字/秒）
  chrome?: 'browser' | 'app' | 'none'; title?: string;
  children?: React.ReactNode; // 页面坐标覆盖层
  content?: React.ReactNode; // 不用截图时，直接放窗口内容（窗口坐标）
  bg?: string; radius?: number; style?: React.CSSProperties; shadow?: string;
}> = ({ x, y, w, h, src, pageW, scroll, layers, layerDur = 0.3, url, typedAt, cps = 22, chrome = 'browser', title, children, content, bg = C.surface, radius = 18, style, shadow = SH.win }) => {
  const t = useSec();
  const g = winGeom({ x, y, w, h, src, pageW, chrome });
  const k = w / g.pageW;
  const sy = scrollAt(scroll, t);
  const pg = src ? PAGES[src] : undefined;
  const addr = url ?? pg?.url ?? '';
  const shown = typedAt != null ? addr.slice(0, Math.max(0, Math.floor((t - typedAt) * cps))) : addr;
  const typedEnd = typedAt != null ? typedAt + addr.length / cps : -1;
  // 打完 0.6s 后光标消失（第 3 期 seg8 反馈：打完字光标一直闪）
  const caret = typedAt != null && t >= typedAt - 0.2 && t < typedEnd + 0.6 && Math.floor(t * 2.2) % 2 === 0;
  const imgs: { src: string; o: number }[] = [];
  if (src) {
    const all = [{ t: -1e9, src }, ...(layers ?? [])];
    all.forEach((L, i) => {
      const next = all[i + 1];
      const inP = i === 0 ? 1 : layerDur <= 0 ? (t >= L.t ? 1 : 0) : clamp((t - L.t) / layerDur);
      const outP = next ? clamp((t - next.t - Math.max(layerDur, 0)) / 0.01) : 0;
      if (inP > 0 && outP < 1) imgs.push({ src: L.src, o: inP });
    });
  }
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: radius, background: bg, boxShadow: shadow, overflow: 'hidden', ...style }}>
      {chrome !== 'none' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: TITLE_BAR, background: C.chrome, borderBottom: `1px solid ${C.line}` }}>
          <Lights />
          {chrome === 'browser' ? (
            <div style={{ position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)', height: 28, minWidth: Math.min(520, w * 0.42), padding: '0 16px', borderRadius: 8, background: C.chromeField, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: F.sans, fontSize: 14, color: C.ink2, letterSpacing: 0.1 }}>
              <LockIcon />
              <span>{shown}</span>
              {caret && <span style={{ width: 1.5, height: 15, background: C.accent, display: 'inline-block', marginLeft: -4 }} />}
            </div>
          ) : (
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: TITLE_BAR, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 14, fontWeight: 500, color: C.muted }}>{title}</div>
          )}
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, top: g.bar, width: w, height: h - g.bar, overflow: 'hidden' }}>
        {src ? (
          <div style={{ position: 'absolute', left: 0, top: 0, width: g.pageW, transformOrigin: '0 0', transform: `scale(${k}) translateY(${-sy}px)` }}>
            {imgs.map((im, i) => (
              <Img key={im.src + i} src={staticFile(im.src)} style={{ position: 'absolute', left: 0, top: 0, width: g.pageW, opacity: im.o, display: 'block' }} />
            ))}
            {children}
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
};
