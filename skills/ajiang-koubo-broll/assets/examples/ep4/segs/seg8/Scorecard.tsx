import React from 'react';
import { At, Backdrop, Bracket, BrandMark, C, E, F, LevelCells, Lines, alpha, tw, useSec } from '../../lib';

// seg0 段尾 8TH 记分牌的复刻（照 Seg0.tsx 的 Scorecard / ShotLow 坐标与字号，不 import Seg0）：
// 「8TH」大字 + 身份位 + 6 关结果格 + 大号红 0。区别只有身份位：seg0 停在「?」，这里在 tFlip 翻面成 Grok 的 BrandMark —— seg0 悬念第一次回收。

/** 身份位：seg0 Roulette 停住后的样子（? 方块 + 6 格名字占位），tFlip 时整块翻面（scaleY 过 0，和 LevelCells 同一种翻牌语法）露出 BrandMark。 */
const IdentitySlot: React.FC<{ h: number; tFlip: number; racer: string; suffix: string }> = ({ h, tFlip, racer, suffix }) => {
  const t = useSec();
  const col = C.bad;
  const p = tw(t, tFlip - 0.16, 0.32, E.inOut);
  const flipped = p > 0.5;
  const sy = Math.abs(Math.cos(Math.PI * p)) * 0.94 + 0.06;
  const settle = tw(t, tFlip, 0.45, E.out);
  return (
    <div style={{ position: 'relative', width: h * 6.2, height: h * 1.6, overflow: 'hidden', borderTop: `2px solid ${alpha(col, 0.6)}`, borderBottom: `2px solid ${alpha(col, 0.6)}` }}>
      <div style={{ position: 'absolute', left: h * 0.3, top: h * 0.3, height: h, display: 'flex', alignItems: 'center', gap: h * 0.32, transform: `scaleY(${sy})` }}>
        {!flipped ? (
          <>
            <div style={{ width: h, height: h, display: 'grid', placeItems: 'center', background: alpha(col, 0.16), border: `2px solid ${col}`, boxSizing: 'border-box', fontFamily: F.display, fontWeight: 800, fontSize: h * 0.8, color: col }}>?</div>
            <div style={{ display: 'flex', gap: h * 0.12 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ width: h * 0.42, height: h * 0.72, background: C.surface2, border: `1px solid ${C.line}` }} />)}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: h * 0.24, transform: `translateX(${(1 - settle) * -10}px)` }}>
            <BrandMark racer={racer} h={h} />
            <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: h * 0.86, lineHeight: 1, color: C.ink, marginTop: h * 0.04 }}>{suffix}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const RevealCard: React.FC<{
  tIn: number; cellT: number[]; tZero: number; tFlip: number; racer: string; suffix: string; lines: { t: number; text: string; end?: number }[];
}> = ({ tIn, cellT, tZero, tFlip, racer, suffix, lines }) => {
  const t = useSec();
  const col = C.bad;
  const SH = 70; // 身份位高度（seg0 同值）
  // 揭晓后身份位放大一档（以左缘为轴），取景框咬住它 —— 推近的替代：右侧大 0 贴着画面右缘，整镜头不能再推
  const grow = 1 + 0.45 * tw(t, tFlip + 0.12, 0.7, E.out);
  const slot = { x: 150, y: 440, w: SH * 6.2, h: SH * 1.6 };
  const oy = 0.4; // 放大轴心：左缘、偏上（往下长，别顶到 8TH）
  const gx = slot.x, gw = slot.w * grow, gh = slot.h * grow, gy = slot.y + slot.h * oy - gh * oy;
  return (
    <>
      <Backdrop src="sokoban/arena-sokoban.webp" cx={760} t0={tIn - 0.3} t1={tIn + 4.2} z0={1.25} z1={1.31} dim={0.95} style={{ opacity: 0.55 }} />
      <Lines y={74} items={lines} />
      <At x={124} y={170} t0={tIn} dy={20}>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontStyle: 'italic', fontSize: 250, lineHeight: 1, color: col, letterSpacing: -4 }}>8TH</div>
      </At>
      <At x={slot.x} y={slot.y} t0={tIn + 0.1} dy={10}>
        <div style={{ transform: `scale(${grow})`, transformOrigin: `0 ${oy * 100}%` }}>
          <IdentitySlot h={SH} tFlip={tFlip} racer={racer} suffix={suffix} />
        </div>
      </At>
      <Bracket x={gx} y={gy} w={gw} h={gh} t0={tFlip + 0.4} tone="bad" pad={12} arm={30} />
      <At x={150} y={620} t0={tIn + 0.2} dy={10}>
        <div style={{ fontFamily: F.sans, fontSize: 26, color: C.muted, letterSpacing: 6, marginBottom: 14 }}>6 道题</div>
        <LevelCells results={[false, false, false, false, false, false]} times={cellT} w={104} h={84} gap={14} />
      </At>
      <div style={{ position: 'absolute', left: 900, top: 250, width: 960, textAlign: 'right' }}>
        <span style={{ display: 'inline-block', fontFamily: F.display, fontWeight: 800, fontSize: 470, lineHeight: 1, color: col, letterSpacing: -10, opacity: tw(t, tZero - 0.05, 0.3), transform: `translateY(${(1 - tw(t, tZero - 0.05, 0.5, E.out)) * 24}px)` }}>0</span>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 64, color: C.muted, marginTop: -40, opacity: tw(t, tZero + 0.1, 0.3) }}>/ 100 分</div>
      </div>
    </>
  );
};
