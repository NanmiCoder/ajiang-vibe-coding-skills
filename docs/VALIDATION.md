# 验证记录

## 当前五个 Skills

2026-10-12 将技能收敛为 `ajiang-debug`、`ajiang-review`、`ajiang-feature`、`ajiang-ablation`、`ajiang-git`，同步修改描述、README 与引用。

| 检查 | 结果 |
|---|---|
| Skill Creator 格式校验 | 五个 SKILL.md 均通过；名称使用短横线格式 |
| 本地 CLI 发现 | skills@1.7.2 只发现上述五个 skill，名称和描述正确 |
| 独立安装 | 在临时项目中通过 CLI 复制安装至 Codex 与 Claude Code 的目录，共 10 份 |
| 安装内容与自足性 | 10 份文件均与源文件逐字节一致，模板与许可证完整，逐份通过校验 |
| 缺失资源检测 | 删除临时安装副本的模板后，校验器正确拒绝该副本 |
| 仓库资源与链接 | validate_skills.py 通过；旧名称引用已更新，删除的 skill 不再列入目录 |

安装测试未修改用户级 skill 配置。新版本尚未做模型执行任务的行为评估，也未验证远程发布后的安装；本地安装通过不代表这些项目通过。

## 旧版记录

2026-10-11 的八技能版本曾通过本地与公开远程安装、模板文本审查，以及 GitHub README 预览。教学 Taskboard 夹具原始结果为 3 项通过 / 2 项失败，隔离修复后为 5 项通过。

这些结果属于旧版，不能当成此次重命名和文案修改后的行为验证。演练与评估方式见 [evals/README.md](../evals/README.md)。
