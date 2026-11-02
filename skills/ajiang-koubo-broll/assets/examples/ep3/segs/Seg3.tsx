import React from 'react';
import { AbsoluteFill } from 'remotion';
import { E, Sfx, Shot, Stage, tw, useSec } from '../lib';
import { T } from './seg3/geo';
import { Converge } from './seg3/Converge';
import { Coverage } from './seg3/Coverage';
import { Live, LIVE_T as L } from './seg3/Live';

// seg3 · 上线与使用方法（53.35s）
// A 两个开源项目汇入 ModelDial（bezier-source-converge-merge）
// B 真实检测页：14 系列 logo 行 → 「已收录的模型」弹窗
// C 一镜到底真实网页演示：首页导航 → 检测页 → 填表 → 开始 → 页头降智 → 分段控件切手动（segmented-thumb-hero）→ 复制 / Codex / 填回 / 分析

const tAB = 5.75; // A → B（推入）
const tBC = T.compareEnd + 0.05; // B → C（横推）

export const sfx: Sfx[] = [
  { t: 0.15, k: 'pop', v: 0.3 },
  { t: T.merge + 0.75, k: 'chime', v: 0.4 }, // 吞并脉冲
  { t: tAB, k: 'whoosh', v: 0.4 },
  { t: T.n14 - 0.2, k: 'pop', v: 0.3 },
  { t: T.all + 0.22, k: 'click' },
  { t: T.all + 0.32, k: 'swish', v: 0.3 }, // 弹窗
  { t: tBC, k: 'swish' },
  { t: L.tNavClick, k: 'click' },
  { t: T.free - 0.08, k: 'pop', v: 0.3 },
  { t: L.tRelayClick, k: 'click', v: 0.4 },
  { t: L.tUrlClick, k: 'click' },
  { t: L.tUrlType, k: 'type', dur: 1.05 },
  { t: L.tKeyClick, k: 'click' },
  { t: L.tKeyType, k: 'type', dur: 0.62 },
  { t: L.tDropClick, k: 'click' },
  { t: L.tPickRow, k: 'click' },
  { t: L.tStartClick, k: 'click' },
  { t: T.ifUse - 0.45, k: 'whoosh', v: 0.3 }, // 长滚动回页头
  { t: T.fear - 0.05, k: 'pop', v: 0.25 },
  { t: T.switchTo - 0.08, k: 'whoosh', v: 0.35 }, // 推近分段控件
  { t: L.tSegClick, k: 'click', v: 0.6 },
  { t: L.tSegSlide + 0.27, k: 'pop', v: 0.35 },
  { t: L.tToggle, k: 'click', v: 0.45 },
  { t: L.tCopy, k: 'click' },
  { t: L.tCodexIn, k: 'swish' },
  { t: L.tReply, k: 'type', dur: 1.4, v: 0.22 },
  { t: L.tCodexOut, k: 'swish', v: 0.35 },
  { t: L.tFillIn, k: 'pop', v: 0.3 },
  { t: L.tAnalyze, k: 'click' },
];

const Seg3: React.FC = () => (
  <>
    <Shot from={0} to={tAB + 0.8} enter="none" exit="zoomIn">
      <Converge />
    </Shot>
    <Shot from={tAB} to={tBC + 0.8} enter="zoomIn" exit="left">
      <Coverage />
    </Shot>
    <Shot from={tBC} to={T.end + 0.1} enter="left" exit="none">
      <Live />
    </Shot>
    <EndFade />
  </>
);

// 段尾：内容整体淡出到空舞台，在最后一帧前完成（用一层舞台色盖上，舞台本身已在外壳里画好）
const EndFade: React.FC = () => {
  const t = useSec();
  const p = tw(t, T.end - 0.52, 0.4, E.inOut); // 最后约 0.12s 已是纯舞台
  if (p <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: p }}>
      <Stage />
    </AbsoluteFill>
  );
};

export default Seg3;
