import React from 'react';
import { AbsoluteFill, Audio, Sequence, getInputProps, staticFile } from 'remotion';
import { Stage, ensureFonts } from './Stage';
import { FPS, SegKey } from './time';
import { C, F, SAFE } from './tokens';
import MIX_JSON from '../data/mix.json';

/**
 * 语义音效。段落文件只写 {t, k, v?}，具体音源由总控统一配（public/sfx/<k>.wav），全片同一套音色。
 *  whoosh  镜头推拉 / 大转场（柔和气流）     swish  元素滑入、横推
 *  click   鼠标点击                           type   打字（一段，按字数自动铺）
 *  pop     胶囊/卡片落位（轻）                tick   计数、逐项出现（很轻）
 *  chime   结论出现（正向/中性的提示）        alert  “不一致/掉包”结论（低沉一点，不刺耳）
 *  paper   卡片翻面 / 纸张                    shutter 截图/报告生成
 * v 音量 0..1（默认按类型给），dur 只对 type 有效（打字持续秒数）。
 */
export type SfxKind = 'whoosh' | 'swish' | 'click' | 'type' | 'pop' | 'tick' | 'chime' | 'alert' | 'paper' | 'shutter';
export type Sfx = { t: number; k: SfxKind; v?: number; dur?: number };

// 音量参数全部在 src/data/mix.json（总控管，章节 agent 不改）：
//   sfxGain 全片音效总增益 · trim 按段再乘（音效密的段压低）· base 各类默认音量 · pre 音源峰值滞后（秒，提前播放让峰落在事件上）
// 改 mix.json 只影响音轨：跑 node scripts/reaudio.mjs [segN]，不用重渲画面。目标：配乐+音效比口播低约 16 LU、真峰值 ≤ -14 dBTP。
const MIX = MIX_JSON as unknown as { sfxGain: number; trim: Record<string, number>; base: Record<SfxKind, number>; pre: Record<SfxKind, number> };
const BASE_V = MIX.base;
const PRE = MIX.pre;

export const SfxTrack: React.FC<{ events: Sfx[]; gain?: number }> = ({ events, gain = 1 }) => (
  <>
    {events.map((e, i) =>
      e.k === 'type' ? (
        <Sequence key={i} from={Math.round(e.t * FPS)} durationInFrames={Math.max(1, Math.round((e.dur ?? 1) * FPS))}>
          <Audio src={staticFile('sfx/type.wav')} volume={(e.v ?? BASE_V.type) * gain} loop />
        </Sequence>
      ) : (
        <Sequence key={i} from={Math.max(0, Math.round((e.t - PRE[e.k]) * FPS))}>
          <Audio src={staticFile(`sfx/${e.k}.wav`)} volume={(e.v ?? BASE_V[e.k]) * gain} />
        </Sequence>
      ),
    )}
  </>
);

/** QA 用：画出头像和字幕安全区（只在 inputProps.guides 时显示，成片不显示） */
const Guides = () => (
  <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 999 }}>
    <div style={{ position: 'absolute', left: SAFE.avatar.x, top: SAFE.avatar.y, width: SAFE.avatar.w, height: SAFE.avatar.h, borderRadius: '50%', border: '3px dashed rgba(220,40,40,.8)', background: 'rgba(220,40,40,.08)' }} />
    <div style={{ position: 'absolute', left: SAFE.subtitle.x, top: SAFE.subtitle.y, width: SAFE.subtitle.w, height: SAFE.subtitle.h, border: '3px dashed rgba(220,40,40,.8)', background: 'rgba(220,40,40,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 30, color: 'rgba(160,30,30,.85)' }}>字幕区</div>
  </AbsoluteFill>
);

/**
 * 每段的外壳：统一舞台 + 段落内容 + 音效 + 配乐。
 * inputProps：{audio?:boolean(默认 true，QA 静帧时关), voice?:boolean(预览时叠口播), guides?:boolean}
 */

export const makeSeg = (key: SegKey, Content: React.FC, sfx: Sfx[] = []) => {
  const Comp: React.FC = () => {
    ensureFonts();
    const ip = getInputProps() as { audio?: boolean; voice?: boolean; guides?: boolean; bgm?: boolean };
    const audio = ip.audio !== false;
    return (
      <AbsoluteFill style={{ background: C.bg, fontFamily: F.sans, color: C.ink, overflow: 'hidden' }}>
        <Stage />
        <Content />
        {audio && <SfxTrack events={sfx} gain={MIX.sfxGain * (MIX.trim?.[key] ?? 1)} />}
        {audio && ip.bgm !== false && <Audio src={staticFile(`audio/bgm-${key}.wav`)} />}
        {audio && ip.voice && <Audio src={staticFile(`audio/voice-${key}.wav`)} />}
        {ip.guides && <Guides />}
      </AbsoluteFill>
    );
  };
  return Comp;
};
