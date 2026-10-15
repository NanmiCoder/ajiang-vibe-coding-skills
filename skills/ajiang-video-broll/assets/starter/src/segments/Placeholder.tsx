import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Chrome, Stage} from '../components/stage';
import {segments, seg} from '../segments';
import {font, ink} from '../theme';

/** 还没写的段：显示段名、区间和当前正在说的字幕，方便先对时间。 */
export const Placeholder: React.FC<{segKey: string; voice?: boolean}> = ({segKey, voice}) => {
  const f = useCurrentFrame();
  const s = seg(segKey);
  const now = [...s.cues].reverse().find((c) => c.at <= f);
  return (
    <Stage voiceKey={voice ? segKey : undefined}>
      <Chrome index={segments.indexOf(s)} />
      <div style={{position: 'absolute', left: 220, top: 600, fontFamily: font.cn, color: ink[50]}}>
        <div style={{fontFamily: font.mono, fontSize: 48, color: ink[300]}}>
          {s.key} · {s.srt[0]} → {s.srt[1]} · f{f}/{s.frames}
        </div>
        <div style={{fontWeight: 900, fontSize: 200, marginTop: 30}}>{s.title}</div>
        <div style={{fontSize: 72, color: ink[200], marginTop: 60, maxWidth: 2600}}>{now ? `#${now.n} ${now.text}` : ''}</div>
      </div>
    </Stage>
  );
};
