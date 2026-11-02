# 范例（只读参考）

这里收的是往期的**范例和判例，不是规则**。配色、章数、分镜、卡的选择，下一期都要重新判断。

**深色产品、比赛 / 横评类选题先看 ep4；浅色产品功能演示看 ep3。**

## ep3 · 第 3 期 ModelDial 模型真假检测（浅色产品 · 功能演示）

6 分 03 秒口播，9 章。

| 文件 | 看什么 |
|---|---|
| `frames/v3-seg2-final-sheet.jpg` · `v3-seg3-…` · `v3-seg7-…` | **通过版**：真实页面占满画面、推近讲解、用产品组件语言。seg2 是 MG 占比最大的原理段；seg3 是一镜到底的真实页面教学；seg7 是 crane-rise + 榜单截图推近 + 排名连线 |
| `frames/v2-rejected-sheet.jpg` | **被否版**：深海军蓝舞台、镀铬字、3D 发光道具、数字场、截图倾斜缩小。用户：“现在出来的效果我非常不满意”。二维码已打码，测试网关弹窗已模糊 |
| `ep3/BRIEF.md` | 第 3 期发给 9 个章节 agent 的总纲**原文**（当时用旧色名 `C.blue / C.red`，还没有归属表和数据驱动的 tokens）。看第 8 节怎么写节拍，第 3 节怎么写隐私裁切 |
| `ep3/tokens.json` | 第 3 期定稿的 ModelDial tokens：取自 modeldial.com 的 CSS 变量，结论色按报告卡手工调过。`extract_tokens.py` 能抽到同一组变量，个别值差一点。浅色只是 ModelDial 碰巧是浅色，不是规则 |
| `ep3/pages.json` | 第 3 期截图登记表（素材本身不在 skill 里） |
| `ep3/segs/Sample.tsx` | 主控的风格样板：真页面推拉 / 原理示意 / 选择 + 结论卡。**已知毛病**：示意图推近时标题被裁，标题应放在 Cam 外。学它的嗓音，别照抄毛病 |
| `ep3/Sample-三种镜头.tsx` | 第 4 期之前模板 `src/segs/Sample.tsx` 的原文：三种最常见镜头的通用写法，还没有截图时用占位页面。**第 4 期证明这种脱离口播的样板会被否**，所以模板改成了重导出 `Seg0`。这份只当写法参考 |
| `ep3/segs/Seg1.tsx` + `seg1/` | 章节成品：真实检测页填表（`PageShot`），再用四块取景框咬合用户的真实报告卡（`ReportShot` + `kit`，scanline-annotate-focus 浅色版）。时间全用 `say()` 锚定，`sfx` 的写法也在里面 |
| `ep3/segs/Seg3.tsx` + `seg3/` | 章节成品：两个开源仓库汇入（Converge）→ 覆盖面统计（Coverage）→ 35 秒一镜到底的真实页面教学（Live：从首页导航进检测页、逐字填表、选型号、切手动检测、复制提示词粘进 Codex）。`Live.tsx` 里的 `Patch / Focus / Menu / Veil` 示范了怎么替换页面局部状态，审片时点名要保留 |

怎么用：

- 已按模板 lib 的语义色名移植（`C.accent / C.bad / C.good / C.warn`、`tone="accent"` 等）。用第 3 期截图搭的工程可以直接编译渲染：拷 `segs/*` 到 `src/segs/`，`tokens.json` 和 `pages.json` 到 `src/data/`，素材放进 `public/st/`、`public/logo/`。
- 代码里剩下的十六进制色大多是**页面补丁**（盖在截图上，必须和截图像素一致，例如 `#F7F8FA`、`'#fff'` 填充框），这是允许的例外。另有少量白字写死成 `'#fff'`，新代码请用 `C.surface`。
- 学的是写法（`say()` 锚时间、`Cam` 推拉、`Window layers` 切状态、`Cutout` 抠页面元素、私有组件放 `segN/`），不是内容。

## ep4 · 第 4 期 ModelDial 挑战赛 · 推箱子（深色产品 · 比赛 / 横评）

6 分 55 秒口播，14 章。第一章交了 4 版才通过（“我觉得你这个版本挺好的了，后续全部按这个做吧。”），整片交付后用户说“做得太好了！”。**详见 `ep4/README.md`**，里面写了每个文件看什么、三版被否的原因（用户原话）、v4 做对了什么，以及本期踩的坑。

| 文件 | 看什么 |
|---|---|
| `ep4/frames/v1…v3-rejected-*-sheet.jpg` · `v4-approved-seg0-sheet.jpg` | 第一章四版对照：脱离口播的样板 → 截图堆砌剧透 → 匿名小卡点阵没大片感 → 产品舞台 + 转播 HUD + 真实数据（通过） |
| `ep4/frames/seg8-final-sheet.jpg` · `seg12-final-sheet.jpg` | 章节终版：两盘真实回放对比 + 身份翻牌揭晓；花费数据 MG + 推近真实榜单 |
| `ep4/segs/Seg0.tsx` | 全片风格样板（第一章就是样板，逐句对口播） |
| `ep4/segs/Seg8.tsx` · `Seg12.tsx` · `Seg3.tsx` + 私有目录 | 真实回放驱动的一镜到底、同一刻度的数据 MG、截图推近 + 截图自身像素遮挡 |
| `ep4/lib/extract_sokoban.py` | 把产品的真实回放数据压成动画用的数据。配套的 `Sokoban.tsx` 移植自 ModelDial Arena 的非公开源码，公开版没有收录，接口说明见 `ep4/README.md` |
| `ep4/lib/Broadcast.tsx` · `Hud.tsx` · `Rec.tsx` | 转播组件（`Lines`、带 `fin` 段首淡入的 `Backdrop`、`Roulette`、`LevelCells` …）、产品组件语言、录屏帧序列 |
| `ep4/BRIEF.md` · `ep4/tokens.json` | 第 4 期总纲原文（§3 选材表、§6 悬念揭晓表）和深色 tokens |

ep4 的段落依赖本期扩展过的 lib 和本期数据，不能直接拷进模板编译。拼法见 `ep4/README.md` 的“怎么用”。
