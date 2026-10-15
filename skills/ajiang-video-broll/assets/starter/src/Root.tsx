import React from 'react';
import {AbsoluteFill, Composition, OffthreadVideo, Sequence, staticFile} from 'remotion';
import './fonts';
import {MASTER_FRAMES, segments} from './segments';
import {registry, SegProps} from './segments/index';
import {Placeholder} from './segments/Placeholder';
import {FPS, H, W} from './theme';

// 每段一个 Composition，id = segments.json 里的 key。
// voice=true（默认）时垫母版同区间口播，方便在 Studio 对口型；渲染成片时脚本传 voice=false。
const compFor = (key: string): React.FC<SegProps> => registry[key] ?? ((p) => <Placeholder segKey={key} {...p} />);

/** 整条母版代理片里把各段替换成包装页，只用于 Studio 预览（需要 public/footage/master-proxy.mp4） */
const Full: React.FC = () => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile('footage/master-proxy.mp4')} style={{width: W, height: H}} />
    {segments.map((s) => {
      const C = compFor(s.key);
      return (
        <Sequence key={s.key} from={s.from} durationInFrames={s.frames} name={s.title} premountFor={FPS}>
          <C voice={false} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    {segments.map((s) => (
      <Composition key={s.key} id={s.key} component={compFor(s.key)} durationInFrames={s.frames} fps={FPS} width={W} height={H} defaultProps={{voice: true}} />
    ))}
    <Composition id="Full" component={Full} durationInFrames={MASTER_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
