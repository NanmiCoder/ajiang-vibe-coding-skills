# 工程与依赖：一条命令建工程，依赖可复现

`S` = 本 skill 目录，`P` = 工程目录，`E` = 精剪交付目录。

## 1. 环境前提

- macOS（中文走系统 PingFang SC；换平台要另配中文字体）、Node ≥ 20（实测 26）、npm（实测 11）、ffmpeg / ffprobe、python3（numpy、Pillow）、`uv`（临时装 OpenCV、faster-whisper：`uv run --with … python …`）。
- 可选：ego-browser（截图）、codex（生图）、video-shotcraft（镜头卡）、ajiang-koubo-cut（精剪 / 转写）。

## 2. init_project.py

```sh
python3 $S/scripts/init_project.py list --srt E/<名>-精剪.srt          # 先通读字幕，写 chapters.json
python3 $S/scripts/init_project.py --out $P --srt E/<名>-精剪.srt --master E/<名>-精剪.mp4 \
    --chapters chapters.json --asr E/work/edited-asr.json
```

| 参数 | 作用 |
|---|---|
| `--master` | 精剪 MP4，或**纯口播音频** mp3 / wav / m4a（第 3 期一开始给的就是 mp3 + SRT）。纯音频按 `--fps`（默认 60）换算帧号；mp3 的封面图不算视频流 |
| `--fps` | 纯音频母版的帧率；视频母版不是恒定整数帧率时 init 会拦下——**停下来问用户**按多少 fps 做，再用它指定 |
| `--asr` / `--transcribe --prompt` | 逐字时间。必须是**精剪后同一条时间轴**的转写（`ajiang-koubo-cut` 的 `work/edited-asr.json`）。没有就 `--transcribe`，调 koubo-cut 的 `speech.py`，缓存在 `P/work/asr.json` |
| `--env` | `shared`（默认）/ `local`（工程内 npm install）/ `none` / `<目录>` |
| `--link-node-modules <dir>` | 直接软链一个已有 node_modules；**先查依赖清单和 esbuild，不全就拒绝**；不往对方目录里写任何东西 |
| `--chrome-from <dir>` | 已下载的同版本 `chrome-headless-shell` 目录，克隆过来省掉首次渲染的 170MB 下载 |
| `--git` | git init + 一次提交（可选快照） |
| `--force` | 只把 `src/lib`、`scripts` 升级到模板最新版，并重切口播 |

**产物：**

```
P/src/data/timing.json   唯一时间数据源：段 → 字幕 → 每个字的开口秒数（say()/cue() 读它）
P/src/data/meta.json     帧率、成片尺寸 / scale、口播响度、安全区、段落表
P/src/data/tokens.json   设计 tokens（模板默认带 _default，开工必须用 extract_tokens.py 覆盖）
P/src/data/pages.json    截图登记表（capture.py 写）    P/src/data/mix.json  音量参数
P/src/segs/SegN.tsx      占位（章节 agent 改写）       P/src/segs/Sample.tsx  只重导出 Seg0（第一章就是样板，主控亲自做 Seg0）
P/src/entries/segN.tsx   每段独立入口；sample.tsx 样板入口（勿改）
P/src/index.tsx          全部段（render / reaudio / studio 用）
P/public/audio/voice-segN.wav  口播切片（只进预览）；bgm-segN.wav  静音占位（bgm.py 覆盖）
P/BRIEF.md               总纲模板        P/替换对照表.txt        P/work/chapters.json
```

**重跑安全：** 已存在的文件一律不覆盖；`src/segs/*`、`src/data/{tokens,pages,mix}.json`、`BRIEF.md` 永远不覆盖（`--force` 也不会）；`timing.json`、`meta.json`、entries、`index.tsx`、对照表按最新输入重写（它们是派生数据）；已有的 `bgm-segN.wav` 不覆盖。改了章节就重跑，章数变少时旧入口会删掉，旧的 `SegN.tsx` 保留不动。

**逐字对齐：** difflib 把字幕逐字对到 ASR 的逐词时间，没命中的字在同一条字幕内插值。命中率 <60% 会警告（多半拿了原始录音的 ASR）；60–85% 的“半对齐”会让 `say()` 有零点几秒系统误差、肉眼难查——派发前抽查 3 个 `say()`。

## 3. 依赖可复现（第 3 期的教训）

**踩过的坑（实际）：** broll-v3 的 `node_modules` 软链到 broll-remotion，后者又软链到 406 期的工程，三层；而且 broll-v3 自己的 `package.json` 漏了 `@remotion/fonts`（`Stage.tsx` 在用），能跑全靠旧工程碰巧装过。换机器、清掉旧工程，第一次打包就会失败。三位草稿作者里有一份模板也漏了它，测试时同样被软链掩盖。

**现在的做法：**

1. 模板 `package.json` 写全依赖（含 `@remotion/fonts`），带 `package-lock.json`。
2. `--env shared`：在 `$AJIANG_BROLL_CACHE`（默认 `~/.cache/ajiang-koubo-broll`）下按 **package.json + lockfile 的哈希**建 `env-<hash>/`，首次 `npm ci`；以后各期软链过去。依赖一变哈希就变，自动新建环境，不污染旧期。
3. npm 11 默认拦截依赖的 install scripts（会打印 `npm warn install-scripts esbuild … postinstall`）。Apple Silicon 上 esbuild 的二进制来自 `@esbuild/darwin-arm64`，不跑 postinstall 也能用；init 仍补跑 `node node_modules/esbuild/install.js`，再**实测一次转译**，失败才提示 `npm install-scripts approve esbuild && npm rebuild esbuild`。
4. **依赖清单检查**：remotion、@remotion/{bundler,renderer,cli,fonts}、react、react-dom、typescript、@types/react、esbuild，缺一个就报错。共享环境和 `--link-node-modules` 都查。
5. Chrome Headless Shell：Remotion 第一次渲染会往 `node_modules/.remotion/` 下载约 170MB（试跑时一次卡在 19MB 十几分钟）。init 读 `@remotion/renderer` 的 `TESTED_VERSION`，从缓存根下其它环境或 `--chrome-from` 克隆同版本（`cp -c`，APFS 秒级）。

**禁止**：软链到“某个旧工程”的 node_modules 而不查依赖。

## 4. 升级模板

skill 的 `assets/template/src/lib` 修了 bug 想用到正在做的工程：`init_project.py … --force`（只覆盖 lib 和 scripts）。**只在所有章节 agent 都停下时做**，改完按 lib 变更走（全部段重出静帧抽查，下一轮消息开头告诉 agent）。

## 5. 排错

| 现象 | 原因 / 做法 |
|---|---|
| `Cannot find module '@remotion/fonts'` | node_modules 不是从模板 lockfile 装的；重跑 init（`--env shared`） |
| 预览报 `404 … public/audio/bgm-segN.wav` | 静音占位被删了；重跑 init（不会覆盖已有配乐） |
| `ENOENT … src/entries/sample.tsx` | 入口被删；重跑 init（每次都生成 sample 入口） |
| `timing.json 里没有段 segN` | 章节改了没重跑 init，或代码里写了不存在的段 |
| 静帧全是默认橙色 | tokens.json 还是模板默认值，`still.mjs` 会提醒；跑 `extract_tokens.py` |
| 渲染卡在下载 Chrome | 用 `--chrome-from` 指向已下载的同版本目录，或换网络后重试 |
| `cv2` 找不到 | `uv run --with opencv-python-headless --with pillow --with numpy python …` |
| `sleep 60; cat log` 被 harness 拦 | 长任务 `run_in_background` 等完成通知；要轮询就 `until <条件>; do sleep 2; done` |
