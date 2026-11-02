import React from 'react';
import { At, Backdrop, Bracket, Cam, CamMove, Lines, Pointer, Sfx, Shot, Tag, keys, lerp, say, stepAt, track, tw, useSec } from '../lib';
import { BoardTag, LV, PH, PW, RacerPanel, RestartButton, boardBox } from './seg8/Duel';
import { RevealCard } from './seg8/Scorecard';

// seg8 · 主动重开对比（24.9s，字幕 #149–#166）
// 两盘并排是主角：左 MiniMax、右 Grok（第 4 关真实回放，track(4, …)），中间是两家共用的「重开」按钮。
// 一镜到底：开场全景 → 推近按钮（光标按下）→ 偏向左盘（MiniMax 第 1 次走乱 → 按重开 → 第 2 次通关）
// → 横移到右盘（Grok 走一半 → 也按重开 → 新一局第 1 步把箱子钉死在墙上，推近那只箱子）
// → 上推换层级到 seg0 的 8TH 记分牌：「?」翻成 Grok 的 BrandMark（Grok = 0 分，全片第一次揭晓）。
// 悬念：本章不出现任何其他模型的总分 / 名次 / 排行榜；Grok 的 0 分只在段尾记分牌上。
const K = 'seg8';
const s = (w: string, off = 0, nth = 0) => say(K, w, off, nth);

const MM = 'MiniMax-3.1-Flash';
const GK = 'Grok-4.7';

// ── 舞台布局（Cam 世界坐标）：左盘 | 按钮 | 右盘 ──
const PY = 220; // 整组下移 20：板头步数字在任何机位下都落在头像框（y≤230）之下
const LX = 150;
const RX = 1920 - 150 - PW;
const BTN = { cx: 960, cy: PY + PH / 2 - 10, w: 240, h: 272 };

// ── 时间锚（全部来自口播逐字时间）──
const T = {
  intro: 0.3,
  give: s('我们'),
  btn: s('按钮') + 0.02,
  mm: s('MiniMax'),
  mess: s('走乱'),
  press1: s('果断') - 0.05,
  clear: s('通关') + 0.06,
  side: s('旁边'),
  gk: s('Grok'),
  press2: s('点了'),
  fresh: s('新的一局'),
  step1: s('第一步'),
  box: s('箱子'),
  nail: s('钉'),
  six: s('6道题'),
  flip: s('Grok', 0, 1),
  zero: s('0分'),
};
const CUT = 21.4; // 上推到记分牌（「墙上」说到一半起推，「6 道题」时记分牌到位）

// ── 左盘 MiniMax：第 1 次机会快放到 121 步 → 停（走乱了）→ 按重开倒带 → 第 2 次机会快放到 CLEAR ──
const mmTrack = track(LV, MM);
const MM_R = mmTrack.ends[0].at; // 第 1 次机会主动重开的那一帧（121 步）
const MM_C2 = mmTrack.chanceStart[2];
const MM_WIN = mmTrack.ends[1].at; // 第 2 次机会通关
const mmPlay1 = { t0: T.mm + 0.3, t1: s('走乱') - 0.35 };
const mmRewind = { t0: T.press1 + 0.06, t1: T.press1 + 0.5 };
const mmPlay2 = { t0: T.press1 + 0.56 };
const mmAt = (t: number) => {
  if (t < mmRewind.t0) return stepAt([{ t: mmPlay1.t0, f: 0 }, { t: mmPlay1.t1, f: MM_R }], t);
  if (t < mmRewind.t1) return stepAt([{ t: mmRewind.t0, f: MM_R }, { t: mmRewind.t1, f: 0 }], t);
  return stepAt([{ t: mmPlay2.t0, f: MM_C2 }, { t: T.clear - 0.5, f: MM_WIN - 12 }, { t: T.clear, f: MM_WIN }], t);
};

// ── 右盘 Grok：第 1 次机会走到 34 步 → 按重开倒带 → 新一局第 1 步 U 把箱子推到上墙 → 死局 ──
const gkTrack = track(LV, GK);
const GK_R = gkTrack.ends[0].at; // 34 步主动重开
const GK_C2 = gkTrack.chanceStart[2];
const GK_DEAD = gkTrack.ends[1].at; // 重开后第 1 步死局
const gkPlay1 = { t0: T.gk + 0.15, t1: s('一半', 0, 1) + 0.35 };
const gkRewind = { t0: T.press2 + 0.06, t1: T.press2 + 0.45 };
const gkPush = { t0: T.nail - 0.42, t1: T.nail - 0.04 };
const gkAt = (t: number) => {
  if (t < gkRewind.t0) return stepAt([{ t: gkPlay1.t0, f: 0 }, { t: gkPlay1.t1, f: GK_R }], t);
  if (t < gkRewind.t1) return stepAt([{ t: gkRewind.t0, f: GK_R }, { t: gkRewind.t1, f: 0 }], t);
  return stepAt([{ t: gkPush.t0, f: GK_C2 }, { t: gkPush.t1, f: GK_DEAD }], t);
};
const GK_BANNER = T.nail + 0.02;

// 那只被钉死的箱子：真实回放里重开后第 1 步 U 把它从第 2 行推到第 1 行（贴上墙）
const gb = boardBox(RX, PY);
const fatal = gkTrack.ends[1].fatal!;
const cellXY = (cell: number) => ({ x: gb.x + (cell % 10) * gb.tile, y: gb.y + Math.floor(cell / 10) * gb.tile });
const boxFrom = cellXY(fatal.from);
const boxTo = cellXY(fatal.to);
const player0 = cellXY(gkTrack.frames[GK_C2].player);
// MiniMax 走乱的地方：第 1 次机会停住时左下那两只卡在一列里的箱子（第 5、6 行第 4 列；MiniMax 自己的输出也说卡在 (6,4)）
const mb = boardBox(LX, PY);

const CAM: CamMove[] = [
  { t: 0, x: 960, y: 540, z: 1.0 },
  { t: 0.1, x: 960, y: 540, z: 1.02, d: 1.6 },
  { t: T.give - 0.1, x: 960, y: BTN.cy, z: 2.0, d: 1.15 }, // 推近按钮
  { t: T.mm - 0.4, x: 822, y: 492, z: 1.25, d: 1.1 }, // 偏向左盘 MiniMax
  { t: T.mm + 0.8, x: 826, y: 490, z: 1.28, d: 6 },
  { t: T.side - 0.1, x: 1195, y: 492, z: 1.25, d: 1.1 }, // 横移到右盘 Grok（右缘步数留在头像框左侧）
  { t: T.side + 1.1, x: 1200, y: 490, z: 1.28, d: 3.6 },
  { t: T.fresh - 0.15, x: 1384, y: 448, z: 1.6, d: 1.15 }, // 推近那只箱子（按钮整块留在左侧画内，不被画框裁）
  { t: T.fresh + 1.1, x: 1388, y: 438, z: 1.68, d: 3.2 },
];

const ShotDuel: React.FC = () => {
  const t = useSec();
  const focusL = keys(t, [[0, 1], [T.give - 0.1, 1], [T.give + 0.4, 0.2], [T.mm - 0.4, 0.2], [T.mm + 0.1, 1], [T.side - 0.1, 1], [T.side + 0.5, 0.35]]);
  const focusR = keys(t, [[0, 1], [T.give - 0.1, 1], [T.give + 0.4, 0.2], [T.mm - 0.4, 0.2], [T.mm + 0.1, 0.35], [T.side - 0.1, 0.35], [T.side + 0.5, 1]]);
  const mm = mmAt(t);
  const gk = gkAt(t);
  const mmTags: BoardTag[] = [
    { text: '第 1 次机会', tone: 'dim', from: T.intro + 0.4, to: mmRewind.t1 },
    { text: '▶▶ 快放', tone: 'ink', from: mmPlay1.t0, to: mmPlay1.t1 },
    { text: '◀◀ 重开', tone: 'accent', from: T.press1, to: mmPlay2.t0 + 0.4 },
    { text: '第 2 次机会', tone: 'dim', from: mmRewind.t1, to: T.side + 0.5 },
    { text: '▶▶ 快放', tone: 'ink', from: mmPlay2.t0 + 0.4, to: T.clear - 0.1 },
  ];
  const gkTags: BoardTag[] = [
    { text: '第 1 次机会', tone: 'dim', from: T.intro + 0.5, to: gkRewind.t1 },
    { text: '▶▶ 快放', tone: 'ink', from: gkPlay1.t0, to: gkPlay1.t1 },
    { text: '◀◀ 重开', tone: 'accent', from: T.press2, to: gkRewind.t1 + 0.5 },
    { text: '第 2 次机会', tone: 'dim', from: gkRewind.t1, to: GK_BANNER },
  ];
  const mmLives = t < T.press1 ? 3 : 2;
  const gkLives = t < T.press2 ? 3 : t < GK_BANNER ? 2 : 1;
  return (
    <>
      <Backdrop src="sokoban/arena-sokoban.webp" cx={980} t0={0} t1={CUT + 0.8} z0={1.06} z1={1.16} dim={0.9} style={{ opacity: 0.5 * tw(t, 0.05, 0.6) }} />
      <Cam moves={CAM}>
        <RacerPanel racer={MM} x={LX} y={PY} at={mm} lives={mmLives} stamp={mm >= MM_WIN - 0.001} bannerAt={T.clear} tags={mmTags} o={focusL} tIn={T.intro} result={t >= T.clear ? 'solved' : undefined} />
        <RacerPanel racer={GK} suffix="4.7" x={RX} y={PY} at={gk} lives={gkLives} stamp={gk >= GK_DEAD - 0.001} bannerAt={GK_BANNER} tags={gkTags} o={focusR} tIn={T.intro + 0.12} result={t >= GK_BANNER ? 'dead' : undefined} />
        <RestartButton {...BTN} tIn={T.give - 0.05} presses={[T.btn, T.press1, T.press2]} />
        {/* 「我们给模型留了一个按钮」：光标把它按下去 */}
        <Pointer keys={[{ t: s('重开') - 0.15, x: 1220, y: 860 }, { t: T.btn, x: 1028, y: BTN.cy - 36, click: true }]} hideAt={T.btn + 0.4} scale={1} />
        {/* MiniMax：走乱了（停住的那一盘，左下两只箱子挤在同一列） */}
        <Bracket x={mb.x + 4 * mb.tile} y={mb.y + 5 * mb.tile} w={mb.tile} h={mb.tile * 2} t0={T.mess - 0.15} t1={T.press1 - 0.05} />
        {/* 标签放在取景框左边（第 5 行第 2–3 列是空地和墙，不挡棋子；放下面会掉进字幕区） */}
        <At x={mb.x + 4 * mb.tile - 18 - 220} y={mb.y + 5 * mb.tile + 14} t0={T.mess - 0.02} t1={T.press1 - 0.1} dy={6}>
          <div style={{ width: 220, display: 'flex', justifyContent: 'flex-end' }}><Tag tone="accent" size={26}>走乱了</Tag></div>
        </At>
        {/* Grok：新一局第 1 步 → 这个箱子 → 钉在墙上 */}
        <At x={player0.x + gb.tile + 10} y={player0.y + 8} t0={T.step1 - 0.12} t1={GK_BANNER - 0.1} dy={8}>
          <Tag tone="ink" size={24}>第 1 步 ↑</Tag>
        </At>
        <Bracket x={boxFrom.x} y={boxFrom.y} w={gb.tile} h={gb.tile} t0={T.box - 0.12} t1={gkPush.t0 + 0.05} pad={6} arm={20} />
        <Bracket x={boxTo.x} y={gb.y} w={gb.tile} h={boxTo.y + gb.tile - gb.y} t0={GK_BANNER + 0.05} tone="bad" pad={6} arm={20} />
      </Cam>
      <Lines items={[
        { t: Math.max(0.42, s('这关')), text: '这关还有个 *很鲜明的对比*' },
        { t: T.give, text: '给模型留了一个 *主动重开* 按钮' },
        { t: T.mm, text: 'MiniMax：第一次机会 *推到一半*' },
        { t: s('它发现'), text: '发现走乱了，*果断重开止损*' },
        { t: s('第二次'), text: '第二次机会 *顺利通关*' },
        { t: T.side, text: '旁边的 *Grok 4.7*，也是走了一半' },
        { t: s('也跟着'), text: '也跟着点了 *主动重开*' },
        { t: s('结果'), text: '刚重开完，新的一局 *第一步*' },
        { t: s('它又'), text: '又把箱子 ~钉死在了墙上~', end: CUT - 0.2 },
      ]} />
    </>
  );
};

const ShotReveal: React.FC = () => {
  const cellT = [0, 1, 2, 3, 4, 5].map((i) => lerp(T.six + 0.1, T.six + 0.64, i / 5));
  return (
    <RevealCard tIn={CUT + 0.15} cellT={cellT} tZero={T.six + 0.15} tFlip={T.flip} racer={GK} suffix="4.7"
      lines={[
        { t: T.six, text: '6 道题下来……' },
        { t: s('它是'), text: '*Grok 4.7*：拿了 ~0 分~', end: 24.6 },
      ]} />
  );
};

export const sfx: Sfx[] = [
  { t: say(K, '我们') - 0.05, k: 'whoosh', v: 0.4 },
  { t: say(K, '按钮') + 0.02, k: 'click', v: 0.55 },
  { t: say(K, '果断') - 0.05, k: 'click', v: 0.5 },
  { t: say(K, '通关') + 0.06, k: 'chime', v: 0.45 },
  { t: say(K, '点了'), k: 'click', v: 0.5 },
  { t: say(K, '新的一局') - 0.1, k: 'whoosh', v: 0.3 },
  { t: say(K, '钉') + 0.02, k: 'alert', v: 0.5 },
  { t: say(K, 'Grok', 0, 1) - 0.05, k: 'paper', v: 0.5 },
];

const Seg8: React.FC = () => (
  <>
    <Shot from={0} to={CUT + 0.8} enter="none" exit="up">
      <ShotDuel />
    </Shot>
    <Shot from={CUT} to={25.22} enter="up" exit="fade" outDur={0.8}>
      <ShotReveal />
    </Shot>
  </>
);
export default Seg8;
