import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { loadFont } from '@remotion/fonts';
import T from '../data/tokens.json';
import { C, F } from './tokens';

// 字体：tokens.json 的 font.files（public/fonts/ 下的 woff2）。中文走系统字体回退（PingFang SC）。
let fontsQueued = false;
export const ensureFonts = () => {
  if (fontsQueued) return;
  fontsQueued = true;
  for (const [family, weight, file] of T.font.files as [string, string, string][]) loadFont({ family, weight, url: staticFile(`fonts/${file}`) });
};

/**
 * 全片统一舞台：产品底色 + 左上一片柔光 + 右下一点主色环境光 + 极淡点阵（颜色全部来自 tokens.json 的 stage）。
 * 不要在段落里另造背景；需要换气氛时只调 `glow`（0..1）或在舞台上放内容。
 */
export const Stage: React.FC<{ glow?: number; grid?: number }> = ({ glow = 1, grid = 1 }) => {
  const s = T.stage;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: F.sans, color: C.ink }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1500px 900px at 14% -6%, rgba(${s.lightA},${s.lightAOpacity * glow}) 0%, rgba(${s.lightA},0) 62%),
            radial-gradient(1300px 820px at 104% 108%, rgba(${s.lightB},${s.lightBOpacity * glow}) 0%, rgba(${s.lightB},0) 62%),
            linear-gradient(180deg, ${s.top} 0%, ${s.bottom} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.55 * grid,
          backgroundImage: `radial-gradient(circle, rgba(${s.dot},${s.dotOpacity}) 1.05px, transparent 1.35px)`,
          backgroundSize: '30px 30px',
          backgroundPosition: '15px 15px',
          WebkitMaskImage: 'radial-gradient(1100px 700px at 50% 45%, rgba(0,0,0,.55) 0%, rgba(0,0,0,.18) 55%, rgba(0,0,0,0) 85%)',
          maskImage: 'radial-gradient(1100px 700px at 50% 45%, rgba(0,0,0,.55) 0%, rgba(0,0,0,.18) 55%, rgba(0,0,0,0) 85%)',
        }}
      />
    </AbsoluteFill>
  );
};
