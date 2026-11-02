# 素材：截图、tokens、logo、隐私

`S` = 本 skill 目录，`P` = 工程目录。Python 脚本缺包时前缀 `uv run --with numpy --with pillow python`；用到 OpenCV 的加 `--with opencv-python-headless`。

## 1. 每个画面需要的东西从哪来（按顺序，先满足的那条就是答案）

| 需要的东西 | 来源 | 判例 |
|---|---|---|
| 主视觉、舞台、吉祥物 / 主持人立绘、游戏精灵图、产品自己的状态横幅 | 产品仓库 `public/assets/` 或官网首页大图、OG 图，整张当舞台和主题用（[art-direction §0](art-direction.md)） | 第 4 期 v4 用 `modeldial-arena/public/assets/acid/arena-sokoban.webp`、`host-sokoban.webp`，被认可“后续全部按这个做吧” |
| 产品自己在前端画的动画（游戏棋盘、表盘、回放器） | **读产品源码，把引擎和渲染组件移植进 Remotion，用真实记录驱动**；录屏和截图只作兜底。数据从产品自己的接口或静态 JSON 拉（第 4 期：`/data/runs/<runId>.json`），用脚本抽成 `src/data/*.json`（范例 `assets/examples/ep4/lib/extract_sokoban.py`） | 用户原话：“推箱子的代码要动起来。本来我们就是用一些前端技术做动画嘛……你完全可以去复现出来”。移植后 13 段逐步回放录屏全部作废 |
| 口播提到的真实界面（产品页、设置、结果页、榜单、思考记录） | **ego-browser 截真实页面**（§3），用来“证明页面上真这么写”；不是每句都截（[chapters §3.5](chapters.md)） | 用户原话：“核心思想就是能去截图，能看到真实网页的一些效果”；以及“并不是所有的页面你都需要用实际的截图” |
| 用户自己给的图（报告、海报、后台局部） | 原图直接用（`Img` / `Cutout` + 取景框标注），不用 HTML 重画 | v3 报告卡用原图，四块取景框逐一咬合，审片评为全片最好之一 |
| 某个状态没法安全截到（已填表单、关掉的弹窗） | 用示例数据截真实页面；或在真实截图上做局部补丁（补丁颜色取截图像素） | seg8 把 det-group 右上角换成 det-api 的同一块，拼出“交流群关闭态” |
| 私人后台、有隐私的页面 | **不截**；只用用户给的图，`Cutout` 只裁需要的那一行 | 测试网关后台有个人邮箱和消费额，截了又整批删掉 |
| 品牌 / 模型 logo | lobehub（§5）；产品字标从官网 `<svg>` 取 | 用户原话：“缺图片素材，比如一些 logo 啊、icon 嘛，可以看这个站点” |
| 抽象概念（锁、数据库、钥匙、勾叉） | lib 的线性图标 `Icon`，用 tokens 颜色 | v3 全片都用它 |
| 页面上没有的界面（终端、对话窗、分布图） | **手搓 MG**：同一套 tokens、原生排版。有真实数据就用真实数据；纯概念用产品原生物件来演（按钮、生命条），不画“示意”图表 | 第 4 期 v3 的“1 点 = 1 分”点阵被否：“示意图那些写得感觉也很丑陋” |
| 具体物件或场景，图标说不清、页面上也没有 | **Codex 生图**（[codex-imagegen.md](codex-imagegen.md)），最后一档 | v2 的 22 个 3D 道具整版被否 |
| 动态素材（用户录屏、生成视频） | 抽成 JPG 帧序列再进 Remotion，不直接放 `<video>` | 渲染时 `<video>` 不同步（video-mg-remotion 踩过） |

两条禁令：不用生成或手搓去**复刻一个真实存在的界面**；不用生成图当**装饰**。

## 2. 设计 tokens：从产品自己的 CSS 抽

目标：所有颜色、字体、圆角、阴影都出自当期产品，MG 像产品自己长出来的。产物 `P/src/data/tokens.json`，lib 全部读它，换产品不改组件代码。模板里的默认值带 `_default` 标记（中性纸白 + 橙），**不是任何产品的设计**，`still.mjs` 看到会提醒。

**先找视觉来源，按优先级：**

1. 产品自己的网站 / Web 应用（第 3 期：modeldial.com 的 `styles-base.css`）。
2. 产品的桌面 App / 终端界面：截图取色；Electron 应用可拆 `app.asar` 找 CSS。
3. 开源项目：看项目自己的文档站或 logo 配色（GitHub 页面不算产品视觉）。
4. 没有单一产品（观点、横评、资讯）：取画面主角的原生截图；舞台用中性浅底，强调色取频道一贯的颜色。实在没有，就用模板默认值，删掉 `_default`，并在第一章确认消息里写明“没有产品视觉来源，用的是默认配色”。
5. 用户明确讨厌的风格不碰，即使产品本身就是：深海军蓝 + 电光蓝发光、霓虹、粒子。产品真是深色科技风时，只取底色、强调色和产品自己的主视觉资产（舞台图、立绘），**我们自己不加发光**。第 4 期的 ModelDial Arena 是深色酸性绿风，照这样做被认可。

tokens 只是颜色和字体。主题还要加上产品自己的主视觉和动画组件，以及这期的演出类型，见 [art-direction §0](art-direction.md)。

**静态抽取（大多数站点够用）：**

```sh
python3 $S/scripts/extract_tokens.py https://<官网>/ --out $P/src/data/tokens.json --fonts $P/public/fonts --wordmark $P/public/logo
```

- 抓首页同站样式表，列出 CSS 变量，按变量名猜语义（`--bg`→bg、`--text`→ink、`--accent/--primary/--blue`→accent、`--success/--positive`→good、`--danger`→bad、`--warning`→warn），缺的从 accent 和底色推导；底色亮度 <0.25 判深色，自动切深色舞台参数（极淡环境光、白点阵、黑阴影）。
- 拉丁字体在 Google Fonts 上就下 latin woff2；**中文一律系统 PingFang SC，不做 `text=` 子集**（v1 踩过子集只剩 12 个字形）。
- `--wordmark` 把首页 logo 链接里的 `<svg>` 存成 `wordmark.svg` / `wordmark-white.svg`（Read 一下确认是字标不是图标）。
- 输出里的 `_evidence` **主控必须看**：对照截图确认 accent 是品牌色，不是某个按钮的 hover 色。合稿时对 modeldial.com 实测：bg / surface / accent / good 和第 3 期定稿（`assets/examples/ep3/tokens.json`）一致；ink、muted、line、warn 差一点点；bad 抽到的是站点的 `#AA4A43`，第 3 期提亮成 `#C8473E` 给小面积用——所以抽完一定要人工校对。

**Tailwind v4 站点**：主题变量叫 `--color-bg`、`--color-accent`、`--font-display` 这类名字。脚本已经能识别 `--color-*` 和 `--font-*`；第 4 期旧脚本漏抽，把深色站判成了白底。抽完一定要对照截图看 bg 和 accent。下载 CSS 或字体时要带浏览器 UA，否则会被拒。

**CSS-in-JS / 只有 `--tw-*` 的站点**（颜色几百个）：用 ego-browser 读 computed style，手填进 tokens.json：

```sh
ego-browser nodejs <<'EOF'
const task = await taskSpace("broll-<期名>");
const page = task.page("tokens");
await page.goto("https://<官网>/"); await page.waitForLoadState(); await page.waitForTimeout(2000);
console.log(JSON.stringify(await page.evaluate(() => {
  const pick = (sel) => { const el = document.querySelector(sel); const s = el && getComputedStyle(el); return s && { bg: s.backgroundColor, color: s.color, font: s.fontFamily, radius: s.borderRadius, border: s.borderColor, shadow: s.boxShadow }; };
  return { body: pick('body'), h1: pick('h1'), btn: pick('button[class*=primary], a[class*=primary], button'), card: pick('[class*=card], article, section'), input: pick('input'), code: pick('code, pre') };
}), null, 1));
EOF
```

**校对清单（写进 tokens.json 前逐条过）：**

- [ ] accent 只有一个，就是品牌主色；第二品牌色只在 logo 里出现。
- [ ] good / bad / warn 有出处（优先产品自己的状态色；第 3 期用报告卡“一致 / 相近 / 不一致”的配色，把站点 `--red #AA4A43` 提亮到 `#C8473E` 给小面积用），并在 BRIEF 第 1 节写明本期语义。
- [ ] ink 和 bg 对比度够，28px 正文清楚。
- [ ] stage 和产品底色同一色系，环境光取 accent 的浅色，点阵透明度 ≤0.16；深色产品环境光 ≤0.10、不发光。
- [ ] shadowTint：浅色产品取 accent 加深一档，深色产品纯黑。
- [ ] 字体：拉丁用产品字体，中文 PingFang SC，等宽用产品代码字体（没有就 Geist Mono）。
- [ ] 删掉 `_default`。改 tokens 等于改全片画面：派发后再改就要全部重渲（`affected.py` 会这样报）。

## 3. 截真实页面：capture.py（ego-browser，2x，自动坐标表）

先列“每章要推近的真实页面状态”再截，别只截首页：空表单、已填表单、弹窗、切换后的模式、结果页、对照的第三方页面。一个状态一张图，用 `Window` 的 `layers=[{t, src}]` 在镜头里切换，看起来就像真人在操作。

```sh
python3 $S/scripts/capture.py --project $P --space "broll-<期名>" --name home --url https://<官网>/ --wait 3000 --note "首页"
python3 $S/scripts/capture.py --project $P --space "broll-<期名>" --name tool-filled \
  --before 'await page.fill("loc=css:input[placeholder=\"模型 ID\"]", "claude-opus-5-5"); await page.waitForTimeout(2000); await page.evaluate(() => document.querySelectorAll(".error").forEach(e => e.style.display = "none"));'
python3 $S/scripts/capture.py --project $P --space "broll-<期名>" --name modal --viewport --before 'await page.click("text=查看全部"); await page.waitForTimeout(1500);'
python3 $S/scripts/capture.py --space "broll-<期名>" --finish        # 整期一个任务空间，截完 finish 一次
```

- 原理：`Emulation.setDeviceMetricsOverride({width:1600,height:1000,deviceScaleFactor:2})` + `Page.captureScreenshot({captureBeyondViewport:true, clip:{…, scale:1}})`。脚本校验输出像素宽 = 2×CSS 宽，不是就报错。**不用 `page.screenshot`**：它出 1x 图，推近就糊（第 3 期第一张截图就是 1x，重截）；也别给 clip 加 `scale:2`，Retina 上会变 4 倍。
- 先滚回顶部再截（否则 sticky 头卡在页面中间）；页面上的临时报错（第 3 期已填表单页的“HTTP 530”）用 `--before` 隐藏；数字滚动动画多等一会（`--wait`）；`--max-h 4000` 限高（整页太高时浏览器纹理有 16000px 上限，也没人看）。
- 不传 `--url` 就接着上一条命令的页面状态截。表单里填示例值：URL 用 `relay.example.com`，Key 显示成圆点。
- 输出：`public/st/<名>.jpg`、`src/data/pages.json` 登记 `{w,h,url,els,note}`、`out/capture/<名>.layout.txt`（元素框表）、`<名>-preview.jpg`（1000 宽，用 Read 看全貌）。
- `els` 自动收集可见的标题、按钮、输入框、tab、带 aria-label 的区块，键名如 `button:开始检测`；章节代码 `const [x, y, w, h] = el('st/home.jpg', 'button:开始检测')`。缺的用 `--el 名字=CSS选择器` 补。
- 用户给的图（非网页）拷进 `public/st/`，不进 pages.json，坐标用原图像素：`python3 $P/scripts/grid.py <图> x0 y0 x1 y1 out/tmp/grid.jpg --px`。
- 看到 `[ego-browser:notice] … update is available` 不自己升级，做完问用户。
- **浏览器有缩放时**（第 4 期 ego-browser 是 125%，CSS 宽变成 1280、dpr 2.5），capture.py 会报“截图宽不是 2×CSS 宽”。补偿办法：视口宽按 `1600×缩放` 设，或 `deviceScaleFactor: 2/缩放`。
- **站点用内部滚动容器时**（如 `main.arena-content`），“整页”只有一屏高。先用 `--before` 注入 CSS，解除容器的 `overflow` 和高度限制，再截。
- **点击用 JS 触发**（`el.click()`），别用模拟鼠标，否则会截到 ego-browser 的光标浮层。
- **私人状态别截**：第 4 期 `task.jpg` 露出了本机的模型配置状态，整张作废。“设置”页、API Key 页一律不进。
- **录屏 vs 移植**：产品自己用前端画的过程动画，优先移植（§1）。第 4 期先派采集 agent 录了 24 段回放（1.35GB），最后只用上 5 段。开工先查源码和数据接口，能移植就不录过程，只录真实的交互操作（填表、点按钮、切换）。

**清晰度上限**（推近会不会糊看素材，不看镜头参数）：4K 成片上每个源像素被放大的倍数 = `z × 窗口缩放 k × 2 / dpr`，≤2 清晰，≤3 可短暂停留，再大就重截（dpr 3，或只对那个元素截 4x），或在旁边用 MG 重写成大字。第 3 期 2x 整页在 1560 宽窗口里推到 z≈2.2–2.8 仍清楚；用户给的 1x 报告卡（1200 宽）只能推到源图 1px ≈ 屏幕 1.55px。

## 4. 隐私：三道关，绝不能排在预览之后

第 3 期用户看预览时说：“真的非常棒，但是你要注意有一些二维码我们得打个马赛克”——二维码在报告卡、交流群弹层、海报、单独二维码图 4 张源图里，被多个镜头引用，最后整片重渲。所以：

| 关 | 什么时候 | 命令 |
|---|---|---|
| ① 入库 | 每截一批、每拷一张用户图 | `uv run --with opencv-python-headless --with pillow --with numpy python $S/scripts/mosaic.py --project $P --scan`；命中就 `mosaic.py --project $P public/st/x.jpg --auto`（认不出用 `grid.py --px` 量了手动框 `x0 y0 x1 y1`） |
| ② 发预览前 | 预览页生成前 | 再跑一次 `--scan`（写 `out/privacy-scan.json`）；`preview_page.py` 会检查这个戳比所有图片新、且没有未处理命中，否则拒绝生成 |
| ③ 成片 | 4K 渲完、交付前 | `mosaic.py --project $P --frames out/final/*.mp4 --every 2`，抽帧再扫一遍 |

- 在**源图**上打码（原图备份到 `out/orig-mosaic/`，`--restore` 还原），所有引用它的镜头一起变，不改镜头代码；打完 `affected.py` 找出要重渲的段。
- 扫描用标准检测器 + Aruco 检测器（第 3 期交流群弹层的码标准检测器认不出），对第 3 期 4 张原图全部命中。但**扫不出 ≠ 没有**：花式 / 带 logo / 低对比的码会漏，邮箱、手机号、Key、消费额、不该露的产品名根本扫不到——每张截图入库时用 Read 人眼看一遍。
- 后台、账户页、带邮箱 / 手机号 / 消费额 / 余额 / 密钥的页面不截。用户稿子写了“不出现 XX 名字”的，素材里一律不露，只用 `Cutout` 裁允许的那一行，范围写死进 BRIEF 第 3 节。

## 5. 品牌 logo（lobehub）

先读一次使用说明 https://lobehub.com/icons/skill.md （本机也有 `lobe-icons` skill）。id 在目录 https://lobehub.com/icons 查。

静态 SVG：`https://unpkg.com/@lobehub/icons-static-svg@latest/icons/{id}{变体}.svg`。

| 变体 | 是什么 | 注意 |
|---|---|---|
| 无后缀 | 单色图标，`fill="currentColor"` | **深色舞台上是黑的，看不见**（第 4 期 openai、grok 撞过两次） |
| `-color` | 彩色图标 | openai、grok、xai、anthropic 没有彩色版 |
| `-text` | 英文字标 | 都有 |
| `-text-cn`、`-brand`、`-brand-color` | 中文字标、品牌组合 | 第 4 期用到的 8 家都没有 `-text-cn` |

```sh
python3 $S/scripts/fetch_logos.py --project $P --dark claude openai gemini grok deepseek kimi zhipu minimax
```

- 每个 id 都拉单色、`-color`、`-text` 三种，不存在的跳过并打印出来。
- `--dark`（tokens 是深色时加）只给单色图标和 `-text` 字标生成 `-white` 反白版，彩色版不动。
- 传入的 id 自己带变体后缀（如 `claude-color`）时，只拉那一个。

| 场景 | 用哪个 |
|---|---|
| 深色舞台上的图标 | 有 `-color` 就用 `-color`；没有就用 `-white` |
| 深色舞台上的字标 | `-text-white` |
| 浅色舞台 | `-color` 加原色 `-text`（第 3 期） |
| 点名一个模型 | **BrandMark = 图标 + 字标**（lobehub 里叫 Combine）。第 4 期的 `BrandMark` 写在 `ep4/lib/Sokoban.tsx` 里（公开版未收录），用法见 `assets/examples/ep4/segs/Seg12.tsx`、`seg8/Duel.tsx` |
| 产品自己的 logo | 不从 lobehub 取，从产品仓库或官网 `<svg>` 取（`extract_tokens.py --wordmark`）。取不到时用 ego-browser 读 `document.querySelector('header a svg, nav a svg, a[href="/"] svg')?.outerHTML` |

第 4 期 id 对应：GPT→`openai`、Claude→`claude`、Gemini→`gemini`、Grok→`grok`、DeepSeek→`deepseek`、Kimi→`kimi`、智谱→`zhipu`、MiniMax→`minimax`。

**什么时候必须出 logo：**
- 口播点名某个模型时，它的 BrandMark 在画面上。
- 选手登场、阵容、对比时，所有人都带 BrandMark。
- **悬念还没揭晓时也不去掉 logo**：身份位放 logo 老虎机，最后停在“?”，到揭晓那句再翻牌（第 4 期 seg0 的 1ST / 8TH 记分牌、seg8 翻成 Grok）。
  - 用户只说过“别把模型名称露出来”；v3 主控自己加了“不露 logo”，被否：“Logo 也没有用”。

logo 不用 AI 生成，也不手画。模板旧组件 `<Logo id="claude"/>`（别名见 `src/lib/UI.tsx` 的 `LOGOS`）仍可用，深色舞台记得指向 `-white` 文件。

## 6. 量安全区

用户的头像 / 字幕位置变了，或母版不是常规 16:9：`python3 $S/scripts/measure_safe.py <母版.mp4> out/tmp/safe.jpg --at=30` 出带 50px 网格的帧，Read 读坐标，改 `src/data/meta.json` 的 `safe`（still 拼图的红框跟着变）。纯音频母版没有头像画面，沿用默认。
