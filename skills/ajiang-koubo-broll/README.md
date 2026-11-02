# ajiang-koubo-broll · 口播整片 B-roll

把一期口播做成**从头盖到尾的画面层**：每章一个 16:9 4K MP4，首尾相接正好铺满精剪后的时间线；另交一整条 4K 全片和一条带口播的 1080p 预览。在剪映里把它们拖到口播上方，再叠上头像和字幕就能发。

画面以真实产品为主角：网页截图推近、从产品前端源码移植的真实动画、产品自己的主视觉。主题由产品自己的美术和这期的演出类型决定，例如比赛横评做成电竞转播，功能上手做成 Screen Studio 式演示。主控先亲自做第一章，给你确认一次；认可后每章派一个子 Agent 并行做，经过多轮验收和独立审片，配好乐和音效、打码、排队渲 4K。

完整流程写在 [SKILL.md](SKILL.md)，第三方资源和许可写在 [NOTICE.md](NOTICE.md)。

## 和 ajiang-video-broll 的区别

| | [ajiang-video-broll](https://github.com/NanmiCoder/ajiang-vibe-coding-skills/tree/main/skills/ajiang-video-broll) | ajiang-koubo-broll |
|---|---|---|
| 覆盖范围 | 只包装你选出的几段时间 | 整条时间线，从第一帧盖到最后一帧 |
| 画面从哪来 | 10 套现成模板选一套 | 产品自己的美术、真实页面、移植的产品动画，每期重新定主题 |
| 怎么做 | 一个 Agent 写场景，预览页确认后渲 4K | 主控做第一章 → 你确认一次 → 每章一个子 Agent 并行 → 独立审片 → 排队渲 4K |
| 适合 | 给几段话加包装，想快、想换风格 | 整期都要画面，产品有可截的网页或可移植的前端代码 |

## 依赖

### 必装

- **[ajiang-koubo-cut](https://github.com/NanmiCoder/ajiang-vibe-coding-skills/tree/main/skills/ajiang-koubo-cut)**：B-roll 只认精剪后的时间线。原始录音（有重录、磕巴）必须先用它精剪；逐字转写也走它的 `scripts/speech.py`（faster-whisper）。本 skill 先在同一个 skills 目录里找它，再找环境变量 `AJIANG_KOUBO_CUT`，最后找 `~/.claude/skills/ajiang-koubo-cut`。
- **[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)**：镜头卡库。章节 Agent 照它的卡写动作，审片 Agent 用它的终检方法。本仓库不打包它的文件，需要自己装：

  ```sh
  git clone --depth 1 https://github.com/Vincentwei1021/video-shotcraft ~/.claude/skills/video-shotcraft
  ```

  SKILL.md 和 BRIEF 模板默认去这个位置找卡。装在别处时，`list_cards.py` 可以用环境变量 `VIDEO_SHOTCRAFT` 指向它，但发给子 Agent 的路径要你自己改。

### 可选

- **ego-browser（[Ego Lite](https://lite.ego.app/)）**：`scripts/capture.py` 用它截 2x 真实网页、录真实操作。可以不装，但素材阶段强烈建议装；没有它就只能用你自己提供的截图和录屏。
- **[lobe-icons](https://lobehub.com/icons)**：`scripts/fetch_logos.py` 直接从 unpkg 下载 logo SVG，不需要额外安装；装上 lobe-icons skill 只是让 Agent 多一份使用说明。
- **[Codex CLI](https://github.com/openai/codex)**：缺素材时生图，是最后一档，第 4 期的 B-roll 没有用到。注意 `scripts/codex_image.py` 以 `--dangerously-bypass-approvals-and-sandbox` 调用 `codex exec`，只在你信任的输出目录里用。

## 环境要求

- **macOS**：中文用系统的 PingFang SC。换平台要自己配中文字体。
- **Node.js ≥ 20 和 npm**：模板自带 `package-lock.json`，首次建工程时 `npm ci`。
- **FFmpeg 和 ffprobe**：切口播、混音、抽帧、拼全片。
- **Python 3 和 uv**：脚本用 Python 标准库加 numpy、Pillow；OpenCV 和 faster-whisper 用 `uv run --with …` 临时装。

需要联网的步骤：

- 首次建工程时 `npm ci` 安装 Remotion 等依赖；
- Remotion 第一次渲染时下载 Chrome Headless Shell；
- faster-whisper 首次转写时下载模型（经 ajiang-koubo-cut）；
- `fetch_logos.py` 拉 logo，`extract_tokens.py` 抓产品官网的 CSS 和 Google Fonts 字体，`capture.py` 截网页；
- 选配乐、换音效、clone 或更新 video-shotcraft；
- 预览页从 Google Fonts 加载字体，发布 Artifact 预览页需要 claude.ai。

依赖装好之后，渲染、检查、交付都在本机完成。

## 运行时：需要 coding agent 的子 Agent 能力

本 skill 在 Claude Code 上实测过，用到了：

- **Agent 工具**：一条消息并行派出多个章节子 Agent，以及独立审片 Agent；
- **SendMessage**：给同一个子 Agent 续派定点修改，它带着上下文改；
- **后台任务和完成通知**：巡检卡住的子 Agent、排队渲 4K；卡住时用 TaskStop 停掉重派；
- **Artifact**：发布带口播的预览页（可选；你说过“不要问我”时跳过这一步）。

其他 coding agent 需要有等价的能力：能并行起子 Agent、能给已有子 Agent 续发消息、能收到后台任务的完成通知。目前只在 Claude Code 上跑过完整流程，其他 agent 没有验证。

## Remotion 许可证提醒

渲染引擎 [Remotion](https://www.remotion.dev) 不是 MIT 或 Apache 许可，它有自己的许可证：个人和小团队免费，公司达到一定规模需要购买商业许可。用于公司项目前，请先查看 <https://www.remotion.dev/license>。本 skill 的 MIT 许可不覆盖 Remotion。

## 安装

和仓库里其他 skill 一样，用 [Vercel Skills CLI](https://github.com/vercel-labs/skills) 安装。建议和 ajiang-koubo-cut 一起装：

```sh
npx skills add NanmiCoder/ajiang-vibe-coding-skills --skill ajiang-koubo-broll --skill ajiang-koubo-cut
```

再装 video-shotcraft：

```sh
git clone --depth 1 https://github.com/Vincentwei1021/video-shotcraft ~/.claude/skills/video-shotcraft
```

默认装到当前项目，加 `--global` 装到用户范围。

## 最小用法

```text
用 ajiang-koubo-broll 给这期口播做整片 B-roll。
输入：口播原始录音.mp4、稿子.md、产品网址 https://example.com
产品前端源码在 ~/code/my-product（没有就不写）。
右上角留头像圆，底部留一行字幕。
```

接下来会发生的事：

1. 原始录音先交给 ajiang-koubo-cut 精剪，拿到精剪 MP4、SRT 和逐字转写；
2. 读懂口播、定主题、分章，一条命令建好 Remotion 工程；
3. 截素材、抽产品 tokens、拉 logo，每批素材入库就扫一遍二维码；
4. 主控亲自做第一章，自检两轮后发给你，**停下来等你确认一次**；
5. 你认可后，其余章节并行派给子 Agent，主控收稿、巡检、续派修改，再让独立审片 Agent 挑问题；
6. 配乐和音效、隐私复查、排队渲 4K、跑检查，最后交付。

交付目录 `B-roll成片/` 里有：

- 按 SRT 毫秒时间命名的分段 MP4：3840×2160，帧率同母版，音频只有配乐和音效，不含口播；
- `B-roll全片_4K_配乐音效_不含口播.mp4`：一整条，帧数等于母版；
- `预览_B-roll加口播_1080p.mp4`：直接看效果；
- `无配乐版/`、`替换对照表.txt`、`音乐与音效来源.txt`、`剪映贴法.txt`。

## 实例：ModelDial 挑战赛第 4 期 · 推箱子

8 个大模型做 6 道推箱子题。口播精剪后 6 分 55.133 秒，24908 帧 @ 60fps，分成 14 章。

- **第一章交了 4 版，用了 94 分钟。**
  - v1 是脱离口播的“三种镜头”样板，用户说：“你的音频完全没有跟画面一起走”；
  - v2 逐句对上了口播，但截图堆砌，还把第一名露了出来；
  - v3 用黑底匿名小卡和点阵示意，没有 logo，用户说：“完全没有那种大片的感觉”；
  - v4 用产品自己的舞台主视觉做成电竞转播 HUD，棋盘用真实回放驱动。用户回复：“我觉得你这个版本挺好的了，后续全部按这个做吧。”方向一明确，v4 本身只用了约 8 分钟。
- **13 个章节 Agent 并行**，第一轮每个实际干活 22–75 分钟。其中两个各卡在一条变量加通配符的删除命令上约 6 小时，推断是权限确认框没人点。这条教训写进了 skill：主控巡检，子 Agent 30 分钟没有新产物就查。
- **独立审片 Agent** 用约 15 分钟挑出 21 条问题（严重 2、中 10、轻 9）；第二轮 11 段定点修改，每段 2–8 分钟。
- **4K 排队渲染**：验收过一段就渲一段，14 段约 37 分钟。
- **交付检查**：
  - 帧数 14/14 一致；
  - 配乐和音效比口播低 14.2–15.1 LU，真峰值 ≤ −17 dBTP；
  - 段尾残留 0.00%，段首接缝亮度差 ≤ 0.1；
  - 4K 成片抽 209 帧扫二维码，0 命中；
  - 声音没有逐条试听，只用仪器测过。
- 用户看完成片：“做得太好了！”

第一章四版和两段终版的拼图在 `assets/examples/ep4/frames/`。每版被否的原因（用户原话）和 v4 做对了什么，见 [第 4 期范例说明](assets/examples/ep4/README.md)。浅色产品功能演示的范例见 [第 3 期](assets/examples/README.md)。

推箱子棋盘的移植代码（`Sokoban.tsx`）来自 ModelDial Arena 的非公开源码，公开版没有收录，范例说明里保留了接口。

## 目录

| 路径 | 内容 |
|---|---|
| `SKILL.md` | 判断规则、停与不停、流水线、分工与通信、失败恢复 |
| `references/` | 主题与审美、分章、素材、声音、编排、提示词模板、验收、交付、踩过的坑 |
| `scripts/` | 建工程、截图、抽 tokens、拉 logo、扫码打码、配乐、检查、交付、只重渲受影响段、派工台账 |
| `assets/template/` | Remotion 工程模板：组件库、渲染脚本、BRIEF 模板、字体、10 种 CC0 音效、lockfile |
| `assets/preview/` | 预览页模板 |
| `assets/examples/` | 第 3 期和第 4 期的范例源码、总纲和被否 / 通过版拼图 |

## 致谢

这个 skill 站在下面这些项目上：

- **[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)**（作者 Vincentwei1021，Apache-2.0）：我们用了它 124 张镜头配方卡的动作语法（时值、缓动，按本期 tokens 重新蒙皮）、审美准则 `aesthetic-rules`（发给章节 Agent）和终检方法 `final-review`（发给独立审片 Agent）。不打包它的文件，请自行安装或 clone。在线画廊：<https://vincentwei1021.github.io/video-shotcraft/>，卡片索引：<https://vincentwei1021.github.io/video-shotcraft/api/library.json>。
- **[lobe-icons](https://github.com/lobehub/lobe-icons)**（LobeHub）：模型和厂商 logo，经 unpkg 拉静态 SVG。目录 <https://lobehub.com/icons>，使用说明 <https://lobehub.com/icons/skill.md>。
- **[Remotion](https://www.remotion.dev) 4 + React 19**：整套工程的渲染引擎，每段一个 composition。
- **[faster-whisper](https://github.com/SYSTRAN/faster-whisper)**（SYSTRAN）：经 ajiang-koubo-cut 调用，做逐词转写，让画面能锚在口播的每个字上。
- **[Freesound](https://freesound.org)**：模板自带的 10 种音效来自 CC0 素材，署名清单在 `assets/template/public/sfx/src/FREESOUND-CREDITS.md`。
- **[Mixkit](https://mixkit.co)**：免费配乐（Mixkit Stock Music Free License）。
- **[Ego Lite / ego-browser](https://lite.ego.app/)**：截真实网页、录真实操作。
- **[FFmpeg](https://ffmpeg.org)、[OpenCV](https://github.com/opencv/opencv)**：抽帧、拼接、混音、扫二维码。
- **[Codex CLI](https://github.com/openai/codex)**：缺素材时生图的最后一档；第 4 期的 B-roll 没有用到。
- **[Geist](https://github.com/vercel/geist-font)**：模板自带的拉丁和等宽字体（SIL OFL 1.1）。
- **[ModelDial Arena](https://arena.modeldial.com/)**：作者团队自己的产品，第 4 期的推箱子渲染组件和舞台主视觉都来自它。
