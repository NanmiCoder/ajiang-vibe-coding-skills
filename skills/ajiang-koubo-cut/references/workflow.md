# 执行接口

`SKILL_DIR` 指本 skill 所在目录；下列路径是示意，实际使用绝对路径。每次剪辑在视频旁新建独立交付目录，工作文件放其中 `work/`。不覆盖先前成片，不改原片。

## 分析与选段

```sh
python3 "$SKILL_DIR/scripts/cut.py" inspect "/path/口播.mp4" --out "/path/交付/work/source-info.json"
```

先读完整剪映字幕与逐字稿，区分重录、完整即兴段和未录出的稿件内容。SRT 仅是参考时轴：若与原音存在偏移或漂移，先纠正源字幕再选段。把判断落实为源时轴上的保留区间：

```json
{"keep":[
  {"start":3.5,"end":29.3,"note":"完整介绍"},
  {"start":34.8,"end":62.27,"note":"更完整的结果重录"}
]}
```

入点包含、出点不包含。时间用秒；需要精确指定时可用 `in_frame` / `out_frame`。按实际源帧率量化，共用这一套时间线处理视频、音频和字幕；不能单独把三条轨道各自去静音。

纠正后的源字幕 `source.json` 使用源视频时间，文本只写该段真正保留的表达：

```json
[
  {"start":3.5,"end":5.1,"text":"你看画面里的操作"},
  {"start":35.0,"end":37.1,"text":"你看结果有多猛"}
]
```

一条字幕横跨内容删除区时，优先按词或短句拆分并修正时间。如果边界被截断但已人工核对文字确实对应保留音频，可加 `"reviewed":true`；这不是跳过内容审核的批量开关。普通静音缩短可以在映射后保持同一条字幕。

## 一次转写，疑点局部校准

当前环境优先复用已有 Python/模型缓存。若默认 Python 缺包，可用 `uv run --with faster-whisper --with numpy python` 代替 `python3`，不为每个项目重装环境。

```sh
python3 "$SKILL_DIR/scripts/speech.py" transcribe "/path/口播.mp4" \
  --out "/path/交付/work/asr.json" --prompt "简体中文。<本次稿子的实际专名词表>"
```

输出保留词时间和原音转写。先用缓存模型，缺模型才下载；用 FFmpeg 解码后传数组，避免 PyAV 版本不兼容。ASR 与原字幕交叉核对，不把转写自动整理后的流畅句当作没有磕巴的证据。

仅在字词边界有争议时做短片段强制对齐，`cases.json` 里的文字必须包含原音实际说出的磕巴和重复：

```json
[{"start":18.2,"end":22.2,"text":"你看结果你看这个结果有多明显"}]
```

```sh
python3 "$SKILL_DIR/scripts/speech.py" align "/path/口播.mp4" \
  --cases "/path/交付/work/cases.json" --out "/path/交付/work/aligned.json"
```

`align` 使用可选的 `openai-whisper`。若机器已有 `whisper` CLI，优先使用其 shebang 指向的 Python，避免另装 Torch。对齐结果仍需结合波形判断；有时保留稍早的完整起句比硬切一个词更自然。不要为这一步固定选择本轮视频里的时间、模型名或人像坐标。

## 编译、导出、验证

```sh
python3 "$SKILL_DIR/scripts/cut.py" prepare \
  --video "/path/口播.mp4" --plan "/path/交付/work/plan.json" \
  --subtitles "/path/交付/work/source.json" --work "/path/交付/work"
python3 "$SKILL_DIR/scripts/cut.py" render \
  --work "/path/交付/work" --output "/path/交付/口播-精剪.mp4"
python3 "$SKILL_DIR/scripts/cut.py" verify \
  --work "/path/交付/work" --video "/path/交付/口播-精剪.mp4" --full-decode
```

`prepare` 默认只按保留段剪；确认长气口可缩短时增加 `--shorten-pauses`。先看 `--help` 获取参数；`-33dB / 0.30s / 留0.17s` 是干净口播的起点，不是对所有录音的固定标准。保留语尾和下一字起声；语气停顿不一律压成零。

剪后音频、字幕和映射可以先复核；确需画面预览时，`render --preview` 生成临时低分辨率预览。正式导出逐帧重编码，用单次 select/setpts，避免只按关键帧复制、音频按编码包边界粗切，或 split 多路导致大内存缓存。Apple 硬件编码不可用才回退 CPU。

帧率从源媒体读取，支持 25/30/60 和 30000/1001 等有理数帧率。若识别为可变帧率，先建立保持时长和音画同步的 CFR 工作副本，并确认字幕时轴，再按该副本工作，不静默把 VFR 当 CFR。

技术验证通过后仍要核对编辑判断：所有主要内容完整、相邻句接得上、没有重录残留、数字与所选录次一致、字幕没有带回被剪掉的文字。稿子有但未录出的内容若影响核心信息，交付说明简短注明即可，不生成不存在的口播。
