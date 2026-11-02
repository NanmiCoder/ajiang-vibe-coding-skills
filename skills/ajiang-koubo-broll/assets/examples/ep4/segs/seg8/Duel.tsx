import React from 'react';
import { BrandMark, C, E, Eyebrow, F, Icon, Lives, SokoBoard, Tag, alpha, stateAt, track, tw, useSec } from '../../lib';

// seg8 私有组件：两盘并排的选手面板（板头 BrandMark）+ 中间共用的「重开」按钮。
// 面板是 lib SokoPanel 的变体：板头换成 BrandMark（brief 要求），剩余机会按「按下重开的那一刻」扣（stateAt 会在重开前那一步就扣），
// 板上的状态标签（第 N 次机会 / ▶▶ 快放 / ◀◀ 重开 / 死局）按段内秒显示。

export const LV = 4;
export const PANEL = { pad: 22, head: 64, gap: 14, board: 620 };
export const PW = PANEL.board + PANEL.pad * 2; // 664
export const PH = PANEL.pad * 2 + PANEL.head + PANEL.gap + PANEL.board; // 742
/** 面板 (x, y) 里棋盘的左上角和格宽（舞台坐标），给 Bracket / Tag 定位用 */
export const boardBox = (x: number, y: number) => ({ x: x + PANEL.pad, y: y + PANEL.pad + PANEL.head + PANEL.gap, tile: PANEL.board / track(LV, 'Grok-4.7').frames[0].cols });

export type BoardTag = { text: string; tone: 'accent' | 'bad' | 'ink' | 'dim'; from: number; to?: number };

export const RacerPanel: React.FC<{
  racer: string; suffix?: string; x: number; y: number; at: number; lives: number; stamp: boolean; bannerAt?: number;
  tags: BoardTag[]; o?: number; tIn: number; result?: 'solved' | 'dead';
}> = ({ racer, suffix, x, y, at, lives, stamp, bannerAt, tags, o = 1, tIn, result }) => {
  const t = useSec();
  if (t < tIn - 0.02) return null;
  const T = track(LV, racer);
  const st = stateAt(T, at);
  // 入场：物件式透视立起（seg0 棋盘同款语法），落位后正视
  const p = tw(t, tIn, 0.95, E.out);
  const cut = 18;
  const poly = `polygon(0 0, calc(100% - ${cut}px) 0, 100% ${cut}px, 100% 100%, 0 100%)`;
  const border = result === 'solved' ? alpha(C.accent, 0.6) : result === 'dead' ? alpha(C.bad, 0.6) : C.line;
  const bg = result === 'dead' ? C.badBg : C.surface;
  const stepCol = result === 'dead' ? C.bad : result === 'solved' ? C.accent : C.ink;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: PW, height: PH, opacity: p * o, perspective: 1800 }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - p) * 70}px) rotateX(${(1 - p) * 20}deg)`, transformOrigin: '50% 100%', filter: p < 0.98 ? `blur(${(1 - p) * 6}px)` : undefined }}>
        <div style={{ position: 'absolute', inset: 0, background: border, clipPath: poly }} />
        <div style={{ position: 'absolute', inset: 1, background: bg, clipPath: poly }} />
        <div style={{ position: 'absolute', left: PANEL.pad, top: PANEL.pad, width: PANEL.board, height: PANEL.head, display: 'flex', alignItems: 'center', gap: 14 }}>
          <BrandMark racer={racer} h={42} />
          {suffix && <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 40, lineHeight: 1, color: C.ink, marginLeft: -2 }}>{suffix}</span>}
          <div style={{ flex: 1 }} />
          <Lives left={lives} h={22} gap={7} />
          <div style={{ width: 2, height: 34, background: C.line, margin: '0 8px' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6, minWidth: 112 }}>
            <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 54, lineHeight: 1, color: stepCol, fontVariantNumeric: 'tabular-nums' }}>{st.steps}</span>
            <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 26, color: C.muted }}>步</span>
          </div>
        </div>
        <div style={{ position: 'absolute', left: PANEL.pad, top: PANEL.pad + PANEL.head + PANEL.gap }}>
          <SokoBoard lv={LV} racer={racer} at={at} size={PANEL.board} stamp={stamp} bannerAt={bannerAt} />
          {/* 板上状态标签：贴在第 0 行（L4 第 0 行全是墙，不挡棋子） */}
          <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 10, zIndex: 12 }}>
            {tags.map((g, i) => {
              if (t < g.from - 0.02 || (g.to != null && t > g.to + 0.25)) return null;
              const a = tw(t, g.from, 0.22) * (g.to != null ? 1 - tw(t, g.to, 0.22, E.in) : 1);
              return (
                <div key={i} style={{ opacity: a, transform: `translateY(${(1 - a) * 6}px)` }}>
                  <Tag tone={g.tone} size={26}>{g.text}</Tag>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 产品风格的「重开」按钮（切角 + 酸性绿描边，和 arena 的按钮同一套语言）：有厚度的街机按键，按下时键帽下沉、整块填满酸性绿。
 * presses = 每次被按下的段内秒（光标点击 / 模型调用 restart）。
 */
export const RestartButton: React.FC<{ cx: number; cy: number; w: number; h: number; tIn: number; presses: number[]; o?: number }> = ({ cx, cy, w, h, tIn, presses, o = 1 }) => {
  const t = useSec();
  if (t < tIn - 0.02) return null;
  const p = tw(t, tIn, 0.6, E.out);
  let push = 0;
  let lit = 0;
  for (const tp of presses) {
    const d = t - tp;
    if (d >= 0 && d < 0.32) push = Math.max(push, Math.sin((d / 0.32) * Math.PI));
    if (d >= -0.03) lit = Math.max(lit, d < 0.6 ? tw(t, tp - 0.03, 0.08) : 1 - tw(t, tp + 0.6, 0.4, E.inOut));
  }
  const depth = 14;
  const c = 30;
  const poly = `polygon(0 0, calc(100% - ${c}px) 0, 100% ${c}px, 100% 100%, ${c}px 100%, 0 calc(100% - ${c}px))`;
  const on = lit > 0.5;
  const fg = on ? C.bg : C.ink;
  return (
    <div style={{ position: 'absolute', left: cx - w / 2, top: cy - h / 2 + (1 - p) * 34, width: w, height: h + depth, opacity: p * o, filter: p < 0.98 ? `blur(${(1 - p) * 8}px)` : undefined }}>
      {/* 底座（按键厚度） */}
      <div style={{ position: 'absolute', left: 0, top: depth, width: w, height: h, background: alpha(C.accent, 0.45), clipPath: poly }} />
      <div style={{ position: 'absolute', left: 2, top: depth + 2, width: w - 4, height: h - 4, background: C.bg2, clipPath: poly }} />
      {/* 键帽 */}
      <div style={{ position: 'absolute', left: 0, top: push * depth * 0.85, width: w, height: h }}>
        <div style={{ position: 'absolute', inset: 0, background: C.accent, clipPath: poly }} />
        <div style={{ position: 'absolute', inset: 3, background: C.surface, clipPath: poly, opacity: 1 - lit }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Eyebrow text="Restart" size={20} color={on ? C.bg : C.accent} style={{ letterSpacing: 5 }} />
          <Icon name="refresh" size={92} color={on ? C.bg : C.accent} stroke={2.4} />
          <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 64, lineHeight: 1, color: fg, letterSpacing: 6, marginRight: -6 }}>重开</div>
        </div>
      </div>
    </div>
  );
};
