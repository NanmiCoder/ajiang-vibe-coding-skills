import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
// @ts-expect-error engine.js 由 scripts/build_broll.py 生成：broll-core + 场景代码 + 主题，和预览页同一份
import {createBroll, BG, VARS, FONT_PROBES} from './engine.js';
import {CSS} from './style';
import type {SegProps} from '../segments/index';

// 不要手改：成片画面全部来自 broll/scenes.js，改完跑 python3 <skill>/scripts/build_broll.py <工程> --remotion
const BASE = staticFile('broll/');

type Engine = {render: (t: number) => void; ready: () => Promise<unknown>};

// 字体只等一次（每个渲染标签页一次）。FONT_PROBES 来自主题的 fonts。
let fontsReady: Promise<void> | null = null;
const waitFonts = () => {
  if (!fontsReady) {
    fontsReady = Promise.all((FONT_PROBES as string[]).map((f) => document.fonts.load(f, '画面字体ABCabc012'))).then(() => document.fonts.ready).then(() => undefined);
  }
  return fontsReady;
};

export const makeBroll = (segKey: string, mixFile = `mix-${segKey}.wav`): React.FC<SegProps> => {
  const Comp: React.FC<SegProps> = ({voice}) => {
    const frame = useCurrentFrame();
    const {fps, width} = useVideoConfig();
    const stageRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const css = useMemo(() => (CSS as string).split('__BASE__').join(BASE), []);

    useLayoutEffect(() => {
      const h = delayRender(`broll-${segKey}-${frame}`);
      if (!engineRef.current && stageRef.current) {
        stageRef.current.style.cssText += VARS as string;
        engineRef.current = createBroll(stageRef.current, segKey, BASE) as Engine;
      }
      const eng = engineRef.current!;
      eng.render(frame / fps);
      waitFonts()
        .then(() => eng.ready())
        .then(() => continueRender(h))
        .catch(() => continueRender(h));
    }, [frame, fps]);

    return (
      <AbsoluteFill style={{backgroundColor: BG as string}}>
        <style>{css}</style>
        <div className="th-root" style={{position: 'absolute', inset: 0}}>
          <div ref={stageRef} className="stage" style={{transform: `scale(${width / 1920})`}} />
        </div>
        <Audio src={staticFile(`audio/${mixFile}`)} />
        {voice ? <Audio src={staticFile(`footage/${segKey}.wav`)} /> : null}
      </AbsoluteFill>
    );
  };
  return Comp;
};
