# 验证记录

日期：2026-10-11。环境：macOS ARM64、Node.js 26.7.0、npm 11.19.0、Python 3.14.5。

| 检查 | 状态 | 证明范围 |
|---|---|---|
| Vercel Skills CLI 本地发现 | 通过 | skills@1.7.2 发现八个 ajiang_ skill |
| 本地独立安装 | 通过 | 隔离项目中将八个 skill 复制至 Codex 与 Claude Code 的目录；不写用户级配置 |
| 安装后文件完整性 | 通过 | 两种 agent 目录共16份安装：SKILL.md、模板、许可证与源文件逐字节一致，并分别校验自足性 |
| 离线资源/链接检查 | 通过 | 自带 validate_skills.py；删除独立副本模板后检查正确拒绝 |
| GitHub README 审计与预览 | 通过 | audit_readme.py 检查 Hero/SVG 引用；Ego Lite 预览1200与390宽度；公开 GitHub 页面已确认两张素材加载、章节呈现 |
| 演练区分力 | 通过 | 本包原故障 3 通过/2 失败，隔离修复后 5 通过；原故障仍用于分发 |
| 公开远程发现/安装 | 通过 | skills@1.7.2 从 NanmiCoder/ajiang-vibe-coding-skills 克隆并安装八个 skill 至隔离项目的两种 agent 目录，全部16份与源文件逐字节一致且独立校验通过 |
| 宿主加载并执行任务 | 未验证 | 复制到 agent 目录不等于实际模型任务通过 |
| 跨平台与真实项目提效 | 未验证 | 未测 Windows/Linux、所有模型或生产规模 |

包校验只接受本包使用的简单单行 frontmatter，不是通用 YAML 校验器。命名按作者要求使用 ajiang_ 前缀，以 Vercel Skills CLI 实测为依据；不宣称通过所有采用不同命名限制的规范校验器。

演练、安装与模型行为效果分别记录。通过教学项目不能宣称所有真实集成已经通过，分视角自检不能宣称独立 agent 审查。
