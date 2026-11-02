import React from 'react';
import { Img, staticFile } from 'remotion';
import { clamp } from './anim';
import { useSec } from './time';
import recsJson from '../data/recs.json';

/**
 * 真实录屏帧序列登记表 src/data/recs.json（主控用 ego-browser 采集；视口 1600×900 CSS、dpr 2 → 每帧 3200×1800 JPEG）：
 *   { '<name>': { kind: 'steps' | 'video', n, w, h, fps?, url, note, marks: { '<事件>': 帧号(1 起) }, els: { '<名>': [x, y, w, h] } } }
 * 帧文件：public/rec/<name>/f00001.jpg …
 *  - kind 'steps'：回放页「按步骤」逐步截的帧，帧号 = 步号 + 1。播放速度由你按口播定（rate = 每秒几步）。
 *  - kind 'video'：真实交互的实时录屏，已重采样成恒定 fps（30）。rate=1 即原速。
 * els / marks 都是录屏视口里的 CSS px 和帧号，推镜头、落焦点框、对口播都用它们，不要猜坐标。
 */
export type RecInfo = {
  kind: 'steps' | 'video'; n: number; w: number; h: number; fps?: number; url?: string; note?: string;
  marks?: Record<string, number>; els?: Record<string, [number, number, number, number]>;
};
export const RECS = recsJson as unknown as Record<string, RecInfo>;

export const recInfo = (name: string): RecInfo => {
  const r = RECS[name];
  if (!r) throw new Error(`recs.json 里没有录屏 ${name}`);
  return r;
};
/** 录屏里某个事件的帧号（1 起） */
export const mark = (name: string, m: string): number => {
  const v = recInfo(name).marks?.[m];
  if (v == null) throw new Error(`录屏 ${name} 没有 mark「${m}」`);
  return v;
};
/** 录屏视口里某个元素框 [x, y, w, h]（CSS px） */
export const recEl = (name: string, e: string): [number, number, number, number] => {
  const v = recInfo(name).els?.[e];
  if (!v) throw new Error(`录屏 ${name} 没有元素「${e}」`);
  return v;
};
export const recFrame = (name: string, i: number) => `rec/${name}/f${String(i).padStart(5, '0')}.jpg`;

/** 时间 → 帧号。play：[{t, f}] 关键点之间线性推进（t 段内秒，f 帧号）；早于第一个点停在第一帧，晚于最后一个点停在最后一帧。 */
export const recAt = (play: { t: number; f: number }[], t: number) => {
  if (t <= play[0].t) return play[0].f;
  for (let i = 0; i < play.length - 1; i++) {
    const a = play[i], b = play[i + 1];
    if (t <= b.t) return Math.round(a.f + (b.f - a.f) * clamp((t - a.t) / Math.max(b.t - a.t, 1e-6)));
  }
  return play[play.length - 1].f;
};

/**
 * 播放一段真实录屏。放在页面坐标系里（宽 = 录屏 CSS 宽 w），常见用法是当 Window 的 children 或直接放进 Cam：
 *   <Window x={…} y={…} w={…} h={…} pageW={1600} url="arena.modeldial.com/…" content={<Rec name="l1-all" play={[{t: 1, f: 1}, {t: 9, f: 64}]} width={…} />} />
 * play：关键点 [{t, f}]，例如 [{t: say('seg2','63'), f: 1}, {t: say('seg2','63') + 4, f: mark('l1-all','claude-done')}]。
 * 两帧之间是硬切（录屏本身就是逐帧的）；同一帧会复用，不会重复解码。
 */
export const Rec: React.FC<{ name: string; play: { t: number; f: number }[]; width?: number; style?: React.CSSProperties }> = ({ name, play, width, style }) => {
  const t = useSec();
  const r = recInfo(name);
  const f = Math.max(1, Math.min(r.n, recAt(play, t)));
  const w = width ?? r.w;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: (w * r.h) / r.w, overflow: 'hidden', ...style }}>
      <Img src={staticFile(recFrame(name, f))} style={{ position: 'absolute', left: 0, top: 0, width: w, height: (w * r.h) / r.w, display: 'block' }} />
    </div>
  );
};
