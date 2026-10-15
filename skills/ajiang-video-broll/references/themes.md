# 主题预设

模板 = **版式与动效编排（layouts.js）** + 配色 + 字体 + 舞台底纹/页眉 + 动效参数 + 音效映射 + 配乐风格 + 响度。全部在 `assets/themes/<id>/` 里。场景只写内容（`use` + `data`），换模板就换掉整套构图和节奏，不只是换颜色——这是用户明确要求的（“我给你那个站点是让你参考不同的实现，而不是还是原来的布局”）。

```
assets/themes/<id>/
  theme.json   vars（CSS 变量）、variants（变量覆盖）、fonts、chrome（底纹+页眉 HTML）、motion、sound
  theme.css    组件类和模板自己的类（自动加 .stage[data-skin=id] 前缀；不能写 @keyframes/@media）
  layouts.js   BrollCore.template(id, (H, ctx) => ({hero, list, focus, metric}))：每个版式返回 {build, sfx, update}
assets/engine/
  broll-core.js  逐帧引擎（预览和 Remotion 共用）；expand() 按模板把 use+data 展开成场景
  layouts-default.js  通用版式（旧预设用它；也是写新模板的参照实现）
  base.css       组件结构，只用变量取色
```

## 主题库：10 套（2026-10-15 用户选定）

`group`：`chosen` 主选 / `kept` 主题库。其余候选和旧预设在 `assets/themes/_archive/`（不参与构建，需要时移回来）。

| id | 名字 | 组 | 参考 | 版式语言（一句话） | 适合 |
|---|---|---|---|---|---|
| `paper-signal` | 纸白信号橙 | **chosen** | 414 预览（prompt-motion 风） | 瑞士国际主义海报：12 栏网格、巨号索引数字、橙色扫描条显影 | 产品发布、功能清单、观点 |
| `sticker-pop` | 贴纸波普 | kept | pm #2 | 白板系统图：粗描边彩色标题栏窗口 + 流动虚线连线 | 痛点 → 踩坑 → 方案、吐槽教程 |
| `mint-switch` | 黑白薄荷 | kept | pm #89 | 黑白整屏硬切：白场步骤条 + 黑场终端卡，一个薄荷绿 | 原理、四步走、Agent 讲解 |
| `warm-haze` | 暖雾 | kept | pm #103 | 镜头在一个巨大的产品界面上漂移，暖雾色团 | 产品 demo、上手教程 |
| `sticky-audit` | 便签复盘 | kept | pm #208 | 证据墙：模糊碎片被扫描线逐个对焦、编号、连线 | 工作流、排查、从乱到有序 |
| `riso-print` | 孔版印刷 | kept | pm #170 | 孔版海报：错位叠印色带、印版换页、维恩叠色 | 三要点、A 对 B、轻松介绍 |
| `showa-poster` | 昭和海报 | kept | pm #130 | 特摄标题卡：巨字硬切卡 + 放射线 + 竖排 + 红幅 + 印章 | 单字点题、重磅、翻车开场 |
| `retro-sunburst` | 复古旭日 | kept | pm #53 | 对称庆典海报：旋转光芒、锯齿徽章、撒花 | 里程碑、榜单、感谢 |
| `color-cards` | 彩卡拼贴 | kept | pm #190 | 整屏饱和色卡逐张推进，收成倾斜拼贴 | “它能做什么”的枚举、案例墙 |
| `bauhaus-grid` | 包豪斯几何 | kept | pm #227 | 设计学院作品集取景器：几何形网格、图片裁成几何形 | 结构、模块、设计 / 架构 |

各自的音色和配乐见 theme.json 的 `sound`；更细的“适合 / 不适合”写在每套的 `fits`。

## 怎么选

1. 同一期视频的各段（开场 / 中部 / 结尾）**沿用同一套主题和变体**。用户说“同样的方式 / 配色音效差不多”就是这个意思，直接沿用上一段工程的 `theme.lock.json`（`init_project.py --from`）。
2. 新一期视频：
   - 用户已在主题库里选过（Artifact 的 db 里有 `picks/current`）→ 用他选的；
   - 否则从选题推 2–3 套候选放进预览页，**每套都用真实素材做同一个场景**，让用户挑。不要只换配色。
3. 用户可以要“新主题”：复制最接近的一套目录改 `theme.json` / `theme.css`，id 用英文短横线。新主题做完会自动出现在主题库页面（`assets/gallery/build.py` 读取 `assets/themes/`），并在这张表里补一行。

## 写场景时守住的约定（换主题不坏）

- 颜色只用变量：`var(--bg) --fg --muted --accent --accent2 --card --card-fg --line --shadow --ok`。不要在场景里写死色值（品牌 logo 除外）。
- 字体只用变量：`--title --sans --mono --hand --num`。手写批注用 `.hand`；手稿主题下中文会回退到楷体。
- 组件用公共类：`.kick .ttl .body .num .hl .mark .card .ph .chip(.on) .stamp .hand .tag .rule`，SVG 线条用 `H.line / H.path`（默认 `var(--accent)`）。
- 动效优先写**角色**：`data-a="@title|@text|@card|@photo|@number|@item|@note|@stamp|@line|@logo"`（`H.A('@card', t)`），由主题的 `motion.roles` 决定具体动效，换主题时招牌动效跟着换（孔版的标题会套印错位，芥末黑金的数字会带残影）。需要固定某个动效时直接写类型：`fade up mask pop slam stamp drop lift spin wipe wipeY bar draw type flicker rgb focus strike misreg trail`，加 `data-count`。幅度和缓动由主题的 `motion.params` 决定。元素自带旋转写 `--r`，动画会拼上去。
- 换页方式由主题 `motion.transition` 决定：`fade wipe push rise flash cut invert iris zoom blur`。
- 音效只写语义事件（`sfx:[[秒,'stamp',.6], …]`），事件名见下表，主题负责映射成具体音色。

| 事件 | 用在哪里 |
|---|---|
| `enter` | 元素出现 |
| `type` | 打字机 |
| `draw` / `mark` | 描线 / 批注、圈画 |
| `card` / `deal` | 卡片落位 / 一组卡片连发 |
| `count` | 数字滚动 |
| `transition` / `slide` | 换页 / 滑入 |
| `check` | 打勾、条目点亮 |
| `stamp` / `hit` | 盖章 / 重点砸入 |
| `reveal` / `key` | 揭示 / 一个关键结论 |
| `warn` | 问题、bug、告警 |
| `scan` / `shot` | 扫描 / 截图快门 |

## 主题库页面

本地预览：`python3 assets/gallery/serve.py`（构建页面、能生成就生成试听音频，在 http://127.0.0.1:8765/ 打开；`?id=<模板id>&t=<秒>` 直接定位）。

在 Claude 里：`build.py <out>`（从 skill 的主题和引擎拼页面）+ `theme_demo_audio.py`（每套的试听音频）后发布成 Artifact，用户在上面：切主题和变体、看同一段 12 秒演示、单独回放每个动效、试听每个音效和配乐，然后“就用这套”并保存到 db（`picks/current`：theme / variant / backups / note）。读取：`ArtifactData get collection=picks doc_id=current`。

改了主题文件后重跑 `build.py` + `theme_demo_audio.py`，再用同一个 file_path 重新发布（链接不变）。

## 新增或修改一套模板

1. 复制最接近的一套目录，改 `theme.json` 的 id / name / group，重写 `layouts.js`（四个版式都要实现，只用 data 字段）和 `theme.css`（类名加模板前缀，不写 @keyframes/@media）。
2. 招牌运动写在版式的 `update(t, el)` 里，必须是 t 的纯函数（不能用 Math.random / Date），预览和 4K 渲染才能逐帧一致。
3. 自检：`<venv>/python assets/gallery/qa.py <id> <输出目录>` 出 8 个时间点的拼图，检查压头像 / 字幕、溢出、和参考片是否像、和别的模板是否明显不同。
4. 主题库：`python3 assets/gallery/build.py <out>` → `<venv>/python scripts/theme_demo_audio.py <out>/assets/audio --theme <id>` → 再 build 一次 → 用同一个 file_path 发布。主题库页面自己的 CSS 选择器不要写成 `.th span` 这种后代选择器，会误伤缩略图舞台里的元素（踩过：高亮词被压成 13.5px）。
