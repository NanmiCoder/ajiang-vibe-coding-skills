# 声音：主题音色 + 配乐 + 低于口播 16 dB

用户的三次反馈：
- 412 期：“音效太重了……像剪映那些……选轻微的那种” → 不用 boom、冲击、下坠、故障、梗音效。
- 414 期开场：“我现在要你做的就是背景音乐跟卡点的音效，然后音效那些效果要好一点” → 默认配乐 + 有质感的主题拟音，不要推荐“只配音效”。
- 414 期结尾：“不要太大声了 之前的视频感觉有些大 我处理过了” → 混音比口播低 **16 dB**（之前 10 dB 嫌响）。

## 生成

```sh
<venv>/python <skill>/scripts/broll_audio.py <工程> [--theme paper-signal] [--seg seg0] [--out 目录] [--min-gap 0.15]
node scripts/render-audio.mjs [segN]      # 只换成片音轨，不重渲画面
```

- 依赖 numpy、scipy、soundfile、pyloudnorm（建议放在一个单独的 venv 里），mp3 编码要 ffmpeg。
- 主题默认读 `src/broll/theme.lock.json`；时间线读 `src/broll/timeline-<seg>.json`（`build_broll.py --remotion` 从场景里的 `sfx` 导出）；可选 `src/broll/plan-<seg>.json` 写配乐计划。
- 输出 `public/broll/{mix,bgm,sfx}-<seg>.wav`，48kHz 立体声，长度精确到帧。成片只用 `mix`，另外两条是调试用的分轨。
- 全部代码合成，无版权问题。音色库在 `scripts/audio_lib.py`。

## 音色：主题决定，场景只写语义事件

场景里写 `sfx:[[秒, '事件', 增益], …]`，事件名见 [themes](themes.md#写场景时守住的约定换主题不坏)。主题的 `sound.sfx` 把事件映射成音色：

| 主题 | 音色 | 配乐 |
|---|---|---|
| paper-signal | tick、pluck、snap、thock、typing、counter、swipe、air、ding、pluck-up、shutter、alert、chime | marimba-pluck · 112 BPM |
| sticker-pop | zip、bubble、sticker、clap、typing、counter、swoosh、air、glock、pluck-up、shutter、honk-soft、pop | funk-pluck · 106 BPM |
| mint-switch | scan、blip、lock、keys-soft、data、glitch-soft、air、sub-tick、ping、arp-up、shutter、alert、confirm | soft-house · 122 BPM |
| warm-haze | tick、pluck、snap、glass、typing、counter、air、thock、ding、pluck-up、shutter、alert、chime | lofi-keys · 96 BPM |
| sticky-audit | scan、marker、pluck、card、stamp、typing、counter、page、whoosh、thock、ding、cascade、shutter、alert、tick | lofi-keys · 90 BPM |
| riso-print | roller、marker、pluck、card、stamp、typing、counter、page、whoosh、thock、glock、pluck-up、shutter、alert、pop | funk-pluck · 104 BPM |
| showa-poster | roller、tick、thock、taiko-soft、typing、counter、swoosh、air、bell、cascade、shutter、alert | taiko-ambient · 90 BPM |
| retro-sunburst | tick、pluck、card、confetti、typing、counter、swoosh、air、clap、glock、cascade、shutter、alert、chime | swing-uke · 120 BPM |
| color-cards | zip、bubble、sticker、clap、typing、counter、swoosh、air、glock、cascade、shutter、honk-soft、chime | funk-pluck · 118 BPM |
| bauhaus-grid | tick、glock、thock、clap、typing、counter、swoosh、air、arp-up、shutter、alert、chime | funk-pluck · 128 BPM |

每个音色都按最响的 100ms 对齐到同一电平，所以场景里的增益换主题后意思不变（`.2` 轻、`.5` 正常、`.8` 强调）。事件也可以直接写音色名，或者带时长（`'type:1.4'`）。

## 配乐

风格由主题 `sound.bgm.style` 决定：`felt-piano`、`marimba-pluck`、`synth-pulse`、`funk-pluck`、`minor-tech`。

- 计划是 `[(秒, 和弦, 能量 0–1, 有无鼓), …]`。不写时按主题的和弦进行每小节换一个。
- **跟着画面写计划**：换页处换和弦；讲“难点 / 先留着 / 反思”的页撤鼓、能量降到 .25；结论页能量最高。
- 段尾自动淡出。用户有自己的曲库音乐时，直接替换 `bgm-<seg>.wav` 再重混。

## 卡点规则

- 只给“观众需要注意到的那一下”配声音，卡在视觉落点（`pop` 的峰值、卡片落定），不是动画开始。
- 低电平下，大约每秒一个是可以接受的（414 期中部 36.7 秒 33 个，用户没意见）。同一组元素（三张卡片、三个勾）可以连着响。
- 两声小于 `--min-gap`（默认 0.15s）时只留更响的那个。打字和提示音不要叠，留提示音。

## 响度（硬约束）

| 项 | 目标 |
|---|---|
| 配乐 / 音效内部平衡 | 配乐先归一到 -24 LUFS，音效 -20.5 LUFS（音效比配乐突出约 3.5 dB） |
| 混音整体 | 同区间口播 LUFS **-16 dB**（14–18 可接受） |
| 峰值 | 4 倍过采样真峰值 ≤ **-14 dBFS**（tanh 软限幅） |

- 实测参考：414 结尾 -43.3 LUFS（口播 -27.3）；中部约 -46 LUFS（口播约 -30）。口播越轻，混音跟着越轻。
- `check_delivery.py` 读主题里的电平：低于口播不足 14 dB 警告、不足 10 dB 报错，峰值高于 -14 dBFS 报错。
- 交付时如实写“只做了响度测量，没有试听”，请用户先听第一段。

## Studio / 预览

- 预览页同步播放这一段的口播 mp3，可以选择叠上配乐混音一起听。
- 成片里**不含口播**；用户明确要求带口播时，按 [Remotion 制作](remotion-build.md#渲染) 最后一条把口播混进去，并在交付说明里写清楚。
