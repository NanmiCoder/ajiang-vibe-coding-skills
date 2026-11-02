// seg3 共享：窗口几何、页面坐标 → 舞台坐标、口播时间锚。
import { CamMove, say, sayEnd } from '../../lib';

// 全段统一的浏览器窗口（B / C 两个页面镜头同一套几何，横推时像在同一块屏幕上换页）
export const WIN = { x: 170, y: 70, w: 1580, h: 1070 } as const;
export const PW = 1585; // 页面 CSS 宽
export const K = WIN.w / PW; // 页面 CSS px → 舞台 px
export const BAR = 44;

/** 页面坐标（含滚动）→ 舞台坐标 */
export const pg = (px: number, py: number, scroll = 0) => ({ x: WIN.x + px * K, y: WIN.y + BAR + (py - scroll) * K });

/** 镜头对准页面某点（scroll 为镜头到位时的页面滚动） */
export const camOn = (t: number, px: number, py: number, z: number, scroll = 0, d?: number): CamMove => {
  const p = pg(px, py, scroll);
  return { t, x: p.x, y: p.y, z, d };
};

const s = (w: string, off = 0, nth = 0) => say('seg3', w, off, nth);
const se = (w: string, off = 0, nth = 0) => sayEnd('seg3', w, off, nth);

// 口播锚点（段内秒）
export const T = {
  // ① 开源整合
  open: s('开源社区'),
  two: s('两个开源项目'),
  merge: s('整合到了一起'),
  thanks: s('非常感谢'),
  // ② 覆盖
  cover: s('目前一共'),
  n14: s('14个模型'),
  n64: s('64个'),
  claude: s('Claude'),
  gpt: s('GPT'),
  gemini: s('Gemini'),
  grok: s('Grok'),
  cn: s('国产'),
  zhuli: s('主力模型'),
  all: s('全都能'),
  compare: s('直接去对比'),
  compareEnd: se('直接去对比'),
  // ③ 上线
  live: s('那这个功能'),
  online: s('正式上线'),
  here: s('就在这个地方'),
  free: s('免费'),
  openTest: s('打开就能测试'),
  // ④ 操作
  simple: s('那整个操作'),
  relay: s('中转站'),
  api: s('API地址'),
  key: s('Key'),
  pick: s('点击选一个'),
  model: s('待测的这个型号'),
  start: s('点击开始'),
  startEnd: se('点击开始就行了'),
  // ⑤ ChatGPT / Codex / Luna
  ifUse: s('那如果平时'),
  chatgpt: s('ChatGPT网页版'),
  codex: s('Codex', 0, 0),
  fear: s('特别怕降智'),
  luna5: s('GPT-5的Luna'),
  luna6: s('6的Luna'),
  // ⑥ 手动检测
  switchTo: s('你也可以切换'),
  manual: s('手动检测模式'),
  copy: s('提示词复制'),
  copyWord: s('复制一下'),
  paste: s('粘回'),
  codex2: s('Codex', 0, 1),
  web: s('或者网页'),
  fill: s('把回答的答案'),
  same: s('一样对比'),
  end: 53.35,
};
