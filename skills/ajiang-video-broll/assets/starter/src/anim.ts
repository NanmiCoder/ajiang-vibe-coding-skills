import {Easing, interpolate, spring} from 'remotion';
import {FPS} from './theme';

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const IN = 18;
export const OUT = 12;
export const STAGGER = 4;

/** 0 → 1，入场进度 */
export const enter = (f: number, at: number, d = IN) =>
  interpolate(f, [at, at + d], [0, 1], {...clamp, easing: easeOut});

/** 0 → 1，退场进度 */
export const leave = (f: number, at: number, d = OUT) =>
  interpolate(f, [at, at + d], [0, 1], {...clamp, easing: easeIn});

/** 入场 × (1 - 退场) */
export const vis = (f: number, at: number, out = Infinity) =>
  enter(f, at) * (out === Infinity ? 1 : 1 - leave(f, out));

export const draw = (f: number, at: number, d = 45) =>
  interpolate(f, [at, at + d], [0, 1], {...clamp, easing: easeInOut});

export const pop = (f: number, at: number) =>
  spring({
    frame: f - at,
    fps: FPS,
    config: {damping: 12, stiffness: 140, mass: 0.8},
  });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 入场前 10 帧的模糊 */
export const entryBlur = (f: number, at: number, px = 24) =>
  interpolate(f, [at, at + 10], [px, 0], clamp);

export const range = (f: number, input: number[], output: number[], ease = easeInOut) =>
  interpolate(f, input, output, {...clamp, easing: ease});
