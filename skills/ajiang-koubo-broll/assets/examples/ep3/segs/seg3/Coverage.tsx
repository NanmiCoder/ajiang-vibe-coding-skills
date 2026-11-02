import React from 'react';
import { C, Cam, Count, Cutout, E, F, Pointer, Pop, Ring, SH, Window, rise, tw, useSec } from '../../lib';
import { K, T, WIN, camOn } from './geo';

// 镜头 B · 14 个系列 / 64 个型号：真实检测页的 logo 行 → 「已收录的模型」弹窗
// 页面坐标 = det-api.jpg 的 CSS px（像素 / 2），用 scripts/grid.py 量过。

type Box = [number, number, number, number]; // x, y, w, h（页面 CSS px）
const CHIP: Record<string, Box> = {
  Claude: [181, 405, 99, 41], GPT: [299, 405, 86, 41], Gemini: [391, 405, 104, 41], DeepSeek: [509, 405, 119, 41],
  Grok: [643, 405, 72, 41], Qwen: [744, 405, 87, 41], GLM: [846, 405, 88, 41], Kimi: [945, 405, 80, 41],
  MiniMax: [1043, 405, 110, 41], MiMo: [1167, 405, 88, 41], Seed: [1273, 405, 88, 41],
  Step: [181, 455, 90, 41], Hunyuan: [283, 455, 111, 41], Muse: [403, 455, 96, 41],
};

// 「已收录的模型」弹窗：从 det-allmodels.jpg（视口截图，同为 scroll 0）抠出弹窗本体，按真实位置弹出
const MODAL = { sx: 806, sy: 50, sw: 1558, sh: 1902, x: 403, y: 25 };

const Modal: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useSec();
  if (t < t0) return null;
  const p = tw(t, t0, 0.42, E.out);
  const dim = tw(t, t0, 0.3, E.out);
  return (
    <>
      <div style={{ position: 'absolute', left: -40, top: -40, width: 1700, height: 1400, background: `rgba(18,22,30,${0.3 * dim})` }} />
      <div style={{ position: 'absolute', left: MODAL.x, top: MODAL.y, opacity: p, transform: `translateY(${(1 - p) * 14}px) scale(${0.965 + 0.035 * p})`, transformOrigin: '50% 30%', borderRadius: 20, boxShadow: '0 30px 80px -20px rgba(15,20,35,.45), 0 8px 24px -8px rgba(15,20,35,.25)' }}>
        <Cutout src="st/det-allmodels.jpg" sx={MODAL.sx} sy={MODAL.sy} sw={MODAL.sw} sh={MODAL.sh} w={MODAL.sw / 2} radius={20} />
      </div>
    </>
  );
};

/** 页面里的统计强调卡：把「14 个模型系列 · 64 个型号」这行小字抬成大字 */
const StatCard: React.FC<{ t0: number; t1: number }> = ({ t0, t1 }) => {
  const t = useSec();
  if (t < t0 - 0.05 || t > t1 + 0.5) return null;
  const n = (v: number) => String(Math.round(v));
  return (
    <div style={{ position: 'absolute', left: 452, top: 286, ...rise(t, t0, { t1, dy: 14, dur: 0.55 }) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '10px 26px 10px 22px', borderRadius: 18, background: '#fff', border: `1px solid ${C.line}`, boxShadow: SH.md, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 46, fontWeight: 650, color: C.accent, letterSpacing: -1.5, minWidth: 54, textAlign: 'right' }}><Count to={14} t0={T.n14 - 0.1} dur={0.9} fmt={n} /></span>
          <span style={{ fontSize: 22, color: C.ink2, fontWeight: 500 }}>个模型系列</span>
        </div>
        <div style={{ width: 1, height: 34, background: C.line }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 46, fontWeight: 650, color: C.accent, letterSpacing: -1.5, minWidth: 54, textAlign: 'right' }}><Count to={64} t0={T.n64 - 0.1} dur={1.0} fmt={n} /></span>
          <span style={{ fontSize: 22, color: C.ink2, fontWeight: 500 }}>个具体型号</span>
        </div>
      </div>
    </div>
  );
};

const ChipRing: React.FC<{ id: string; t0: number; t1: number }> = ({ id, t0, t1 }) => {
  const [x, y, w, h] = CHIP[id];
  return <Ring x={x} y={y} w={w} h={h} r={21} pad={4} width={2.5} t0={t0} t1={t1} />;
};

export const Coverage: React.FC = () => {
  const t = useSec();
  const tModal = T.all + 0.3; // 「全都能在我们这个 ModelDial 上面……」弹窗打开
  const intl = [['Claude', T.claude], ['GPT', T.gpt], ['Gemini', T.gemini], ['Grok', T.grok]] as const;
  // 国产主力：错峰越来越快
  const cnIds = ['DeepSeek', 'Qwen', 'GLM', 'Kimi', 'MiniMax'];
  const cnT = [0, 0.2, 0.36, 0.48, 0.57].map((d) => T.cn + 0.05 + d);
  const moves = [
    camOn(5.7, 790, 470, 1.0),
    camOn(T.cover + 0.15, 800, 400, 1.42, 0, 1.2), // 推到「指纹库覆盖」+ logo 行
    camOn(T.claude - 0.45, 512, 390, 1.95, 0, 1.1), // 国外四家（取景让开头像圆：内容整体往左下让 ~70px）
    camOn(T.cn - 0.1, 935, 390, 1.95, 0, 1.15), // 平移到国产主力
    camOn(T.all - 0.35, 820, 430, 1.2, 0, 1.1), // 拉回，准备点「查看全部型号」
    camOn(tModal + 1.0, 792, 468, 1.25, 0, 1.15), // 推进弹窗：标题 + 系列 + 型号列表
  ];
  void t;
  return (
    <Cam moves={moves}>
      <Window {...WIN} src="st/det-api.jpg" scroll={0}>
        <Ring x={258} y={360} w={160} h={26} r={8} pad={6} t0={T.cover + 0.6} t1={T.claude - 0.5} />
        <StatCard t0={T.n14 - 0.25} t1={T.claude - 0.55} />
        {intl.map(([id, at]) => <ChipRing key={id} id={id} t0={at - 0.08} t1={T.cn + 0.02} />)}
        {cnIds.map((id, i) => <ChipRing key={id} id={id} t0={cnT[i]} t1={T.all - 0.3} />)}
        <Pop x={509} y={344} t0={T.zhuli - 0.15} t1={T.all - 0.3} origin="0% 100%">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 999, background: C.accent, color: '#fff', fontSize: 17, fontWeight: 600, boxShadow: '0 4px 12px -4px rgba(52,93,227,.5)', whiteSpace: 'nowrap' }}>
            国产主力模型
          </div>
        </Pop>
        <Ring x={1336} y={362} w={82} h={22} r={6} pad={6} t0={T.all - 0.05} t1={tModal} />
        <Modal t0={tModal} />
        <Ring x={426} y={318} w={78} h={24} r={6} pad={6} t0={tModal + 0.75} />
        <Pointer scale={1 / K} keys={[{ t: T.all - 0.6, x: 1240, y: 600 }, { t: tModal - 0.08, x: 1372, y: 375, click: true }]} hideAt={tModal + 0.45} />
      </Window>
    </Cam>
  );
};

void F;
