import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, Cam, Cutout, E, F, Logo, SH, Wire, clamp, curve, lerp, say, tw, useSec } from '../../lib';
import { Bracket, Tag, Veil, rgba } from './kit';

// 镜头 3：用户的真实检测报告卡（st/user-report.jpg，1200×1500 像素）。
// 主角卡 scanline-annotate-focus 的浅色版：四个关键区块依次被取景框咬合 + 机器标签命名（01→04），
// 镜头 Screen Studio 式推近每一块，其余部分蒙浅色白纱；散点图用 Cutout 抬出来放大讲排名。
const s = (w: string, off = 0, nth = 0) => say('seg1', w, off, nth);

// 报告卡在舞台上的摆放：卡片坐标（源图像素）u,v → 舞台 (CX + S0·u, CY + S0·v)
const CX = 600, CY = 90, S0 = 0.6;
const st = (u: number, v: number) => ({ x: CX + S0 * u, y: CY + S0 * v });
const ZP = 1.55 / S0; // 推近档：源图 1px = 屏幕 1.55px（再大 JPEG 会发糊）
const ZL = 1.9; // 散点图抬起时的镜头档
const LIFT = 1.35; // 散点图抬起放大倍数 → 源图 1px ≈ 屏幕 1.54px

export const R = {
  in: 12.6,
  t1: s('表盘', -0.68), // 推近表盘
  b1: s('表盘', 0.12),
  d1: s('不一致', -0.12),
  t2: s('底层', -0.55), // 焦点移到「指纹最接近」
  b2: s('指纹', -0.06),
  d2: s('DeepSeek', -0.15),
  mk: s('1017', -0.12),
  t3: s('最逗', 0.15), // 镜头移到散点图
  lift: s('散点', -0.4),
  bub: s('嘴上', -0.12),
  wire: s('真的', -0.22),
  b3: s('Opus', -0.22, 1),
  cnt: s('在64', 0.02),
  r37: s('37名', -0.02),
  t4: s('37名', 0.6), // 散点图落回、镜头移到前三候选
  b4: s('前三', 0.12),
  d4: s('候选', -0.06),
  ring: s('摸着', -0.55),
  end: 38.1,
};

const kP = S0 * ZP; // 推近档下 1 源像素的屏幕像素
const kL = S0 * ZL * LIFT;

const camMoves = () => {
  const o = st(600, 654), a = st(612, 515), a2 = st(616, 652), c = st(600, 980), d = st(700, 620);
  return [
    // 报告卡像一张文件落到眼前：起始就推近到 z1.75（卡宽约 66% 画面，从「待测型号」到图例行），再缓推
    { t: R.in, x: o.x, y: o.y, z: 1.75 },
    { t: R.in + 0.3, x: o.x, y: o.y - 4, z: 1.82, d: R.t1 - R.in - 0.3 },
    { t: R.t1, x: a.x, y: a.y, z: ZP, d: 1.15 },
    { t: R.t2, x: a2.x, y: a2.y, z: ZP, d: 1.2 },
    { t: R.t2 + 1.2, x: a2.x, y: a2.y + 4, z: ZP * 1.03, d: R.t3 - R.t2 - 1.2 },
    { t: R.t3, x: c.x, y: c.y, z: ZL, d: 1.2 },
    { t: R.t4, x: d.x, y: d.y, z: ZP, d: 1.15 },
  ];
};

// 散点图里比 Opus 更像这次回答的 36 个点（像素检测得到；第 36 个藏在标签下面，只计数不画）
const AHEAD: [number, number][] = [
  [1079.5, 997.5], [829.5, 997.5], [756, 997.5], [722, 997.5], [715, 1010], [617.5, 997.5], [617.5, 1010], [606.5, 985],
  [597.5, 997.5], [583.5, 997.5], [578, 1010.5], [576.5, 985], [574.5, 1023.5], [569.5, 997.5], [561, 1010.5], [558.5, 985],
  [557, 1023.5], [553.5, 997.5], [546.5, 1010.5], [541, 985], [527, 997.5], [503.5, 997.5], [500, 1010], [487.5, 997.5],
  [484, 1010.5], [473.5, 985], [473.5, 997.5], [462.5, 1010.5], [461, 1023.5], [452, 997.5], [450, 985], [448.5, 1010.5],
  [446.5, 1023.5], [443, 971], [441, 1036], [432.5, 997],
];
const HIDDEN = 34;
const CNT_D = 1.42;
const litAt = (i: number) => R.cnt + CNT_D * (1 - Math.pow(1 - i / AHEAD.length, 1.7)); // 越点越快
const RED = { x: 425.5, y: 1010.5 };

const LitDots: React.FC = () => {
  const t = useSec();
  if (t < R.cnt) return null;
  return (
    <>
      {AHEAD.map(([x, y], i) => {
        if (i === HIDDEN) return null;
        const t0 = litAt(i);
        if (t < t0) return null;
        const p = tw(t, t0, 0.22, E.back);
        const r = i === 0 ? 8 : 6.4;
        return <div key={i} style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, background: C.accent, opacity: i === 0 ? 0 : tw(t, t0, 0.08), transform: `scale(${0.4 + 0.6 * p})` }} />;
      })}
      {/* 第 1 名（最接近）一圈确认 */}
      <Pulse x={AHEAD[0][0]} y={AHEAD[0][1]} t0={litAt(0)} color={C.accent} r0={9} r1={22} />
    </>
  );
};

const Pulse: React.FC<{ x: number; y: number; t0: number; color: string; r0: number; r1: number; w?: number }> = ({ x, y, t0, color, r0, r1, w = 2.4 }) => {
  const t = useSec();
  if (t < t0 || t > t0 + 0.8) return null;
  const p = tw(t, t0, 0.8, E.out);
  const r = lerp(r0, r1, p);
  return <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, border: `${w}px solid ${color}`, opacity: 1 - p, boxSizing: 'border-box' }} />;
};

const rankText = (t: number) => {
  let n = 0;
  for (let i = 0; i < AHEAD.length; i++) if (t >= litAt(i)) n = i + 1;
  if (t >= R.r37) n = 37;
  return ` · 排第 ${String(Math.max(1, n)).padStart(2, '0')} / 64`;
};

// 「嘴上说」：模型自称的气泡，尾巴指向下面的红点（真 Opus 指纹）
const Bubble: React.FC<{ t0: number; t1: number }> = ({ t0, t1 }) => {
  const t = useSec();
  if (t < t0) return null;
  const p = tw(t, t0, 0.5, E.back);
  const o = tw(t, t0, 0.18) * (1 - tw(t, t1, 0.3, E.in));
  if (o <= 0) return null;
  const fs = 30 / kL;
  return (
    <div style={{ position: 'absolute', left: RED.x, top: 862, transform: `translate(-50%, -100%) scale(${0.8 + 0.2 * p})`, transformOrigin: '50% 100%', opacity: o, zIndex: 25 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 / kL * 1.2, padding: `${12 / kL}px ${20 / kL}px`, background: C.surface, border: `${1 / kL}px solid ${C.line}`, borderRadius: 16 / kL, boxShadow: `0 ${2 / kL}px ${4 / kL}px rgba(20,28,45,.06), 0 ${14 / kL}px ${30 / kL}px ${-10 / kL}px rgba(20,28,45,.22)`, whiteSpace: 'nowrap', fontSize: fs, fontWeight: 600, color: C.ink }}>
        <Logo id="claude" size={fs * 1.05} />
        <span>我是 <span style={{ fontFamily: F.mono, fontWeight: 500 }}>claude-opus-5-5</span></span>
      </div>
    </div>
  );
};

const RankUnderline: React.FC<{ t0: number; t1: number }> = ({ t0, t1 }) => {
  const t = useSec();
  if (t < t0) return null;
  const p = tw(t, t0, 0.45, E.inOut);
  const o = 1 - tw(t, t1, 0.3, E.in);
  return <div style={{ position: 'absolute', left: 848, top: 924, width: 256 * p, height: 3.2 / kL * 1.4, borderRadius: 3, background: C.bad, opacity: o }} />;
};

// 散点图抬起：从卡里的原位抬起、放大、投影变深；最后落回原位（Q9：飞出去的元素要落回真实槽位）
const ScatterLift: React.FC = () => {
  const t = useSec();
  if (t < R.lift - 0.05 || t > R.end + 0.5) return null;
  const up = tw(t, R.lift, 0.85, E.inOut);
  const down = tw(t, R.t4, 0.7, E.inOut);
  const L = 1 + (LIFT - 1) * up * (1 - down);
  const h = up * (1 - down);
  return (
    <div style={{ position: 'absolute', left: 64, top: 870, width: 1072, height: 220, transform: `scale(${L})`, transformOrigin: '536px 110px', zIndex: 15 }}>
      <Cutout src="st/user-report.jpg" sx={64} sy={870} sw={1072} sh={220} w={1072} radius={30}
        style={{ boxShadow: `0 0 0 ${1.2 * h}px rgba(20,28,45,${0.07 * h}), 0 ${4 * h}px ${10 * h}px rgba(20,28,45,${0.06 * h}), 0 ${36 * h}px ${80 * h}px ${-20 * h}px rgba(20,28,45,${0.3 * h}), 0 ${90 * h}px ${150 * h}px ${-50 * h}px rgba(25,40,100,${0.28 * h})` }} />
      <div style={{ position: 'absolute', left: -64, top: -870, width: 1200, height: 1500 }}>
        <LitDots />
        {/* 落回卡里之后，跟整张卡一起蒙上白纱 */}
        <div style={{ position: 'absolute', left: 64, top: 870, width: 1072, height: 220, borderRadius: 30, background: `rgba(247,248,250,${0.68 * down})`, zIndex: 5 }} />
        <Pulse x={RED.x} y={RED.y} t0={R.r37} color={C.bad} r0={11} r1={30} w={2.6} />
        <RankUnderline t0={R.r37 + 0.05} t1={R.t4 - 0.1} />
        <Wire c={curve([RED.x, 863], [RED.x, 996], 0)} t0={R.wire} dur={0.5} t1={R.t4 - 0.1} color={C.muted} width={2.2} dash={6} />
        <Bubble t0={R.bub} t1={R.t4 - 0.1} />
        <Bracket x={340} y={994} w={176} h={66} t0={R.b3} t1={R.t4 - 0.1} k={kL} />
        <Tag x={340} y={1068} t0={R.b3 + 0.17} t1={R.t4 - 0.1} k={kL} head="03 真 Opus 指纹" detail={rankText} detailAt={R.cnt} />
      </div>
    </div>
  );
};

// 「1017」马克笔高亮（multiply，在卡片原文字下层的效果）
const Mark1017: React.FC = () => {
  const t = useSec();
  if (t < R.mk) return null;
  const p = tw(t, R.mk, 0.4, E.inOut);
  const o = 1 - tw(t, R.t3, 0.4, E.in);
  return <div style={{ position: 'absolute', left: 391, top: 746, width: 66 * p, height: 36, borderRadius: 5, background: C.tint, mixBlendMode: 'multiply', opacity: o, zIndex: 12 }} />;
};

const OutRing: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useSec();
  if (t < t0) return null;
  const p = tw(t, t0, 0.55, E.inOut);
  const x = 531, y = 681, w = 576, h = 84, r = 22;
  return (
    <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', zIndex: 26 }}>
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={C.bad} strokeOpacity={0.16} strokeWidth={10 / kP} pathLength={1} strokeDasharray={`${p} 1`} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={C.bad} strokeWidth={3.2 / kP} pathLength={1} strokeDasharray={`${p} 1`} strokeLinecap="round" />
    </svg>
  );
};

// 散点图抬起期间，整张卡再退后一层（白纱加厚），让抬起的图成为唯一主角
const LiftVeil: React.FC = () => {
  const t = useSec();
  const p = tw(t, R.lift, 0.7, E.inOut) * (1 - tw(t, R.t4, 0.6, E.inOut));
  if (p <= 0) return null;
  return <div style={{ position: 'absolute', inset: 0, background: `rgba(247,248,250,${0.7 * p})`, zIndex: 11 }} />;
};

const CARD_SHADOW = '0 2px 4px rgba(20,28,45,.06), 0 30px 70px -24px rgba(20,28,45,.26), 0 100px 170px -60px rgba(25,40,100,.30)';

export const ReportShot: React.FC = () => {
  const veil = [
    { t: R.t1, x: 121, y: 397, w: 306, h: 306, r: 153 },
    { t: R.t2, x: 78, y: 704, w: 392, h: 90, r: 18, d: 1.0 },
    { t: R.t3, x: 64, y: 870, w: 1072, h: 220, r: 30, d: 1.1 },
    { t: R.t4, x: 504, y: 352, w: 632, h: 484, r: 30, d: 1.1 },
  ];
  return (
    <Cam moves={camMoves()}>
      <div style={{ position: 'absolute', left: CX, top: CY, width: 1200, height: 1500, transform: `scale(${S0})`, transformOrigin: '0 0' }}>
        {/* 卡片本体（裁切：白纱只蒙在卡内） */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 36, overflow: 'hidden', isolation: 'isolate', background: '#fff', boxShadow: CARD_SHADOW, outline: `1px solid ${rgba('#14203a', 0.06)}` }}>
          <Img src={staticFile('st/user-report.jpg')} style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 1500 }} />
          <Mark1017 />
          <Veil keys={veil} t0={R.t1 + 0.15} a={0.68} />
          <LiftVeil />
        </div>
        {/* 01 表盘判定 */}
        <Bracket x={128} y={404} w={292} h={290} t0={R.b1} t1={R.t2 + 0.1} k={kP} r={14} />
        <Tag x={128} y={361} t0={R.b1 + 0.17} t1={R.t2 + 0.1} k={kP} head="01 表盘判定" detail="不一致" detailAt={R.d1} />
        {/* 02 指纹最接近 */}
        <Bracket x={80} y={706} w={388} h={86} t0={R.b2} t1={R.t3} k={kP} />
        <Tag x={80} y={804} t0={R.b2 + 0.17} t1={R.t3} k={kP} head="02 指纹最接近" detail="deepseek-v4.1-flash-1017" detailAt={R.d2} />
        {/* 03 散点图（抬起） */}
        <ScatterLift />
        {/* 04 前三候选 */}
        <Bracket x={497} y={345} w={646} h={498} t0={R.b4} k={kP} r={30} />
        <Tag x={497} y={302} t0={R.b4 + 0.17} k={kP} head="04 前三候选" detail="没有 Opus" detailAt={R.d4} />
        <OutRing t0={R.ring} />
      </div>
    </Cam>
  );
};

export { clamp };
