<p align="center">
  <img src="./assets/readme/hero.png" width="100%" alt="阿江的 Vibe Coding Skills：把日常开发、复现、审查与验证的实践，整理成可复用的方法卡片">
</p>

# Ajiang Vibe Coding Skills

**程序员阿江日常 vibe coding 习惯的蒸馏。八个独立 skill，帮你把 AI 协作开发做得更有依据、更容易验收。**

<p align="center">
  <a href="#快速开始">安装</a> ·
  <a href="#按问题选-skill">Skill 目录</a> ·
  <a href="#我常用的其他-skills">其他常用 Skills</a> ·
  <a href="#这些-skill-从哪里来">来源</a> ·
  <a href="./LICENSE">MIT</a>
</p>

## 从一个真实问题开始

你让 AI 修一个 bug，它改了代码、跑了检查。换回用户原来的环境，问题还在。

`ajiang_debugging` 会把这次协作拉回可验证的结果：区分现象和归因，先建立失败证据，找到原因后最小修复，再从原入口、原条件复测。

```text
使用 ajiang_debugging 调查这个 issue。
先核验报告里的现象和归因，修复后按原用户流程验证。
告诉我：原因是什么、什么证据支持它、哪些环境仍未验证。
```

同样的思路延伸到新功能、外部集成、代码审查、重构、上手和发版。每个 skill 都能单独使用，必要的方法和模板随它一起安装。

## 快速开始

在你要开发的项目目录中，通过 [Vercel Skills CLI](https://github.com/vercel-labs/skills) 安装：

```sh
npx skills add NanmiCoder/ajiang-vibe-coding-skills
```

交互选择需要的 skill 和 coding agent。也可以只装排障：

```sh
npx skills add NanmiCoder/ajiang-vibe-coding-skills --skill ajiang_debugging
```

全部安装到指定 agent：

```sh
npx skills add NanmiCoder/ajiang-vibe-coding-skills --skill '*' --agent codex
```

默认安装到当前项目；添加 `--global` 可安装到用户范围。需要 Node.js/npm 和能访问仓库的网络。技能内容本身不要求模型 API Key、MCP 或作者的其他 skill。

安装后，在 Codex 中可用 `$ajiang_debugging`，在 Claude Code 中可用 `/ajiang_debugging`；也可以在任务中直接写“使用 ajiang_debugging”。实际调用遵循你所用客户端的配置与权限。

## 按问题选 Skill

- [ajiang_feature_iteration](skills/ajiang_feature_iteration/SKILL.md) — 做新功能、迭代已有功能，完成最小用户路径与验收。
- [ajiang_debugging](skills/ajiang_debugging/SKILL.md) — 排查原因不明或修后仍复现的 bug，留下失败证据与原流程复测。
- [ajiang_contract_audit](skills/ajiang_contract_audit/SKILL.md) — 检查接口、配置、插件和同步，追到实际消费者与负向验证。
- [ajiang_adversarial_review](skills/ajiang_adversarial_review/SKILL.md) — 独立审查高影响改动，给出有触发条件的发现并逐条核验。
- [ajiang_ablation_refactor](skills/ajiang_ablation_refactor/SKILL.md) — 对膨胀代码做消融，用证据决定删、合并或保留。
- [ajiang_newcomer_acceptance](skills/ajiang_newcomer_acceptance/SKILL.md) — 按 README 和普通安装入口，验收新用户第一项真实成果。
- [ajiang_git_delivery](skills/ajiang_git_delivery/SKILL.md) — 明确范围提交、集成或创建 PR，在最新目标状态下验证。
- [ajiang_release_verification](skills/ajiang_release_verification/SKILL.md) — 核对版本、CI 和实际发布产物，确认用户拿到的结果。

只选当前问题需要的 skill。一次小改动不必启动所有流程；独立审查不必固定开四个 agent，内部逻辑测试也不必每次调用真实模型。

## 我常用的其他 Skills

点击名称查看项目与安装方式。

| Skill | 用途 | 来源 |
|---|---|---|
| [design-taste-frontend](https://github.com/Leonxlnx/taste-skill) | 提升 UI 设计品味，改善布局、字体与动效 | Leonxlnx |
| [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 搜索配色、字体组合、设计风格与 UX 规则 | nextlevelbuilder |
| [ego-browser](https://lite.ego.app/) | 操作真实浏览器，截图、提取数据、验证网站 | Ego Lite |
| [voice-clone-tts](https://github.com/NanmiCoder/creator-pipeline/tree/main/skills/voice-clone-tts) | 用自己的声音生成配音与字幕 | 阿江改造维护 |
| [web-video-presentation](https://github.com/NanmiCoder/creator-pipeline/tree/main/skills/web-video-presentation) | 把口播与字幕做成网页视频演示，导出 MP4 | 阿江改造维护 |

后两个可以配合使用：先生成配音与字幕，再按声音节奏制作画面。

## 这些 Skill 从哪里来

我是[程序员阿江 / Relakkes](https://github.com/NanmiCoder)。这套 skill 来自最近几个月我和 AI 一起开发、迭代和维护软件的日常实践。

项目里的真实问题反复让我追问：你复现了吗？为什么认定是这个原因？独立审查发现的东西真的成立吗？别人按 README 能跑通吗？发布出来的包，真的包含这次修复吗？

这些问题和有效的解决方法，来自桌面 Agent、VoxAgent、TodoCue、MediaCrawler / MediaCrawlerPro，以及 DeepSeek Harness 插件等开发场景。我把其中可以迁移的习惯整理成独立 skill，补上输入、操作方法、证据、验收和工具不足时的处理方式，让别人在自己的项目里也能用。

开源的是重新编写的协作方法和原创练习。原始私密对话、账号凭证、作者本机配置不随仓库分发。部分方法的来源是历史会话整理材料；具体技术事实仍要在目标项目与版本中核验。详见[来源与整理边界](docs/ORIGIN.md)。
