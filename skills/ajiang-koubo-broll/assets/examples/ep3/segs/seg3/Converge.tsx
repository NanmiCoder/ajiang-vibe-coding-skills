import React from 'react';
import { C, Cam, E, F, Headline, Kicker, Logo, SH, Wordmark, clamp, lerp, tw, useSec } from '../../lib';
import { T } from './geo';

// 镜头 A · 两个开源项目汇入 ModelDial（主角卡 bezier-source-converge-merge，浅色重新蒙皮）
// 语法照搬：曲线错峰 draw-on → 来源沿自己的曲线滑向汇聚点、三段式加速缩小（像被吸进去）
// → 强调色数据包全程沿路径滑行（整数周期）→ 吞并瞬间汇聚点一次接收脉冲 + 一圈涟漪
// → 曲线从起点反向擦除 → 相机平移把汇聚点收到画面正中，致谢字幕落下。

const XC = 1540, YC = 610; // 汇聚卡中心
const X0 = 472; // 来源卡中心
const XS = 866; // 直线段终点（之后弯向汇聚点）
const SRCS = [
  { y: 440, owner: 'Ikaleio', repo: 'lm-detector' },
  { y: 780, owner: 'xqy2006', repo: 'ModelTrace' },
];
const CW = 770, CH = 200; // 来源卡尺寸（×1.3）
const TW = 480, TH = 184; // 汇聚卡尺寸
const XE = XC - TW / 2 + 24; // 曲线终点 = 汇聚卡左缘内侧：来源卡恰好在这里缩到 0（被吸进去）

type P = { x: number; y: number };
const cubic = (y0: number, u: number): P => {
  const v = 1 - u;
  const p0 = { x: XS, y: y0 }, p1 = { x: XS + 200, y: y0 }, p2 = { x: XE - 200, y: YC }, p3 = { x: XE, y: YC };
  return {
    x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
    y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y,
  };
};
// 弧长表（模块级预计算，确定性，无 DOM 依赖）
const N = 600;
const geom = (y0: number) => {
  const lineLen = XS - X0;
  const cum = [0];
  let px = XS, py = y0, acc = 0;
  for (let k = 1; k <= N; k++) {
    const q = cubic(y0, k / N);
    acc += Math.hypot(q.x - px, q.y - py);
    cum.push(acc);
    px = q.x; py = q.y;
  }
  const len = lineLen + acc;
  const at = (f: number): P => {
    const sl = clamp(f) * len;
    if (sl <= lineLen) return { x: X0 + sl, y: y0 };
    const target = sl - lineLen;
    let lo = 0, hi = N;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1; else hi = mid;
    }
    const i = Math.max(1, lo);
    const a = cum[i - 1], b = cum[i];
    return cubic(y0, (i - 1 + (b > a ? (target - a) / (b - a) : 0)) / N);
  };
  return { len, at, d: `M ${X0},${y0} L ${XS},${y0} C ${XS + 200},${y0} ${XE - 200},${YC} ${XE},${YC}`, fEdge: (CW / 2) / len };
};
const GEO = SRCS.map((s) => geom(s.y));

const RepoCard: React.FC<{ owner: string; repo: string }> = ({ owner, repo }) => (
  <div style={{ width: CW, height: CH, boxSizing: 'border-box', padding: '0 42px', display: 'flex', alignItems: 'center', gap: 32, background: 'linear-gradient(180deg,#FFFFFF 0%,#FBFBFC 100%)', borderRadius: 32, border: `1px solid ${C.line}`, boxShadow: SH.md }}>
    <div style={{ width: 100, height: 100, borderRadius: 50, background: C.surface2, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <Logo id="github" size={54} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: F.mono, fontSize: 44, letterSpacing: -0.8, whiteSpace: 'nowrap' }}>
        <span style={{ color: C.muted, fontWeight: 400 }}>{owner} / </span>
        <span style={{ color: C.ink, fontWeight: 600 }}>{repo}</span>
      </div>
      <div style={{ fontSize: 30, color: C.muted, marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 11, height: 11, borderRadius: 6, background: C.accent, display: 'inline-block' }} />
        GitHub 开源项目
      </div>
    </div>
  </div>
);

export const Converge: React.FC = () => {
  const t = useSec();
  // 时间轴（秒）：口播「两个开源项目」1.3–2.9，「整合到了一起」3.0–4.2，「非常感谢他们的开源」4.2–5.5
  const tIn = 0.12;
  const tConv0 = 2.15, tConv1 = T.merge + 0.95; // 汇聚主段（≈2.1s，inOutCubic）
  const conv = tw(t, tConv0, tConv1 - tConv0, E.inOut);
  const tEat = tConv1 - 0.12; // 吞并完成（节点在缩到 0 的那一刻消失）
  const erase = tw(t, tEat + 0.2, 0.55, E.out); // 曲线从起点退走
  const pk0 = 0.75, pk1 = tEat - 0.1;
  const pkCycle = ((clamp((t - pk0) / (pk1 - pk0)) * 2) % 1); // 整数周期（2 圈）
  const pkOn = tw(t, pk0, 0.25) * (1 - tw(t, pk1 - 0.3, 0.3));

  // 汇聚卡：入场 + 吞并瞬间接收脉冲（+6%，回落）
  const bp = tw(t, 0.55, 0.6, E.out);
  const pulse = 1 + 0.06 * tw(t, tEat - 0.1, 0.22, E.back) - 0.06 * tw(t, tEat + 0.12, 0.3, E.out);
  const ripple = tw(t, tEat, 0.75, E.out);

  const moves = [
    { t: 0, x: 960, y: 580, z: 1.0 },
    { t: 0.1, x: 960, y: 580, z: 1.03, d: 4.0 }, // 极慢漂移
    { t: tEat + 0.02, x: XC, y: YC + 52, z: 1.38, d: 1.2 }, // 结尾把汇聚点收到画面正中并推近
  ];

  return (
    <Cam moves={moves}>
      <Kicker text="开源社区 · 指纹库" x={88} y={122} size={27} t0={0.15} t1={tEat - 0.1} />
      <Headline text={'两个优秀的开源项目，*整合到一起*'} x={88} y={172} size={64} t0={0.3} t1={tEat - 0.15} />

      {/* 曲线（灰 → 墨渐变，读出流向） */}
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id="s3-conv-stroke" gradientUnits="userSpaceOnUse" x1={X0} y1={0} x2={XE} y2={0}>
            <stop offset="0" stopColor="#CDD3DD" />
            <stop offset="0.5" stopColor="#A3ABB9" />
            <stop offset="1" stopColor="#5B6473" />
          </linearGradient>
        </defs>
        {SRCS.map((s, i) => {
          const draw = tw(t, 0.35 + i * 0.22, 0.75, E.out);
          const off = erase > 0 ? -erase : 1 - draw;
          return (
            <path key={i} d={GEO[i].d} fill="none" stroke="url(#s3-conv-stroke)" strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={off} opacity={draw * (1 - clamp((erase - 0.85) / 0.15))} />
          );
        })}
      </svg>

      {/* 数据包（带彗尾的品牌蓝小圆，路径中段最亮） */}
      {pkOn > 0.01 &&
        SRCS.map((s, i) => {
          const g = GEO[i];
          const ph = (pkCycle + i * 0.37) % 1;
          const f = lerp(g.fEdge, 1, ph);
          const scNow = conv < 0.75 ? lerp(1, 0.3, conv / 0.75) : lerp(0.3, 0, (conv - 0.75) / 0.25);
          if (f < conv + g.fEdge * scNow * 0.9) return null; // 卡片之前的包被卡片盖住
          const op = pkOn * (1 - Math.abs(ph - 0.5) * 0.7);
          return (
            <React.Fragment key={i}>
              {Array.from({ length: 9 }, (_, j) => 9 - j).map((j) => {
                const q = g.at(f - j * 0.0075);
                const r = 6.5 * (1 - j / 10);
                return <div key={j} style={{ position: 'absolute', left: q.x - r, top: q.y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: C.accent, opacity: op * 0.32 * (1 - j / 10) }} />;
              })}
              {(() => {
                const q = g.at(f);
                return <div style={{ position: 'absolute', left: q.x - 8, top: q.y - 8, width: 16, height: 16, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, #6E8DF0, ${C.accent})`, boxShadow: '0 0 0 3px rgba(52,93,227,.14), 0 2px 5px rgba(52,93,227,.35)', opacity: op }} />;
              })()}
            </React.Fragment>
          );
        })}

      {/* 来源卡：沿自己的曲线滑向汇聚点，三段式缩小（前 75% 慢瘦身、最后 25% 掉光） */}
      {SRCS.map((s, i) => {
        const g = GEO[i];
        const pt = g.at(conv);
        const sc = conv < 0.75 ? lerp(1, 0.3, conv / 0.75) : lerp(0.3, 0, (conv - 0.75) / 0.25);
        const appear = tw(t, tIn + i * 0.12, 0.55, E.back);
        const aop = tw(t, tIn + i * 0.12, 0.25);
        if (sc <= 0.002) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: pt.x - CW / 2, top: pt.y - CH / 2, width: CW, height: CH, opacity: aop, transform: `scale(${sc * (0.86 + 0.14 * appear)})`, transformOrigin: '50% 50%', zIndex: 3 }}>
            <RepoCard owner={s.owner} repo={s.repo} />
          </div>
        );
      })}

      {/* 接收涟漪（只发一次） */}
      {ripple > 0 && ripple < 1 && (
        <div style={{ position: 'absolute', left: XC - TW / 2, top: YC - TH / 2, width: TW, height: TH, borderRadius: 38, border: `2.5px solid ${C.accent}`, boxSizing: 'border-box', opacity: (1 - ripple) * 0.6, transform: `scale(${lerp(1, 1.32, ripple)})`, zIndex: 4 }} />
      )}

      {/* 汇聚点：ModelDial 模型检测（不透明白卡，盖住曲线与数据包的汇入端） */}
      <div style={{ position: 'absolute', left: XC - TW / 2, top: YC - TH / 2, width: TW, height: TH, boxSizing: 'border-box', borderRadius: 38, background: 'linear-gradient(180deg,#FFFFFF 0%,#FAFBFC 100%)', border: `1px solid ${C.line}`, boxShadow: SH.lg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: bp, transform: `scale(${lerp(0.82, 1, bp) * pulse})`, zIndex: 5 }}>
        <Wordmark h={60} />
        <div style={{ fontSize: 30, color: C.muted, letterSpacing: 2 }}>模型检测</div>
      </div>

      {/* 致谢字幕：吞并后落在汇聚点下方 */}
      <Headline text={'感谢 *lm-detector* 与 *ModelTrace* 的开源'} x={XC} y={YC + 122} size={44} weight={500} align="center" w={1200} t0={T.thanks + 0.3} color={C.ink2} />
    </Cam>
  );
};
