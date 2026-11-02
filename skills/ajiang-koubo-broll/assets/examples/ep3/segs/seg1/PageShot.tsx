import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, Cam, Chip, E, F, Icon, Pointer, SH, Strike, Window, clamp, pageToStage, rand, say, tw, useSec, winGeom } from '../../lib';
import { Spinner, Veil, rgba } from './kit';

// 镜头 1–2：真实检测页（det-api → det-filled）。Screen Studio 式推拉：
//  页面顶部（标题「模型检测」）→ 快速推近输入框粘贴地址 / Key（完整填表教学在 seg3）→ 拉开下滚
//  → 点选「三次探针检测」（与后面报告卡「三次探针检测 / 已分析 3 次探针」一致；页面层 patch 选中态、按钮字、表盘数字）
//  → 点「开始三次探针检测」→ 拉开上滚到右侧「本次检测」表盘，三段探针逐段走完；屏幕层浮卡：不问身份、只写随机数。
const s = (w: string, off = 0, nth = 0) => say('seg1', w, off, nth);

export const WIN = { x: 160, y: 64, w: 1600, h: 904 };
const g = winGeom({ ...WIN, src: 'st/det-api.jpg' });
const K = WIN.w / 1585;

// ── 时间锚 ──
export const T = {
  fields: s('我们', -0.04), // 推近输入框（填表整段压在 ~2s 内）
  click1: s('模拟', 0.2), // 点 API 地址 → 粘贴
  key: s('模拟', 0.75), // 点 Key → 粘贴
  fill: s('模拟', 1.17), // 上半区切到已填写状态
  out: s('模拟', 1.3), // 拉开 + 下滚
  btn: s('ModelDial', 0.7), // 推近探针次数 + 开始按钮
  opt: s('页面', -0.3), // 点选「三次探针检测」
  click: s('跑'), // 点击开始
  up: s('跑', 0.38), // 拉开 + 上滚
  panel: s('跑', 1.16), // 推近「本次检测」
  ident: s('不用', -0.5), // 屏幕层浮卡入场（对齐「我们不用问它的身份」）
  strike: s('问', 0.1),
  veil: s('跑', 1.2), // 浮卡背后的页面蒙白纱
  rnd: s('连续', -0.45), // 只让它写随机数
  p1: s('连续', -0.3),
  p2: s('几百', -0.6),
  p3: s('个随机', -0.15),
  done: s('随机数', 0.15),
};

const SCROLL = [
  { t: 0, y: 0 },
  { t: T.fields, y: 640, d: 0.95 },
  { t: T.out, y: 1290, d: 1.15 },
  { t: T.up, y: 330, d: 1.1 },
];
const at = (px: number, py: number, sy: number) => pageToStage(g, px, py, sy);

const URL = 'https://relay.example.com/v1';
// 粘贴而不是逐字打字（逐字填表的教程在 seg3）：点框 → 0.12s 后整串出现，带一下选中高亮再褪掉
const tUrl = T.click1 + 0.12;
const tDots = T.key + 0.12;

const camMoves = () => {
  const f = at(600, 1046, 640);
  const b = at(600, 1826, 1290);
  const p = at(943, 770, 330);
  return [
    { t: 0, x: 960, y: 520, z: 1.0 },
    { t: 0, x: 960, y: 528, z: 1.035, d: T.fields },
    { t: T.fields, x: f.x, y: f.y, z: 1.75, d: 0.95 },
    { t: T.out, x: 960, y: 524, z: 1.12, d: 1.15 },
    { t: T.btn, x: b.x, y: b.y, z: 1.8, d: 1.05 },
    { t: T.up, x: 960, y: 520, z: 1.06, d: 0.8 },
    { t: T.panel, x: p.x, y: p.y, z: 1.85, d: 1.1 },
  ];
};

// det-api → det-filled：两张截图在 y≈1180 以下版式不同，整张交叉淡化会出现重影。
// 所以先只淡入上半区（输入框、步骤「已填写」、右侧「目标 API / 待测模型」都在这里，两图版式一致），
// 下半区在下滚最快的那一刻快速换掉（运动中看不出）。
const SWAP = T.out + 0.5;
const FilledLayer: React.FC = () => {
  const t = useSec();
  if (t < T.fill) return null;
  const top = tw(t, T.fill, 0.3, E.linear);
  const all = tw(t, SWAP, 0.12, E.linear);
  const img = (o: number, clip?: string) => (
    <Img src={staticFile('st/det-filled.jpg')} style={{ position: 'absolute', left: 0, top: 0, width: 1585, opacity: o, clipPath: clip, display: 'block' }} />
  );
  return (
    <>
      {all < 1 && img(top, 'inset(0 0 calc(100% - 1180px) 0)')}
      {all > 0 && img(all)}
    </>
  );
};

// 遮住 det-api 输入框占位符的白块：放在已填写截图之下，交叉淡化时占位符不会透出来
const FieldPatches: React.FC = () => {
  const t = useSec();
  if (t < tUrl - 0.05 || t > SWAP + 0.3) return null;
  return (
    <>
      <div style={{ position: 'absolute', left: 271, top: 1047, width: 318, height: 25, background: '#fff' }} />
      {t >= T.key - 0.05 && <div style={{ position: 'absolute', left: 615, top: 1047, width: 318, height: 25, background: '#fff' }} />}
    </>
  );
};

// 输入框打字（盖住 det-api 的占位符，打完后与 det-filled 交叉淡化）
const Pasted: React.FC<{ t0: number; x: number; y: number; w: number; h: number; children: React.ReactNode }> = ({ t0, x, y, w, h, children }) => {
  const t = useSec();
  if (t < t0) return null;
  const sel = 1 - tw(t, t0 + 0.32, 0.45, E.inOut); // 选中高亮停一下再褪
  const flash = tw(t, t0, 0.08) * (1 - tw(t, t0 + 0.08, 0.5, E.out)); // 输入框底色闪一下
  return (
    <>
      <div style={{ position: 'absolute', left: x - 12, top: y - 7, width: 330, height: h + 14, borderRadius: 7, background: rgba(C.accent, 0.07 * flash) }} />
      <div style={{ position: 'absolute', left: x - 1.5, top: y, width: w + 3, height: h, borderRadius: 2, background: rgba(C.accent, 0.24 * sel) }} />
      {children}
    </>
  );
};

const FieldTyping: React.FC = () => {
  const t = useSec();
  if (t < tUrl - 0.05 || t > T.fill + 0.4) return null;
  const o = 1 - tw(t, T.fill, 0.3, E.linear);
  const caretOn = Math.floor(t * 2.4) % 2 === 0;
  return (
    <div style={{ opacity: o }}>
      {/* URL：整串粘贴，真实页面同款等宽字（白色遮挡块在 FieldPatches，压在已填写截图下面） */}
      <Pasted t0={tUrl} x={281.5} y={1054.5} w={231} h={17}>
        <div style={{ position: 'absolute', left: 281.5, top: 1054.5, height: 17, fontFamily: F.mono, fontSize: 13.75, lineHeight: '17px', color: C.ink, whiteSpace: 'pre', letterSpacing: 0 }}>
          {URL}
          {t < T.key && caretOn && t > tUrl + 0.5 && <span style={{ display: 'inline-block', width: 1.4, height: 16, background: C.ink, verticalAlign: -3, marginLeft: 1 }} />}
        </div>
      </Pasted>
      {/* Key：20 个圆点一次粘进去 */}
      <Pasted t0={tDots} x={626.6} y={1054.5} w={84} h={17}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', left: 626.6 + i * 4.2, top: 1061.5, width: 3, height: 3, borderRadius: 2, background: C.ink }} />
        ))}
        {caretOn && t > tDots + 0.5 && <div style={{ position: 'absolute', left: 626.6 + 20 * 4.2 + 1, top: 1054.5, width: 1.4, height: 16, background: C.ink }} />}
      </Pasted>
    </div>
  );
};

// 「本次检测」表盘：三段弧 = 探针 1 / 2 / 3（可选）。按探针逐段描成品牌蓝。
const DIAL = { cx: 1101, cy: 684, r: 65.5, w: 7 };
const arc = (a0: number, a1: number) => {
  const r = DIAL.r, rad = (a: number) => (a * Math.PI) / 180;
  const x0 = DIAL.cx + r * Math.cos(rad(a0)), y0 = DIAL.cy + r * Math.sin(rad(a0));
  const x1 = DIAL.cx + r * Math.cos(rad(a1)), y1 = DIAL.cy + r * Math.sin(rad(a1));
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};
const DialProgress: React.FC = () => {
  const t = useSec();
  const p1 = tw(t, T.p1, T.p2 - T.p1 - 0.05, E.inOut);
  const p2 = tw(t, T.p2, T.p3 - T.p2 - 0.05, E.inOut);
  const p3 = tw(t, T.p3, T.done - T.p3 - 0.05, E.inOut);
  if (p1 <= 0) return null;
  const seg = (a0: number, a1: number, p: number) => (p > 0 ? <path d={arc(a0, a0 + (a1 - a0) * Math.max(p, 0.002))} fill="none" stroke={C.accent} strokeWidth={DIAL.w} strokeLinecap="round" /> : null);
  const lg = (y: number, p: number) => <div style={{ position: 'absolute', left: 1193.5, top: y - 2.6, width: 13, height: 5.2, borderRadius: 3, background: C.accent, opacity: tw(p, 0.98, 0.02, E.linear) }} />;
  return (
    <>
      <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {seg(-86, 27, p1)}
        {seg(37, 150, p2)}
        {seg(157, 266, p3)}
      </svg>
      {lg(655.5, p1)}
      {lg(683, p2)}
      {lg(710.5, p3)}
    </>
  );
};

// 浮卡：不问身份 → 只写随机数（数字流）。MG 层，盖在表单右半边，跟页面一起被镜头推拉。
const NUMS = (seed: number) => Array.from({ length: 96 }, (_, i) => 1 + Math.floor(rand(seed + i * 13) * 355));
const N1 = NUMS(11), N2 = NUMS(907), N3 = NUMS(4021);
const PER = 8;
const Stream: React.FC<{ nums: number[]; t0: number; t1: number }> = ({ nums, t0, t1 }) => {
  const t = useSec();
  if (t < t0) return null;
  const rate = 26; // 个/秒
  const n = clamp(Math.floor((Math.min(t, t1) - t0) * rate) + 1, 0, nums.length);
  const lines: string[] = [];
  for (let i = 0; i < n; i += PER) lines.push(nums.slice(i, Math.min(n, i + PER)).map((v) => String(v).padStart(3, ' ')).join(', ') + (i + PER < n ? ',' : ''));
  const shown = lines.slice(-4);
  return (
    <div style={{ fontFamily: F.mono, fontSize: 17, lineHeight: '27px', color: C.ink, whiteSpace: 'pre', fontVariantNumeric: 'tabular-nums' }}>
      {shown.map((l, i) => (
        <div key={lines.length - shown.length + i} style={{ opacity: shown.length === 4 && i === 0 ? 0.35 : i === 1 && shown.length === 4 ? 0.7 : 1 }}>{l}</div>
      ))}
    </div>
  );
};

const ProbeCard: React.FC = () => {
  const t = useSec();
  if (t < T.ident - 0.05) return null;
  const p = tw(t, T.ident, 0.6);
  const sk = tw(t, T.strike, 0.35, E.inOut);
  const pr = tw(t, T.rnd, 0.5, E.back);
  const pro = tw(t, T.rnd, 0.25);
  const probe = t >= T.p3 ? 3 : t >= T.p2 ? 2 : 1;
  // 屏幕层（不跟页面滚动）：设计单位沿用页面 px，整体 ×1.868 = 推近后与页面同尺度；落在页面左半边、白纱之上
  const SC = 1.868, Wd = 494;
  return (
    <div style={{ position: 'absolute', left: 70, top: 196, width: Wd, opacity: p, transformOrigin: '0 0', transform: `translateY(${(1 - p) * 24}px) scale(${SC})`, filter: p < 0.99 ? `blur(${(1 - p) * 6}px)` : undefined, zIndex: 20 }}>
      <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, boxShadow: SH.lg, padding: '18px 22px 20px', boxSizing: 'border-box' }}>
        {/* 问法：不问身份 → 只写随机数 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 36 }}>
          <div style={{ position: 'relative', opacity: 1 - 0.55 * sk }}>
            <Chip tone="gray" size={17} icon="user">问它的身份</Chip>
            <Strike x={-4} y={18} w={142} t0={T.strike} color={C.bad} width={2.6} />
          </div>
          <div style={{ opacity: pro, color: C.faint }}><Icon name="arrow" size={18} stroke={2.2} /></div>
          <div style={{ opacity: pro, transform: `scale(${0.85 + 0.15 * pr})`, transformOrigin: '0 50%' }}>
            <Chip tone="accent" size={17} icon="dice">只让它写随机数</Chip>
          </div>
        </div>
        <div style={{ height: 1, background: C.line2, margin: '16px -22px 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 16, color: C.muted, height: 24 }}>
          <span>
            <span style={{ color: C.accent, fontWeight: 600 }}>探针 {probe}</span> · 模型回答
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: C.faint }}>1–355</span>
        </div>
        <div style={{ height: 112, marginTop: 8, overflow: 'hidden' }}>
          {t < T.p1 && Math.floor(t * 2.4) % 2 === 0 && <div style={{ width: 9, height: 20, marginTop: 4, background: C.accent, opacity: 0.8 }} />}
          {probe === 1 && <Stream nums={N1} t0={T.p1} t1={T.p2} />}
          {probe === 2 && <Stream nums={N2} t0={T.p2} t1={T.p3} />}
          {probe === 3 && <Stream nums={N3} t0={T.p3} t1={T.done + 2} />}
        </div>
      </div>
    </div>
  );
};

export const PageShot: React.FC = () => (
  <>
    <Cam moves={camMoves()}>
      <Window {...WIN} src="st/det-api.jpg" scroll={SCROLL}>
        <FieldPatches />
        <FilledLayer />
        <FieldTyping />
        {/* 「模拟掉包的接口」：贴在 API 地址标签旁 */}
        <MockChip />
        <ThreeProbes />
        <Pointer scale={1 / K} keys={[{ t: T.click1 - 0.45, x: 520, y: 1150 }, { t: T.click1, x: 330, y: 1060, click: true }, { t: T.key, x: 700, y: 1061, click: true }]} hideAt={T.fill + 0.05} />
        <Pointer scale={1 / K} keys={[{ t: T.btn + 0.5, x: 880, y: 1880 }, { t: T.opt, x: 826, y: 1752, click: true }, { t: T.click, x: 392, y: 1911, click: true }]} hideAt={T.click + 0.55} />
        <SpinnerBg />
        <Spinner x={446} y={1908} r={10.5} width={2.8} t0={T.click + 0.12} />
        <DialProgress />
        {/* 浮卡背后：页面除「本次检测」面板外蒙一层浅白纱，卡片边缘不再露出截断的页面字 */}
        <Veil keys={[{ t: 0, x: 1000, y: 530, w: 417, h: 425, r: 18 }]} t0={T.veil} a={0.66} />
      </Window>
    </Cam>
    <ProbeCard />
  </>
);

// 选「三次探针检测」：页面层 patch（取消「两次」的选中框、给「三次」加选中框；按钮字、说明里的次数、表盘中心数字一起改成 3）
const SEL = '#4C58D0';
const ThreeProbes: React.FC = () => {
  const t = useSec();
  const t0 = T.opt + 0.06;
  if (t < t0) return null;
  const p = tw(t, t0, 0.16, E.out);
  return (
    <>
      {/* 两次：抹掉选中描边（内侧白、外侧表单底色） */}
      <div style={{ position: 'absolute', left: 492.5, top: 1707.5, width: 216.8, height: 92, borderRadius: 14, boxShadow: `0 0 0 3.5px rgba(247,248,250,${p}), inset 0 0 0 3.4px rgba(255,255,255,${p})` }} />
      {/* 三次：加选中描边 */}
      <div style={{ position: 'absolute', left: 720.75, top: 1707.5, width: 216.75, height: 92, borderRadius: 13, boxShadow: `inset 0 0 0 1.8px ${rgba(SEL, p)}, 0 0 0 2px ${rgba(SEL, 0.08 * p)}` }} />
      {/* 按钮字：开始两次探针检测 → 开始三次探针检测 */}
      <div style={{ position: 'absolute', left: 286, top: 1893, width: 130, height: 25, background: '#202328', opacity: p }} />
      <div style={{ position: 'absolute', left: 290, top: 1893, height: 25, display: 'flex', alignItems: 'center', fontFamily: F.sans, fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: 0.07, whiteSpace: 'nowrap', opacity: p }}>开始三次探针检测</div>
      {/* 说明：将发送 2 次 → 3 次 */}
      <div style={{ position: 'absolute', left: 532.6, top: 1898.5, width: 11, height: 17, background: '#F7F8FA', opacity: p }} />
      <div style={{ position: 'absolute', left: 533.6, top: 1897, height: 20, display: 'flex', alignItems: 'center', fontFamily: F.sans, fontSize: 14.3, color: '#5A5E67', opacity: p }}>3</div>
      {/* 右侧「本次检测」表盘：2 次请求 → 3 次请求 */}
      <div style={{ position: 'absolute', left: 1088.5, top: 661, width: 25, height: 30, background: '#F7F8FA' }} />
      <div style={{ position: 'absolute', left: 1080.8, top: 657, width: 40, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 35.5, fontWeight: 700, color: '#1A1D22', lineHeight: 1 }}>3</div>
    </>
  );
};

const MockChip: React.FC = () => {
  const t = useSec();
  const t0 = s('模拟', -0.1);
  if (t < t0) return null;
  const p = tw(t, t0, 0.5, E.back);
  const o = tw(t, t0, 0.2) * (1 - tw(t, T.out + 0.2, 0.3, E.in));
  return (
    <div style={{ position: 'absolute', left: 356, top: 998, opacity: o, transform: `scale(${0.82 + 0.18 * p})`, transformOrigin: '0 50%' }}>
      <Chip tone="bad" size={16} icon="shuffle">模拟掉包的接口</Chip>
    </div>
  );
};

// 按钮里的白色箭头圆 → 加载圈（点下之后）
const SpinnerBg: React.FC = () => {
  const t = useSec();
  const t0 = T.click + 0.08;
  if (t < t0) return null;
  const o = tw(t, t0, 0.15);
  return <div style={{ position: 'absolute', left: 446 - 21, top: 1908 - 21, width: 42, height: 42, borderRadius: 21, background: '#fff', opacity: o }} />;
};

export { at as pageAt };
