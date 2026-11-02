import React from 'react';
import { C, E, F, Icon, clamp, lerp, spring, tw, useSec } from '../../lib';

// 主角卡 segmented-thumb-hero（浅色重新蒙皮）：页面里真实的分段控件被镜头推近后，
// 由同几何的矢量控件接管（交叉淡化，像素对齐 det-api.jpg），thumb 严格 0.27s（8f@30）滑到「手动检测」，
// 前缘先走、后缘跟随（橡皮筋拉伸）+ 1.5% 过冲回弹；到位同帧新图标 spring 弹出。坐标 = 页面 CSS px。

const TRACK = { x: 646, y: 572.5, w: 291.5, h: 47.5 };
const A = { l: 650, r: 763.5 }; // API 自动检测 thumb
const M = { l: 767.5, r: 932.5 }; // 复制提示词，手动检测 thumb
const TY = 577, TH = 39.5;

const outQuad = (x: number) => 1 - (1 - x) * (1 - x);
const outQuart = (x: number) => 1 - Math.pow(1 - x, 4);

const mixHex = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp(p))).join(',')})`;
};

export const SegCtl: React.FC<{ tIn: number; tSlide: number; tLift: number; tDrop: number; tOut: number }> = ({ tIn, tSlide, tLift, tDrop, tOut }) => {
  const t = useSec();
  const op = Math.min(tw(t, tIn, 0.3, E.inOut), 1 - tw(t, tOut, 0.3, E.inOut));
  if (op <= 0) return null;
  const D = 0.27;
  const s = (ease: (x: number) => number) => ease(clamp((t - tSlide) / D));
  const dt = t - (tSlide + D);
  const settle = dt > 0 && dt < 0.2 ? 0.015 * Math.sin((dt / 0.2) * Math.PI) * (1 - dt / 0.2) : 0;
  const trail = s(outQuad) + settle;
  const lead = s(outQuart) + settle;
  const l = lerp(A.l, M.l, trail);
  const r = lerp(A.r, M.r, lead);
  const amt = clamp((s(E.out) - 0.2) / 0.6); // 标签颜色随 thumb 位置连续过渡
  const icon = t >= tSlide + D ? spring(t, tSlide + D, 26, 0.45) : 0;
  // 轻微“离页抬起”：推近期间控件浮起一点，拉回前落回原位（与截图对齐后再淡出）
  const lift = tw(t, tLift, 0.5, E.out) * (1 - tw(t, tDrop, 0.4, E.inOut));
  const label = (active: number): React.CSSProperties => ({
    position: 'absolute', top: TY, height: TH, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 * icon,
    fontFamily: F.sans, fontSize: 13, fontWeight: 600, letterSpacing: 0.1, whiteSpace: 'nowrap',
    color: mixHex('#5F6673', '#FFFFFF', active),
  });
  // 点击涟漪：圆心锁点击点（光标尖端），压在 thumb 之上
  const rip = tw(t, tSlide - 0.08, 0.4, E.out);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity: op, zIndex: 30 }}>
      {/* 盖住截图里的原控件（不随抬起移动，抬起时下面不会露出第二层边） */}
      <div style={{ position: 'absolute', left: TRACK.x - 8, top: TRACK.y - 6, width: TRACK.w + 16, height: TRACK.h + 12, borderRadius: 32, background: '#F7F8FA' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${-lift * 3}px)` }}>
      <div style={{ position: 'absolute', left: TRACK.x, top: TRACK.y, width: TRACK.w, height: TRACK.h, borderRadius: TRACK.h / 2, background: '#EAEDF2', boxShadow: `inset 0 1px 2px rgba(20,28,45,.06), 0 ${lift * 10}px ${lift * 26}px -${lift * 8}px rgba(20,28,45,${0.22 * lift})` }} />
      <div style={{ position: 'absolute', left: l, top: TY, width: r - l, height: TH, borderRadius: TH / 2, background: mixHex('#202328', '#2E323A', amt), boxShadow: '0 1px 2px rgba(20,28,45,.18), 0 4px 10px -4px rgba(20,28,45,.35)' }} />
      {rip > 0 && rip < 1 && (
        <div style={{ position: 'absolute', left: 858 - 30 * rip, top: 597 - 30 * rip, width: 60 * rip, height: 60 * rip, borderRadius: '50%', border: `1.2px solid ${C.accent}`, opacity: (1 - rip) * 0.9, boxSizing: 'border-box', zIndex: 3 }} />
      )}
      <div style={{ ...label(1 - amt), left: A.l, width: A.r - A.l }}>API 自动检测</div>
      <div style={{ ...label(amt), left: M.l, width: M.r - M.l }}>
        <span style={{ display: 'inline-flex', width: 13 * icon, transform: `scale(${icon})`, overflow: 'visible' }}>
          <Icon name="copy" size={13} stroke={2.4} color="#FFFFFF" />
        </span>
        复制提示词，手动检测
      </div>
      </div>
    </div>
  );
};
