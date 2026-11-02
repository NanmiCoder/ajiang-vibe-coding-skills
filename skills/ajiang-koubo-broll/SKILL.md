---
name: ajiang-koubo-broll
description: "把一期口播（脚本 + 口播音频或录屏，可以是没剪过的原始录音；可选 SRT、产品网址、产品源码、自己的图、参考片）做成盖满整条时间线的 16:9 4K B-roll：真实产品画面当主角（截图推近、从产品前端源码移植的真实动画、产品自己的主视觉），用产品自己的美术和这期的演出类型定主题，Screen Studio 式自然推拉，借 video-shotcraft 镜头卡的动作语法，lobehub logo。主控先亲自做第一章给用户确认一次，之后每章派一个子 agent 并行做，多轮验收加独立审片，配乐音效、隐私打码、排队渲 4K，交付按 SRT 毫秒命名的分段 MP4、一整条 4K 全片、带口播的 1080p 预览和剪映贴法。用户说“给口播配 B-roll / 整片包装 / 带上各种 B-roll 画面 / 像 ModelDial 那期一样做 / 把这期做成直接能剪的画面”时使用。"
license: MIT
---

# 阿江口播整片 B-roll

把一条口播做成**从头盖到尾的画面层**：每章一个 MP4，首尾相接正好铺满精剪时间轴；另交一整条 4K 全片。用户在剪映里拖上去、叠头像和字幕就能发。用户只给一个输入，**全程只在第一章停一次**，其余一路推进，进度用一两句话同步。

两期的教训：
- **第 3 期**：
  - v1 浅色平面 MG 被批“完全没有任何的美感”；
  - v2 深色 AE 风加粒子爆炸被批“非常不满意”；
  - v3 才被认可“真的非常棒”。
- **第 4 期**：第一章交了 4 版，94 分钟才定下来。
  - v1：脱离口播的“三种镜头”样板，“你的音频完全没有跟画面一起走”；
  - v2：截图堆砌，还剧透了第一名；
  - v3：黑底匿名小卡加点阵示意，没有 logo，“完全没有那种大片的感觉”；
  - v4：产品自己的舞台主视觉加电竞转播 HUD，棋盘移植产品源码、用真实回放驱动，用户回“后续全部按这个做吧”。之后 13 章并行，一次通过，“做得太好了！”。

工程、脚本、组件库都从这两期抽出，**一条命令建工程**。

## 终点

- `<精剪交付>/B-roll成片/`：
  - N 个 `{序号}_{标题}_{SRT起}~{SRT止}_字幕a-b.mp4`：3840×2160，帧率同母版，首尾相接盖满口播；音频只有配乐和音效（比口播低约 16 LU），不含口播。
  - `B-roll全片_4K_配乐音效_不含口播.mp4`：一整条，帧数等于母版。
  - `预览_B-roll加口播_1080p.mp4`：给用户直接看效果。
  - `无配乐版/`、`替换对照表.txt`、`音乐与音效来源.txt`、`剪映贴法.txt`。
- 用户没说“别问我”时，另发一个预览页（Artifact）：带口播连续播放、每段镜头表、需要用户拍板的事实口径。
- 回复写清：
  - 剪映贴法；
  - 验证过什么、没验证什么（没试听就说没试听）；
  - “需要你看一眼”：口播和数据的出入、字幕专名。

## 判断只守这几条（理由和判例见 [为什么好看](references/art-direction.md)）

1. **真实产品画面当主角，按句子选形态。** 用户原话：“核心思想就是能去截图，能看到真实网页的一些效果……”，以及“并不是所有的页面你都需要用实际的截图……什么时候用MG动画这些 好好的去思考”。
   - 先想清楚这句口播在讲什么，再按 [chapters §3.5](references/chapters.md) 选形态：
     - 讲过程：移植产品前端动画，用真实数据驱动（“推箱子的代码要动起来……你完全可以去复现出来”）；
     - 证明“页面上真这么写”：截图推近；
     - 讲怎么操作：录屏；
     - 跨对象比较：产品风格的 MG。
   - 有真实数据就不画示意图（“示意图那些写得感觉也很丑陋”）。
2. **主题 = 产品自己的美术 × 这期的演出类型**，见 [art-direction §0](references/art-direction.md)。
   - tokens 只定颜色和字体，不等于主题。还要找：
     - 产品自己的主视觉、舞台图、吉祥物或主持人立绘、游戏精灵图、状态横幅；
     - 这期是什么演出：比赛横评做成电竞转播；功能上手做成 Screen Studio 式演示。
   - 一个强调色，结论色只表示结论。
   - 不另造“宣传片皮肤”，不用深蓝科技光效。
   - 要有“大片感”：舞台铺满、大字大数字、实物有体积。
3. **包装放在运动上，不放在特效上。** 用户原话：“该有的动画效果、转场以及放大缩小都要很自然，不要过度包装，但该有的包装还是得有。”
   - 统一用 `Cam` 推拉、blur-slide 入场。
   - 借 video-shotcraft 镜头卡的动作语法，换成本期皮肤：第一章至少 2 张，之后每章 1 张主角卡。
   - 禁我们自己加的粒子、冲击波、印章、震屏、发光、镀铬字、生成的 3D 道具。
   - 产品自带的主视觉、立绘（自带灯光）可以整张用。
4. **讲清楚、看得清、不太小也不太大。**
   - 时间锚在口播的词上（`say()`），每句口播一个画面落点。
   - 关键信息早 0.1–0.3 秒出，落定后停 ≥1 秒。
   - 要读的字有效字高 ≥28px；主体占画面宽 ≥70%，但不贴边、不被裁。
   - 被念到的标题放在 `Cam` 外，标题下面不能压着截图上的字。
5. **只写真的，口播为准。**
   - 屏幕上只写口播说过的结论，不编数字和出处。
   - 口播和网站数据有出入时：画面跟口播走，画面上不露出矛盾的数字（裁掉或压暗那一列），**不问用户**，出入清单写进交付说明。用户原话：“说法以我的那个口播为准吧”。
   - 二维码、邮箱、Key、私人后台、用户要求隐藏的名字一律不出现。
   - **对子 agent 只转述用户真说过的话，不撒谎，也不加码。**
     - 第 3 期派单谎称“用户认可这个方向”，4 个 agent 白干半小时。
     - 第 4 期把“别把模型名称露出来”加码成“不露名称和 logo”，v3 因此被否。
6. **悬念只藏本期结论，logo 必须出。**
   - 开场卖关子的句子（“最强的模型……”“垫底的模型……”）只藏本期的名次和身份。
   - 前几期的排行榜照常放：“你不要具体的排名，但是可以讲上期模型魔方的时候那些排行榜”。
   - 口播点名的模型都要有它的 logo（图标 + 字标）。
   - 还没揭晓的身份位，用 logo 老虎机停在“?”。没有 logo 被批：“Logo 也没有用”。
7. **首检不交给用户。** 第一章：主控自检两轮再发。其余章节：章节自检 → 主控验收 → 独立审片 → 再修。

## 开工就用的链接（用户不用再贴）

| 资源 | 地址 | 拿来干什么 |
|---|---|---|
| video-shotcraft 仓库 | https://github.com/Vincentwei1021/video-shotcraft （本机 `~/.claude/skills/video-shotcraft`，没装就 `git clone --depth 1`，旧了就 `git pull`） | 镜头卡 `references/shots/<类>/<卡>.md` 和实现 `demos/`：照搬动作语法、时值、缓动；`references/aesthetic-rules.md` 发给章节 agent；`references/final-review.md` 发给审片 agent |
| video-shotcraft 在线画廊 | https://vincentwei1021.github.io/video-shotcraft/ ；卡索引 https://vincentwei1021.github.io/video-shotcraft/api/library.json | 看卡的动态预览；索引里有一句话说明、适用场景、时长、能量和预览 mp4 路径。第 4 期核对过和本机卡库一致（124 卡 / 150 样式） |
| lobehub icons | 使用说明 https://lobehub.com/icons/skill.md ；目录 https://lobehub.com/icons ；静态 SVG `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/{id}{变体}.svg` | 模型和厂商 logo：单色、`-color`、`-text` 字标；深色舞台用 `fetch_logos.py --dark` 生成反白版，见 [assets §5](references/assets.md) |
| 上一期被认可的成片 | 你自己上一期被认可的成片和工程（你自己的路径，读用户偏好记忆或问一次后记下）；还没有就看本 skill 的范例：`assets/examples/ep3`（浅色产品功能演示）、`assets/examples/ep4`（深色比赛横评），里面有被否版和通过版的拼图、源码和总纲 | 逐句对位和画面密度的基准。第一章动手前看 3–5 段，源码范例在 `assets/examples/ep3`、`ep4` |
| 产品源码（如有） | 本期产品的前端仓库（你自己的路径）；第 4 期是 ModelDial Arena（线上 https://arena.modeldial.com/ ，回放数据 `/data/runs/<runId>.json`）；别的产品先找源码，找不到再问 | 前端动画组件（移植进 Remotion）；主视觉、立绘、精灵图（如 `public/assets/`）；品牌色和 CSS 变量 |

## 输入与默认

| 输入 | 必需 | 缺了怎么办 |
|---|---|---|
| 口播音频或录屏 | 是 | 唯一必须要的；没有就停下来要 |
| 脚本 / 逐字稿 | 建议 | 只靠 SRT 理解；稿子里的【画面】提示直接采纳 |
| SRT | 否 | 原始录音（有重录、磕巴）→ 先走 `ajiang-koubo-cut`，它交付精剪 MP4/SRT 和 `work/edited-asr.json` |
| 产品网址 / 产品源码 | 否 | 从稿子和上面的链接表里找；没有产品站就截口播提到的真实来源（GitHub、文档、榜单），见 [素材](references/assets.md) |
| 自己的图、参考片 | 否 | 图优先当真实素材；参考片先判片种，拆成手法清单逐个取舍（[§4](references/art-direction.md)） |

默认：
- 设计坐标 1920×1080，成片 ×2。
- 头像圆 `{x:1690,y:30,w:200,h:200}`，字幕行 `{x:360,y:966,w:1200,h:64}`；用户换位置就改 `src/data/meta.json`。
- 画面永远铺满 16:9。
- 纯音频母版按 60fps。

## 停与不停

只在这几处停下来等用户，其余自主。用户说过：
- “下次我只需要给他一个输入，他就 OK 了”；
- “让你干活啊”（414 期）；
- “记得交代清楚 不要问我了”（第 4 期）。

| 节点 | 什么时候停 | 为什么 |
|---|---|---|
| 开工 | 找不到任何口播音视频；或视频母版不是恒定整数帧率（init 会拦） | 没有时间轴什么都做不了；帧率错了，每段在剪映里都错位 |
| **第一章（每期必停，一次）** | 主控亲自做完第一章、自检两轮后，用 [prompts §5](references/prompts.md) 的模板发一次 | 方向错是最贵的错：第 4 期第一章交了 4 版；方向定了以后 13 章一次通过。用户原话：“先给我做一个简短的第一章节出来。我确认之后……再去以同样的主题、同样的动画效果和风格去做后面的章节。” |
| 预览（默认停） | 内部验收、独立审片都修完，隐私两道关已过，预览页发布后。**例外**：用户说过“不要问我了 / 起床就要成片”这类话，就不停，直接渲 4K 交付，附 1080p 带口播预览 | 第 3 期用户在这一关提出打码；第 4 期用户睡觉前说了不要问 |
| 覆盖已有交付目录（必停） | `B-roll成片/` 里已有 mp4 | 不可逆；`deliver.py` 会拦 |
| 不停 | 第一章认可后，总纲 / BRIEF 要不要过目；口播和数据的出入；专名和口径存疑；稿子和录音不一致 → 都按默认处理，写进交付说明的“需要你看一眼”。后台或登录页有私人数据 → 不截，用用户的图裁出允许的那块，叙事离不开时才问 | 这些都有默认值。第 4 期主控把数据出入、总纲拿去问，用户回：“说法以我的那个口播为准吧”“不要问我了” |

## 流水线

`S` = 本 skill 目录，`P` = 工程目录（默认 `<期目录>/broll`）。`$S/scripts/*.py` 是主控工具（操作工程的都带 `--project $P`）；`$P/scripts/*.mjs|sh` 是渲染脚本，在 `$P` 里跑，章节 agent 也用。

0. **盘点**：
   - 列出稿子、音视频、SRT、网址、图片；`ffprobe` 看时长和帧率；读用户偏好记忆。
   - **找产品源码和产品美术**（上面的链接表）。
   - 看上一期成片 3–5 段。
1. **精剪（按需）**：原始录音先调 `ajiang-koubo-cut`。B-roll 只认精剪后的时间轴：SRT、ASR、母版必须是同一条。
2. **读懂、定主题、分章**：
   - `python3 $S/scripts/init_project.py list --srt 精剪.srt` 通读，写 200 字理解和勘误表。
   - 定主题：[art-direction §0](references/art-direction.md)，写成一句话。
   - 按 [分章节](references/chapters.md) 切：一章回答观众一个问题，20–55 秒，切在转折句开口处，章数不设上限。
   - **写 BRIEF 之前先定四张表**（[chapters §3.5](references/chapters.md)）：
     - 悬念揭晓表；
     - 逐句镜头表：每个素材键只归一章；
     - 口径表：口播为准；
     - 用词表。
   - 写好 `chapters.json`。
3. **一条命令建工程**（[工程与依赖](references/setup.md)）：
   ```sh
   python3 $S/scripts/init_project.py --out $P --srt 精剪.srt --master 精剪.mp4 --chapters chapters.json \
       --asr <精剪交付>/work/edited-asr.json     # 母版也可以是口播 mp3；没有 ASR 用 --transcribe --prompt "简体中文。<专名>"
   ```
   生成：
   - 逐字对齐的 `timing.json`；
   - 每段占位和独立入口（`Sample` 入口重导出 `Seg0`）；
   - 口播切片、静音配乐占位、替换对照表。

   依赖从 lockfile 装进共享缓存并查清单，最后跑 tsc。重跑或 `--force` 不会清掉已写的段和数据。
4. **素材 + 隐私第一道**（[素材](references/assets.md)）。按这个顺序补，先满足的那条就是答案：
   1. 产品自己的美术和前端动画：移植渲染层，喂真实数据；
   2. `capture.py` 截 2x 页面（ego-browser 有缩放时看 assets §3）/ 录屏；
   3. 用户图 Cutout；
   4. 手搓产品原生 UI；
   5. logo / 线性图标；
   6. [Codex 生图](references/codex-imagegen.md)。

   同时要做：
   - `extract_tokens.py <官网> --out $P/src/data/tokens.json`：认 Tailwind v4 的 `--color-*`，抽完要看一眼。
   - `fetch_logos.py --project $P --dark <id…>`：拉图标、彩色版、字标，深色舞台生成反白版。
   - **每入库一批就** `mosaic.py --project $P --scan`；扫到就在源图打码，再用 Read 人眼过一遍隐私。
5. **第一章 = 风格样板（必停一次）**：
   - 动手前并行派 2 个分析 agent，各 ≤15 分钟：① 从 video-shotcraft 选本期 10–16 张卡，并给第一章逐句配卡；② 拆上一期成片（第 3、4 期的拆解结论已经写进 [art-direction §6](references/art-direction.md)，同类选题可以跳过）。
   - **主控亲自做 `src/segs/Seg0.tsx`**（20–30 秒，第一章太长就做到 30 秒内的某个句末），`Sample.tsx` 只重导出它。
   - 逐句对口播，全部用终稿素材：产品主视觉、真实动画或截图、logo、至少 2 张卡、悬念处理、至少一个数据镜头。
   - 按 [验收 §1 第一章自检](references/qa.md) 至少过两轮；渲带口播的预览，按关键词每句抽一帧核对音画。
   - 用 [prompts §5](references/prompts.md) 发给用户，**停**。被否就把每条意见对到自检清单的某一条，改完用同一个模板再发。
6. **BRIEF + 派发**（[编排](references/orchestration.md)、[提示词](references/prompts.md)）：
   - 用户认可第一章后：
     - 把第一章的组件收进 `src/lib`；
     - **新组件先整段压测**：渲一段 ≥40 秒的预览，并出一张各种状态的静帧拼图；
     - 填好 `P/BRIEF.md`，第 0 节逐字写入用户的认可原话（范例 `assets/examples/ep4/BRIEF.md`）。
   - 过派发前检查单，然后**一条消息并行派出**其余全部章节：同时跑的 ≤ CPU 核数 / 2，多的排队补派；ID 记进 `ledger.py`。
7. **收稿 + 第二轮**：
   - 每个通知到了就 Read 它的 final-sheet、代存回报、记问题。
   - **主控等通知期间设后台闹钟巡检**：某个 agent 超过 30 分钟没有新产物，就查它卡在哪条命令（第 4 期两个 agent 卡在权限确认上各 6 小时），卡住就停掉，用接手模板重派。
   - 全部到齐后看首尾帧衔接，再用 SendMessage 续派定点修改（模板里已嵌验收清单，带时间点和数字）。
8. **声音**（和 6–7 并行，[声音](references/audio.md)）：
   - 模板自带 10 种语义音效，sfxGain 默认 0.3。
   - 挑一首安静的免版税曲子，用 `bgm.py` 拼长、包络拉平、对齐到口播 −16 LU、按段切片。
9. **独立审片 → 第三轮**：
   - 新开干净上下文的审片 agent（[验收 §4](references/qa.md)），只给预览、字幕、BRIEF、审片清单。
   - 共性问题，主控等全员停下后在 lib 里统一修；其余按章续派。
10. **预览闸门**（[交付 §1](references/delivery.md)）：
    - 依次跑：各段 `preview.mjs` → 隐私第二道 `mosaic.py --scan` → `preview_page.py` → Artifact 发布 → **停**。
    - `preview_page.py` 在没扫码、有未处理的码时拒绝生成；预览比代码、lib、截图旧会警告，先重渲。
    - 用户说过不要问，就跳过这一步。
    - 4K 可以在审片前后就开始渲。
11. **4K + 交付**：
    - **排队渲**：`scripts/queue.sh`，验收过一段就往 `out/render-queue.txt` 追加一段；有 agent 在跑时并发 ≤6。6–7 分钟的片约 40 分钟。
    - 然后依次跑：
      - `check.py`：帧数、响度、段尾空舞台、段首接缝亮度；
      - 隐私第三道 `mosaic.py --frames out/final/*.mp4 --every 2`；
      - `deliver.py --to <精剪交付>/B-roll成片`：同时出全片 4K 和 1080p 带口播预览。
    - 回复用户：文件、剪映贴法、验证过 / 没验证、需要你看一眼。
    - 用户要改，就用 `affected.py` 只重渲受影响的段。

实测时间（对话时间戳）：
- **第 3 期 v3**：建工程 + 样板 + BRIEF 约 14 分钟 → 9 个 agent 第一轮 22–33 分钟 → 第二轮、审片、第三轮约 40 分钟 → 等用户 → 打码、4K、音轨、检查、交付约 63 分钟（4K 本身 41 分钟）。
- **第 4 期**：
  - 第一章 4 版 94 分钟：方向一明确，v4 只用了 8 分钟。
  - 13 个章节 agent 第一轮实际干活 22–75 分钟；其中两个卡在权限确认上各约 6 小时。
  - 审片 15 分钟，第二轮每段 2–8 分钟。
  - 排队渲 4K 14 段约 37 分钟。

## 分工与通信（完整协议见 [编排](references/orchestration.md)）

- **一个工程、按文件分权。**
  - 章节 agent 只写 `src/segs/SegN.tsx`、`src/segs/segN/`、`public/segN/`；lib、data、scripts、别人的段只读。
  - 每段独立入口、独立打包目录、`enableCaching:false`，一段写坏不连累别人。第 3 期 v2 用四份工程副本，出过全局变量冲突、修复要逐份拷、共享脚本被同名覆盖。
- **BRIEF 是宪法，提示词只写这一章的差异**；用 Agent 工具的通用 agent，不用 fork。
- **派单里用户原话放引号，主控推断另起一行写“总控推断：”**，分析 agent 的建议先对照主旨和悬念表再用。
- **回报只在最终回复里**，不写报告 .md（第 3 期 9 个 agent 写报告文件全被拦）；主控代存 `out/reports/`。
- **改稿用 SendMessage 续派同一个 agent**（它带着上下文，每轮 2–8 分钟）；ID 丢了用“接手”模板新开。
- **一轮进行中 lib 冻结**；只影响声音的参数在 `src/data/mix.json`，随时可调。主控确实要修 lib bug 时，只加带默认值的可选参数，不改已有行为。
- **任务通知是唯一的进度来源**：不读 agent 的 output 文件，不在通知到达前对用户描述结果；台账 `ledger.py` 防上下文压缩丢 ID（第 3 期对话压缩过 4 次）。
- **会触发权限确认的命令写进 BRIEF 禁用**：如 `rm -f $D/*.jpg` 这种变量加通配符的删除，改用 python 清目录。用户不在场时，一个确认框就能卡死一个 agent 几个小时。

## 失败恢复：只重做坏掉的那一块

| 现象 | 做法 |
|---|---|
| 某章不满意 / 审片挑出问题 | SendMessage 给原 agent 定点改；ID 丢了用 [提示词 §4 接手](references/prompts.md) |
| 某个 agent 30 分钟以上没有新产物 | 查它卡在哪条命令（多半是权限确认或死循环渲染），TaskStop 后用接手模板重派；不要空等 |
| 段首在剪映里闪一下 | 上一段收在暗的空舞台，这段第 0 帧却是亮背景 → 背景 0.3–0.5 秒淡入（`check.py` 会报接缝亮度差） |
| 改了某张图（打码、换截图） | `python3 $S/scripts/affected.py --project $P public/st/x.jpg` → 只重渲引用它的段 |
| 改了 `src/lib` 或 tokens | 所有段重出静帧抽查 → 全部重渲；所以 lib 在派发前定型 |
| 音量偏响 / 配乐不平 | 改 `mix.json` 或重跑 `bgm.py` → `node scripts/reaudio.mjs`，画面不动 |
| 渲到一半被打断 / 交付前 | `affected.py --stale` 列出缺的或过期的段，只渲它们 |
| 某段编译错误拖垮终渲打包 | `npx tsc -p .` 定位，交回该章 agent；终渲必须全绿 |
| 整段渲染 `Page crashed` | 二分定位到具体组件（第 4 期是 `Pop` 缩放弹入），换掉，再整段渲一次确认 |
| 上下文压缩后不知道进度 | `ledger.py show`（可选 `git log`），按台账续派 |
| 用户说不满意 | 先停掉在跑的渲染（TaskStop），回到原话和 [art-direction](references/art-direction.md) 找原因，再定改哪一层 |

## 第 4 期用户点名的五件事（下次开工就照做，不用用户再说）

| 问题 | 一句话 | 细节 |
|---|---|---|
| 参考的开源项目在线地址 | video-shotcraft 仓库、在线画廊、library.json；lobehub icons 说明和 unpkg 地址；上一期成片和产品源码的路径 | 上面的“开工就用的链接”、[来源](references/sources.md) |
| 怎样为当期视频挑到合理的主题 | 主题 = 产品自己的美术（主视觉、立绘、动画组件）× 这期的演出类型（比赛→电竞转播，功能上手→Screen Studio 演示），再用大片感清单检查；只有 tokens 不够 | [art-direction §0](references/art-direction.md) |
| 该用的 logo 怎么去找 | lobehub：单色、`-color`、`-text` 三种都拉，深色舞台 `--dark` 出反白版；用 BrandMark（图标 + 字标）；口播点名就出现，悬念身份位用老虎机停在“?” | [assets §5](references/assets.md) |
| 主题怎么对应并划分脚本 | 分章后写四张表：悬念揭晓表、逐句镜头表（按句子选形态，每个素材键只归一章）、口径表（口播为准）、用词表 | [chapters §3.5](references/chapters.md) |
| 怎么让用户确认第一章 | 主控亲自做真正的第一章，逐句对口播、用终稿素材，自检两轮后按模板发一次，列出替用户定好的默认；认可后不再停 | [prompts §5](references/prompts.md)、[qa §1](references/qa.md) |

## 第 3 期用户点名的五件事

| 问题 | 一句话 | 细节 |
|---|---|---|
| 用了哪个开源项目、哪些 skill | 开源项目：video-shotcraft 的镜头卡、审美准则和终检。skill：ajiang-koubo-cut（精剪 + 逐字转写）、ego-browser（截真实网页）、lobe-icons（品牌 logo）；video-mg-remotion 是前身。渲染用 Remotion | [来源](references/sources.md) |
| 为什么好看 | 真实页面当主角 + 产品自己的 tokens 和美术 + 一种镜头语言 + 镜头卡的调校动作换皮 + 字够大 + 多轮看帧；不是因为浅色 | [art-direction](references/art-direction.md) |
| 怎么分章节 | 一章回答观众一个问题，20–55 秒，切在转折句开口处；每章一个主角卡、一个 agent、一个 MP4，镜头归属提前分好 | [chapters](references/chapters.md) |
| agent 怎么通信 | 主控建工程、第一章、BRIEF → 一条消息并行派单 → 子 agent 在最终回复里回报 → 主控看拼图、SendMessage 续派定点修改 → 独立审片 → 再续派 | [orchestration](references/orchestration.md)、[prompts](references/prompts.md) |
| 缺素材怎么用 Codex CLI 生图 | 最后一档才用；`codex exec … "Use your built-in image_gen tool …"`；风格串从 tokens 来，底色用 surface 放进 Card，黑底 Unmult 只给深色舞台；脚本带并发、校验、重试 | [codex-imagegen](references/codex-imagegen.md) |

## 资源

| 路径 | 作用 |
|---|---|
| `scripts/init_project.py` · `timing_lib.py` | 列字幕；一条命令建工程（模板 + 分段 + 逐字对齐 + 入口 + 口播切片 + 静音占位 + 依赖 + tsc） |
| `scripts/capture.py` · `extract_tokens.py` · `fetch_logos.py` · `measure_safe.py` · `list_cards.py` | 2x 截图 + 元素坐标；产品 tokens + 字标；logo（`--dark` 反白）；量安全区；挑镜头卡 |
| `scripts/mosaic.py` · `codex_image.py` | 二维码扫描打码（三道关）；Codex 生图 |
| `scripts/bgm.py` · `sfx_prep.py` · `check.py` · `contact.py` | 配乐；音效；交付检查（含接缝亮度）；审片联系表 |
| `scripts/preview_page.py` · `deliver.py` · `affected.py` · `ledger.py` | 预览页；交付 + 全片 + 1080p 带口播预览 + 剪映贴法；只重渲受影响段；派工台账 |
| `assets/template/` | Remotion 工程模板：`src/lib` 组件库（读 `src/data/*.json`，零写死品牌色）、渲染脚本（含 `queue.sh` 排队渲 4K）、BRIEF 模板、字体、10 种 CC0 音效、lockfile |
| `assets/preview/index.html` | 预览页模板 |
| `assets/examples/` | ep3（浅色产品功能演示）、ep4（深色比赛横评：第一章、BRIEF、回放数据提取脚本、转播组件、被否版和通过版拼图；移植自产品非公开源码的推箱子渲染层公开版没有收录），见[说明](assets/examples/README.md) |
| `references/pitfalls.md` | 踩过的坑和判例（实际 / 预防、证据分级），**动手前读一遍** |
