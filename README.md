# BoolTox Plugins

BoolTox 官方和社区插件集合仓库。

## 目录结构

```
booltox-plugins/
├── packages/
│   ├── official/         # 官方插件（严格审核）
│   ├── community/        # 社区插件（标记"未验证"）
│   └── examples/         # 示例插件（教学）
│
├── plugins/              # GitOps 元数据目录
│   ├── index.json        # 插件索引
│   └── official/
│       └── pomodoro/
│           ├── metadata.json
│           ├── icon.png
│           └── releases/
│
└── scripts/              # 自动化脚本
    ├── update-registry.js
    └── validate-plugin.js
```

## 开发

### 前置要求

- Node.js >= 20
- pnpm >= 9

### 安装依赖

```bash
pnpm install
```

### 开发插件

```bash
cd packages/official/your-plugin
pnpm dev
```

### 构建插件

```bash
cd packages/official/your-plugin
pnpm build
```

## 插件分级

### 官方插件（Official）

- ✅ 已通过安全审核
- ✅ 代码质量保证
- ✅ 持续维护
- 显示绿色"已验证"标记

### 社区插件（Community）

- ⚠️ 未经官方安全审核
- ⚠️ 质量由作者保证
- 显示黄色"未验证"标记
- 安装前会有风险提示

### 示例插件（Examples）

- 📚 仅用于教学目的
- 📚 展示插件开发最佳实践
- 不会出现在插件市场

## 许可证

CC-BY-NC-4.0 © ByteTrue
