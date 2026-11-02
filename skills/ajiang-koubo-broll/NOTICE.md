# 第三方资源与许可说明

本 skill 自己的文档、脚本、Remotion 模板代码和范例代码按 [MIT](LICENSE) 发布。下面列出随 skill 一起分发的第三方资源，以及运行时会用到、但没有打包进来的项目。

## 随 skill 分发的第三方资源

| 资源 | 位置 | 出处 | 许可 | 说明 |
|---|---|---|---|---|
| Geist、Geist Mono 字体 | `assets/template/public/fonts/*.woff2` | The Geist Project Authors，<https://github.com/vercel/geist-font> | SIL Open Font License 1.1 | 许可证全文和版权声明放在同目录的 `OFL.txt`。文件元数据为 Geist 1.800、Geist Mono 1.701，是可变字体的拉丁子集，每个字重文件的内容相同 |
| 16 个音效源文件 | `assets/template/public/sfx/src/fs-*.mp3` | Freesound 上的 16 位作者，逐条见 `FREESOUND-CREDITS.md` 和 `audio-manifest.json`（作者、原页面、许可链接、sha256） | 全部为 CC0 1.0 | 下载的是 Freesound 的 MP3 预览版，不是作者上传的原文件。CC0 不要求署名，清单保留，便于溯源和致谢 |
| 10 种语义音效 | `assets/template/public/sfx/*.wav` | 由上面的 CC0 源文件按 `recipe.json` 裁剪、淡出、归一化得到；`chime`、`alert` 的音调部分是本地合成 | CC0 素材的衍生品，随本 skill 按 MIT 分发 | 改音色的方法见 `references/audio.md` |
| 范例拼图 | `assets/examples/frames/*.jpg`、`assets/examples/ep4/frames/*.jpg` | 作者自己的 B-roll 工程渲染的审片拼图 | 拼图本身随本 skill 分发 | 画面里有公开网页的截图（modeldial.com、arena.modeldial.com、Artificial Analysis 榜单等）、ModelDial Arena 的舞台主视觉和主持人立绘，以及各 AI 厂商的 logo。这些只用来说明做法，页面版权和商标归各自所有者。ModelDial / ModelDial Arena 是作者团队自己的产品 |
| 占位字标 | `assets/template/public/logo/wordmark*.svg` | 本 skill 自制 | MIT | 只是一个虚线框，开工后会被产品自己的字标替换 |

`assets/template/package-lock.json` 只锁定 npm 依赖的版本，依赖本身不打包，安装时从 npm 拉取，各包许可证以各自为准。其中 Remotion 有自己的许可证，见下文。

## 没有打包、运行时由你自己获取的项目

| 项目 | 许可 | 本 skill 怎么用它 |
|---|---|---|
| [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)（Vincentwei1021） | Apache-2.0 | 不打包它的任何文件，需要你自己 clone。章节 Agent 读它的镜头配方卡和 demo 源码，照搬动作语法、时值和缓动，再按本期 tokens 重新蒙皮；审美准则 `aesthetic-rules.md` 发给章节 Agent，终检方法 `final-review.md` 发给独立审片 Agent。说明见下一节 |
| [lobe-icons](https://github.com/lobehub/lobe-icons)（LobeHub） | MIT | `scripts/fetch_logos.py` 运行时从 unpkg（备用 npmmirror）下载 `@lobehub/icons-static-svg` 的 SVG。logo 图形本身是各厂商的商标 |
| [Remotion](https://www.remotion.dev) 4 + React 19 | Remotion 自有许可证 | 由 `npm ci` 安装，负责逐帧渲染。个人和小团队免费，公司达到一定规模需要购买商业许可，请自查 <https://www.remotion.dev/license> |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper)（SYSTRAN） | MIT | 经 `ajiang-koubo-cut` 的 `speech.py` 调用，做逐词转写 |
| [Freesound](https://freesound.org) | 每条音效各自的许可 | 换音效时自己搜，默认只选 CC0 |
| [Mixkit](https://mixkit.co) 免费配乐 | Mixkit Stock Music Free License | 不打包任何曲子。`references/audio.md` 写了怎么选曲；用之前自己确认曲子的许可条款 |
| [Ego Lite / ego-browser](https://lite.ego.app/) | 见其官网 | `scripts/capture.py` 调 `ego-browser` 截真实网页、录真实操作 |
| [Codex CLI](https://github.com/openai/codex) | Apache-2.0 | `scripts/codex_image.py` 缺素材时用它生图，是最后一档 |
| [FFmpeg](https://ffmpeg.org)、[OpenCV](https://github.com/opencv/opencv) | 各自许可 | 抽帧、拼接、混音；OpenCV 扫二维码 |
| Google Fonts | 每个字体各自的许可 | 预览页从 Google Fonts 加载 Geist；`extract_tokens.py` 会下载产品用到的 Google Fonts 字体 |

## 和 video-shotcraft 代码的关系

发布前用脚本逐行对比了本 skill 的全部 TSX、TS、JS、Python 代码与本机 video-shotcraft 的 `demos/`、`template/`、`workbench/`、`assets/` 下的源码，并逐句对比了全部 Markdown 文字：

- 没有整份文件或成段代码照搬，也没有照搬它的文档文字。
- 下列范例是按镜头卡的动作语法重写的“本片版”，代码注释里写了对应的卡名：
  - `assets/examples/ep3/segs/seg1/kit.tsx`、`seg1/ReportShot.tsx`、`assets/examples/ep4/lib/Hud.tsx`：`scanline-annotate-focus`；
  - `assets/examples/ep3/segs/seg3/Converge.tsx`：`bezier-source-converge-merge`；
  - `assets/examples/ep3/segs/seg3/SegCtl.tsx`：`segmented-thumb-hero`。
- 与它的 demo 逐字相同的只有通用写法：`import React`、弧长查找用的二分循环、十六进制颜色解析、通用样式行。

这些镜头的动作设计归功于 video-shotcraft 的作者 Vincentwei1021。

## 公开版没有收录的文件

`assets/examples/ep4/lib/Sokoban.tsx` 和 `assets/examples/ep4/segs/seg3/Board.tsx` 是从 ModelDial Arena 的非公开前端源码移植的推箱子引擎和棋盘渲染，公开仓库没有收录。`assets/examples/ep4/README.md` 保留了它们的接口说明。
