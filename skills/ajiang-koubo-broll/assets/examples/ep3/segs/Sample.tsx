import React from 'react';
import {
  At, C, Cam, Card, Chip, E, F, Headline, Icon, Kicker, ModelTag, Pointer, Pop, Ring, SH, Shot, Spot, Strike, Typed, Wire,
  Along, Flowing, curve, rand, rise, tw, useSec, Window, Count, Logo,
} from '../lib';

// 风格样板（不进成片）：三种最常见的镜头——真实页面推拉 / 原理示意图 / 结论卡片。
// 各章节照这个“嗓音”做：浅底、真实窗口是主角、镜头慢推慢拉、文字逐字上浮、强调只用品牌蓝、红色只给“掉包”。

// ── 镜头 1：真实页面 + Screen Studio 推拉 ──
const WIN = { x: 180, y: 60, w: 1560, h: 860 };
const K = WIN.w / 1585; // 页面 CSS px → 舞台 px
const st = (px: number, py: number, scroll: number) => [WIN.x + px * K, WIN.y + 44 + (py - scroll) * K] as const;

const PageShot: React.FC = () => {
  const [ax, ay] = st(598, 1060, 470);
  const [mx, my] = st(598, 1370, 760);
  return (
    <Cam moves={[{ t: 0, x: 960, y: 520, z: 1 }, { t: 1.5, x: ax, y: ay, z: 1.7, d: 1.2 }, { t: 4.3, x: mx, y: my, z: 1.7, d: 1.1 }, { t: 6.3, x: 960, y: 520, z: 1.0, d: 1.2 }]}>
      <Window {...WIN} src="st/det-filled.jpg" scroll={[{ t: 0, y: 470 }, { t: 4.3, y: 760, d: 1.1 }]}>
        <Ring x={256} y={1031} w={685} h={58} t0={2.0} t1={4.2} />
        <At x={260} y={968} t0={2.3} t1={4.2}>
          <Chip tone="ink" size={22} icon="link">只填 API 地址 + Key</Chip>
        </At>
        <Ring x={256} y={1341} w={685} h={58} t0={5.0} t1={6.4} />
        <Pointer scale={1 / K} keys={[{ t: 1.9, x: 520, y: 1110 }, { t: 2.6, x: 430, y: 1062, click: true }, { t: 3.4, x: 760, y: 1064, click: true }, { t: 5.3, x: 520, y: 1372, click: true }]} hideAt={6.4} />
      </Window>
    </Cam>
  );
};

// ── 镜头 2：原理示意图（请求 → 转发层 → 模型）──
// 示意图也在 Cam 里拍：全程极慢漂移，讲到哪就推到哪（和真实页面镜头同一套运镜）。
const Node: React.FC<{ x: number; y: number; w: number; h: number; t0: number; icon: string; title: string; sub: string; children?: React.ReactNode }> = ({ x, y, w, h, t0, icon, title, sub, children }) => (
  <Card x={x} y={y} w={w} h={h} t0={t0} pad={30} shadow={SH.lg}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: C.pale, color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={34} />
      </div>
      <div>
        <div style={{ fontSize: 36, fontWeight: 600, color: C.ink, letterSpacing: -0.5 }}>{title}</div>
        <div style={{ fontSize: 24, color: C.muted, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
    <div style={{ height: 1, background: C.line2, margin: '24px -30px 22px' }} />
    {children}
  </Card>
);

const FlowShot: React.FC = () => {
  const t = useSec();
  const tSwap = 11.0;
  const a = curve([560, 640], [740, 640], 0);
  const b = curve([1180, 640], [1360, 640], 0);
  const back = curve([1360, 820], [560, 820], -40);
  const sw = tw(t, tSwap, 0.35);
  return (
    <Cam moves={[{ t: 7.4, x: 960, y: 560, z: 1.0 }, { t: 9.0, x: 960, y: 590, z: 1.04, d: 2 }, { t: 10.5, x: 960, y: 640, z: 1.32, d: 1.1 }, { t: 12.4, x: 960, y: 600, z: 1.06, d: 1.2 }]}>
      <Kicker text="本地模拟 · 偷梁换柱规则" x={140} y={118} t0={7.9} />
      <Headline text={'客户端请求 *Claude Opus 5.5*\n转发层却换成了 ~deepseek-flash~'} x={140} y={166} size={68} t0={8.1} />
      <Node x={100} y={500} w={460} h={290} t0={8.6} icon="terminal" title="客户端" sub="Claude Code">
        <div style={{ fontFamily: F.mono, fontSize: 24, color: C.ink2, lineHeight: 1.7 }}>
          <div><span style={{ color: C.faint }}>&gt;</span> /model</div>
          <div style={{ color: C.accent }}>claude-opus-5-5</div>
        </div>
      </Node>
      <Node x={740} y={500} w={440} h={290} t0={8.9} icon="route" title="中转站" sub="转发层 · 模型映射">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.mono, fontSize: 22 }}>
          <span style={{ padding: '6px 10px', borderRadius: 8, background: C.surface2, border: `1px solid ${C.line}` }}>opus-5-5</span>
          <Icon name="arrow" size={22} color={sw > 0 ? C.bad : C.faint} />
          <span style={{ padding: '6px 10px', borderRadius: 8, background: sw > 0 ? C.badBg : C.surface2, color: sw > 0 ? C.bad : C.ink2, border: `1px solid ${sw > 0 ? '#F1CFC9' : C.line}` }}>deepseek-flash</span>
        </div>
      </Node>
      <Node x={1360} y={500} w={460} h={290} t0={9.2} icon="cpu" title="实际干活的模型" sub={sw > 0.5 ? '便宜模型' : '？'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: sw }}>
          <Logo id="deepseek" size={44} />
          <span style={{ fontFamily: F.mono, fontSize: 26, color: C.bad }}>deepseek-flash</span>
        </div>
      </Node>
      <Wire c={a} t0={9.4} color={C.faint} dash={8} />
      <Wire c={b} t0={9.6} color={C.faint} dash={8} />
      <Along c={a} t0={9.7} dur={1.1} hideAt={tSwap}>
        <ModelTag logo="claude" name="claude-opus-5-5" size={24} />
      </Along>
      <Along c={b} t0={tSwap + 0.1} dur={1.0} hideAt={12.3}>
        <ModelTag logo="deepseek" name="deepseek-flash" size={24} tone="bad" />
      </Along>
      <Wire c={back} t0={12.6} dur={1.0} color={C.faint} width={2.5} arrow />
      <Along c={back} t0={12.8} dur={1.5}>
        <Chip tone="white" size={24} mono>model: claude-opus-5-5</Chip>
      </Along>
      <At x={100} y={880} t0={14.1}>
        <div style={{ fontSize: 32, color: C.ink2 }}>返回的型号照样写着 <span style={{ fontFamily: F.mono, color: C.accent }}>claude-opus-5-5</span>，肉眼看不出破绽</div>
      </At>
    </Cam>
  );
};

// ── 镜头 3：选择 + 结论卡 ──
const ChoiceShot: React.FC = () => {
  const t = useSec();
  const opts = ['问它「你是谁」', '让它画鹈鹕骑自行车', '让它写 218 个随机数'];
  const pick = 18.0;
  return (
    <>
      <Headline text={'哪种问法，*改提示词也骗不过去*？'} x={960} y={150} align="center" size={64} t0={15.6} />
      <div style={{ position: 'absolute', left: 0, top: 330, width: 1920, display: 'flex', justifyContent: 'center', gap: 28 }}>
        {opts.map((o, i) => {
          const sel = i === 2;
          const p = tw(t, 16.2 + i * 0.18, 0.55);
          const s = tw(t, pick, 0.25);
          const dim = sel ? 1 : 1 - 0.78 * s;
          return (
            <div key={o} style={{ ...rise(t, 16.2 + i * 0.18), opacity: p * dim, padding: '22px 34px', borderRadius: 999, fontSize: 34, fontWeight: 600, background: sel && s > 0 ? C.ink : C.surface, color: sel && s > 0 ? '#fff' : C.ink, border: `1px solid ${sel && s > 0 ? C.ink : C.line}`, boxShadow: SH.sm, transform: `scale(${sel ? 1 + 0.04 * Math.sin(Math.min(1, s) * Math.PI) : 1})` }}>
              {o}
            </div>
          );
        })}
      </div>
      <Card x={420} y={480} w={1080} h={380} t0={18.8} pad={36}>
        <div style={{ fontFamily: F.mono, fontSize: 20, color: C.muted }}>探针 1 · 凭直觉写 218 个 1–355 的整数</div>
        <div style={{ fontFamily: F.mono, fontSize: 26, color: C.ink, lineHeight: 1.6, marginTop: 14, width: 1000, height: 160, overflow: 'hidden' }}>
          <Typed t0={19.3} cps={60} text={Array.from({ length: 80 }, (_, i) => 1 + Math.floor(rand(i + 7) * 355)).join(', ')} />
        </div>
        <div style={{ position: 'absolute', left: 36, bottom: 30, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2 }}><Count to={218} t0={19.3} dur={3} /></span>
          <span style={{ fontSize: 24, color: C.muted }}>个数字 → 行为指纹</span>
        </div>
      </Card>
    </>
  );
};

const Sample: React.FC = () => (
  <>
    <Shot from={0} to={8.2} enter="none" exit="left">
      <PageShot />
    </Shot>
    <Shot from={7.4} to={15.9} enter="left" exit="up">
      <FlowShot />
    </Shot>
    <Shot from={15.1} to={24} enter="up" exit="none">
      <ChoiceShot />
    </Shot>
  </>
);
export default Sample;
