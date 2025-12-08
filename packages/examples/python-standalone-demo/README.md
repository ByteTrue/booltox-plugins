# 番茄钟计时器（Python Standalone）

使用 **PySide6 + QFluentWidgets** 编写的独立番茄钟应用，用于展示 BoolTox 插件的「纯 Python Standalone」类型能力。核心特性：

- 现代 Fluent Design UI：基于 `MSFluentWindow`、`ProgressRing` 等组件构建。
- 可配置计时器：专注/短休/长休时长、长休间隔、自动开始策略、系统通知等均可在设置页调整并持久化在 `QSettings`。
- 统计面板：实时记录今日番茄数量、专注分钟数，并展示最近 7 天的趋势列表。
- 系统通知：通过 `plyer` 触发跨平台通知（可在设置里关闭）。

## 文件结构
```
com.booltox.python-standalone-demo/
├── main.py            # 应用入口 + UI/业务逻辑
├── manifest.json      # runtime.type=standalone, requirements 指向 requirements.txt
├── requirements.txt   # PySide6 / PySide6-Fluent-Widgets / plyer
└── README.md
```

## 开发/调试
1. 在宿主根目录运行 `pip install -r packages/client/plugins/com.booltox.python-standalone-demo/requirements.txt`（或使用虚拟环境）。
2. 以开发模式加载插件目录，BoolTox 会按 `manifest.runtime.entry` 启动 `main.py`。
3. 所有设置与统计存储在 `QSettings(APP_ID='BoolTox/PomodoroDemo')`，删除 `%APPDATA%/BoolTox` 或 `~/.config/BoolTox` 可重置。
4. 如需自定义主题，可修改 `DEFAULT_THEME_COLOR` 或调用 `setTheme(Theme.DARK)` 等。

## 运行截图
- 计时器：ProgressRing + 倒计时 + 控制按钮
- 设置：`QSpinBox` + `SwitchButton` 配置各项策略
- 统计：显示今日汇总及最近 7 天记录

（首次运行若缺少 PySide6，会根据 requirements 自动拉起宿主提供的 Python 依赖安装流程。）
