/* 压力内容：检查模板在“非演示”内容下是否还好看（qa.py --stress 用）。
   0–4 hero（长标题 + 副标题 + 图）；4–8 list 5 个长条目；8–12 list 2 个条目无 aside；
   12–16 focus 只有 1 条 check、无 stamp、无 range；16–20 focus 用 clip 不用 img、4 条 check；20–24 metric 大数 1240 无图无注无 logo。 */
var DEMO = {
  key: 'stress', label: 'OIIOII · 压力测试', dur: 24,
  cues: [[0, '开场'], [4, '五个条目'], [8, '两个条目'], [12, '一条检查'], [16, '四条检查'], [20, '大数字']],
  scenes: [
    { name: 'hero', from: 0, to: 4, use: 'hero', data: { kick: 'Episode 414 · AI 视频工作流', title: '把一条爆款视频拆开再拼回去', hl: '拆开再拼回去', sub: '从拉片、复刻到续写，全程只用一个工具', img: 'st/b03_22.5.jpg' } },
    { name: 'list5', from: 4, to: 8, use: 'list', data: { kick: '五个步骤', title: '从拉片到成片的完整流程', hl: '完整流程',
        items: [{ name: '拉片拆解镜头', img: 'st/a02_6.5.jpg', tag: '01' }, { name: '提示词逐段改写', img: 'st/b03_22.5.jpg', tag: '02' }, { name: '换道具换场景', img: 'st/c04_24.jpg', tag: '03' },
                { name: '续写十秒反转', img: 'st/c04_25.jpg', tag: '04' }, { name: '片段重拍收尾', img: 'st/sk_c04_25.jpg', tag: '05' }],
        aside: { label: '总耗时', value: 47, suffix: '分钟' } } },
    { name: 'list2', from: 8, to: 12, use: 'list', data: { kick: '对比', title: '原片和复刻', hl: '复刻',
        items: [{ name: '原片', img: 'st/a02_6.5.jpg' }, { name: '复刻', img: 'st/c04_24.jpg' }] } },
    { name: 'focus1', from: 12, to: 16, use: 'focus', data: { kick: 'Prompt', title: '提示词决定了镜头怎么走', hl: '镜头怎么走', img: 'st/b03_22.5.jpg', checks: ['运镜'] } },
    { name: 'focus4', from: 16, to: 20, use: 'focus', data: { kick: 'Review', title: '续写后的四项检查', hl: '四项检查', img: 'st/c04_25.jpg',
        range: { from: 14, to: 25.1, total: 25.1 }, checks: ['画面一致', '运镜连贯', '角色不崩', '符合设定'], stamp: { text: '通过', sub: '4 / 4' } } },
    { name: 'metric', from: 20, to: 24, use: 'metric', data: { kick: '提示词总字数', value: 1240, suffix: '字', caption: '一段提示词撑起二十五秒', hl: '二十五秒' } }
  ]
};
