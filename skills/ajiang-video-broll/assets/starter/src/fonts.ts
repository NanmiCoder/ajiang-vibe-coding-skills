import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import raw from './fonts.json';

type FontEntry = {family: string; file: string; weight: string; style: string};
const manifest = raw as FontEntry[]; // broll 路线下这里是 []（字体在 src/broll/fonts.json）

// 字体子集由 scripts/fetch-fonts.mjs 生成，渲染时不再访问网络。
export const fontsReady = Promise.all(
  manifest.map((m) =>
    loadFont({
      family: m.family,
      url: staticFile(`fonts/${m.file}`),
      weight: m.weight,
      style: m.style,
      display: 'block',
    }),
  ),
);
