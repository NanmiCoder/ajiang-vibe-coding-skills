# 来源与整理边界

本仓库由程序员阿江 / Relakkes（GitHub: NanmiCoder）发起，整理的是作者日常与 AI 协作开发、迭代开源软件的习惯。

素材来自最近几个月多种软件项目的历史协作整理：桌面 Agent、VoxAgent、TodoCue、MediaCrawler / MediaCrawlerPro、DeepSeek Harness 插件等。整理同时关注作者提出的要求，以及 AI 在排障、架构分析、实验和复盘中给出的有效方法。

## 从习惯到 Skill

| 实际协作中反复出现的要求 | 独立 Skill |
|---|---|
| 先围绕我真正要完成的动作做实现 | ajiang_feature_iteration |
| 先复现，不要直接信 issue 的归因；按原条件验证 | ajiang_debugging |
| 配置显示正确，实际执行为什么不同？写入成功，后续读取呢？ | ajiang_contract_audit |
| 给独立背景做审查；你自己也要核实它的发现 | ajiang_adversarial_review |
| 先做实验，证明哪些复杂度有用，再重构 | ajiang_ablation_refactor |
| 当成第一次用项目的人，只按 README 跑一遍 | ajiang_newcomer_acceptance |
| 只提交本次范围；最新目标集成之后再验证 | ajiang_git_delivery |
| 不要 push 完就结束；看 CI，也看实际发布产物 | ajiang_release_verification |

转为公开 skill 时，为这些要求补齐目标范围、可执行方法、验收、证据分级、结束条件和缺少工具时的交接。个人项目的固定参数、精确平台行为和本机路径没有提升为所有项目必须遵循的规则。

## 公开的内容

重新编写的方法、模板、安装与评估说明、原创 Taskboard 教学夹具，以及 README 视觉素材。另附[常用 Skills 的汇总统计](SKILL_USAGE.md)与离线复查脚本；只公开名称、频次和来源，不分发原始会话或定位信息。Hero 是通过内置 imagegen 生成的概念插画，展示经验被整理为方法卡片，不是历史项目截图或实际测量结果。

不分发原始私密会话、用户日志、cookie/API Key、作者机器配置或其他已安装 skill。项目名称提供场景背景，不代表这些项目为本仓库背书。

## 证据边界

初始蒸馏输入是历史会话的二次摘要。仓库不把其中的具体缺陷数量、频次或所有技术归因作为重新复现过的事实，也不宣传未经测量的提效比例。

发布前检查的是 skill 自足性、Vercel Skills CLI 的发现/安装、包资源、README 和演练区分力。某个宿主中 agent 能否遵循方法、真实项目效果如何，需要独立行为评估；详情见 [VALIDATION.md](VALIDATION.md)。
