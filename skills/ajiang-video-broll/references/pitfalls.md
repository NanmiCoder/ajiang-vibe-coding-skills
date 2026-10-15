# 踩过的坑

来源：412 期，以及 414 期一整个 session 的复盘（开场 v1 被否 → 开场 B-roll → 结尾 → 中部三段）。

## 方向与沟通

| 错误 | 正确 | 用户原话 / 出处 |
|---|---|---|
| 为了躲头像和字幕，把画面缩成黑框里约 70% 的小窗 | 画面永远铺满 16:9；只让文字和关键信息避开**实测**的头像圆和字幕那一行 | “让你做 16:9，你做的什么格式啊？真的是太丑陋了” |
| 用矩形安全区，右边留了一大块空 | 先从母版截一帧量出头像圆和字幕行，版面照常铺满 | “你是不是把右边留得太宽了？…你应该通过截视频帧发现” |
| 内容压到底边 | 1920 坐标下内容底边约 920（4K 约 1840） | “底部可以稍微再往上留一点点空间” |
| 套 skill 默认的石墨底 + 粉橙 | 预览里给多套主题（见 [themes](themes.md)），logo 从 lobehub 取 | “为什么老是用这种颜色？没有美感 / logo也没有” |
| 给“多套主题”时只换配色字体，所有主题共用一个版式 | 每套模板有自己的 layouts.js：构图、版式、动效编排、转场都参照各自的参考片子重新设计 | “我给你那个站点是让你参考不同的实现，而不是还是原来的布局……每一套的 broll 都不一样” |
| 只有大字 + 标签的页面 | 用真实素材：官网截图、作品图、真实数字、用户自己的 AI 片段；没生成的内容用铅笔分镜表示 | “画面还不够丰富，有点太单调了” |
| 用抽象比喻表达“难”（乱画的线、划掉的草稿） | 换成具体对照（别人的成片 vs 自己空白的提示词框 + “差距”尺寸线） | “这块儿是不是还有优化的空间呢？好像不太行” |
| 推荐“只配音效，不要配乐” | 默认配乐 + 卡点音效，音效要做得有质感 | “我现在要你做的就是背景音乐跟卡点的音效” |
| 混音只比口播低 10 dB | 低 **16 dB**，峰值 ≤ -14 dBFS | “不要太大声了 之前的视频感觉有些大 我处理过了” |
| 拿到 skill 后绕开它，直接写 Remotion，整段 4K 渲完才给看 | 不管画面用不用 starter 组件，都先出预览页确认、先渲一段 | 开场 v1 整段返工 |
| 一次问三个问题（含能从母版读出的分辨率） | 能读出来的不问；网页素材默认 ego-browser；收尾默认淡出 | “使用ego lite去录制不可以吗” |
| 写完方案或提示词就停下来等 | 预览页确认后，一路做到交付，中间不停 | “让你干活啊” |
| 文件名用帧号或英文 id | 文件名带 SRT 毫秒时间和字幕条号，附替换对照表 | |
| 同一份时间在场景、音效、和弦里各写一遍 | 场景用 `cue:'字幕原文'` 锚定，音效写在场景里，build 统一导出 | |
| 同时交 MP4 和 WAV | 只交一个 MP4，里面带配乐和音效 | |

“同样的方式去做 / 配色音效差不多”= 沿用上一段的主题、变体、音色和响度，用 `init_project.py --from <上一段工程>`。

用户偶尔会要成片**带口播**（开场 v1 时说过“需要把音频放上去”）。默认不带；用户明确要时渲完再用 ffmpeg 混进口播（见 remotion-build.md），交付说明里写清楚。

## 技术

**渲染 / Remotion**
- create-video 模板克隆超时（`read ETIMEDOUT`）：用 `init_project.py` 复制 starter，所有 remotion 包锁定同一个版本。
- npm allowScripts 拦掉了 esbuild 的 postinstall：`node node_modules/esbuild/install.js`（init 已包含）。
- 中文路径下 `new URL(import.meta.url).pathname` 被 URL 编码导致 ENOENT：用 `fileURLToPath(import.meta.url)`。
- 多个工程共用依赖：`node_modules` 软链到上一段工程（`--from` 会做），省 5 分钟安装。
- `<video>` 在渲染里不同步：视频素材一律抽成 JPG 帧序列（`extract_clips.py`），预览里才用 mp4。
- `<img>` 可能在图片解码前就截帧：引擎的 `ready()` 等可见图片 `decode()`；`Broll.tsx` 用 `delayRender` 等字体和图片。
- 渲染前 `<Audio>` 的文件必须存在：init 先放一个静音的 `mix-segN.wav` 占位。
- `--no-install` 不会生成 `fonts.json`：跑 `fetch_fonts.py`，或用 `--from` 拷上一段的。
- 手写字体 Caveat 没有中文，Remotion 里会回退成粗宋体：`--hand` 一定要带 `"Kaiti SC","STKaiti","KaiTi"` 回退（主题里已写好）。
- 字体：渲染时联网加载不稳定，用 Google Fonts `&text=` 子集下载到本地。**改了文案必须重跑字体脚本**，缺字会静默回退。
- SVG 水平/竖直线上的 `linearGradient` 不显示：加 `gradientUnits="userSpaceOnUse"` 写绝对坐标。
- SVG 的 `transform-origin` 要配合 `transformBox: 'fill-box'`。
- `backdrop-filter` 加 4K 视频渲染很慢，整屏方案用不到。
- 母版是 HEVC：口播用 ffmpeg 切 wav；不要直接给 Remotion。
- ffmpeg 帧精确切片：`-ss <from/fps>` 放在 `-i` 前面，配合 `-frames:v N`。
- 成片音频 48kHz、母版常见 44.1kHz：剪辑软件会处理，交付时提一句。

**预览 / Artifact**
- 预览页发成 claude.ai Artifact：`root` + `files` 带上 assets，同一个 file_path 重发，链接不变。
- `python3 -m http.server` 返回的页面没有 charset，本地截图中文乱码：本地测试时在文件头加 `<meta charset="utf-8">`（发布时 skeleton 自带）。
- 本地端口可能被以前的 http.server 占着，打开的是旧目录：换一个新端口再截图。
- headless Chrome 最小窗口宽约 500px，`--window-size=420` 截出来右边被裁，不代表页面溢出；用 `scrollWidth` 判断。
- headless Chrome 截不到 WebGL（星图类页面是空白）：用 ego-browser 截图。
- 不要把 base64 字体/图片读进上下文：用 build 脚本在磁盘上替换占位符。

**素材抓取**
- 网页素材用 ego-browser：一个 taskSpace 复用 `p1`；懒加载图等 2–3 秒；页面在内层容器滚动时，在 `page.evaluate` 里对每个 img `scrollIntoView`；hover 卡片能拿到 `_video.mp4` 地址；结束 `finish({keep:[]})`。
- Chrome 插件报 “Browser extension is not connected” 时直接用 ego-browser。
- WebFetch 不能用来判断网站的视觉风格（会描述错）。
- CDN 的封面尺寸变体（如 `w960q80v2`）可能 404：用原图或 `w480`。
- 飞书：`lark-cli docs +fetch` 能直接吃 wiki URL；`--output` 必须是相对路径（先 cd）；`schema docx` 不存在。
- 剪片段前先看一张拼图，确认入点（有一次切错到 550s）。

**Shell / Python**
- macOS 没有 `timeout`；不要 `find /`（会挂 2 分钟）。长任务放后台，用 Monitor 等。
- zsh：变量名不要用 `path`（会覆盖 PATH）；`set -- $spec` 不拆分，用 `${=spec}` 或 `${st%%:*}`；函数名别和别名冲突（`g`）。
- `rm -rf $VAR/*` 会被安全检查拦下：写到新目录，或用字面绝对路径。
- ffmpeg：空输出用 `-f null -`；本机 blend 没有 `colordodge`；可能没有 drawtext；拼图统一用 `sheet.py`（PIL）。
- venv 里要有 numpy、scipy、soundfile、pyloudnorm、pillow。
- 音频脚本：随机种子固定（不要用 `hash(key)`）；带抖动的时间要 `max(0, t)`。
- rsvg-convert 不支持 CSS 变量：先 sed 成色值。
- 后台渲染时不要反复发 `echo waiting` 的空回合。

## logo 收集

- 公司和模型：`https://unpkg.com/@lobehub/icons-static-svg@latest/icons/<name>.svg`，有 `-color`、`-text` 变体。lobehub 里没有 X 和 Seedance：X 用官方字形，Seedance 用母公司 ByteDance。
- 本机 App：`iconutil -c iconset` 导出 `.icns`；官方 SVG 字标常在 `app.asar` 里，用 `npx @electron/asar extract-file` 取。
- 产品官网的 logo：ego-browser 打开官网，从 DOM 里取 `<svg>`（OiiOii 就是这样拿到的）。
- 讲模型时用公司标；讲工具或 App 本身时才用 App 图标。品牌 logo 保留品牌色，不要跟着主题反色。
