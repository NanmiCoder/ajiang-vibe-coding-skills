# ModelDial 挑战赛 · 推箱子 B-roll · 美术与制作总纲（所有章节 agent 必读）

## 0. 这是什么、用户要什么

- 一支 6 分 55 秒的 B 站口播（ModelDial 挑战赛：8 个大模型在 6 道推箱子题上比赛）。我们做的是**整屏 16:9 的画面层**，用户把它盖在口播上，自己在右上角叠一个小圆头像、底部叠字幕。共 14 段（seg0–seg13），每段单独出一个 MP4，首尾相接。
- **风格样板 = `src/segs/Seg0.tsx`（开场 27 秒，总控做的）。用户看过这一版，原话：“我觉得你这个版本挺好的了，后续全部按这个做吧。”** 你的章节必须和它像同一个人做的：同一个舞台、同一套组件、同一种标题位置、同一种节奏。先用 `node scripts/still.mjs seg0 1.6 5.25 9.4 11.3 13.4 15.4 17.2 18.9 22.9 26.4 --tag=ref` 渲一张拼图看清楚它长什么样。
- 用户本期的其它原话（拿不准时回到这里）：
  > “我们要保留悬念，所以在看最强模型的时候……别把模型名称露出来。”
  > “说法以我的那个口播为准。”
  > “并不是所有的页面你都需要用实际的截图，你要去思考：讲到什么地方合适用截图放大，用 Screen Studio 的时候什么地方适合去做素材……什么时候用 MG 动画这些，好好的去思考。”
  > “一定要用（video-shotcraft）这里面这些好用的动画。”
  > “推箱子的代码要动起来……你完全可以去复现出来。”（→ 我们把产品源码的棋盘移植成了 `SokoBoard`）
  > 否掉上一版时：“完全没有那种大片的感觉”；“Logo 也没有用”；“示意图那些写得感觉也很丑陋”；更早一版：“你的音频完全没有跟画面一起走”。
  > 交付要求：“16:9，右上角留一个很小的圆形位置我放头像就好了，然后画面底部我放字幕，不用很高……生效的画面应该是布局合理的，不要太小也不要太大。”
- 片种：**讲解片 B-roll，但要有电竞转播的大片感**。画面跟着口播的词走；每句口播都要有画面落点。

## 1. 视觉语言（照 seg0，不许另造）

- 产品 arena.modeldial.com 本身就是深色电竞转播风：`src/data/tokens.json` → `C / F / SH / R`。底 `C.bg`、面板 `C.surface`、墨色 `C.ink`、**唯一强调色 `C.accent`（酸性绿）**、`C.bad`（危险红）**只表示死局 / 没过 / 0 分 / 被拦截 / 超时**、`C.warn`（琥珀）只给“评分仅供参考”这类提醒。不用品牌色当装饰（品牌色只出现在 logo 和棋盘名牌里）。
- 字体：`F.display`（Acid Display = Barlow Condensed，窄体粗体，名次 / 大数字 / 英文眉标，可 italic）、`F.sans`（Chakra Petch + 中文 PingFang SC）、`F.mono`（Geist Mono，ID、步数、调用串、秒表）。
- **舞台**：外壳已经画好深色舞台。电竞舞台主视觉用 `<Backdrop src="sokoban/arena-sokoban.webp" cx={…}>`（魔方是 `arena-cube.webp`），它自带左侧和底部压暗；做数据画面时像 seg0 那样把它压到 `style={{opacity:0.45–0.55}}` 当远景。主持人立绘 `<Host src="sokoban/host-sokoban.webp">`（魔方是 `host.webp`）——全片已在 seg0 用过，后面**最多再出现一次**（建议只在 seg13 结尾）。
- **组件（都在 `src/lib`）**：
  - 推箱子：`SokoBoard`（真实棋盘，`at` = 帧位置，`bannerAt` 死局/通关横幅擦入时间，`stamp`、`mark`）、`SokoPanel`（回放页选手面板）、`track(lv, racer)`（frames / info / calls / ends / chanceStart / last）、`stepAt([{t,f}…], t)`、`stateAt`、`Lives`、`RACERS`、`BrandMark`（lobehub 图标 + 文字字标，深色底反白）。**所有走法都来自真实回放数据，不许手编走法。**
  - 转播：`Lines`（逐句标题，固定在 x=130 y=74 字号 64）、`Backdrop`、`Host`、`Keys`（方向键 HUD）、`LifeBar`（生命条）、`HazardBand`（全屏 DEADLOCK 横幅——**seg0 已用，全片不再用**）、`Roulette`（logo 老虎机）、`LevelCells`（6 关结果格）、`Stopwatch`、`Bracket`（四角取景框 + 标签）、`Panel` / `Tag` / `Eyebrow`（切角面板、斜切标签、等宽眉标）。
  - 通用：`Cam`、`Shot`、`Window`（真实网页截图）、`Rec`（真实录屏帧序列）、`Headline`、`At`、`Pop`、`Count`、`Pointer`、`Ring`、`Cutout`、`Logo`、`Icon`、`Card`、`Chip`。
- **代码里不写死颜色**，一律 `C.*`；`alpha(C.x, a)` 做半透明。
- **禁用**：粒子、冲击波、印章砸入、震屏 / 手持抖动、故障闪、发光 / 辉光 / 泛光、镀铬字、扫光、整屏压暗聚光、深蓝科技光效、3D 道具图。要强调：推近 + `Bracket` / `Ring`。
- **字号（1920×1080 设计坐标、按镜头放大后的有效字高）**：逐句标题 64（`Lines` 默认）；大标题 120–170（seg0 的“推箱子”170、“前两期 · 魔方”150）；大数字 200–470（`F.display`）；想让观众读的字 ≥28；小标签 ≥24；眉标 24（`Eyebrow`）。截图里的小字只算纹理：要读就推近到 ≥28，或抠出来（`Cutout`）放大，或旁边用 MG 大字复述。
- **构图**：主体占画面宽 ≥70%（不许一小团 + 大片留白），也不许大到被裁、贴边。左上角 y≈74–150 是标题行；正文区 y≈190–930；**底部 y≥940 不放要读的东西**。

## 2. 运动语言

- 内容包在 `<Cam moves>` 里，推拉曲线统一 `E.cam`，单次 0.9–1.3s，推到位停 ≥1s；讲到哪推到哪；数据 / MG 画面全程极慢漂移（6–8s 内 z 1.00→1.035）。
- 入场：`At` / `Headline`（上浮 + 去模糊 + 淡入，0.5–0.6s）；批量元素错峰越来越快，收尾静止 ≥0.5s。透视只给棋盘和窗口这种“物件”（seg0 的棋盘 rotateX 24°→9°、魔方榜 rotateY −18°→−7°），**表格、文字、思考记录保持正视**。
- 转场：`<Shot from to enter exit>`，按两镜关系选：`left`（下一步）、`up`（换层级：页面→原理 / 数据）、`fade`（同话题）、`zoomIn`（走进细节）、`none`。每段 2–3 种。相邻镜头重叠 0.8s（`dur`）。
- 段首段尾：第 0.3–0.5s 内容入场；最后一个 `Shot` `exit='fade'`、`to ≈ 段长 + 0.3`（outDur 0.8），**最后 2–4 帧必须是纯空舞台**。
- 节奏：**每一句口播一个画面落点**；`say('segN','词')` / `cue()` 锚时间，不手写秒数；标题在关键词前 0.1–0.2s 出（`Lines` 已处理）；画面明显变化约每 2–3s 一次；计数 / 翻牌在口播说完那个数时到位。

## 3. 截图 / MG / 棋盘动画：怎么选（总控定的规则，seg0 已按此做）

| 口播在讲什么 | 用什么 | 例子 |
|---|---|---|
| 这个游戏怎么走、哪一步错了、谁推死了、谁通关 | **`SokoBoard` 真实回放**（能放慢、定格、对口播；4K 不糊） | seg0 第 7 步推死；seg7 GPT 第 34 步 |
| 证明“页面上真的这么写着 / 这个数是真的” | **截图 `Window` 推近到那一格 + `Bracket` 取景框标签**，停 ≥1s | 思考记录里的原话、调用次数、超时提示 |
| 讲“怎么用、点哪里” | **真实录屏 `Rec`**（实时操作）或截图 + `Pointer` | seg13 人机对战 |
| 跨模型比较、规则、分值、花费 | **MG（转播记分牌风格）**，数字只用口播说过的真数 | seg0 战绩矩阵、seg12 花费 |
| 还没揭晓的身份 / 名次 | **匿名 MG**（`Roulette` 停在 ?、“???” 名字位） | seg0 的 1ST / 8TH |
| 页面字推近后仍 <28px | `Cutout` 抠出放大，或 MG 大字复述（注明来源页面） | |
- **logo 一律用 `BrandMark`（lobehub 图标 + 字标）**，模型被点名时它的 BrandMark 要出现在画面上。
- 不做“示意图”式的手绘图表（用户嫌丑）：数据就用真实数据做成转播记分牌 / 条形 / 格子。

## 4. 真实素材

- `src/data/sokoban.json`：6 关完整回放数据（`tools/extract_sokoban.py` 从网站 /api 原始记录提取）。`track(lv, racer)` 得到逐步帧；`T.calls[k]`（第 k 次工具调用：帧区间 from/to、提交的走法 sent、错误 error）、`T.ends[k]`（第 k 次机会结局：end = solved/deadlock/restart、at = 结局帧、fatal = 致命一步 from→to、kind）。选手名：`Claude-Opus-5.5`、`OpenAI-GPT-6-Astra`、`Gemini-4-Argon`、`Grok-4.7`、`DeepSeek-Flash-1017`、`Kimi-K3.1 Pro`、`智谱 GLM-5.3`、`MiniMax-3.1-Flash`。
  - 各关结局（真实）：L1 Claude/GPT 63 步通关；DeepSeek 死局 @7、@3、@49；MiniMax 死局 @3；GLM 死局 @3、@5、@8；Grok/Gemini/Kimi 没走（超时 / 失败）。L3 Claude 112、GPT 122 第 1 次通关；DeepSeek 死局 @1、@92，第 3 次 130 步通关（共 52 次调用）；Kimi 死局 @1。L4 GPT 死局 @34（往右推到右墙）后第 2 次 105 步通关；MiniMax 第 1 次 121 步主动重开、第 2 次 126 步通关；Grok 34 步重开 → 重开后第 1 步死局 → 再死局 @23；DeepSeek/Kimi/GLM/Gemini/Claude 第 1 次通关。L5 GPT 103、Claude 109 通关；DeepSeek 三次死局；MiniMax 两次死局。L6 Claude 102、GPT 122 通关，Gemini 死局 @12 后第 2 次 120 步通关；DeepSeek、MiniMax 三次死局。
- `public/st/` 网页截图（登记在 `src/data/pages.json`，`w×h` 是页面 CSS 尺寸，`els` 是元素框）：用 `<Window src="st/x.jpg">`，children 用页面 CSS 坐标。主要的：
  - 思考记录 / 调用轨迹抽屉（1600×900）：`trace-l1-claude`（输出 106.6k、5 次工具调用）、`trace-l1-gpt`（4 次调用、18.7k）、`trace-l1-grok`（“确认无解…怀疑存在特殊字符干扰导致坐标误读”原文）、`trace-l1-grok-2`、`trace-l1-kimi(-2)`（请求超时，持续输出超过 20 分钟）、`trace-l1-minimax(-2)`、`trace-l1-glm(-2)`（裁判死局原文）、`trace-l3-deepseek(-2)`（52 次工具调用）、`trace-l4-gpt`、`trace-l4-grok`、`trace-l4-minimax`、`trace-l6-claude(-2)`、`trace-gemini-block`、`trace-l5-kimi`。精确框在 `pages.json` 的 `els` 和 `note` 里；没有的用 `python3 scripts/grid.py public/st/x.jpg x0 y0 x1 y1 out/tmp/segN/g.jpg --px` 量。
  - 回放页（1600×900）：`l1-start/end`、`l3-start`、`l3-start-focus`、`l4/5/6-start`、`l4/5/6-map`、`l4/5/6-end`。
  - 排行榜：`lb-top`、`lb`、`lb-table`、`lb-expand-gpt`、`lb-basis`、`lb-rules*`（**带总分和名次，见第 6 节揭晓表，seg11 之前不许出现**）。`s-cube-*`（魔方榜，可以用）。`versus`、`history`、`challenge`。**`task.jpg` 不许用**（有本机配置状态）。
- `public/rec/<名>/` 真实录屏帧序列（`src/data/recs.json`，`<Rec name play={[{t,f}…]}>`，`marks` 关键帧号、`els` 元素框）：`op-grok-trace`（点开 Grok 轨迹、滚到原话）、`op-claude-trace`、`op-lb-region` / `op-lb-scroll` / `op-lb-rules(-scroll)`（排行榜，揭晓前不许用）、`op-replay-open` / `op-replay-play`（点“回放 →”、按步骤 2× 播放）、`op-versus` / `op-versus-switch`（人机对战）；逐步回放 `l1-all`、`l4-all` 等（一般用 `SokoBoard` 更好）。
- logo：`<BrandMark racer="Claude-Opus-5.5" h={48} />`（图标 + 字标）、`text={false}` 只要图标。产品字标 `public/logo/wordmark-acid.svg` / `wordmark-white.svg` / `symbol-acid.svg`。
- **隐私**：不出现任何 Key、邮箱、本机配置；`task.jpg` 禁用。

## 5. 文案与事实：**以口播为准**

- 屏幕文字只写口播说过的话和结论，用口播的原词；`Lines` 的标题就是这句口播的复述（截原句 / 压缩 / 改问句）。
- 网站数据和口播有出入时，**画面跟口播走**：不画面上写和口播矛盾的数字，也不主动去纠正口播（例：口播“每走两三步调用一次”，就不要把每次调用的步数逐条摆出来；口播“原地上下晃了两步”，就按“晃两步”表现）。
- 不编数字、不编出处。口播没说的数字（具体 Token、美金、步数、秒数）只有在截图里本来就有、且不是重点时才可以出现。

## 6. 悬念揭晓表（硬约束）

| 内容 | 什么时候第一次揭晓 | 之前怎么处理 |
|---|---|---|
| 8 个参赛模型是谁 | seg1（口播点名国外 / 国内） | seg0 匿名 |
| Claude、GPT 第 1 关通关 | seg2（口播点名） | — |
| **Grok = 垫底 0 分** | **seg8 段尾“它是拿了 0 分”** | 之前不许出现 Grok 的总分 / 名次 |
| **GPT = 89.9 第二，Claude = 91.6 第一** | **seg11** | seg1–seg10 不许出现任何带总分 / 名次的排行榜（`lb*`、`op-lb-*` 录屏、`lb-rules-rank`），不许出现 91.6 / 89.9 和模型名同框 |
| 花费 18.8 / 6.4 / 1.4 美金 | seg12 | 之前不出现美金数 |
- 个别关的“通关 / 死局 / 步数”可以随口播出现（seg2–seg10 都在讲单关表现）。

## 7. 安全区（硬约束，QA 拼图画了红框）

- 右上角头像圆 `{x:1690,y:30,w:200,h:200}`、底部字幕行 `{x:360,y:966,w:1200,h:64}`：**里面不放要读的东西**，要读的文字底边 ≤930。背景、窗口、棋盘可以延伸过去，画面永远铺满 16:9。推近时页面里的长句会滑进头像圆，取景往左下偏。

## 8. 工程规则

- 工程：`<期目录>/broll`（公开版把本机绝对路径换成了占位；Remotion 4，TSX，60fps，设计 1920×1080，成片 4K）。时间一律“段内秒”：`const t = useSec()`。
- **你只能写**：`src/segs/SegN.tsx`、`src/segs/segN/`（私有组件）、`public/segN/`（自己裁的图）；产出 `out/qa/segN/`、`out/preview/segN.mp4`；临时文件只放 `out/tmp/segN/`。**不许改** `src/lib/`、`src/data/`、`src/entries/`、`scripts/`、`tools/`、别的段、`public/` 其它目录。lib 缺东西就在私有目录写，回报里说明。
- `SegN.tsx` 默认导出组件 + 导出 `sfx: Sfx[]`（`{t, k, v?}`，k：whoosh / swish / click / type / pop / tick / chime / alert / paper / shutter；稀疏，每 2–4 秒最多一个，音量 0.35–0.6，时间也用 `say()`）。
- 纯函数、确定性：禁 `Math.random` / `Date`，伪随机用 `rand(seed)`。`npx tsc -p .` 只看你文件的错。
- 静帧：`node scripts/still.mjs segN 0.5 3.2 … --tag=v1 --guides`（默认 `--scale=0.5`，**一次 ≤14 帧**）→ `out/qa/segN/v1-sheet.jpg`；推近处 `--scale=1` 单看。拼图 960 宽：量到的字高 ×2 = 有效字高。
- 预览（带口播）：`node scripts/preview.mjs segN --conc=2` → `out/preview/segN.mp4`，一轮最多 2 次；用 ffmpeg 按口播关键词抽帧核对音画。

## 9. 各章分镜方向与镜头卡（方向，不是死命令；每张卡全片只当一次主角）

镜头卡库 `~/.claude/skills/video-shotcraft/`：卡 `references/shots/<类>/<卡>.md`，实现 `demos/<类>/<卡>/`，审美准则 `references/aesthetic-rules.md`（必读 R1–R4、Q1、Q2、Q4、Q6、Q11、P4）。照搬卡的**动作语法、时值配比、缓动**（demo 是 30fps：秒 = 帧 / 30；demo 的 spring(阻尼, 刚度) 是 Remotion 写法，自己用 `remotion` 的 `spring` 或 `anim.ts` 换算），**按本片 tokens 重新蒙皮**，删掉卡里的光效、白闪、全屏压暗、相纸白边、手绘抖动。各章参数详见 `out/reports/ana-shotcraft.md`。

- **seg1 八强与计分规则（35.9s）** 卡：`interaction/segmented-thumb-hero`（国外 / 国内二选一切换）。“8 个模型同场竞技”：8 张选手卡（`BrandMark` + 模型全名）像电竞选手登场依次亮起；“国外的模型有这几个 / 国内的…”：大号分段控件切 国外 → 国内，对应 4 张卡高亮（不能录真实排行榜，会剧透）。计分规则：6 关三档（入门 / 进阶 / 挑战，每档两关，分值 1:2:3 → 16.7 / 33.3 / 50）做成越来越高的台阶；“90 分通关能力 + 10 分 Token 效率”做成一根 100 分的分割条；“三条命”用 `LifeBar`；“推进死角 → 裁判判死局 → 扣一次机会”用一块 `SokoBoard` 真实推死（选一个和 seg0 不同的：如 L2 MiniMax 第一次死局）+ 一行裁判原文（`trace-l1-glm` 里的裁判句子可 `Cutout`）；“Token 费用花了好几百”：MG 收据 / 计费条（不写具体金额）；“点赞支持”：一个转播式点赞按钮被点亮；（seg1 只到第 39 条“记得点赞支持一下”；“OK 现在我们开始直接看第一关”是第 40 条，归 seg2，seg2 已做“第一关”标题卡。）
- **seg2 第一关见分晓（23.1s）** 卡：`transition/mosaic-reframe`。“只有 4 个箱子 / 地图不大 / 通道非常窄”：L1 `SokoBoard` 大图，4 个箱子依次 `Bracket`，窄通道用一条描边路径标出；“稍微推错一步就堵死”：一块真实推死（MiniMax L1 第 3 步）；“8 个模型差距一下就看出来了”：8 块 `SokoPanel` 网格同步回放（帧对齐），再 mosaic-reframe 成两大（Claude、GPT）六小；“全是 63 步，跟最优解一步不差”：两块大板的步数计数器同时停在 63，旁边“最优 63”对齐。
- **seg3 两强怎么过的（36.3s）** 无主角卡。Claude：`trace-l1-claude` 推近到“输出 106.6k”（“十多万思考 Token”）→ 一条时间轴：很长的“思考”段 + 很短的“动手”段（真实：约 15 分 45 秒思考、5 次调用约 15 秒推完）；`SokoBoard` Claude L1 快放，5 次调用分段高亮（`T.calls`）；“第一次机会直接满分”：CLEAR + 三星。GPT：`trace-l1-gpt` 推近“18.7k”和“已核对出一条 63 步的完整路线，开始执行”；4 次调用；Claude vs GPT 思考 Token 条形对比（106.6k vs 18.7k，`BrandMark` 标注）；“跟测魔方一样花了巨少的 token 完成了智商非常高的事情”：可以带一句魔方 `s-cube-*` 的 GPT 第一行（魔方榜 GPT 第一可以露）。
- **seg4 其余六家怎么挂（45.5s）** 卡：`rhythm/rhythm-interrupt-moves · jump-cut-punch-in`（Grok 原话三挡跳切）+ `ui-entrance/draw-svg-trace`（GLM 同一个死角）。Grok：`op-grok-trace` 录屏（点开思考记录）→ `trace-l1-grok` 原话三挡跳切 1.0→1.6→2.6（推到“怀疑存在特殊的字符干扰导致坐标误读”），“开始怀疑我们题目出的有问题”配一个“题目有问题？”问号 Tag。国内四个：Kimi `trace-l1-kimi-2` 推近“请求超时（持续输出超过 20 分钟）”+ `Stopwatch` 走到 20:00；MiniMax “走一步看一眼位置”：`SokoBoard` 一步一停（每次调用后停顿 + 一个“看一眼”小眼睛图标），第 3 步推死；GLM：第 1 次机会 3 步把左上角箱子往下推死（`SokoBoard` + 危险红直角描框 draw-svg-trace）→ 裁判提醒原文（`trace-l1-glm` Cutout）→ 第 2 次机会“原地晃两步，又推进同一个死角”：描框常驻成虚线，箱子再进框时只补一次闭合加粗。每个模型被点名时它的 `BrandMark` 出现。
- **seg5 第三关开局陷阱（23.3s）** 卡：`effects/fui-hud-moves · reticle-lock-on`（全片只扑这一次）。“策略差异更明显”：L3 + L4 两块地图并排一闪（`SokoBoard` at=0）；“小人出生在箱子正上方”：L3 大图，四角准星扑上来锁住“小人 + 正下方箱子”两格，标签“正上方”；“顺手往下推一步就死局”：演示那一步（DeepSeek 或 Kimi 第 1 步）→ 死局横幅；“Claude 和 GPT 开局算完路线，第一次稳稳通关”：两块板快放到 CLEAR（`BrandMark`）；“Kimi 和 DeepSeek 第一步直接往下推”：两块板同时第 1 步推死，各自生命条少一格。
- **seg6 DeepSeek 小步快跑（28.3s）** 卡：`ui-entrance/list-stack-press`。“前两次机会死局之后”：两格生命变红；“第三次改成小步快跑，每走两三步调用一次工具，确认箱子位置再走下一步”：左边 `SokoBoard` DeepSeek L3 第 3 次机会按调用分段播放（每次调用后短暂停顿），右边调用卡（“第 N 次调用”+ 一个确认✓）从下方逐张飞上来摞起，计数器滚到“52”（口播“一共调用了 52 次”时到位）；**不要在卡上写每次调用走了几步**（见第 5 节）；“一点点把箱子挪到位”：CLEAR；“唯一得分的模型”：三枚 `BrandMark`（Claude、GPT、DeepSeek）亮、其余 5 枚暗。
- **seg7 第四关 GPT 失误（31.7s）** 卡：`rhythm/speed-ramp-freeze · freeze-annotate`。“决定冠亚军的关键一题”：L4 地图 + “进阶”标签；“前面一路满分的 GPT”：GPT `BrandMark` + 3 格前三关全绿（不写总分）；“第一次推到一半，往右多推了一格，推死在右墙上”：`SokoBoard` GPT L4 播到第 34 步**定格**，危险红不闭合椭圆圈住那只箱子 + 批注“往右多推了一格”，再解冻 → 死局横幅；“看到裁判提示后第二次机会顺利过掉”：`trace-l4-gpt` 推近裁判提示 / GPT 那句“刚才多走了一步”→ 第 2 次机会快放到 CLEAR；“丢了 5 分能力分”：这一题的分数格从满格掉 5 分（数字可以写 −5，不写总分）；“DeepSeek、Kimi、智谱第四关全部一次性通关拿满分”：三块板并排快放同时 CLEAR + 三星。
- **seg8 主动重开对比（24.9s）** 无主角卡（两盘并排）。“我们给模型留了一个主动重开的按钮”：一个产品风格的“重开”按钮被光标按下；左 MiniMax L4（第 1 次走到一半 → 按重开 → 第 2 次 CLEAR），右 Grok L4（走一半 → 也按重开 → 新一局第 1 步就推死在墙上，死局横幅）；`BrandMark` 在各自板头。**段尾揭晓**：“6 道题下来，Grok 4.7 拿了 0 分”：复用 seg0 的 8TH 记分牌样式（`LevelCells` 6 格全红 + 大号红 0），身份位从“?”翻成 Grok 的 `BrandMark`——这是 seg0 悬念的第一次回收。
- **seg9 最后两关挑战（32.4s）** 卡：`data/timeline-travel`。“最后两关最难，第五关跟第六关，占了整张卷子一半的分值”：6 关刻度轴（每关的地图缩略图，高度按分值 8.3/8.3/16.7/16.7/25/25），镜头缓起冲刺急停在 5、6 关，上方括线“一半”；“4 个箱子在狭窄通道里来回借位让路”：L5 / L6 大图，用 Claude 的真实解法快放一段展示“借位让路”；“你可以脑子里想一下这道题”：地图停住 + 秒表静静走；“四个国内模型全部没能通关，拿了 0 分”：四枚国内 `BrandMark` + 每家两格红；“Kimi 和智谱单次思考超过 20 分钟超时”：`trace-l5-kimi` 推近超时原文；“DeepSeek 和 MiniMax 三次机会全部推成死局”：两块板三连死局（真实 L6）；“最后两关变成国外三个模型的较量”：三枚国外 `BrandMark`（Claude、GPT、Gemini）。
- **seg10 Gemini 被拦截（20.7s）** 卡：`effects/scanline-annotate-focus`。“谷歌的 Gemini 4，空间规划能力能排进前三”：Gemini `BrandMark` 大号登场；“上一期没测、后面补上也能排第三”：`s-cube-table` 里 Gemini 那一行推近（魔方榜可以露）——口播说“第三”，画面不要突出名次数字，推近 logo 和分数即可；“三道题完成、三道题超时……因为安全策略被过滤、直接中断了回答”：Gemini 的 6 关格（真实：✓ L2 L4 L6，✕ L1 L3 L5）扫描线匀速扫过，三个 ✕ 依次被取景框咬住、标签“安全拦截 · 中断回答”（`C.warn`）；可以接 `trace-gemini-block` 推近一下。不许出现其他模型的总分。
- **seg11 冠亚军拆解（35.3s）** 卡：`data/gauge-readout-moves · needle-sweep-selftest`（效率分表盘）+ `ui-entrance/row-embed`（行嵌入）。“总榜上的冠亚军拆解”：GPT vs Claude 两枚 `BrandMark` 对峙（转播 VS 版式）；“最后两道压轴题 GPT 全部一次性通关，思考 Token 非常简洁”：GPT 的 L5、L6 两格 CLEAR；“10 分效率分拿到 4.9 分，比 Claude 高出不少”：0–10 表盘指针甩满回落到 4.9，旁边 Claude 1.6；“第四关用掉一次机会，能力分少了 5 分”：能力条 90 → 85；“最终以 89.9 分排在第二”：GPT 那一行从空中落进第二名行位（row-embed，可用 `lb-top` / `lb-table` 截图裁行）；“Claude 在最难的第六关延续测魔方的套路，花了很多思考预算，一次性过掉”：`trace-l6-claude` 推近“输出 72.9k”+ Claude L6 `SokoBoard` 快放到 CLEAR；**段尾揭晓**：seg0 的 1ST 记分牌“?”翻成 Claude `BrandMark`、91.6，Claude 那一行嵌进第一名——全片悬念回收。
- **seg12 跑分的代价（21.3s）** 无主角卡（条形 MG）。“Claude 非常非常的贵，跑完 6 道题花了 18.8 美金，差不多 135 块人民币”：三根花费条（`BrandMark` + 美金数，Count 滚动），Claude 那根最长；“GPT 6.4 美金，差不多三倍”：两根之间一个“×3”括号；“排名第四的 DeepSeek 拿了 20.7 分，全程只花了 1.4 美金，大概 10 块钱”：DeepSeek 一根很短；“但是在推箱子上表现就一般了”：DeepSeek 的 6 格（✕✕✓✓✕✕）。可以用 `lb-table` 的“花费”列做证据推近（这时已揭晓）。
- **seg13 去试试人机对战（29.6s）** 卡：`camera/cursor-flyover`。“完整榜单、每一局的思考轨迹回放都上线到了 ModelDial 挑战赛”：`lb` 整页 → `op-replay-open` / `op-replay-play` 录屏（点回放、播放）；“也可以跑跑自己感兴趣的模型”：光标飞到“开一局”；“上线了人机对战模式，挑一个 AI 跟它 PK”：`op-versus` 录屏；“填自己的 API、可以填模型，然后跟它 PK 推箱子、还原魔方”：一个 API 地址 / 模型两栏的 MG 表单（示例值 `relay.example.com`、`claude-opus-5-5`，Key 显示成圆点），再 `op-versus-switch` 切到魔方；“这就是本期所有内容，点赞关注，下期再见”：ModelDial Arena 字标定版（`wordmark-acid.svg` + `arena.modeldial.com`）+ 点赞 / 关注图标，可以让 `host-sokoban.webp` 最后出现一次；最后 0.4s 淡到空舞台。

### 镜头归属总表（同一东西只完整演示一次）

| 页面状态 / 交互 / 数字 | 完整演示归 | 其它章 |
|---|---|---|
| 全屏 DEADLOCK 横幅、生命条 HUD、方向键、秒表首秀 | seg0 | `LifeBar`、`Stopwatch` 可复用但不再做全屏横幅 |
| 8 位选手登场 + 国外 / 国内 | seg1 | 后面只用 `BrandMark` 点名 |
| 6 关分值 1:2:3 台阶 | seg1 | seg9 用刻度轴讲“5、6 关占一半”，换角度 |
| L1 地图逐块讲解、8 盘同步回放 | seg2 | seg3/4 只用单盘 |
| 打开思考记录抽屉的真实录屏 | seg4（Grok） | seg3 用截图推近 |
| 主动重开 | seg8 | seg7 不提 |
| 8TH / Grok 揭晓 | seg8 段尾 | — |
| 1ST / Claude 揭晓、带总分的排行榜 | seg11 | seg12、seg13 可以用 |
| 主持人立绘 | seg0（两次） | seg13 结尾最多一次 |

## 10. 交付（每个章节 agent）

1. `src/segs/SegN.tsx`（+ 私有目录）`tsc` 不报你文件的错、能渲染。
2. `out/qa/segN/final-sheet.jpg`：覆盖整段的静帧拼图（`--guides`），每个镜头至少 2 帧，含段首 0.05/0.35s、段尾 −0.45/−0.02s。
3. `out/preview/segN.mp4`：带口播的预览。
4. 交稿前逐条自检：
   - [ ] 每一句口播都有画面落点，`Lines` 标题复述口播；音画对位（抽帧核对过关键词）
   - [ ] 像 seg0：同一舞台、同一组件、同一标题位置；有大片感（大字、大数字、真实棋盘 / 页面当主角、转播 HUD），不是“小卡片 + 留白”
   - [ ] 要读的字 ≥28 / 标签 ≥24；主体占宽 ≥70% 且不贴边被裁；头像圆、字幕行里没有要读的字
   - [ ] 被点名的模型有 `BrandMark`；悬念揭晓表没被提前破坏
   - [ ] 走法全部来自 `track()`；数字和口播一致（第 5 节）；没有编出处
   - [ ] 转场重叠窗口正中没有双重字；最后 2–4 帧是纯空舞台
   - [ ] 没有禁用效果（第 1 节）；没有写死颜色
5. **报告写在最终回复里，不要写报告 .md 文件**。五块：① 交付路径 ② 镜头表（`起–止秒｜画面｜转场｜主角卡或真实素材`）③ 上面清单逐条 ✓/✗ ④ 遗留问题 ⑤ 对 lib 的需求。
6. 不要发布 Artifact，不要跑 ego-browser 或联网，不要渲 4K，不要 git，不要动别人的文件。
