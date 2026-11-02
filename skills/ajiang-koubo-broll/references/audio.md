# 声音

`S` = 本 skill 目录，`P` = 工程目录。声音和章节 agent 第一轮并行做（主控的轻活）；init 已放好静音配乐占位，bgm.py 之前跑预览不会 404。

成片音频 = 配乐 + 音效，**不含口播**（口播留在用户的原音轨）。另出「无配乐版」（只有音效）。

## 目标

- 带配乐版整体比口播低 14–18 LU（目标 16；口播响度 init 时量好写在 `meta.voiceLUFS`，第 3 期 −20.3 LUFS）。
- 两版真峰值 ≤ −14 dBTP。
- 段与段之间响度不跳（配乐各段差 ≤1.5 LU）。

## 音效：语义事件 + 统一音色

章节代码只写 `export const sfx: Sfx[] = [{ t: say('seg1','不一致'), k: 'alert' }, …]`，k 是语义：

| k | 用在 | 第 3 期素材（Freesound CC0） |
|---|---|---|
| whoosh | 镜头推拉、大转场 | fs:71852 digital whoosh soft |
| swish | 元素滑入、横推 | fs:667419 swish wipe |
| click | 鼠标点击 | fs:687107 mouse click |
| type | 打字（`dur` 秒，循环铺满） | fs:718673 键盘 |
| pop | 卡片/胶囊落位 | fs:517095 tap（6k 低通） |
| tick | 计数、逐项、粘贴 | fs:528561 |
| chime | 结论出现（正向/中性） | 本地合成（E6 + B6 + E7 衰减） |
| alert | 不一致/掉包（低沉不刺耳） | fs:653910 soft hit + 合成两音下行 |
| paper | 翻牌 | fs:615337 |
| shutter | 截图/报告生成 | fs:661279 相机快门 |

- 模板已带这 10 个处理好的 wav（`public/sfx/`）和源 mp3、`recipe.json`、Freesound 署名清单。不换音色就什么都不用做。
- 换音色：`python3 ~/.claude/skills/video-shotcraft/assets/scripts/sfx-source.py search` 按「声源 + 材质 + 时长」搜（不是搜抽象情绪），默认只要 CC0 → `get` 下到 `public/sfx/src/` → 改 `recipe.json` → `python3 $S/scripts/sfx_prep.py --project $P` → `node scripts/reaudio.mjs`。新素材没写 `pre` 时自动量「攻击点」（包络第一次到 70% 峰值；和第 3 期人工定的值吻合 ±0.04s，快门这种双击声要人工核）。
- 稀疏：只给有辨识度的动作（点击、打字、落位、结论、推拉）。连发（计数、删圆点）音量递减。
- 混音参数在 `src/data/mix.json`：`sfxGain`（全局，模板默认 0.3；第 3 期最终 0.45，第 4 期 0.45 时只比口播低 13.0–13.5 LU，降到 0.3 后 14.2–15.1 LU、真峰值 ≤ −17 dBTP）、`trim`（按段再乘，音效密的段 0.5–0.8；第 3 期 seg3 0.78、seg4 0.55、seg5 0.58、seg7 0.7、seg8 0.5）、`base`（各类默认音量）、`pre`（音源峰值滞后，提前播放让峰落在事件时间上）。改它只需 `node scripts/reaudio.mjs [segN]`。
- **BRIEF 不要给音效写音量范围**（第 4 期写了“音量 0.35–0.6”，各段音效的 v 均值被抬到 0.40–0.46，高于 base 的 0.22–0.42）。章节 agent 只写音效类型和时间，音量用 `base`。
- 第 3 期首次 4K 出来 seg0 带配乐版 −30.9 LUFS / 峰 −9.9 dBTP（只比口播低 10.6 LU，音效太响）→ 全局 0.45 + 按段 trim 后 14.4–15.4 LU、峰 ≤ −15 dBTP。`check.py` 不过时会按「只有音效那一轨」的实测给出建议 trim。

## 配乐：一条贯穿全片

```sh
python3 $S/scripts/bgm.py --project $P --track work/music/<曲>.mp3 --loop-at 236 --loop-to 100 \
  --credit "Mixkit「Focus on Yourself」(Eugenio Mininni)，Mixkit Stock Music Free License，免署名可商用 https://assets.mixkit.co/music/568/568.mp3"
```

- 选曲：轻、稳、无人声、无强鼓点、不抢口播；企业/科技向的 lo-fi、轻电子、钢琴氛围。来源：Mixkit 免费曲库（`curl -sL -A Mozilla https://mixkit.co/free-stock-music/tag/corporate/` 里能扒出 `assets.mixkit.co/music/<id>/<id>.mp3`），或 video-shotcraft 的 `assets/audio/bgm`。下载几首候选，用 numpy 看 5 秒窗响度曲线，挑起伏小的。第 3 期选的 568 号从 −20 渐强到 −10 LUFS，靠包络拉平才能用。
- 不够长：`--loop-at`（原曲第几秒开始 4 秒交叉淡化）回跳到 `--loop-to`（选段落起点）；够长就不用写。
- 处理链：拼接 → `dynaudnorm`（先压一遍长时变化）+ 3kHz 以上 −3dB 给人声让位 → 3s 短时 RMS、10s 滑动平均做增益包络（±10/8 dB 封顶）拉平 → 包络之后再做 0.6s 淡入、3s 淡出（反过来包络会把片尾淡出顶回去，第 3 期 seg8 踩过）→ 整体对齐到口播 −16 LU → 按段帧数精确切片到 `public/audio/bgm-segN.wav`。
- 用 numpy RMS 而不是 ffmpeg `ebur128` framelog：后者在这台机器上读不到逐帧值（第 3 期报错后改的）。
- 输出 `out/bgm-report.txt`：各段 LUFS 和峰值。
- 署名写进 `src/data/credits.json`，`deliver.py` 会生成「音乐与音效来源.txt」。

## 验收

- `check.py` 只能证明响度和峰值；**没逐条试听就在回复里说没试听**，并告诉用户「嫌吵就换无配乐版或把 B-roll 轨音量拉低」。
- 预览页里的声音如果是调整前的版本，要在预览页或回复里注明。

## 只改声音时

`src/data/mix.json`、`public/sfx/*`、`public/audio/bgm-*` 变了 → `node scripts/reaudio.mjs [segN …]`：只重渲两条 wav，用 ffmpeg 复制视频流重封装，几秒一段，画面不动。`affected.py` 会把这类改动归到“只重做音轨”。
