# Backend Bridge Demo

演示新版 BoolTox 插件系统如何像 VS Code 一样，通过声明式 `manifest.runtime.backend` 启动一个长期运行的 Python 后端，并在 Webview 与子进程之间进行消息通信。

## 结构

```
com.booltox.backend-demo/
├── manifest.json                # `protocol` + `runtime` + 权限声明
├── index.html                   # UI，调用 `window.booltox.backend.*`
└── backend/
    └── server.py                # Python 子进程，读取 STDIN/写入 STDOUT
```

## 行为

1. Webview 通过 `backend.register()` 启动 manifest 中声明的 Python 入口。
2. `PluginBackendRunner` 负责拉起进程、监听 STDOUT/STDERR，并将事件通过 `booltox:backend:message` 回传给 Webview。
3. UI 使用 `backend.onMessage()` 订阅事件，并可通过 `backend.postMessage()` 将 JSON 字符串写入子进程标准输入。
4. `backend.dispose()` 或窗口关闭时自动销毁子进程，避免僵尸进程。

该示例提供最小可行代码，便于第三方插件快速对齐 VS Code Extension Host 的后端模式。可在此基础上替换为 JSON-RPC / LSP 等更复杂协议。
