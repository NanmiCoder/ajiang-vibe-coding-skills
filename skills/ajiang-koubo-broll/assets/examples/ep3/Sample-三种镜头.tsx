// 【参考件，不进模板】第 4 期之前模板 src/segs/Sample.tsx 的原文（只修正了末尾一处 ep3 路径）：三种最常见的镜头写法（真实页面推拉 / 原理示意图 / 选择 + 结论卡）。
// 第 4 期证明：这种借第一段时间轴、却不逐句对口播的“风格样板”会被否（用户：“你的音频完全没有跟画面一起走”）。
// 现在模板的 Sample.tsx 只重导出 Seg0（第一章就是风格样板）。这里只学写法：Cam 推拉、Window + Ring + Pointer、示意图标题放 Cam 外、选择 + Count 结论卡。
// 要编译就拷进工程的 src/segs/（import 路径是 '../lib'）。

import React from 'react';
import {
  At, C, Cam, Card, Chip, F, Headline, Icon, Kicker, Pointer, Ring, SH, Shot, Typed, Wire, Along, Count,
  curve, rand, rise, tw, useSec, Window, PAGES,
} from '../lib';

// 风格样板（不进成片）：三种最常见的镜头——真实页面推拉 / 原理示意图 / 结论卡片。
// 总控每期在派单前把它改成「本期产品的样子」（真截图、真文案），渲静帧确认气质后再发给章节 agent。
// 嗓音：产品自己的底色、真实窗口是主角、镜头慢推慢拉、文字逐字上浮、只有一个强调色、C.bad 只给「坏结论」。
// 不写死颜色（一律 C.*）；正在被念到的标题放 Cam 外。第 3 期的定稿样板见 skill 的 assets/examples/ep3/segs/Sample.tsx。

// ── 镜头 1：真实页面 + Screen Studio 推拉 ──
// public/st/ 里有截图（capture.py 采集，pages.json 自动登记）就用第一张；还没截图时用占位页面，保证模板能渲。
const FIRST = Object.keys(PAGES)[0];
const WIN = { x: 180, y: 60, w: 1560, h: 860 };
const PAGE_W = FIRST ? PAGES[FIRST].w : 1585;
const K = WIN.w / PAGE_W; // 页面 CSS px → 舞台 px
const st = (px: number, py: number, scroll: number) => [WIN.x + px * K, WIN.y + 44 + (py - scroll) * K] as const;

const FakePage: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: C.surface, fontFamily: F.sans }}>
    <div style={{ position: 'absolute', left: 120, top: 70, fontSize: 44, fontWeight: 700, color: C.ink, letterSpacing: -1 }}>产品页面占位</div>
    <div style={{ position: 'absolute', left: 120, top: 136, fontSize: 22, color: C.muted }}>先跑 scripts/capture.py 截真实网页，这里会自动换成真截图</div>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ position: 'absolute', left: 120 + i * 440, top: 220, width: 400, height: 220, borderRadius: 16, border: `1px solid ${C.line}`, background: C.surface2 }}>
        <div style={{ margin: 28, width: 160, height: 18, borderRadius: 9, background: C.line }} />
        <div style={{ margin: '0 28px', width: 300, height: 12, borderRadius: 6, background: C.line2 }} />
      </div>
    ))}
    <div style={{ position: 'absolute', left: 120, top: 500, width: 1280, height: 64, borderRadius: 12, border: `1.5px solid ${C.accent}`, background: C.pale }} />
  </div>
);

// 焦点元素直接取 pages.json 里 capture.py 量好的坐标（不猜坐标）。正式镜头里写 el('st/xxx.jpg', 'button:开始检测')。
const FOCUS: [number, number, number, number] = (() => {
  const els = FIRST ? PAGES[FIRST].els ?? {} : {};
  const k = Object.keys(els).find((n) => /^(h2|button):/.test(n) && els[n][1] > 150 && els[n][1] < 900);
  return k ? els[k] : [120, 500, 1280, 64];
})();

const PageShot: React.FC = () => {
  const [fx, fy, fw, fh] = FOCUS;
  const [ax, ay] = st(fx + fw / 2, fy + fh / 2, 0);
  return (
    <Cam moves={[{ t: 0, x: 960, y: 520, z: 1 }, { t: 1.5, x: ax, y: ay, z: 1.6, d: 1.2 }, { t: 5.6, x: 960, y: 520, z: 1.0, d: 1.2 }]}>
      {FIRST ? (
        <Window {...WIN} src={FIRST} scroll={0}>
          <Ring x={fx} y={fy} w={fw} h={fh} t0={2.0} t1={5.4} />
          <Pointer scale={1 / K} keys={[{ t: 1.9, x: fx + fw + 160, y: fy + 220 }, { t: 2.8, x: fx + fw / 2, y: fy + fh / 2, click: true }]} hideAt={5.4} />
        </Window>
      ) : (
        <Window {...WIN} url="example.com" content={<FakePage />}>
          <Ring x={120} y={500} w={1280} h={64} t0={2.0} t1={5.4} />
        </Window>
      )}
      <At x={WIN.x + fx * K} y={WIN.y + 44 + (fy - 60) * K} t0={2.3} t1={5.4}>
        <Chip tone="ink" size={26} icon="link">讲到哪，推到哪</Chip>
      </At>
    </Cam>
  );
};

// ── 镜头 2：原理示意图（A → B → C）──
// 示意图也在 Cam 里拍：全程极慢漂移，讲到哪就推到哪（和真实页面镜头同一套运镜）。
const Node: React.FC<{ x: number; y: number; w: number; h: number; t0: number; icon: string; title: string; sub: string }> = ({ x, y, w, h, t0, icon, title, sub }) => (
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
  </Card>
);

const FlowShot: React.FC = () => {
  const a = curve([560, 700], [740, 700], 0);
  const b = curve([1180, 700], [1360, 700], 0);
  return (
    <>
      {/* 标题放在 Cam 外的屏幕层：镜头推近时不会被裁掉（第 3 期审片反馈：正在被念到的标题被推拉切掉半截） */}
      <Kicker text="原理示意" x={140} y={118} t0={7.9} size={26} />
      <Headline text={'请求从 *这里* 出发，中途被 ~悄悄换掉~'} x={140} y={166} size={64} t0={8.1} />
      <Cam moves={[{ t: 7.4, x: 960, y: 640, z: 1.0 }, { t: 9.0, x: 960, y: 650, z: 1.04, d: 2 }, { t: 10.5, x: 1180, y: 700, z: 1.3, d: 1.1 }, { t: 12.4, x: 960, y: 660, z: 1.05, d: 1.2 }]}>
        <Node x={100} y={630} w={460} h={140} t0={8.6} icon="terminal" title="客户端" sub="发起请求" />
        <Node x={740} y={630} w={440} h={140} t0={8.9} icon="route" title="中间层" sub="转发 · 映射" />
        <Node x={1360} y={630} w={460} h={140} t0={9.2} icon="cpu" title="实际处理" sub="结果从这里回来" />
        <Wire c={a} t0={9.4} color={C.faint} dash={8} />
        <Wire c={b} t0={9.6} color={C.faint} dash={8} />
        <Along c={a} t0={9.9} dur={1.1} hideAt={11.2}>
          <Chip tone="white" size={26} mono>request</Chip>
        </Along>
        <Along c={b} t0={11.2} dur={1.0}>
          <Chip tone="bad" size={26} mono>swapped</Chip>
        </Along>
      </Cam>
    </>
  );
};

// ── 镜头 3：选择 + 结论卡 ──
const ChoiceShot: React.FC = () => {
  const t = useSec();
  const opts = ['问法 A', '问法 B', '问法 C（能抓到）'];
  const pick = 18.0;
  return (
    <>
      <Headline text={'哪一种，*改提示词也骗不过去*？'} x={960} y={150} align="center" size={64} t0={15.6} />
      <div style={{ position: 'absolute', left: 0, top: 330, width: 1920, display: 'flex', justifyContent: 'center', gap: 28 }}>
        {opts.map((o, i) => {
          const sel = i === 2;
          const s = tw(t, pick, 0.25);
          const dim = sel ? 1 : 1 - 0.78 * s;
          const r = rise(t, 16.2 + i * 0.18);
          return (
            <div key={o} style={{ ...r, opacity: (r.opacity as number) * dim, padding: '22px 34px', borderRadius: 999, fontSize: 34, fontWeight: 600, background: sel && s > 0 ? C.ink : C.surface, color: sel && s > 0 ? C.surface : C.ink, border: `1px solid ${sel && s > 0 ? C.ink : C.line}`, boxShadow: SH.sm }}>
              {o}
            </div>
          );
        })}
      </div>
      <Card x={420} y={480} w={1080} h={380} t0={18.8} pad={36}>
        <div style={{ fontFamily: F.mono, fontSize: 24, color: C.muted }}>输出 · 一串数字</div>
        <div style={{ fontFamily: F.mono, fontSize: 28, color: C.ink, lineHeight: 1.6, marginTop: 14, width: 1000, height: 160, overflow: 'hidden' }}>
          <Typed t0={19.3} cps={60} text={Array.from({ length: 80 }, (_, i) => 1 + Math.floor(rand(i + 7) * 355)).join(', ')} />
        </div>
        <div style={{ position: 'absolute', left: 36, bottom: 30, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2 }}><Count to={218} t0={19.3} dur={3} /></span>
          <span style={{ fontSize: 28, color: C.muted }}>个数字 → 指纹</span>
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
    <Shot from={15.1} to={24} enter="up" exit="fade">
      <ChoiceShot />
    </Shot>
  </>
);
export default Sample;
