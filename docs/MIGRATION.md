# 插件迁移说明

## 迁移完成 ✅

所有插件已从 `booltox-web/packages/client/plugins` 迁移到独立仓库 `booltox-plugins`

### 迁移的插件

**示例插件** (`packages/examples/`):
- `backend-demo` - Python 后端演示
- `backend-node-demo` - Node.js 后端演示
- `frontend-only-demo` - 纯前端演示
- `python-standalone-demo` - Python 独立应用演示

**官方插件** (`packages/official/`):
- `uiautodev` - UI 自动化工具
- `pomodoro` - 番茄钟(已有)

---

## Client 端配置

### 1. 环境变量配置

在 `booltox-web/.env` 中配置开发插件目录：

```env
# 开发环境插件目录 (指向新插件仓库的 examples 目录)
BOOLTOX_DEV_PLUGINS_DIR=E:\Code\TS\BoolTox\booltox-plugins\packages\examples
```

### 2. 插件加载机制

Client 端会自动从以下路径加载插件：
- **生产环境**: `%APPDATA%/booltox/plugins`
- **开发环境**: `BOOLTOX_DEV_PLUGINS_DIR` 环境变量指定的目录

---

## 新仓库使用指南

### 开发插件

```bash
cd E:\Code\TS\BoolTox\booltox-plugins

# 1. 安装依赖
pnpm install

# 2. 开发插件（以 backend-demo 为例）
cd packages/examples/backend-demo
pnpm dev

# 3. 构建插件
pnpm build
```

### 打包插件

```bash
cd E:\Code\TS\BoolTox\booltox-plugins

# 打包示例插件
pnpm pack:plugin backend-demo --type=examples

# 打包官方插件
pnpm pack:plugin uiautodev --type=official
```

打包后的文件位置：
```
plugins/
├── examples/
│   └── backend-demo/
│       ├── metadata.json
│       └── releases/
│           └── backend-demo-1.0.0.zip
└── official/
    └── uiautodev/
        ├── metadata.json
        └── releases/
            └── uiautodev-1.0.0.zip
```

### 更新插件索引

```bash
pnpm update:registry
```

这会更新 `plugins/index.json`，供 web 端的插件市场使用。

---

## 验证迁移

### 启动 Client 检查

```bash
cd E:\Code\TS\BoolTox\booltox-web
pnpm dev
```

应该能在插件中心看到迁移的示例插件。

### 检查点

- [ ] Client 能正常加载开发插件
- [ ] 插件列表显示正确
- [ ] 插件可以正常启动
- [ ] 打包脚本工作正常

---

## 目录对比

### 迁移前
```
booltox-web/
└── packages/
    └── client/
        └── plugins/
            ├── com.booltox.backend-demo/
            ├── com.booltox.backend-node-demo/
            ├── com.booltox.frontend-only-demo/
            ├── com.booltox.python-standalone-demo/
            └── com.booltox.uiautodev/
```

### 迁移后
```
booltox-plugins/
└── packages/
    ├── examples/
    │   ├── backend-demo/           (com.booltox.backend-demo)
    │   ├── backend-node-demo/      (com.booltox.backend-node-demo)
    │   ├── frontend-only-demo/     (com.booltox.frontend-only-demo)
    │   └── python-standalone-demo/ (com.booltox.python-standalone-demo)
    └── official/
        ├── pomodoro/               (新)
        └── uiautodev/              (com.booltox.uiautodev)
```

---

## 下一步

1. **清理旧插件目录** (可选)
   ```bash
   # 备份后删除 booltox-web/packages/client/plugins 中的插件目录
   # 保留 scripts 和 CLAUDE.md 等文档
   ```

2. **提交变更**
   ```bash
   cd E:\Code\TS\BoolTox\booltox-plugins
   git add .
   git commit -m "feat: 迁移 client 端插件到独立仓库"
   git push
   ```

3. **更新 booltox-web**
   ```bash
   cd E:\Code\TS\BoolTox\booltox-web
   git add .env
   git commit -m "chore: 更新插件目录指向新仓库"
   git push
   ```
