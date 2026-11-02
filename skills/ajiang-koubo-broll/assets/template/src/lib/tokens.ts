// 设计 tokens —— 全部来自「本期产品」自己的设计系统：src/data/tokens.json（<skill>/scripts/extract_tokens.py 抽取，主控校对）。
// 全片只用这一套：一个强调色 accent；good / bad / warn 只表示结论语义（本期在 BRIEF 第 1 节定义），不当装饰色。
// 段落代码一律用 C.* / SH.* / R.*，不写死任何颜色（换成深色产品时写死的颜色会出事）。
import T from '../data/tokens.json';
import META from '../data/meta.json';

export const C = T.color;
export const DARK = T.dark;

export const F = { sans: T.font.sans, mono: T.font.mono } as const;

/** '#345DE3' + 0.1 → 'rgba(52,93,227,0.1)' */
export const alpha = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// 阴影：带产品主色相的柔阴影，层次 = 接触影 + 中景 + 远景（深色产品把 shadowTint 设成 0,0,0）
const st = T.shadowTint;
export const SH = {
  sm: `0 1px 2px rgba(20,28,45,.06), 0 4px 12px -4px rgba(20,28,45,.10)`,
  md: `0 1px 2px rgba(20,28,45,.06), 0 10px 28px -10px rgba(20,28,45,.16), 0 30px 60px -30px rgba(${st},.18)`,
  lg: `0 1px 3px rgba(20,28,45,.08), 0 18px 44px -14px rgba(20,28,45,.20), 0 60px 120px -40px rgba(${st},.28)`,
  win: `0 0 0 1px rgba(20,28,45,.08), 0 2px 4px rgba(20,28,45,.05), 0 24px 60px -18px rgba(20,28,45,.22), 0 80px 160px -60px rgba(${st},.30)`,
} as const;

export const R = { ...T.radius, pill: 999 } as const;

// 画面安全区（1920×1080 设计坐标，src/data/meta.json 的 safe；用户换了头像/字幕位置就改那里，QA 拼图的红框跟着变）。
// 要读的文字不进这两块；窗口和背景可以延伸过去。
type Box = { x: number; y: number; w: number; h: number };
export const SAFE = (META as unknown as { safe: { avatar: Box; subtitle: Box; textBottom: number } }).safe;

export const W = 1920;
export const H = 1080;
