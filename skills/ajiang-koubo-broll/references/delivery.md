# 预览、渲染与交付

`S` = 本 skill 目录，`P` = 工程目录。node 脚本在 `P` 里跑。

## 0. 四种渲染

| 用途 | 命令 | 规格 |
|---|---|---|
| 静帧自检 | `node scripts/still.mjs segN 0.5 3.2 … --tag=v1 [--scale=1] [--guides]` | 默认 0.5 倍（960×540），拼图带时间和安全区红框；一次 ≤14 帧 |
| 预览（带口播） | `node scripts/preview.mjs segN [--conc=2] [--from=12 --to=20]` | 960×540、配乐 + 音效 + 口播，CRF 24 veryfast |
| 成片 | `node scripts/render.mjs [segN …] [--conc=10]` | 1920×1080 × `meta.output.scale`（默认 2 → 3840×2160）、H.264 CRF 16、bt709、AAC 320k；每段出带配乐版 + 无配乐版；校验帧数 = timing 里的帧数 |
| 只改声音 | `node scripts/reaudio.mjs [segN …]` | 只重渲两条 wav，复制视频流重封装，几秒一段 |

每段独立 entry（`src/entries/segN.tsx`）、独立 bundle 目录、`enableCaching:false`；终渲用 `src/index.tsx` 一次打包，任何一段编译错误都会让它失败，所以终渲前 `npx tsc -p .` 必须全绿。长渲染用 `run_in_background` + `> out/render.log 2>&1`，等完成通知。

## 1. 预览闸门（默认停）

**例外**：用户说过“不要问我了 / 起床就要成片”这类话，就跳过这一节。直接按 §2 渲 4K 交付，交付物里带 1080p 带口播预览，回复里写清“需要你看一眼”。第 4 期就是这样交付的，用户回复“做得太好了！”。

前提：第三轮修完、主控抽查过改动最大的帧、所有预览比代码新。

```sh
for k in seg0 seg1 …; do node scripts/preview.mjs $k --conc=4; done          # 章节 agent 都停了才用 conc=4
uv run --with opencv-python-headless --with pillow --with numpy python $S/scripts/mosaic.py --project $P --scan   # 隐私第二道
python3 $S/scripts/preview_page.py --project $P                                # 读 work/preview.json
```

- `work/preview.json`（主控写，没有就只出骨架）：`title / eyebrow / h1 / lead`、`asks`（需要用户看一眼的：口播和数据的出入、稿子和录音不一致处、字幕专名、隐私怎么处理的）、`notes`（怎么做的、声音没逐条试听）、`beats`（每段镜头表，取自章节 agent 回报：`{"seg0": [["0–8s", "画面讲什么<span class=\"tag\">卡名</span>"], …]}`）。
- `preview_page.py` 会**拒绝生成**：没扫过二维码、有图片比上次扫描新、上次扫描还有未处理命中（人工确认是误报时用 `--privacy-ok "理由"` 放行）。会**警告**：哪些段的预览比代码 / lib / 数据 / 截图旧、哪些段缺预览。
- 发布：`Artifact(file_path=$P/preview/index.html, files={"v/seg0.mp4": "$P/preview/v/seg0.mp4", …})`（脚本会打印这个映射）；改版重发同一个 file_path，链接不变。没有 Artifact 工具时 `cd preview && python3 -m http.server`。
- 给用户的消息用 [prompts.md](prompts.md) §5 的预览闸门模板。然后**停**。
- 等待期间：确认**所有章节 agent 都空闲、隐私已过两道**后，可以后台先渲 4K（第 3 期用户在渲染中途问过“咋样了”，先渲能省半小时）。用户一提修改就 TaskStop，改完只重渲受影响的段。

## 2. 4K → 检查 → 第三道隐私 → 交付

```sh
# 排队渲（推荐）：验收过一段就追加一段；队列空了、且有 stop 文件时退出
mkdir -p out/logs && nohup bash scripts/queue.sh --conc 6 > out/logs/queue.log 2>&1 &   # 常驻；没有 agent 在跑时可以 8–10
printf "seg0\nseg5\n" >> out/render-queue.txt                     # 验收过一段就追加一段；'seg3!' = 强制重渲（改了 affected.py 看不到的东西时）
touch out/render-queue.stop                                       # 全部入队后再 touch；队列取空后退出（下次启动前删掉）
# 或一次渲全部：
node scripts/render.mjs > out/render.log 2>&1                    # 后台；第 3 期 6 分 03 秒全片 41 分钟，第 4 期排队约 37 分钟
python3 $S/scripts/affected.py --project $P --stale              # 有没有段比源文件旧 / 缺成片
python3 $S/scripts/check.py --project $P                         # 文件名、3840×2160、帧率、帧数、响度、真峰值、段尾空舞台、段首接缝亮度
uv run --with opencv-python-headless --with pillow --with numpy python $S/scripts/mosaic.py --project $P --frames out/final/*.mp4 --every 2
python3 $S/scripts/deliver.py --project $P --to <精剪交付>/B-roll成片   # 默认还出全片 4K（校验帧数 = masterFrames）+ 1080p 带口播预览，剪映贴法自动补这两条；--no-full 关
```

- 用 `run_in_background` 起一个等待命令（如 `while pgrep -f queue.sh; do sleep 20; done`），队列渲完会通知主控，不用轮询。

- `check.py` 不过：音效偏响 → 按提示改 `mix.json` 的 `trim` → `reaudio.mjs`；配乐 → `bgm.py` → `reaudio.mjs`；`--fix-peak` 可对个别段限幅。段尾判据合稿时实测过（占位段末帧残留 1.00% / 0.73% 被抓出，干净段 0.00%；原来按整帧平均差的判据漏报了这两段）；trim 建议公式没用真实偏响的成片校准过，当参考，以实测为准。
- `deliver.py` 先跑 check，不过不拷；交付目录已有 mp4 时**拒绝覆盖**——这是停点，先问用户覆盖还是另建 `B-roll成片-v2`，确认后加 `--overwrite`。`--dry-run` 只写三个说明文件。

## 3. 交付物

```
B-roll成片/
  0_开场模拟掉包_00-00-00,000~00-00-42,650_字幕1-22.mp4     ← 带配乐 + 音效，不含口播
  …
  B-roll全片_4K_配乐音效_不含口播.mp4                          ← 分段按顺序拼成一整条，帧数 = 母版；用户说要“一个 4K 成片”时就是它
  预览_B-roll加口播_1080p.mp4                                  ← 画面层 + 口播混好，只用来看效果，不要拖进工程
  无配乐版/<同名>.mp4                                          ← 只有音效
  替换对照表.txt      每段 SRT 起止、分:秒:帧、帧号、覆盖字幕条号、首句末句
  音乐与音效来源.txt  配乐出处与许可、实际用到的 Freesound 条目
  剪映贴法.txt
```

## 4. 剪映贴法（`deliver.py` 生成同样内容的 txt）

用户交付后问过：“那我的内容就是完整的把这一个跟着我原有的时间线贴上去就行了，是吧？贴到剪映上”——答“对”，并给这几步：

1. 工程 16:9，帧率和成片一致（接缝才对得上帧）。
2. 口播精剪视频留在主轨；N 个 B-roll 全选，拖到上一条画中画轨，从 0 秒开始首尾吸附。文件名以序号开头，按顺序拖进去就对；放好后对一下替换对照表（比如第 1 段应从某秒开始）。
3. 每段都铺满 16:9，口播原画被完全盖住。
4. 头像：口播视频再复制一层放最上面，加圆形蒙版，缩小放到右上角（B-roll 在那块一直留空）。
5. 字幕：导入精剪 SRT，B-roll 底部留了一行字幕位置。
6. 声音：口播用原轨；B-roll 自带配乐和音效（比口播低约 16 LU），直接保留；想自己配乐就用 `无配乐版/` 同名文件替换；嫌吵就把 B-roll 轨音量拉低。

## 5. 回复用户

- 列交付目录和文件。
- 剪映贴法（上面 6 步，或指向 `剪映贴法.txt`）。
- 验证过什么：帧数 / 分辨率 / 命名、响度和真峰值数值、段尾空舞台、从 4K 成片抽帧扫过二维码。
- 没验证什么：**声音只用仪器测过，没有逐条试听**；预览页里的声音是不是最终版。
- 可选：video-shotcraft 作者欢迎在简介 @ 他、投稿作品展示页。
