# 缺素材：Codex CLI 生图

> 用户点名的第 5 件事。用户原话（第 3 期 v1 之后）：“codex cli imagegen 可以用这个 CLI 的图片生成技能来生成你的图片。如果你缺图片素材，比如一些 logo 啊、icon 嘛，可以看这个站点（lobehub）”。
> 前提是**缺素材**，不是缺装饰。第 3 期 v3 最后一张生成图都没用。

## 1. 先判断该不该生成（按顺序，前面的能解决就别往下走）

| 情况 | 做法 |
|---|---|
| 产品页面上有 | 截图（`capture.py`），推近或 `Cutout` 抠出来 |
| 品牌 logo、模型图标 | `fetch_logos.py`（lobehub）或官网 svg；**不生成** |
| 抽象概念的小图标（锁、钥匙、数据库、时钟） | lib 的 `Icon`（lucide 笔画），缺的照 lucide 补 path |
| 终端、聊天窗、表格、图表、流程图 | 手搓组件（出版级排版、真实密度内容、同一套 tokens） |
| 口播里提到、页面上没有、图标又说不清的**具体物件或场景**（例：“让它画一只鹈鹕骑自行车”“像在路上拦个人报数字”） | **Codex 生图** |
| 氛围、装饰、3D 道具、背景 | **不要** |

## 2. 命令（第 3 期实测可用，单张约 70 秒，并发 5 稳定）

单张：

```sh
mkdir -p $P/work/gen && cd $P/work/gen && codex exec --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox -C . \
  "Use your built-in image_gen tool to generate ONE image and save it in the current directory as pelican-bike.png. Subject: a cute toy pelican riding a bicycle, side view. Style: <整批共用的风格串>. Do nothing else; reply with the saved file path."
```

批量（推荐：并发、PIL 校验、坏图自动重生成一次、拷进 `public/gen/`）：

```sh
cat > $P/work/gen.json <<'EOF'
{"style": "clean product illustration in the visual language of a modern product website, palette limited to <ink hex>, <accent hex>, <pale hex>, soft subtle shading, thin consistent strokes, soft contact shadow, no glow, no neon, no text, no letters, no logo, centered with generous margin, isolated on a solid {surface} background, 1:1 square",
 "items": {"pelican-bike": "a cute toy pelican riding a bicycle, side view",
           "passerby": "a friendly passerby on a street, holding up a card with a number"}}
EOF
python3 $S/scripts/codex_image.py --project $P --spec $P/work/gen.json --jobs 5
# → 原图 $P/work/gen/<名>.png（+ log-<名>.txt）→ $P/public/gen/<名>.webp（1024）
```

- 组件里：`<Img src={staticFile('gen/pelican-bike.webp')} />`，放进 `Card` / `At`，和别的元素同一套入场动效。
- 参考图：`--ref <产品截图>`（= `codex exec -i`，可多次）。第 3 期没验证过 `-i` 对 image_gen 的风格有没有效果，第一次用先生成 2 张看。
- 安全：`--dangerously-bypass-approvals-and-sandbox` 关掉了 Codex 的沙箱，所以 `-C` 必须指向只放生成图的目录（`work/gen/`），提示词里只写生成任务，不放密钥。

## 3. 风格串和去底（从本期 tokens 推，不从“这一版的舞台”推）

- **整批一条风格串**，颜色写成 hex，取自 `src/data/tokens.json`。`{surface}` 会被脚本替换成本期 surface 色值（如 `#FFFFFF`）：图的底色和 `Card` 的底色一样，放进卡片里看不出方块，**不用去底**。
- 主体颜色要明显深于底色；不要发光、玻璃、金属、霓虹（用户讨厌的深蓝科技光效）。
- **只有深色舞台、自发光物体**才用黑底 + `--alpha`（AE 的 Unmult：alpha = 最亮通道，压掉 3.5% 底噪、实体 ×1.35，颜色除以 alpha）。黑底 Unmult 放到浅色舞台上发灰发透，v2 的听诊器道具实测过。
- **每次迭代都完整重新生成**（完整提示词 + 原始参考图），不要把上一版输出当底图继续改——用户在封面上踩过：连续原地编辑会越改越假（“每次生成图片都要基于原始人脸形象”）。
- 生成完逐张 Read 看：风格不统一的整张重生成。

## 4. 已知坑

- Codex 偶尔报 “The image was generated, but I couldn't save the complete file”，存出打不开的 png：第 3 期 22 张里 **1 张**（fingerprint）。另一次 `robot-chat` 的 `UnidentifiedImageError` 是生成还没跑完就去转换、读到半截文件，等生成结束再转就好。脚本每张都 PIL 校验，坏的自动重生成一次；还失败看 `work/gen/log-<名>.txt`。
- 长批量放后台跑（`run_in_background`），等完成通知；不要 `sleep 60; cat log` 轮询（会被 harness 拦）。

## 5. 为什么 v2 的 22 个 3D 道具在 v3 全部弃用（反例）

v2 风格串原文：

```text
glossy 3D product-render icon, dark navy and electric blue (#4C7DFF) glass and brushed metal, soft rim light,
subtle blue glow, centered with generous margin, isolated on a pure black background (#000000), no text, no letters, no logo, 1:1 square
```

1. **风格跟着错误的方向走**：道具是照 v2 深海军蓝舞台定制的，舞台被否，道具一起作废。
2. **正是用户讨厌的审美**：玻璃、金属、电光蓝、光晕。
3. **不承载信息**：发光芯片、全息小人不解释任何事，还把真实页面挤成配角。
4. **和真实截图是两套视觉系统**：照片级 3D 材质放在扁平 UI 截图旁边，一看就是拼贴。
5. **线性图标说得更清楚**：钥匙、数据库、垃圾桶、秒表、听诊器，v3 都换成了产品色的线性图标。
6. **技术上不适配浅色舞台**：黑底 Unmult 在浅底上发灰。
