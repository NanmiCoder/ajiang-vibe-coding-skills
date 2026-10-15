# 验证记录

## 当前五个 Skills

2026-10-12 将技能收敛为 `ajiang-debug`、`ajiang-review`、`ajiang-feature`、`ajiang-ablation`、`ajiang-git-commit-pr`，同步修改描述、README 与引用。

| 检查 | 结果 |
|---|---|
| Skill Creator 格式校验 | 五个 SKILL.md 均通过；名称使用短横线格式 |
| 本地 CLI 发现 | skills@1.7.2 只发现上述五个 skill，名称和描述正确 |
| 独立安装 | 在临时项目中通过 CLI 复制安装至 Codex 与 Claude Code 的目录，共 10 份 |
| 安装内容与自足性 | 10 份文件均与源文件逐字节一致，模板与许可证完整，逐份通过校验 |
| 缺失资源检测 | 删除临时安装副本的模板后，校验器正确拒绝该副本 |
| 仓库资源与链接 | validate_skills.py 通过；旧名称引用已更新，删除的 skill 不再列入目录 |

安装测试未修改用户级 skill 配置。新版本尚未做模型执行任务的行为评估，也未验证远程发布后的安装；本地安装通过不代表这些项目通过。

### Git PR 同步流程检查

2026-10-12 改写 `ajiang-git-commit-pr` 的 commit / PR 模式，并增加创建 PR 前的强制上游同步说明。格式与本地资源检查通过。

在临时 Git 仓库中分别验证普通 checkout，以及 worktree + fork：来源分支开发后让目标分支前进；fetch 正确目标并无文本冲突地合并；用金额单位变化构造业务回归，实际验收失败；修复后通过。目标再次前进时，发布前第二次 fetch 能发现变化，重新同步后的最终 HEAD 与推送结果一致。

此项验证 Git 操作与验收案例，不是模型遵循该技能的行为评估。

## ajiang-video-broll（2026-10-15 加入）

从作者本机的视频包装 skill 整理而来，带 10 套 B-roll 模板。归档的候选模板、旧版示例代码和本机路径没有放进仓库。

| 检查 | 结果 |
|---|---|
| validate_skills.py | 六个 skill 全部通过（元数据、MIT 许可证、本地链接、无个人路径） |
| CLI 发现 | `npx skills@1.7.2 add . --list` 列出六个 skill，包括 ajiang-video-broll |
| 模板库本地预览 | 从仓库副本运行 `assets/gallery/serve.py`：页面在 127.0.0.1 正常打开，10 套模板都能切换播放；有音频依赖时自动生成试听音频，缺依赖时跳过并提示，动画照常 |
| README 截图 | `assets/readme/broll/` 的 10 张图由同一个本地预览页用 headless Chrome 截取 |
| 模板压力测试 | 每套都用 `qa.py --stress`（长标题、5 个条目、1 条检查、四位数中文单位等）看过截图 |

没有验证：从 GitHub 远程安装后的完整流程；仓库副本没有从头跑过一次 Remotion 4K 渲染（这套引擎在作者本机的工程里渲过静帧）；试听音频和成片混音只检查了响度，没有人耳试听。

## 旧版记录

2026-10-11 的八技能版本曾通过本地与公开远程安装、模板文本审查，以及 GitHub README 预览。教学 Taskboard 夹具原始结果为 3 项通过 / 2 项失败，隔离修复后为 5 项通过。

这些结果属于旧版，不能当成此次重命名和文案修改后的行为验证。演练与评估方式见 [evals/README.md](../evals/README.md)。
