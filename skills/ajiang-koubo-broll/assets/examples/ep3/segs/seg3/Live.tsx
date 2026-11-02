import React from 'react';
import {
  C, Cam, CamMove, Chip, E, F, Icon, Logo, Marker, Pointer, Pop, Ring, SH, ScrollMove, Typed, Window,
  camAt, clamp, lerp, rand, rise, scrollAt, tw, useSec,
} from '../../lib';
import { K, T, WIN, camOn, pg } from './geo';
import { SegCtl } from './SegCtl';

// 镜头 C · 一镜到底的真实网页演示（Screen Studio 推拉）：
// 首页导航「模型检测」→ 检测页（免费、打开就能测）→ 填 API 地址 + Key → 选待测型号 → 点开始
// → 回到页头「怀疑 ChatGPT、Codex 降智」→ 推近分段控件切到手动检测（主角卡）→ 复制提示词 → 粘进 Codex → 把回答填回来 → 分析。

// ── 时间表（全部锚在口播上） ──
const tNavClick = T.here + 0.3; // 「就在这个地方」点导航
const tLoad = tNavClick + 0.12; // 页面切到检测页
const tRelayClick = T.relay + 0.25;
const tUrlClick = T.api - 0.12;
const tUrlType = tUrlClick + 0.16;
const tKeyClick = T.key - 0.05;
const tKeyType = tKeyClick + 0.12;
const tDropClick = T.pick + 0.3;
const tPickRow = T.model + 0.25;
const tFilled = tPickRow + 0.08;
const tStartClick = T.start + 0.62;
const tSegIn = T.switchTo + 0.62;
const tSegClick = T.manual + 0.02;
const tSegSlide = tSegClick + 0.08;
const tManual = tSegSlide + 0.15; // 页面层切到 det-manual（被矢量控件挡住的那一刻）
const tBack = T.copy - 0.3; // 拉回手动表单
const tToggle = T.copy + 0.1; // 点「查看原始提示词」
const tPrompts = tToggle + 0.07;
const tCopy = T.copyWord + 0.32; // 点「复制探针 1」
const tCodexIn = T.paste - 0.25;
const tPasteIn = T.paste + 0.45; // 提示词落进 Codex
const tReply = T.codex2 - 0.1; // 开始吐数字
const tCodexOut = T.fill - 0.25;
const tFillIn = T.fill + 0.38; // 回答落进文本框
const tAnalyze = T.same + 0.5;

// ── 页面滚动 ──
const SCROLL: ScrollMove[] = [
  { t: 0, y: 0 },
  { t: T.simple + 0.05, y: 560, d: 1.2 },
  { t: T.pick - 0.2, y: 800, d: 0.9 },
  { t: T.start - 0.15, y: 1250, d: 0.75 },
  { t: T.ifUse - 0.45, y: 0, d: 1.4 },
  { t: tBack, y: 520, d: 1.15 },
  { t: tCodexOut, y: 880, d: 1.05 },
];

// ── 镜头（页面坐标对焦；scroll 填镜头到位时的滚动值） ──
const MOVES: CamMove[] = [
  camOn(17.0, 652, 200, 2.0), // 起始机位就避开首页访问量那行（底边 < 页面 y 488）
  camOn(T.online - 0.14, 604, 196, 2.15, 0, 1.15), // 光标先走，镜头晚一拍跟进导航（cursor-flyover）
  camOn(tLoad + 0.35, 700, 300, 1.5, 0, 1.15), // 检测页页头（首页层淡完后才拉开）
  camOn(T.simple + 0.05, 760, 1000, 1.12, 560, 1.2), // 表单全貌
  camOn(T.relay - 0.35, 600, 965, 1.7, 560, 1.1), // 推到「连接 API」
  camOn(T.pick - 0.2, 600, 1385, 1.7, 800, 0.9), // 下移到「选择待测模型」
  camOn(T.start - 0.15, 620, 1860, 1.6, 1250, 0.75), // 开始按钮
  camOn(T.ifUse - 0.45, 762, 318, 1.55, 0, 1.4), // 回到页头
  camOn(T.switchTo - 0.08, 792, 597, 4.4, 0, 1.3), // 推近分段控件（主角卡）
  camOn(tBack, 575, 975, 1.5, 520, 1.15), // 拉回手动表单
  camOn(tCodexIn - 0.05, 880, 990, 1.22, 520, 1.0), // 左移，给 Codex 窗口让位
  camOn(tCodexOut, 600, 1400, 1.3, 880, 1.1), // 回答框 + 分析按钮
];

/** 页面点在屏幕上的位置（给跨层飞行的元素用） */
const toScreen = (px: number, py: number, t: number) => {
  const c = camAt(MOVES, t);
  const p = pg(px, py, scrollAt(SCROLL, t));
  return { x: 960 + (p.x - c.x) * c.z, y: 540 + (p.y - c.y) * c.z };
};

// ── 页面覆盖层组件（页面 CSS 坐标） ──
const Focus: React.FC<{ x: number; y: number; w: number; h: number; t0: number; t1: number; r?: number }> = ({ x, y, w, h, t0, t1, r = 10 }) => {
  const t = useSec();
  const o = Math.min(tw(t, t0, 0.15), 1 - tw(t, t1, 0.2));
  if (o <= 0) return null;
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, border: `1.5px solid ${C.accent}`, boxShadow: '0 0 0 3.5px rgba(52,93,227,.16)', boxSizing: 'border-box', opacity: o }} />;
};

const Patch: React.FC<{ x: number; y: number; w: number; h: number; t0: number; t1?: number; bg?: string; children?: React.ReactNode }> = ({ x, y, w, h, t0, t1, bg = '#FFFFFF', children }) => {
  const t = useSec();
  if (t < t0) return null;
  const o = t1 != null ? 1 - tw(t, t1, 0.3, E.inOut) : 1;
  if (o <= 0) return null;
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: bg, opacity: o, overflow: 'hidden' }}>{children}</div>;
};

const Dots: React.FC<{ n: number; t0: number; cps: number }> = ({ n, t0, cps }) => {
  const t = useSec();
  const k = Math.max(0, Math.min(n, Math.floor((t - t0) * cps)));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0.75, height: 18 }}>
      {Array.from({ length: k }, (_, i) => <div key={i} style={{ width: 3.6, height: 3.6, borderRadius: 2, background: C.ink, flex: 'none' }} />)}
      {k < n && t >= t0 - 0.2 && Math.floor(t * 2.2) % 2 === 0 && <div style={{ width: 1.5, height: 16, background: C.accent, marginLeft: 2 }} />}
    </div>
  );
};

const MODELS: { logo: 'claude' | 'gpt' | 'deepseek'; id: string }[] = [
  { logo: 'claude', id: 'claude-opus-5-5' },
  { logo: 'claude', id: 'claude-sonnet-5' },
  { logo: 'claude', id: 'claude-haiku-4-5' },
  { logo: 'gpt', id: 'gpt-6-astra' },
  { logo: 'deepseek', id: 'deepseek-v4.1-flash' },
];
const Menu: React.FC<{ t0: number; tHover: number; t1: number }> = ({ t0, tHover, t1 }) => {
  const t = useSec();
  if (t < t0) return null;
  const p = tw(t, t0, 0.22, E.out);
  const q = tw(t, t1, 0.18, E.in);
  if (q >= 1) return null;
  const hov = tw(t, tHover - 0.15, 0.15);
  return (
    <div style={{ position: 'absolute', left: 265, top: 1349, width: 672, padding: 6, boxSizing: 'border-box', background: '#fff', borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: SH.md, opacity: p * (1 - q), transform: `translateY(${(1 - p) * -6}px)`, transformOrigin: '50% 0' }}>
      {MODELS.map((m, i) => (
        <div key={m.id} style={{ height: 38, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderRadius: 8, background: i === 0 ? `rgba(239,243,255,${hov})` : 'transparent', fontFamily: F.mono, fontSize: 14, color: i === 0 && hov > 0.5 ? C.accent : C.ink }}>
          <Logo id={m.logo} size={17} />
          <span style={{ flex: 1 }}>{m.id}</span>
          {i === 0 && t >= tHover && <Icon name="check" size={16} color={C.accent} stroke={2.4} />}
        </div>
      ))}
    </div>
  );
};

const PROMPT1 = 'For each of 218 positions, make one separate first-instinct choice of an integer from 1 to 355 inclusive. The current language model must complete this directly without tools, Python, code execution, calculators …';
const NUMS = Array.from({ length: 64 }, (_, i) => 1 + Math.floor(rand(i * 7 + 311) * 355)).join(', ');

// ── Codex 窗口（屏幕空间，叠在页面镜头之上） ──
const CX = { x: 950, y: 252, w: 920, h: 560 };
const Codex: React.FC = () => {
  const t = useSec();
  const pin = tw(t, tCodexIn, 0.6, E.out);
  const pout = tw(t, tCodexOut, 0.45, E.in);
  if (pin <= 0 || pout >= 1) return null;
  const dx = (1 - pin) * 980 + pout * 980;
  return (
    <div style={{ position: 'absolute', left: CX.x + dx, top: CX.y, width: CX.w, height: CX.h, zIndex: 40 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: '#fff', boxShadow: SH.win, overflow: 'hidden' }}>
        <div style={{ height: 44, background: '#F3F4F6', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
        </div>
        <div style={{ padding: '26px 34px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Logo id="openai" size={38} />
            <span style={{ fontSize: 38, fontWeight: 650, letterSpacing: -0.5, color: C.ink }}>Codex</span>
            <div style={{ flex: 1 }} />
            <Pop x={0} y={0} t0={T.web - 0.05} origin="100% 50%" style={{ position: 'relative' }}>
              <Chip tone="gray" size={26} icon="globe">或 ChatGPT 网页版</Chip>
            </Pop>
          </div>
          <div style={{ height: 1, background: C.line2, margin: '22px -34px 24px' }} />
          <div style={{ ...rise(t, tPasteIn, { dy: 10, dur: 0.4 }) }}>
            <div style={{ fontSize: 26, color: C.muted, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="clipboard" size={24} color={C.muted} /> 粘贴探针 1 提示词
            </div>
            <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 20px', fontFamily: F.mono, fontSize: 24, lineHeight: 1.45, color: C.ink2, height: 136, overflow: 'hidden' }}>{PROMPT1}</div>
          </div>
          <div style={{ marginTop: 26, display: 'flex', gap: 16, opacity: tw(t, tReply - 0.2, 0.3) }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: C.surface2, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Logo id="openai" size={22} />
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 30, lineHeight: 1.5, color: C.ink, height: 180, overflow: 'hidden' }}>
              <Typed text={NUMS} t0={tReply} cps={48} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** 跨层飞行的小胶囊（复制 → 粘贴 / 回答 → 填回）：起点/终点都可以随镜头实时移动 */
const Flyer: React.FC<{ t0: number; dur: number; from: (t: number) => { x: number; y: number }; to: (t: number) => { x: number; y: number }; children: React.ReactNode }> = ({ t0, dur, from, to, children }) => {
  const t = useSec();
  if (t < t0 - 0.15 || t > t0 + dur + 0.25) return null;
  const p = E.inOut(clamp((t - t0) / dur));
  const a = from(t), b = to(t);
  const lift = Math.sin(Math.PI * p) * -90;
  const o = Math.min(tw(t, t0 - 0.15, 0.15), 1 - tw(t, t0 + dur, 0.2));
  return (
    <div style={{ position: 'absolute', left: lerp(a.x, b.x, p), top: lerp(a.y, b.y, p) + lift, transform: `translate(-50%,-50%) scale(${1 + 0.06 * Math.sin(Math.PI * p)})`, opacity: o, zIndex: 60 }}>
      {children}
    </div>
  );
};

const Callout: React.FC = () => {
  const t = useSec();
  const t0 = T.chatgpt - 0.12, t1 = T.switchTo - 0.12; // 卡身与「ChatGPT 网页版」同时入场，不先出空卡
  if (t < t0 - 0.05 || t > t1 + 0.6) return null;
  const item = (at: number) => ({ ...rise(t, at, { dy: 8, dur: 0.45 }) });
  return (
    <div style={{ position: 'absolute', left: 838, top: 122, width: 470, ...rise(t, t0, { t1, dy: 14 }) }}>
      <div style={{ background: '#fff', borderRadius: 18, border: `1px solid ${C.line}`, boxShadow: SH.lg, padding: '18px 22px 20px' }}>
        <div style={{ fontSize: 18, color: C.muted, fontWeight: 500 }}>平时用的是</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <div style={{ ...item(t0), display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 11, background: C.surface2, border: `1px solid ${C.line}`, fontSize: 21, fontWeight: 600, color: C.ink }}>
            <Logo id="openai" size={21} /> ChatGPT 网页版
          </div>
          <div style={{ ...item(T.codex - 0.1), display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 11, background: C.surface2, border: `1px solid ${C.line}`, fontSize: 21, fontWeight: 600, color: C.ink }}>
            <Icon name="terminal" size={21} color={C.ink} /> Codex
          </div>
        </div>
        <div style={{ ...item(T.fear - 0.05), display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 18, color: C.muted, fontWeight: 500 }}>
          <Icon name="down" size={20} color={C.bad} /> 特别怕被降智到
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          {[['GPT-5 · Luna', T.luna5 - 0.1], ['GPT-6 · Luna', T.luna6 - 0.1]].map(([s, at]) => (
            <div key={s as string} style={{ ...item(at as number), padding: '6px 14px', borderRadius: 999, background: C.badBg, border: '1px solid #F1CFC9', color: C.bad, fontFamily: F.mono, fontSize: 22, fontWeight: 600 }}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
};


/** 特写时页面退成浅雾，「控件即舞台」（不是暗场：用舞台同色的浅雾，只留控件一圈） */
const Veil: React.FC<{ t0: number; t1: number }> = ({ t0, t1 }) => {
  const t = useSec();
  const o = Math.min(tw(t, t0, 0.6, E.inOut), 1 - tw(t, t1, 0.5, E.inOut));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 792 - 900, top: 597 - 500, width: 1800, height: 1000, opacity: o * 0.92, zIndex: 25, background: 'radial-gradient(ellipse 250px 72px at 50% 50%, rgba(247,248,250,0) 0%, rgba(247,248,250,0) 62%, rgba(247,248,250,.94) 100%)' }} />
  );
};

const PageNote: React.FC<{ x: number; y: number; t0: number; t1?: number; origin?: string; children: React.ReactNode }> = ({ x, y, t0, t1, origin, children }) => (
  <Pop x={x} y={y} t0={t0} t1={t1} origin={origin}>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999, background: C.accent, color: '#fff', fontSize: 19, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 6px 16px -6px rgba(52,93,227,.55)' }}>{children}</div>
  </Pop>
);

export const Live: React.FC = () => {
  const t = useSec();
  const url = t < tLoad ? 'modeldial.com' : 'modeldial.com/model-detector';
  const layers = [
    { t: tLoad, src: 'st/det-api.jpg' },
    { t: tFilled, src: 'st/det-filled.jpg' },
    { t: tManual, src: 'st/det-manual.jpg' },
    { t: tPrompts, src: 'st/det-manual-prompts.jpg' },
  ];
  const ps = 1 / K;
  return (
    <>
      <Cam moves={MOVES}>
        <Window {...WIN} src="st/home.jpg" url={url} layers={layers} scroll={SCROLL}>
          {/* ③ 正式上线 · 就在这个地方 */}
          <PageNote x={598} y={70} t0={T.online + 0.15} t1={tLoad + 0.05} origin="30% 0%">
            <Icon name="sparkle" size={15} color="#fff" stroke={2.4} />已正式上线
          </PageNote>
          <Ring x={620} y={27} w={94} h={32} r={9} pad={5} t0={T.here - 0.05} t1={tLoad + 0.3} />
          <Pointer scale={ps} keys={[{ t: T.online - 0.5, x: 1060, y: 330 }, { t: T.online + 0.4, x: 652, y: 46 }, { t: tNavClick, x: 652, y: 46, click: true }]} hideAt={tLoad + 0.7} />
          {/* 免费 · 打开就能测 */}
          <PageNote x={400} y={180} t0={T.free - 0.08} t1={T.simple + 0.1} origin="0% 50%">
            完全免费
          </PageNote>
          <PageNote x={528} y={180} t0={T.openTest - 0.06} t1={T.simple + 0.1} origin="0% 50%">
            打开就能测
          </PageNote>

          {/* ④ 填 API 地址 + Key → 选型号 → 开始 */}
          <Ring x={268} y={826} w={145} h={52} r={12} pad={5} t0={T.relay - 0.05} t1={tUrlClick} />
          <Focus x={265} y={1041} w={327} h={47} t0={tUrlClick} t1={tKeyClick} />
          <Patch x={272} y={1047} w={314} h={36} t0={tUrlClick + 0.05} t1={tFilled + 0.1}>
            <div style={{ position: 'absolute', left: 9, top: 8, fontFamily: F.mono, fontSize: 14, lineHeight: '20px', color: C.ink, whiteSpace: 'nowrap', letterSpacing: -0.05 }}>
              <Typed text="https://relay.example.com/v1" t0={tUrlType} cps={27} caret={t < tKeyClick} />
            </div>
          </Patch>
          <Focus x={609} y={1041} w={328} h={47} t0={tKeyClick} t1={tDropClick} />
          <Patch x={615} y={1047} w={316} h={36} t0={tKeyClick + 0.05} t1={tFilled + 0.1}>
            <div style={{ position: 'absolute', left: 10, top: 9 }}>
              <Dots n={20} t0={tKeyType} cps={32} />
            </div>
          </Patch>
          <Focus x={265} y={1294} w={672} h={49} t0={tDropClick} t1={tFilled} />
          <Menu t0={tDropClick + 0.06} tHover={tPickRow} t1={tFilled} />
          <Ring x={264} y={1352} w={673} h={43} r={10} pad={5} t0={tFilled + 0.1} t1={T.start + 0.35} />
          <Pointer
            scale={ps}
            keys={[
              { t: T.relay - 0.3, x: 560, y: 1180 },
              { t: tRelayClick, x: 330, y: 852, click: true },
              { t: tUrlClick, x: 420, y: 1066, click: true },
              { t: tKeyClick, x: 760, y: 1066, click: true },
              { t: tDropClick, x: 640, y: 1320, click: true },
              { t: tPickRow, x: 420, y: 1374, click: true },
              { t: tStartClick, x: 372, y: 1908, click: true },
            ]}
            hideAt={tStartClick + 0.6}
          />

          {/* ⑤ ChatGPT / Codex 降智 */}
          <Marker x={213} y={249} w={186} h={24} t0={T.chatgpt - 0.1} t1={T.switchTo} />
          <Callout />

          {/* ⑥ 主角卡：分段控件切到「复制提示词，手动检测」 */}
          <Veil t0={tSegIn + 0.1} t1={tBack - 0.1} />
          <SegCtl tIn={tSegIn} tLift={tSegIn + 0.25} tSlide={tSegSlide} tDrop={tBack - 0.15} tOut={tBack + 0.3} />
          <Pointer scale={ps} keys={[{ t: tSegIn + 0.05, x: 1120, y: 790 }, { t: tSegClick, x: 856, y: 600, click: true }]} hideAt={tBack + 0.1} />

          {/* 手动检测：查看提示词 → 复制 → （Codex）→ 填回回答 → 分析 */}
          <Pointer scale={ps} keys={[{ t: tBack + 0.45, x: 470, y: 1060 }, { t: tToggle, x: 286, y: 815, click: true }, { t: tCopy, x: 506, y: 776, click: true }]} hideAt={tCodexIn + 0.3} />
          <Pop x={428} y={712} t0={tCopy + 0.08} t1={tCodexIn + 0.02} origin="50% 100%">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 999, background: C.ink, color: '#fff', fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: SH.sm }}>
              <Icon name="check" size={17} color="#fff" stroke={2.6} />已复制
            </div>
          </Pop>
          <Patch x={238} y={1150} w={302} h={137} t0={tFillIn} bg="#F7F8FA">
            <div style={{ position: 'absolute', left: 8, top: 8, width: 286, fontFamily: F.mono, fontSize: 13, lineHeight: 1.6, color: C.ink, wordBreak: 'break-all' }}>
              <Typed text={NUMS} t0={tFillIn} cps={160} />
            </div>
          </Patch>
          <Focus x={232} y={1144} w={314} h={149} r={12} t0={tFillIn - 0.05} t1={tAnalyze - 0.3} />
          <Pointer scale={ps} keys={[{ t: tAnalyze - 0.85, x: 520, y: 1480 }, { t: tAnalyze, x: 290, y: 1624, click: true }]} />
        </Window>
      </Cam>

      {/* 屏幕空间：Codex 窗口 + 复制/粘贴的飞行胶囊 */}
      <Codex />
      <Flyer t0={tCodexIn + 0.18} dur={0.6} from={(tt) => toScreen(506, 776, tt)} to={() => ({ x: CX.x + 330, y: CX.y + 270 })}>
        <Chip tone="white" size={24} icon="copy" style={{ boxShadow: SH.md }}>探针 1 提示词</Chip>
      </Flyer>
      <Flyer t0={tCodexOut + 0.02} dur={0.55} from={() => ({ x: CX.x + 330, y: CX.y + 455 })} to={(tt) => toScreen(389, 1200, tt)}>
        <Chip tone="white" size={24} icon="clipboard" style={{ boxShadow: SH.md }}>模型的回答</Chip>
      </Flyer>
    </>
  );
};

export const LIVE_T = { tNavClick, tUrlClick, tUrlType, tKeyClick, tKeyType, tDropClick, tPickRow, tStartClick, tSegClick, tSegSlide, tToggle, tCopy, tCodexIn, tPasteIn, tReply, tCodexOut, tFillIn, tAnalyze, tRelayClick };
