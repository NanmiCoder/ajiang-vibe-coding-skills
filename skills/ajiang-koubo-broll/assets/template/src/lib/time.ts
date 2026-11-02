// 唯一时间数据源：src/data/timing.json（由 <skill>/scripts/make_timing.py 从 SRT + 分章 + 口播 ASR 逐字对齐生成）。
// 段内时间一律用秒；cue / say 把字幕原文锚到口播上，不手写时间。
import { useCurrentFrame } from 'remotion';
import timing from '../data/timing.json';

type Cue = { n: number; start: number; end: number; text: string; chars: number[] };
type Seg = { key: string; title: string; from: number; frames: number; seconds: number; outName: string; cues: Cue[] };

const TM = timing as unknown as { fps: number; segments: Record<string, Seg> };
/** 帧率 = 母版帧率（make_timing.py 从母版读出写进 timing.json） */
export const FPS = TM.fps;
/** 段 key：seg0、seg1 …（数量由 make_timing.py 的分章决定） */
export type SegKey = string;

const SEGS = TM.segments;

export const segInfo = (k: SegKey) => {
  if (!SEGS[k]) throw new Error(`timing.json 里没有段 ${k}`);
  return SEGS[k];
};

/** 当前段内秒（每段是独立的 composition，第 0 帧 = 段起点） */
export const useSec = () => useCurrentFrame() / FPS;

/** 某条字幕开始的秒数。text 是该条字幕原文里的一段（能唯一定位即可） */
export const cue = (k: SegKey, text: string, nth = 0): number => {
  let n = 0;
  for (const c of segInfo(k).cues) {
    if (c.text.includes(text)) {
      if (n === nth) return c.start;
      n++;
    }
  }
  throw new Error(`cue 找不到: ${k} 「${text}」`);
};

/** 口播说出某个词的秒数（逐字对齐，误差约 ±0.1s）。off 为偏移秒，nth 为第几次出现 */
export const say = (k: SegKey, word: string, off = 0, nth = 0): number => {
  let n = 0;
  for (const c of segInfo(k).cues) {
    let i = c.text.indexOf(word);
    while (i >= 0) {
      if (n === nth) return +(c.chars[i] + off).toFixed(3);
      n++;
      i = c.text.indexOf(word, i + 1);
    }
  }
  throw new Error(`say 找不到: ${k} 「${word}」 nth=${nth}`);
};

/** 某个词说完的秒数 */
export const sayEnd = (k: SegKey, word: string, off = 0, nth = 0): number => {
  let n = 0;
  for (const c of segInfo(k).cues) {
    let i = c.text.indexOf(word);
    while (i >= 0) {
      if (n === nth) {
        const j = i + word.length;
        const tEnd = j < c.chars.length ? c.chars[j] : c.end;
        return +(tEnd + off).toFixed(3);
      }
      n++;
      i = c.text.indexOf(word, i + 1);
    }
  }
  throw new Error(`sayEnd 找不到: ${k} 「${word}」`);
};
