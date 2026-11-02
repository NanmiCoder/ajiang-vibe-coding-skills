# 来源与依赖：用了哪个开源项目、哪些 skill

| 名称 | 是什么 | 这次用来做什么 | 怎么用 |
|---|---|---|---|
| **video-shotcraft**（开源，仓库 https://github.com/Vincentwei1021/video-shotcraft ，Apache-2.0，装在 `~/.claude/skills/video-shotcraft`；在线画廊 https://vincentwei1021.github.io/video-shotcraft/ ；卡索引 https://vincentwei1021.github.io/video-shotcraft/api/library.json ：124 卡 / 150 样式，含一句话、适用、时长、能量、预览 mp4 相对路径，第 4 期核对过和本机一致） | 124 张镜头配方卡 + 每张卡的 demo TSX 源码 + `aesthetic-rules.md`（判例式审美准则）+ `final-review.md`（独立终检方法）+ `sfx-source.py`（Freesound 选材） | **v3 质感的直接来源**：每章借 1–2 张主角卡的动作语法、时值、缓动，按本期 tokens 重新蒙皮；审美准则和终检给章节 agent 和审片 agent；音效从 Freesound CC0 选 | **第一章动手前就选卡**：`python3 $S/scripts/list_cards.py 关键词`，或派 1 个选卡 agent 读 library.json 和本机卡库，给出本期 10–16 张卡和第一章的逐句配卡（第 4 期约 12 分钟）。第一章至少用 2 张；第一章确认消息里附上每张卡的在线预览。章节 agent 读卡全文和 `demos/<类>/<卡>/*.tsx` 全文。没装就 `git clone --depth 1 https://github.com/Vincentwei1021/video-shotcraft ~/.claude/skills/video-shotcraft`，开工时 `git pull`。两期都是用户自己贴的链接，第 4 期 v1、v2 一张卡都没用，被批“一定要用这里面这些好用的动画” |
| **ajiang-koubo-cut** | 阿江口播精剪 skill | 原始录音 → 精剪 MP4 + SRT；它的 `work/edited-asr.json`（faster-whisper 逐词时间）给逐字对齐 | 输入是未剪录音时先调用它；已精剪但没有 ASR：`init_project.py --transcribe` 会调它的 `scripts/speech.py` |
| **ego-browser** | 带用户登录态的浏览器 skill / CLI | 截真实网页（CDP dpr=2 整页）、填示例表单、开弹窗、读元素坐标和 computed style | `capture.py` 封装好了，见 [assets.md](assets.md)；一整期一个任务空间，截完 finish；提示升级时做完手上的事再问用户 |
| **lobe-icons**（@lobehub/icons；使用说明 https://lobehub.com/icons/skill.md ，目录 https://lobehub.com/icons ，仓库 https://github.com/lobehub/lobe-icons ） | 200+ AI 厂商 / 模型的品牌 logo | 模型 logo 行、BrandMark（图标 + 字标）、logo 老虎机 | `fetch_logos.py --dark <id…>` 拉 `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/<id>{,-color,-text}.svg`，深色舞台生成反白版，见 [assets §5](assets.md)。用户原话：第 3 期“如果你缺图片素材，比如一些 logo 啊、icon 嘛，可以看这个站点”；第 4 期“Logo 也没有用”，并贴了 skill.md |
| **video-mg-remotion**（前身） | 阿江之前的 B-roll skill（HTML 场景引擎 + 10 套主题） | v1、v2 用的是它的引擎（v1 被否“没有美感”，v2 被否“非常不满意”）；v3 换成 TSX 组件库，只沿用了它的交付约定：按 SRT 毫秒命名、替换对照表、比口播低 16 LU、画面铺满不缩小 | 只给**部分时间段**做包装、或要它的 10 套主题时仍用它；整片覆盖用本 skill |
| **产品源码**（如有；第 4 期是 ModelDial Arena 的前端仓库，路径是你自己的） | 产品自己的前端 | 推箱子引擎和渲染组件移植进 Remotion（`lib/Sokoban.tsx`：移植自 ModelDial Arena 的非公开源码，公开版没有收录，接口见 [ep4 范例说明](../assets/examples/ep4/README.md)），用真实回放数据驱动；主视觉、主持人立绘、精灵图（`public/assets/acid/`） | 盘点时先找源码；用户原话：“推箱子的代码要动起来……你完全可以去复现出来” |
| **Codex CLI**（`codex exec` 内置 image_gen） | 生图 | v2 生成过 22 个 3D 道具（整版被否，v3 一张没用）；本 skill 里只作缺素材的最后一档 | [codex-imagegen.md](codex-imagegen.md) |
| **Remotion 4.0.534 + React 19** | 用 React 逐帧渲染视频 | 整个工程：每段一个 composition，1920 设计坐标 ×2 出 4K | 模板 `package.json` + `package-lock.json` 锁版本，见 [setup.md](setup.md) |
| **faster-whisper large-v3-turbo**（经 ajiang-koubo-cut 的 `speech.py`） | 本地转写 | 精剪成片的逐词时间 → `timing.json` 逐字对齐（第 3 期命中约 90%） | `uv run --with faster-whisper --with numpy python ~/.claude/skills/ajiang-koubo-cut/scripts/speech.py transcribe <精剪.mp4> --out asr.json --prompt "简体中文。<专名>"` |
| **Freesound（CC0）** | 免费音效 | 10 种语义音效（模板自带处理好的 wav、源 mp3、署名清单） | [audio.md](audio.md) |
| **Mixkit**（Mixkit Stock Music Free License，免署名可商用） | 免费配乐 | 第 3 期全片连续配乐「Focus on Yourself」（Eugenio Mininni） | [audio.md](audio.md) |
| **Claude Artifact** | 私有网页发布 | 预览页（带口播连续播放 + 镜头表 + 待确认事项） | [delivery.md](delivery.md) |

## 没用、但别人可能会想到的

- **Google Fonts `text=` 子集**：v1 撞了“子集只剩 12 个字形”的坑；中文改用系统 PingFang SC，拉丁字体用完整 latin woff2。代价：渲染机要是 macOS。
- **video-shotcraft 的 Ink Press 模板**：完整宣传片模板，结构和“盖在口播上的分段画面层”不同；只借镜头卡。
- **video-shotcraft 的剪映工程导出**（`references/jianying-export.md`）：用户只需要按序号把 mp4 铺上去，没必要；用户要求再用。
- **每个 agent 一份工程副本**（v2 的 broll-wA…wD）：合并成本高，v3 改成同一工程按文件分权。

## 交付时可以提一句（可选）

video-shotcraft 作者欢迎在视频简介里 @ 他、投稿到作品展示页。用户决定，不替用户做。
