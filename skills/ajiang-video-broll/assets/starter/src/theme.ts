// 主题：预览页确认后，把配色和品牌填到这里。所有组件只从这里取色。
import data from './segments.json';

// 设计画布固定 3840×2160（所有组件坐标按 4K 写）。母版不是 4K 时，
// 渲染脚本用 scale = 母版宽 / 3840 输出到母版分辨率。
export const W = 3840;
export const H = 2160;
export const FPS = data.fps;
export const OUTPUT_SCALE = data.width / 3840;

// 中性底色：暖石墨。不要用纯黑。
export const ink = {
  950: '#0D0C0B',
  900: '#151413',
  800: '#1D1C1A',
  700: '#272523',
  600: '#3B3835',
  400: '#6E6A64',
  300: '#9C978F',
  200: '#D6D1C8',
  50: '#F3F0EA',
};

type Accent = {grad: string; 300: string; 500: string; rgb: string; tint: string};
const accent = (from: string, to: string, c300: string, c500: string, rgb: string): Accent => ({
  grad: `linear-gradient(100deg, ${from} 0%, ${to} 100%)`,
  300: c300,
  500: c500,
  rgb,
  tint: `rgba(${rgb},0.14)`,
});

// 主色 A（单主题时只用 A；对比类视频 A = 左边一方）
export const A = accent('#E2167E', '#FE603C', '#F8907F', '#F2475F', '242,71,95');
// 对比色 B（对比类视频的右边一方；单主题视频可以设成与 A 同色系的冷色辅助）
export const B = accent('#4D6BFE', '#5873F5', '#93A6FF', '#5873F5', '88,115,245');

export const signal = {
  pass: '#9DBE8F',
  passTint: 'rgba(157,190,143,0.16)',
  warn: '#E3A945',
  warnTint: 'rgba(227,169,69,0.15)',
};

export const line = 'rgba(243,240,234,0.10)';
export const line2 = 'rgba(243,240,234,0.18)';

/**
 * 品牌：只在走 TSX 组件路线（对比类、强定制段落）时填。L/R 对应 A/B，mark 是 public/brand/ 下的文件名。
 * 推荐的 broll 路线不读这里：配色、字体、动效、声音都来自 assets/themes/<id>/theme.json（init_project.py --theme）。
 */
export const brands = {
  L: {maker: '', name: '', short: '', mark: ''},
  R: {maker: '', name: '', short: '', mark: ''},
} as const;
export type Side = keyof typeof brands;
export const sideAccent = (s: Side) => (s === 'L' ? A : B);

/** 顶部导航左侧的节目标题（等宽大写） */
export const showTitle = '';

/**
 * 头像和字幕只是后期叠在画面上的两个小东西，版面照常铺满，只避开它们本身。
 * 数值是 414 期从粗剪截帧实测的（4K 坐标 = 1920 坐标 ×2）；换期先截一帧重新量。
 * - avatar：右上头像圆（1920：x1523–1858, y55–395）
 * - subtitle：底部那一行字幕（1920：x410–1510, y905–965）
 * - content：内容框（1920：x90–1830, y110–920）
 */
export const safe = {
  avatar: {cx: 3381, cy: 450, r: 340},
  subtitle: {left: 820, right: 3020, top: 1810, bottom: 1930},
  content: {left: 180, top: 220, right: 3660, bottom: 1840},
};

export const font = {
  cn: '"Noto Sans SC"',
  sans: '"Geist", "Noto Sans SC"',
  mono: '"Geist Mono", "Noto Sans SC"',
  serif: '"Instrument Serif", "Noto Sans SC"',
};
