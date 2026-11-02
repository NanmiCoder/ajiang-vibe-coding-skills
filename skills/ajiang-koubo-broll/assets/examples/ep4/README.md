# 第 4 期范例：ModelDial 挑战赛 · 推箱子（只读参考）

第 4 期 = ModelDial Arena 推箱子挑战赛：8 个大模型做 6 道推箱子题。口播 6 分 55 秒，切成 14 章（seg0–seg13）。产品 arena.modeldial.com 是深色电竞风。第一章交了 4 版才通过，通过时用户说：“我觉得你这个版本挺好的了，后续全部按这个做吧。”整片交付后，用户的评价是：“做得太好了！”

这里收的是**范例和判例，不是规则**。

> 公开版说明：`lib/Sokoban.tsx` 和 `segs/seg3/Board.tsx` 是从 ModelDial Arena 的非公开前端源码移植的，公开仓库没有收录。下表保留它们的说明，方便看懂别的段落怎么调用；做自己的产品时，照同样的思路移植你自己产品的源码。

配色、舞台、组件、章数都得每期重新判断。要学的是做法：用产品自己的美术、拿真实数据驱动画面、逐句对口播、守住悬念。照抄这期的长相没有用。

## 文件

| 文件 | 是什么 · 为什么值得看 |
|---|---|
| `frames/v1-rejected-sample-sheet.jpg` | **v1 被否**：照旧模板 `Sample.tsx` 做的三种镜头（回放页推近 → 死局示意图 → 1ST/8TH 结论卡），借 seg0 的时间轴，没逐句对口播。结论卡还直接露了模型名和分数 |
| `frames/v2-rejected-seg0-sheet.jpg` | **v2 被否**：第一次按口播做 seg0。逐句标题有了，可画面几乎全是截图：回放页、魔方榜、推箱子榜整表推近。1ST Claude-Opus-5.5 91.6、垫底的几家，名字全露了 |
| `frames/v3-rejected-seg0-sheet.jpg` | **v3 被否**：反过来藏过了头。黑底、匿名 `???` 小卡、点阵柱状“示意图”、LCD 数字。没有舞台，没有 logo，魔方榜只露一条标题 |
| `frames/v4-approved-seg0-sheet.jpg` | **v4 通过**：产品舞台主视觉、主持人立绘、带透视的真实棋盘、转播 HUD、真实魔方榜、8×6 匿名战绩矩阵、6 题扇形飞入、1ST 91.6 / 8TH 0 记分牌。对应 `segs/Seg0.tsx` |
| `frames/seg8-final-sheet.jpg` | 章节终版：MiniMax 和 Grok 两盘真实回放并排，中间是共用的「重开」按钮，一镜到底推拉。段尾 8TH 记分牌的「?」翻成 Grok 的 logo，seg0 的悬念在这里第一次回收 |
| `frames/seg12-final-sheet.jpg` | 章节终版：花费段。Claude 的计价条扫到 $18.8 ≈ ¥135，再拿同一刻度和 GPT $6.4 比出 ×3。之后 zoomIn 进真实榜单 `lb-table`，取景框咬住 20.7 和花费列，最后是 DeepSeek $1.4 和 6 关格 |
| `BRIEF.md` | 第 4 期发给章节 agent 的总纲**原文**。§0 抄录了用户原话。§3 是“截图 / MG / 棋盘动画怎么选”的表。§6 是悬念揭晓表，规定每个名次、身份最早在哪一章露。§9 有镜头归属总表，同一个东西只完整演示一次。§8 里写的“音量 0.35–0.6”是**反例**，见下文“坑”的最后一条 |
| `tokens.json` | 第 4 期 tokens，取自 arena 站点 CSS 变量：`dark: true`、唯一强调色酸性绿 `#B6FF3B`、危险红 `#FF3D6E`，字体有 Chakra Petch / Acid Display（含 italic）/ Geist Mono。`font.files` 的第 4 个字段是 `style` |
| `segs/Seg0.tsx` | **全片风格样板**，主控亲自写的。27 秒 7 个镜头，每句口播一个落点，时间全用 `say()` 锚定。开头注释写明了悬念范围：本期名次和身份不露，前两期的魔方榜照常放 |
| `segs/Seg8.tsx` + `seg8/` | 两块 `SokoBoard` 用真实回放（`track(4, …)`）对口播快放、倒带、定格，`Cam` 一镜到底在两盘之间推拉。`seg8/Duel.tsx` 里有绕开 lib 两个坑的写法（见下文“坑”），`seg8/Scorecard.tsx` 是“复刻 seg0 记分牌 + 身份位翻牌揭晓”的写法 |
| `segs/Seg12.tsx` + `seg12/` | 数据 MG 的范例：三根条按真实花费画在同一刻度上，画面上只写口播说过的数。`Window` 里的 `Bracket` 传 `scale={1/Z}`，推近后线宽不变。`Stage12` 让全段共用一层 `Backdrop`，转场时背景不闪 |
| `segs/Seg3.tsx` + `seg3/` | 截图推近的范例：思考记录里 13px 的小字推到 `ZT = 2.55`，读得清。`seg3/parts.tsx` 的 `DollarMask` 用截图自己的像素盖掉美金数，因为花费留到 seg12 才揭晓。镜头 5 用 `Cutout` 从魔方榜抠出 GPT 那一行，拼成横条卡。`seg3/Board.tsx`（公开版未收录）是 lib 修红框之前的私有拷贝，**现在别再用**，它仍会显示“其他” |
| `lib/Sokoban.tsx`（公开版未收录） | **从产品源码移植前端动画、用真实回放驱动**的范例。引擎照搬 arena 的 `core/engine.ts`，画面照搬 `components/arcade.tsx` 和 `arcade.css`。`track()` 把回放压成逐步帧，`stepAt()` 把口播时间映射成帧位置（带小数，表示走到一半）。另有 `SokoBoard` / `SokoPanel` / `Lives` / `stateAt`、8 家的 `RACERS` 和 `BrandMark`（lobehub 图标 + 字标） |
| `lib/Broadcast.tsx` | 本期的转播组件，seg0 定稿后才收进 lib：`Lines`（逐句标题）、`Backdrop`（舞台主视觉 + 慢推 + `fin` 段首淡入）、`Host`、`Keys`、`LifeBar`、`HazardBand`、`Roulette`（logo 老虎机）、`LevelCells`、`Stopwatch` |
| `lib/Hud.tsx` | 产品组件语言：切角 `Panel`、斜切 `Tag`、等宽 `Eyebrow`、四角取景框 `Bracket`（代替整屏压暗：讲到哪就咬到哪） |
| `lib/Rec.tsx` | 真实录屏帧序列（`recs.json` 登记，`marks` 存关键帧号，`els` 存元素框），配 `recAt()` 按口播放 |
| `lib/extract_sokoban.py` | 把 arena `/api` 下载的 `run-*.json` 压成 `src/data/sokoban.json`：每关的初始棋盘、最优步数、每家每次工具调用实际执行的走 / 推 / 撞、每次机会的结局（通关 / 死局含致命一步 / 重开 / 步数用完）和 token。**路径和 run id 都写死成第 4 期的**，下次要改 |

## 第一章为什么改了 4 版（用户原话逐字）

- **v1 被否**：“做的啥玩意儿呀？你好好去检查一下行不行？你的音频完全没有跟画面一起走”
  - 毛病：样板是脱离口播的“三种镜头”展示，只借了 seg0 的时间轴，画面和正在说的那句话对不上。所以模板的 `Sample.tsx` 现在只重导出 `Seg0`，旧的三种镜头写法挪到了 `../ep3/Sample-三种镜头.tsx`。
- **v2 被否**：“我们要保留悬念，所以在看最强模型的时候，很多时候你可以自己生成一些画面，别把模型名称露出来，你懂吗？”“并不是所有的页面你都需要用实际的截图”
  - 毛病：所有内容都拿截图推近，排行榜一整张放出来，本期的名次和身份全剧透了。
- **v3 被否**：“我非常不满意，你的第一段视频做得毫无那种感觉，完全没有那种大片的感觉。”“你不要具体的排名，但是可以讲上期模型魔方的时候那些排行榜，对不对？”“Logo 也没有用”“示意图那些写得感觉也很丑陋”
  - 毛病：主控替用户加了码。用户只说“别把模型名称露出来”，主控写成了“不露 logo”，还把前几期的榜一起藏了。结果是黑底、匿名小卡、点阵示意图：没有舞台，没有 logo，没有大字。
- **v4 通过**：“我觉得你这个版本挺好的了，后续全部按这个做吧。”
- **整片交付后**：“做得太好了！”

## v4 做对了什么

1. **产品自己的舞台主视觉铺满全屏**：`modeldial-arena/public/assets/acid/` 下的 `arena-sokoban.webp`（推箱子舞台）、`host-sokoban.webp`（主持人立绘），魔方段换成 `arena-cube.webp` / `host.webp`。舞台用 `Backdrop` 铺满并慢推，自带左侧和底部压暗。做数据画面时压到 `opacity 0.45–0.55`，当远景。
2. **电竞转播 HUD**：方向键 `Keys` 跟着回放的每一步亮起，另有生命条 `LifeBar`、秒表 `Stopwatch`、全屏 `HazardBand`（DEADLOCK 横幅，全片只用一次）、记分牌。HUD 放在 `Cam` 外，推拉时不会被裁。
3. **移植产品前端的推箱子棋盘，用真实回放驱动**：`SokoBoard` + `track()` + `stepAt()`，没有一步是手编的。棋盘立在舞台前，带透视（rotateX 24°→9°），慢慢放平。
4. **真实魔方榜**：前两期的事可以完整放，用 `Window` 带透视滑入，镜头沿名次往下扫。
5. **8×6 真实战绩矩阵（名字用 `???`）**：6 关真实结果先乱序翻牌，再按总分重排，拉出总分条。数据是真的，只藏身份。
6. **logo 老虎机停在“?”**：`Roulette` 让 8 家 logo 在身份位里越转越慢，最后停在「?」。logo 用上了，悬念也没破。
7. **170px 大标题、200–470px 大数字**：“推箱子”170、“前两期 · 魔方”150、名次 250、分数 470（`F.display`）。
8. **逐句对口播**：每句话一个画面落点。标题在关键词前 0.1–0.2s 出，计数、翻牌在说完那个数时到位。时间全部用 `say('seg0', '词')`，没有手写秒数。

## 本期的坑

- **`SokoBoard` 推箱途中闪红框（lib 已修）**：没有死局横幅时 `fatalBox = -1`，正在被推的那只箱子 `settledCell` 也是 `-1`，两者相等，就被描了危险红边，快放时每推一下闪一次红。lib 改成 `settledCell >= 0 && settledCell === fatalBox`。
- **死局类型显示成“其他”（lib 已修）**：回放里 `fatal.kind = 'other'` 被直接译成“其他”贴在横幅上。lib 改成 `other` 时不显示类型标签。`seg3/Board.tsx`（公开版未收录）是修之前的私有拷贝，只修了红框。
- **主动重开会显示红色 DEADLOCK 横幅；`stateAt` 提前扣命（seg8 私有绕过，lib 未修）**：`end === 'restart'` 也走死局那套红横幅，只把中间的字换成“重开”。`stateAt` 在结局帧就扣命，也就是重开前的最后一步，比画面上按下按钮早。`seg8/Duel.tsx` 的绕法：`stamp` 只在走到最终结局帧时打开，剩余机会按“按下重开”的那个段内秒手算，状态标签自己按时间显示。
- **`Pop` 缩放弹入导致整段渲染 Page crashed（seg4）**：段首 6 个 `Pop` 缩放入场，加上中段同一组卡片再次出现，整段渲到 21.5s 页面崩溃。换成纯位移淡入（`At` / `rise`）后正常。`Pop` 在模板 `lib/UI.tsx` 里，批量入场别用它。
- **`Lines` 两句间隔 <0.5s 时，前一句整句不显示**：`Lines` 给每句 `t0 = t − 0.12`、`t1 = 下一句 t − 0.62`。两句间隔 ≤0.5s 时 `t1 ≤ t0`，前一句一帧都不出。lib 未修：两句挨得近就合成一句；也可以给前一句写 `end`，但会和后一句叠在一起。
- **段首 `Backdrop` 第 0 帧就满亮度，和上一段的暗空舞台硬切（已加 `fin` 参数）**：每段最后 2–4 帧是纯空舞台，下一段第 0 帧直接亮出舞台图，剪在一起会闪一下。`Backdrop` 加了 `fin`（段首从空舞台淡入的秒数），除第一章外段首一律 `fin={0.4}`，见 seg6、seg7、seg9、seg11。seg8、seg12 是手写的等价写法 `opacity: … * tw(t, 0.05, 0.6)`。**模板 lib 里没有 `Backdrop`（它在本期的 `lib/Broadcast.tsx`），所以这次没收进模板**。下期要做全屏主视觉时，照 `Broadcast.tsx` 的 `fo = fin ? clamp((t - t0) / fin) : 1` 写。
- **音效偏响**：`BRIEF.md` §8 写了“音量 0.35–0.6”，章节 agent 照抄，每条 sfx 都写死了偏大的 `v`。`sfxGain 0.45` 时，带配乐版只比口播低 13.0–13.5 LU，调到 0.3 后是 14.2–15.1 LU。模板 `mix.json` 已改成 `sfxGain: 0.3`。BRIEF 不要给音效写 `v` 的范围，用 `mix.json` 的 `base`。

## 怎么用

- 这些段落**不能直接拷进模板编译**，它们依赖本期扩展过的 lib。照下面拼好后 `tsc` 能过（已在临时工程实测）：
  1. 模板工程，加上 `lib/Sokoban.tsx`（公开版未收录，换成你自己移植的产品组件）、`Broadcast.tsx`、`Hud.tsx`、`Rec.tsx`，并在 `src/lib/index.ts` 补上 `export * from './Rec' / './Hud' / './Sokoban' / './Broadcast'`；
  2. `src/lib/tokens.ts` 的 `F` 加 `display: (T.font as { display?: string }).display ?? T.font.sans`；
  3. `tokens.json` 放进 `src/data/`。另外需要本期的 `sokoban.json`、`recs.json`、`pages.json`、`timing.json`、`meta.json`，这些都**不在 skill 里**。
- 渲染还要素材，也**不在 skill 里**：`public/sokoban/*.webp`（arena 仓库的 `public/assets/acid/`）、`public/logo/lobe/*.svg`（lobehub 图标和字标）、`public/st/*.jpg` 截图、`public/rec/` 录屏帧、三套字体。
- 本期为深色产品改过的模板 lib 小处，做深色产品时自己判断要不要跟着改：`Stage.tsx` 读 `font.files` 的第 4 个字段 `style`（italic 字重），`Marks.tsx` 在 `DARK` 时关掉 `Ring` 外圈淡色光晕、马克笔 `Marker` 改用 `screen` 混合，`UI.tsx` 的 `Logo` 映射对 OpenAI / Grok 用反白版。
- 学写法，不学内容：舞台 + HUD + 真实数据记分牌是**这个产品、这类比赛选题**的答案。浅色产品的功能演示照第 3 期做。
