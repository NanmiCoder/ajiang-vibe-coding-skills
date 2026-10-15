/* 主题库演示：只有内容，没有版式。每套模板用自己的 layouts.js 把同一份内容排成完全不同的 B-roll。
   内容取自 414 期中部（OiiOii 三个功能），图片路径相对 __BASE__。 */
var DEMO = {
  key: 'demo', label: 'OIIOII · 414 / 中部', dur: 12,
  cues: [[0, '我们用 OiiOii 做了三件事'], [4, '刚刚的这 5 秒就是片段重拍'], [8, '整体的完成度相当可以了']],
  scenes: [
    { name: '三个功能', from: 0, to: 4, use: 'list', data: {
        kick: 'OiiOii · 三个功能', title: '一条视频，三次进化', hl: '三次进化',
        items: [{ name: '爆款复刻', img: 'st/a02_6.5.jpg', tag: '0–14s' }, { name: '智能续写', img: 'st/b03_22.5.jpg', tag: '+10s' }, { name: '片段重拍', img: 'st/c04_24.jpg', tag: '最后 5s' }],
        aside: { label: '时长', value: 25, suffix: 's' } } },
    { name: '片段重拍', from: 4, to: 8, use: 'focus', data: {
        kick: 'Segment Reshoot · 20.1s – 25.1s', title: '只重拍最后 5 秒', hl: '5 秒',
        img: 'st/c04_25.jpg', range: { from: 20.1, to: 25.1, total: 25.1 },
        checks: ['画面', '运镜', '符合提示词设定'], stamp: { text: '符合设定', sub: 'PROMPT ✓' } } },
    { name: '完成度', from: 8, to: 12, use: 'metric', data: {
        kick: '整体完成度', value: 88, suffix: '%', caption: '提示词写什么，画面就是什么', hl: '画面就是什么',
        img: 'st/sk_c04_25.jpg', note: '相当可以了！', logo: 'oi/logo.svg' } }
  ]
};
