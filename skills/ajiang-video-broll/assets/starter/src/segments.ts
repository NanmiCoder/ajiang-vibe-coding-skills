// 时间的唯一数据源是 segments.json（由 skill 的 scripts/srt_segments.py 从 SRT 生成）。
// 组件里不要手写帧号，用 cueAt() 按字幕原文查段内帧号。
import data from './segments.json';

export type Cue = {n: number; at: number; end: number; text: string};
export type Segment = (typeof data.segments)[number] & {cues: Cue[]; breaks: number[]};

export const segments = data.segments as Segment[];
export const MASTER_FRAMES = data.masterFrames ?? Math.max(...segments.map((s) => s.to));

export const seg = (key: string): Segment => {
  const s = segments.find((x) => x.key === key);
  if (!s) throw new Error(`segments.json 里没有 ${key}`);
  return s;
};

/**
 * 按字幕原文找这一句在段内的开始帧（相对段起点，可能为负）。
 * needle 写字幕里一小段连续原文即可（SRT 原文，含听写错误也照抄）；
 * 同一段里出现多次时用 nth 指定第几次（从 0 开始）。
 */
export const cueAt = (key: string, needle: string, nth = 0): number => {
  const hits = seg(key).cues.filter((c) => c.text.replace(/\s/g, '').includes(needle.replace(/\s/g, '')));
  if (!hits[nth]) throw new Error(`${key} 里找不到字幕「${needle}」（第 ${nth} 次）`);
  return hits[nth].at;
};

/** 某句字幕的结束帧（段内） */
export const cueEnd = (key: string, needle: string, nth = 0): number => {
  const hits = seg(key).cues.filter((c) => c.text.replace(/\s/g, '').includes(needle.replace(/\s/g, '')));
  if (!hits[nth]) throw new Error(`${key} 里找不到字幕「${needle}」（第 ${nth} 次）`);
  return hits[nth].end;
};

/** 写一段时把常用查询绑定到 key 上：const {at, end, frames} = bindSeg('seg2') */
export const bindSeg = (key: string) => ({
  frames: seg(key).frames,
  at: (needle: string, nth = 0) => cueAt(key, needle, nth),
  end: (needle: string, nth = 0) => cueEnd(key, needle, nth),
  breaks: seg(key).breaks,
});
