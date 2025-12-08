# 正则表达式测试器（Node.js Backend Demo）

基于 `booltox-backend` SDK 与 TypeScript/Vite 构建的完整正则调试插件：Node.js 后端负责任务执行与事件推送，前端为纯 TS 开发（Vite 构建），包含编辑器、实时高亮、历史记录与替换预览。

## 功能亮点
- 正则编辑器：支持 g/i/m/s/u 标志位、语法即时校验、模板一键填充。
- Node 后端：`test`/`replace`/`validate`/`getPatterns` 四类 RPC，内置 800 ms 超时保护与 `matchProgress` 事件。
- 结果展示：匹配统计、唯一计数、耗时、捕获组列表、上下文高亮与批量复制。
- 替换面板：兼容 `$1`、`$<name>` 分组引用，返回替换统计与截断预览。
- 辅助能力：历史记录（10 条）、模板库（含示例文本）、剪贴板复制、100k+ 字符文本下 <200 ms 高亮。

## 目录结构
```
com.booltox.backend-node-demo/
├── package.json                  # Vite + TypeScript 工作区（pnpm workspace）
├── index.html                    # 开发入口（引用 /src/main.ts）
├── src/
│   ├── main.ts                   # 纯 TS 前端逻辑
│   └── style.css                 # UI 样式
├── dist/
│   ├── index.html                # 运行时入口（指向 ./assets/**）
│   └── assets/{index.css,index.js}
├── backend/
│   ├── src/{server.ts,regex-worker.ts}
│   ├── dist/{server.cjs,regex-worker.cjs}
│   └── tsconfig.json             # CJS 编译配置
├── tsconfig.json                 # 前端 TS 配置
├── vite.config.ts                # Vite 构建配置（保留 dist，便于校对）
└── README.md
```

## 后端 API
```javascript
// commands
{
  "validate": { pattern, flags },
  "getPatterns": {},
  "test": { pattern, flags, text },
  "replace": { pattern, flags, text, replacement }
}

// events
{
  "matchProgress": {
     requestId, percent, processed, total, complete
  }
}
```
- Worker 按请求生成唯一 `requestId`，服务器透传到事件，前端可判定是否为当前任务。
- `test`/`replace` 均限制输入 ≤120 000 字符、返回最多 500 条详细匹配；超出将被标记为 `truncated`。
- 800 ms 未完成会强制终止 worker，抛出 `[ERR_TIMEOUT]`。

## 开发与调试
> 当前运行环境缺少 Node，可按照以下步骤在本地安装 Node (>=18) 后执行。

1. 在仓库根目录执行 `pnpm install`，workspace 会为该插件安装 Vite/TypeScript/ts-node。
2. 前端开发：`pnpm --filter com.booltox.backend-node-demo dev`，Vite 会加载 `index.html` + `src/main.ts`。
3. 后端开发：`pnpm --filter com.booltox.backend-node-demo dev:backend`（ts-node 热调试）或 `pnpm build:backend` 输出到 `backend/dist`。
4. 构建前端：`pnpm --filter com.booltox.backend-node-demo build`，会串行执行 `tsc -p backend/tsconfig.json` 与 `vite build`，产物写入 `dist/`。
5. 打包：切到 `packages/client/scripts` 执行 `node package-plugin.mjs com.booltox.backend-node-demo`，会把 `dist/` 与 `backend/dist/` 一起写入 `resources/plugins/com.booltox.backend-node-demo/`。

日常联调时可直接指向 `dist/index.html`（已提供与最新 TS 逻辑同步的静态版本）；当需要更新 UI/逻辑，只需重新运行 `pnpm build` 以覆盖 dist。

## 关键实现
- **超时/隔离**：正则任务在 worker 线程中执行，主进程通过 `setTimeout` + `Worker.terminate()` 保证卡顿可控。
- **进度上报**：worker 每处理 200 次迭代向主进程发送 `progress`，后端再转发到前端的 `matchProgress` 事件。
- **UI 性能**：高亮仅渲染前 60k 字符并对匹配区段做排序/裁剪，避免 100k+ 文本导致渲染卡顿。
- **历史/模板**：历史写入 `localStorage`，模板经 `getPatterns` 动态下发，便于后端统一维护。

如需二次开发，可在 TS 源码中扩展更多 RPC 方法（例如 `explain`）或引入远端存储；构建链已统一为 TypeScript，便于同一套 Lint/Test 流程。欢迎 PR。
