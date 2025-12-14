# BoolTox 工具仓库

> BoolTox 官方和社区工具集合

---

## 📦 仓库结构

```
booltox-plugins/
├── uiautodev/              # UI 自动化开发工具
├── index.json              # 工具注册表（自动生成）
└── README.md               # 说明文档
```

---

## 🔧 工具清单

| 工具 ID | 名称 | 类型 | 说明 |
|---------|------|------|------|
| com.booltox.uiautodev | UI Auto Dev | standalone | 移动端 UI 自动化检查工具 |

---

## 📖 添加新工具

### 目录结构

每个工具必须包含：
- `manifest.json` - 工具元数据
- `README.md` - 工具说明
- 主程序文件（根据类型）

### 工具类型

#### 1. HTTP Service（推荐）
工具提供 HTTP 服务，在浏览器中运行。

#### 2. Standalone
工具创建自己的原生窗口（Qt、Tkinter 等）。

#### 3. Binary
调用系统二进制文件或 CLI 工具。

---

## 🚀 发布流程

1. 提交工具代码到此仓库
2. 运行 `node scripts/generate-index.js` 生成 `index.json`
3. 推送到 GitHub
4. BoolTox 客户端通过 GitOps 自动同步

---

## 📝 许可证

CC-BY-NC-4.0
