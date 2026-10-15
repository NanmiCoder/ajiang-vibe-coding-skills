# Remotion 制作

## 工程结构（`init_project.py --theme` 生成）

```
broll/
  scenes.js            场景（预览和成片共用的唯一画面代码）
  overlay.json         实测头像圆和字幕行（1920 坐标）
  assets/              场景用的截图、logo（__BASE__xxx），build 同步到 preview/ 和 public/broll/
preview/               build_broll.py --preview 的产物（Artifact 发布这里）
  assets/              同步来的素材 + clips/*.mp4（960w）+ 口播 mp3
src/
  segments.json        唯一时间数据源（改区间就重跑 init_project.py）
  broll/
    theme.lock.json    {"theme": "paper-signal", "variant": "signal"}
    engine.js          build 生成：broll-core + 解析好时间的场景 + 主题
    style.ts           build 生成：base.css + theme.css + 变体变量 + 本地字体
    timeline-segN.json build 生成：场景边界、语义音效、配乐风格、电平 → broll_audio.py 的输入
    clips.json         extract_clips.py 维护：{name: {frames, fps}}
    Broll.tsx          Remotion 组件：等字体和图片解码，scale 到母版宽度，放 mix-segN.wav
  segments/index.ts    每段 makeBroll(...) 登记
public/broll/          fonts/、frames/<clip>/0001.jpg…、mix|bgm|sfx-segN.wav、截图和 logo
```

`assets/starter/` 里的 TSX 组件库（mg.tsx、stage.tsx）仍然保留，只在需要强定制、数据驱动的对比段落时用；可以和 B-roll 段混着登记。

## 步骤

```sh
python3 <skill>/scripts/build_broll.py <工程> --remotion     # 或 --both
<venv>/python <skill>/scripts/broll_audio.py <工程>          # 混音，打印每段 LUFS / 峰值
npx tsc -p .
node scripts/stills.mjs seg0:0,150,600,1090                  # 每页落定后各一帧
python3 scripts/sheet.py out/sheet0.jpg out/stills/seg0_*.jpg
npm run render                                               # 或 node scripts/render-all.mjs seg1
```

- 改了文案：先 `fetch_fonts.py`（字体是子集，缺字会静默回退），再 build。
- 改了主题：`build_broll.py --theme id:变体 --both`，铅笔分镜要用 `sketchify.py --theme-project` 重新出图，再重混音频。
- 只改了声音：`broll_audio.py` + `node scripts/render-audio.mjs [segN]`，几秒钟换进成片，不重渲画面。

## 自检（看拼图，不是看日志）

- 和预览页对得上（同一引擎，差异通常是字体没加载或图片没解码）；
- 中文手写字有没有变成粗宋体（`--hand` 回退）；
- 视频片段在动（帧序列编号随时间变化），没有停在第一帧；
- 文字没有压进头像圆、字幕行；第 0 帧是完整舞台，最后一帧正常。

## 渲染

- 4K 整屏大约每秒 14 帧（1124 帧 77 秒）。第一次渲染会下载约 170MB 的 Chrome Headless Shell。
- 用户已经确认预览时可以直接全部渲染；没确认过的新做法先渲一段给他看。
- 用户要成片带口播（默认不带）：渲完后 `ffmpeg -i 成片.mp4 -i public/footage/segN.wav -filter_complex "[0:a][1:a]amix=inputs=2:normalize=0" -c:v copy …`，交付时写明。
