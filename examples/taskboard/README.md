# Taskboard 教学 CLI

需求：Python 3.9+。没有第三方依赖、网络或账号。

在本目录运行：

```sh
python3 app.py --config config.json --show-settings
python3 app.py --config config.json --output work/export
```

第一项显示有效设置；第二项将 tasks.json 的全部任务导出到指定目录。支持 json 和 csv，CSV 列为 id、title、done，done 使用小写 true/false，保留完整 Unicode 标题。

有效格式优先级：`--format` 命令行参数 > `TASKBOARD_EXPORT_FORMAT` 环境变量 > 配置文件 export_format > json 默认值。无效格式应以非零退出，且不创建导出目录或产物。

示例：

```sh
python3 app.py --config config.json --format json --output work/json-export
```

本项目故意保留一个配置到执行的故障，用于 workflow 演练。修复应恢复上述公开契约，并保留其他已支持行为。它不代表真实历史项目，也不是完整任务管理产品。
