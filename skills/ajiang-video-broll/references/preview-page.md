# 预览页：和成片同一套引擎，发成 claude.ai Artifact

这是整个流程里唯一一个停下来等确认的点。用户原话：“视觉这一块先找我确认，我们做一个 claude.ai 的那种视觉资产给我去选择……不要着急去做视频渲染”。

## 主题从哪里来

按顺序：
1. 用户在主题库 Artifact 里存过选择（`ArtifactData get collection=picks doc_id=current`）→ 用它，备注里的修改要落实。
2. 同一期视频的前几段已经做过 → 沿用（`init_project.py --from`），不用再选。
3. 都没有 → 从选题推 2–3 套候选（见 [themes](themes.md) 的“适合”列），先用候选主题各做**同一个场景**，放进预览让用户挑。只换配色不算“不同风格”。
4. 用户要全新风格 → 复制最接近的主题目录改，改完加进主题库。

不要用石墨粉橙当默认；不要紫色 AI 风、霓虹外发光、大面积渐变字。

## 写 `broll/scenes.js`

**优先只写内容，版式交给模板。** 每套模板在 `themes/<id>/layouts.js` 里实现四种版式，各自有完全不同的构图和动效编排（用户原话：“每一套的 broll 都不一样”）：

| use | data 字段 | 用在 |
|---|---|---|
| `hero` | kick, title, hl, sub, img | 开场 / 大标题页 |
| `list` | kick, title, hl, items:[{name, img, tag}]（2–5 个）, aside:{label, value, suffix} | 并列功能、步骤、案例 |
| `focus` | kick, title, hl, img 或 clip:{name, off, in}, range:{from, to, total}, checks:[…], stamp:{text, sub} | 聚焦一个画面 + 结论 |
| `metric` | kick, value, suffix, caption, hl, img, note, logo | 一个大数字结论 |

```js
{ name: '三个功能', cue: '我们用 OiiOii', use: 'list', data: { kick: 'OiiOii · 三个功能', title: '一条视频，三次进化', hl: '三次进化',
    items: [{name: '爆款复刻', img: 'st/a02.jpg'}, …], aside: {label: '时长', value: 25, suffix: 's'} } }
```

换模板（`build_broll.py --theme <id>`）后同一份 scenes.js 会变成另一支片子，音效时间也跟着模板走。四种版式装不下的页面，再用下面的 `build()` 手写（手写页要用 `@title/@card…` 角色和变量配色，换模板时才不会坏）。

### 手写场景

```js
var H = BrollCore.H, A = H.A, pos = H.pos, box = H.box;
var SEGS = {
  seg0: { label: 'SHEET M1 · 复刻总结', scenes: [
    { name: '原片 vs 复刻', cue: '整个的这个复刻效果', until: '而且这是我使用',
      sfx: [[0.1, 'enter', .45], [0.6, 'card', .5], [2.9, 'stamp', .5]],
      mood: {energy: .4, drums: false},           // 可选：覆盖这一页的配乐
      build: function () { return H.title('REPLICA / 01', '换了道具，<span class="hl">改了场景</span>', .05, 76) + … },
      update: function (t, el) { … }              // 可选：逐帧命令式动画（滑杆、播放头）
    }, … ] } };
```

- 坐标按 1920×1080 写（成片 ×2）。时间用 `cue` / `until`（字幕原文片段）锚定，也可以写数字 `from` / `to`；第一页自动从 0 开始。场景之间留空会报警告。
- 场景内时间（`data-t`、`sfx`）都是相对这一页开始的秒数。
- 视频：`H.clip('c03', 场景内开始秒, 素材入点秒)`，素材先用 `extract_clips.py` 处理。
- 素材放 `broll/assets/`，场景里写 `__BASE__st/xxx.jpg`，build 会换成预览或 Remotion 的路径。
- **每页一件事，一眼看懂重点**；20 秒以上的段落按口播转折拆 3–6 页。
- **丰富度来自真实内容**：官网截图（ego-browser）、作品墙、真实数字、用户自己的 AI 片段（看最后几帧选能用的）。还没生成的内容先放铅笔分镜（`sketchify.py`），口播讲到成片时换成彩色原片。
- 示意性的画面（滑杆、进度条、时钟、完成度百分比）要在预览页 notes 里标出来。

字号下限（1920 坐标）：主标题 72–160px；卡片标题 38–50px；正文 28–36px；标签 15–17px（等宽字）。同一页大字最多 1–2 处。

## 生成和发布

```sh
python3 <skill>/scripts/fetch_fonts.py <工程>
python3 <skill>/scripts/build_broll.py <工程> --preview [--title … --lead … --notes notes.html]
```

产出 `preview/index.html` + `preview/files.json`。预览页自带：段落页签、主题和变体切换、和口播 mp3 同步播放和拖动、场景卡点列表（点击跳转）、“叠上头像和字幕看看”开关（读 `broll/overlay.json` 的实测位置）、`#s=段号&t=秒` 定位。

**自检**（发布前一次）：本地 `python3 -m http.server <新端口>`，测试副本文件头加 `<meta charset="utf-8">`，headless Chrome 按 `#s=&t=` 批量截每页落定后的画面，拼图看一遍：
- 有没有文字压进头像圆或字幕行；
- 文字溢出、换行、重叠；
- 空白太多或太挤，底边是否超过 920；
- 第一帧和最后一帧。

**发布**：Artifact `file_path=<工程>/preview/index.html`，`root=<工程>/preview`，`files` 用 `files.json` 里的列表。改了就重发同一个 file_path，链接不变，每版加 `label`（v1、v2 …）。

## 给用户的话

链接 + 三五行：段落和区间（为什么这样切）、每段的画面思路、哪些是真实素材 / 哪些是示意、声音是否已经能试听。请他确认段落、画面和文案。

## 用户确认后

直接一路做到交付（见 [Remotion 制作](remotion-build.md)），不再回头写方案。用户在成片阶段提的修改，改 `scenes.js` 后预览和成片同时更新。
