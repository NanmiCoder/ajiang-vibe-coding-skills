import React from 'react';
import { Sfx, Shot } from '../lib';
import { PageShot, T } from './seg1/PageShot';
import { R, ReportShot } from './seg1/ReportShot';

// seg1 · 检测报告露馅（38.5s）
// 镜头 1–2（0–13.4s）：真实检测页 det-api → det-filled，推近输入框打字 → 点「开始两次探针检测」→ 右侧表盘逐段跑完（不问身份，只写随机数）
// 镜头 3（12.6–38.5s）：真实报告卡 user-report.jpg；主角卡 scanline-annotate-focus 浅色版——
//   01 表盘判定·不一致 → 02 指纹最接近·deepseek-v4.1-flash-1017 → 03 散点图抬起，Opus 排第 37/64 → 04 前三候选·没有 Opus
export const sfx: Sfx[] = [
  { t: T.fields, k: 'whoosh', v: 0.3 },
  { t: T.click1, k: 'click' },
  { t: T.click1 + 0.12, k: 'tick', v: 0.35 }, // 粘贴
  { t: T.key, k: 'click', v: 0.45 },
  { t: T.key + 0.12, k: 'tick', v: 0.3 }, // 粘贴
  { t: T.out, k: 'whoosh', v: 0.25 },
  { t: T.opt, k: 'click', v: 0.45 },
  { t: T.click, k: 'click' },
  { t: T.up, k: 'whoosh', v: 0.3 },
  { t: T.ident, k: 'pop', v: 0.3 },
  { t: T.p2, k: 'tick' },
  { t: T.p3, k: 'tick' },
  { t: T.done, k: 'tick' },
  { t: R.in + 0.05, k: 'shutter' },
  { t: R.t1, k: 'whoosh', v: 0.3 },
  { t: R.b1, k: 'pop', v: 0.35 },
  { t: R.d1, k: 'alert' },
  { t: R.b2, k: 'pop', v: 0.35 },
  { t: R.t3, k: 'whoosh', v: 0.3 },
  { t: R.lift, k: 'swish', v: 0.35 },
  { t: R.bub, k: 'pop', v: 0.35 },
  { t: R.b3, k: 'pop', v: 0.35 },
  { t: R.r37, k: 'pop', v: 0.45 },
  { t: R.t4, k: 'whoosh', v: 0.3 },
  { t: R.b4, k: 'pop', v: 0.35 },
];

const Seg1: React.FC = () => (
  <>
    {/* 段首 0.5s 内淡入；页面 → 报告用上推 */}
    <Shot from={0} to={R.in + 0.8} enter="none" exit="up" dur={0.8}>
      <Shot from={0} to={R.in + 0.8} enter="fade" exit="none" dur={0.5}>
        <PageShot />
      </Shot>
    </Shot>
    {/* 段尾：fade 的不透明度在 dur 的前一半走完 → 38.07 起淡出、38.42 归零，最后 4 帧是空舞台 */}
    <Shot from={R.in} to={38.5} enter="up" exit="none" dur={0.8}>
      <Shot from={R.in} to={38.77} enter="none" exit="fade" dur={0.7}>
        <ReportShot />
      </Shot>
    </Shot>
  </>
);
export default Seg1;
