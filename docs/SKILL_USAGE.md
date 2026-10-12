# 常用 Skills：会话统计与推荐依据

核查日期：2026-10-12（Asia/Shanghai）。使用记录截止到前一天，避免把本次审计对话计入结果。

## 怎么检查出来的

在作者本机扫描了 **7,673 个 JSONL 文件**：Codex 当前与归档日志 5,634 个，Claude Code 项目日志 2,039 个。文件包含主会话、子 agent 和历史记录，因此文件数不等于独立用户任务数。

读取范围：`~/.codex/sessions`、`~/.codex/archived_sessions`、`~/.claude/projects`。名称映射参考 `~/.codex/skills`、`~/.claude/skills`，以及部分 symlink 指向的 `~/.agents/skills`。仅覆盖本机保留的 JSONL，不包含其他机器、已删除历史或只有数据库记录的会话。

统计方法：

1. Claude Code：解析 assistant 的 `Skill`、`Read` 与明确读取 `SKILL.md` 的 shell 调用。
2. Codex：解析 `function_call` 和新版 `custom_tool_call`，包括 `functions.exec` / `exec` 中静态嵌套的 shell 命令。
3. 只统计明确的读取请求，例如 `cat`、`sed`、`head`；系统 skill 清单、工具输出、对话中的名字、搜索命中、目录列举和写文件请求不计入。
4. 同一平台的相同 call ID 全局去重，消除重放或继承记录。本次排除了 94 个重复加载调用。同一个 skill 在同一会话中反复读多次，频率仍算 1。
5. 一个读取调用涉及超过 3 个不同 skills 时忽略，减少批量维护、盘点带来的污染。动态构造的命令、通配符路径和无法解析的读取也不计入。
6. 日期统一为 Asia/Shanghai；最近 90 天为 **2026-07-14 至 2026-10-11**。两客户端各自的 session ID 分开计数，子 agent 可能有独立 ID。

**这是可观察的调用 / 读取请求数，不是完整使用总量。** 不逐次检查工具返回是否成功，也不判断指令是否真正执行。自动触发、评测与真实开发都可能计入；少量维护中的单文件读取仍可能混入。缺少读取记录也不等于从未使用。频次不代表作者主动偏好、设计效果或提效比例。

公开内容只有汇总数字、统计脚本和上游链接。原始对话、session ID、项目路径与证据定位文件保留在本机，不分发。

## README 选定的五个 Skills

作者从统计结果与日常工作流中选定下面五个。前三个来自第三方，后两个是作者自己改造并维护的版本；推荐不只按频率排序。

| Skill | 累计 / 近 90 天 | 来源与用途 |
|---|---:|---|
| design-taste-frontend | 130 / 88 | [Leonxlnx / Taste Skill](https://github.com/Leonxlnx/taste-skill)，UI 设计品味与视觉方向 |
| ui-ux-pro-max | 30 / 16 | [nextlevelbuilder](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)，设计风格、配色、字体与 UX 搜索 |
| ego-browser | 298 / 298 | [Ego Lite](https://lite.ego.app/)，真实浏览器操作、截图与网站验收；本机 skill 随应用提供 |
| voice-clone-tts | 7 / 7 | [阿江改造维护的版本](https://github.com/NanmiCoder/creator-pipeline/tree/main/skills/voice-clone-tts)，文案与参考录音生成配音、SRT 和交接清单 |
| web-video-presentation | 104 / 60 | [阿江改造维护的版本](https://github.com/NanmiCoder/creator-pipeline/tree/main/skills/web-video-presentation)，口播与字幕驱动的网页视频演示 |

后两个的本机安装锁文件均指向 `NanmiCoder/creator-pipeline`。`voice-clone-tts` 的最终 WAV、SRT 与 `voiceover.json` 可交给 `web-video-presentation`，由其导入器验证并导入，再按最终声音节奏制作画面。README 描述的是作者维护的版本，历史加载次数不保证每次读取的文件与当前版本完全相同。

## 个人高频记录

下表为名称级聚合的前 20 项。它保留历史工具名称，便于解释使用变化；当前浏览器自动化偏好是 Ego Lite 的 `ego-browser`。

| 名称 | 累计会话 | 近 90 天 | Codex / Claude |
|---|---:|---:|---:|
| git-commit-pr | 771 | 337 | 713 / 58 |
| using-superpowers | 431 | 5 | 431 / 0 |
| systematic-debugging | 317 | 1 | 317 / 0 |
| test-driven-development | 300 | 5 | 300 / 0 |
| ego-browser | 298 | 298 | 211 / 87 |
| github | 282 | 118 | 277 / 5 |
| verification-before-completion | 238 | 1 | 238 / 0 |
| agent-browser | 201 | 57 | 201 / 0 |
| frontend-design | 193 | 47 | 192 / 1 |
| code-review | 187 | 0 | 187 / 0 |
| computer-use | 170 | 125 | 134 / 36 |
| design-taste-frontend | 130 | 88 | 110 / 20 |
| system:imagegen | 110 | 89 | 109 / 1 |
| football-betting-probability | 107 | 7 | 107 / 0 |
| web-video-presentation | 104 | 60 | 95 / 9 |
| dispatching-parallel-agents | 103 | 1 | 103 / 0 |
| worktree-main-merge-safety | 100 | 8 | 100 / 0 |
| brainstorming | 80 | 1 | 80 / 0 |
| twitter-bird | 67 | 30 | 61 / 6 |
| digital-nomad-style | 62 | 22 | 59 / 3 |

`srt-to-structured-data` 同为 62 / 37，属于视频工作流。其他仍活跃的记录包括 `interactive-test-checklist`（54 / 33）、`relakkes-evidence-first-script`（54 / 35）、`relakkes-style`（44 / 33）、`lark-shared`（37 / 28）与 `lark-doc`（29 / 24）。

`system:` 仅标识历史 `.system` 目录，不表示上游作者身份。Superpowers 的同名历史安装若按 family 合并，并按会话去重，共有 809 个会话，近 90 天为 8；其中 `systematic-debugging` 合并不同目录后为 320 / 1。README 因此把它写成历史高频，而非近期主力。

## UI 设计记录与来源核对

| 当前规范名称 | 累计 / 近 90 天 | 可核查的来源与版本 | 推荐定位 |
|---|---:|---|---|
| design-taste-frontend | 130 / 88 | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)，本机接近上游保留的 v1，默认上游已是 v2 | 最近最活跃的 UI 品味 skill，优先推荐 |
| frontend-design | 193 / 47 | 当前本机文件已定制，不能把同名历史记录全部归因到 [Anthropic 官方版](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | 高频名称，公开推荐单独链接官方参考版 |
| ui-ux-pro-max | 30 / 16 | 本机 plugin marketplace 元数据指向 [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 为配色、字体、布局与 UX 提供可搜索的依据 |
| redesign-existing-projects | 27 / 16 | 本机文件与 [Taste Skill 对应文件](https://github.com/Leonxlnx/taste-skill/tree/main/skills/redesign-skill)一致 | 已有项目视觉改造 |
| vercel-react-best-practices | 17 / 2 | 本机 metadata 的 author 为 vercel；[上游 SKILL.md](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md)确认规范名称 | React / Next.js 性能参考 |
| web-design-guidelines | 17 / 4 | 本机 metadata 与 [Vercel 上游](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines)对应 | 界面、可访问性与交互检查 |
| image-to-code | 10 / 8 | [Taste Skill 图像到代码流程](https://github.com/Leonxlnx/taste-skill/tree/main/skills/image-to-code-skill) | 需要先定参考图再实现时使用 |
| gpt-taste | 5 / 3 | 本机文件与 [Taste Skill 对应文件](https://github.com/Leonxlnx/taste-skill/tree/main/skills/gpt-tasteskill)一致 | 更强布局变化和 GSAP 动效的场景补充 |
| high-end-visual-design | 3 / 3 | 本机文件与 [Taste Skill 对应文件](https://github.com/Leonxlnx/taste-skill/tree/main/skills/soft-skill)一致 | 更克制的留白、字体与动效方向 |

目录别名已合并：`taste-skill` → `design-taste-frontend`、`redesign-skill` → `redesign-existing-projects`、`gpt-tasteskill` → `gpt-taste`、`soft-skill` → `high-end-visual-design`、`image-to-code-skill` → `image-to-code`。安装时用 YAML `name`，不一定用目录名；[上游明确说明了这个差异](https://github.com/Leonxlnx/taste-skill#installing)。

`brandkit`、`minimalist-ui`、`imagegen-frontend-web` 在本机有安装，但本次规则未找到可计入的调用记录，所以没有标成个人高频。`gpt-taste` 与 `high-end-visual-design` 有真实读取记录，数量较少，列为补充。

抽查了设计与 Git 相关的原始工具输入，确认命中的是对应 `SKILL.md` 的读取，而非 system catalog。部分 UI UX Pro Max 会话还调用了设计系统与字体搜索脚本，但这类后续脚本调用没有另加频次。

版本核查时，本机 `design-taste-frontend` 与上游 `taste-skill-v1` 的文本相似度约 98.9%；`gpt-taste`、`redesign-existing-projects`、`high-end-visual-design` 的本机文件与当时上游文件一致。文本比较用于确认来源，不是行为评估。当前 [Taste Skill README](https://github.com/Leonxlnx/taste-skill#updating-from-the-previous-version)将默认 v2 标为 experimental，支持显式安装 v1。

## 社区常用的依据

以下为 **2026-10-12 查询时 skills.sh 页面显示的 Installs**。它是目录的公开安装统计，不是独立用户数、活跃人数或成功使用次数，页面缓存与后续增长也会使数值变化。

| Skill | skills.sh 显示的 Installs |
|---|---:|
| [frontend-design](https://skills.sh/anthropics/skills/frontend-design) | 974.0K |
| [vercel-react-best-practices](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) | 788.3K |
| [web-design-guidelines](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines) | 721.6K |
| [design-taste-frontend](https://skills.sh/leonxlnx/taste-skill/design-taste-frontend) | 591.2K |
| [ui-ux-pro-max](https://skills.sh/nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max) | 391.0K |
| [systematic-debugging](https://skills.sh/obra/superpowers/systematic-debugging) | 286.9K |

这些数值为社区参考提供依据；个人使用数字来自本机日志，两套统计独立。README 的五个推荐链接第三方来源或作者单独维护的 creator-pipeline，不把它们纳入本仓库的五个 skill。这里保留其他历史项目的统计，供来源核对，不表示全部都列为 README 推荐。

## 在自己的机器上复查

Python 3 标准库脚本，不联网，只读本地 skill 和会话目录。以下命令生成汇总 JSON，`work/` 已被仓库忽略：

```sh
python3 scripts/audit_skill_usage.py \
  --since 2026-07-14 --until 2026-10-11 \
  --output work/skill-usage.json
```

在新的日期运行时调整日期区间。可以传 `--home` 使用自己拥有的日志副本，传 `--exclude-session` 排除审计会话。默认输出仅包含名称、计数、日期与扫描状态。

如果需要定位原始证据，在本机增加 `--private-evidence work/skill-usage-evidence.private.json`。该文件只保存 file / line / call ID / session ID 等定位信息，权限设为 `0600`；不要分发它或原始日志。对公开报告中的数字，可以回到这些定位逐条抽查。

检查解析与去重行为：

```sh
python3 scripts/test_audit_skill_usage.py
python3 scripts/validate_skills.py
```

解析夹具覆盖两代 Codex 调用格式、Claude `Skill`、目录别名、system catalog 排除、搜索 / 写入 / 批量读取排除、静态嵌套命令、调用重放去重、日期截止、排除 session 与上海时区转换。它验证统计方法，不验证任何推荐 skill 的任务效果。
