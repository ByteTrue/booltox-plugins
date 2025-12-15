# BoolTox 工具仓库

> BoolTox 官方和社区工具集合

---

## 📦 仓库结构

```
booltox-plugins/
├── uiautodev/              # UI 自动化开发工具
│   └── booltox.json        # 工具配置
├── booltox-index.json      # 工具索引（自动生成）
├── scripts/
│   └── generate-index.js   # 索引生成脚本
└── README.md               # 说明文档
```

---

## 🔧 工具清单

| 工具 ID | 名称 | 类型 | 说明 |
|---------|------|------|------|
| com.booltox.uiautodev | UI Auto Dev | http-service | 移动端 UI 自动化检查工具 |

---

## 📖 添加新工具

### 目录结构

每个工具必须包含：
- `booltox.json` - 工具配置（必需）
- `README.md` - 工具说明（推荐）
- 主程序文件（根据类型）

### 工具类型

#### 1. HTTP Service（推荐）
工具提供 HTTP 服务，在浏览器中运行。

**配置示例**：
```json
{
  "id": "com.example.my-tool",
  "version": "1.0.0",
  "name": "我的工具",
  "description": "工具描述",
  "protocol": "^2.0.0",
  "runtime": {
    "type": "http-service",
    "backend": {
      "type": "python",
      "entry": "main.py",
      "requirements": "requirements.txt",
      "port": 8000,
      "host": "127.0.0.1"
    },
    "path": "/",
    "readyTimeout": 30000
  }
}
```

#### 2. Standalone
工具创建自己的原生窗口（Qt、Tkinter 等）。

#### 3. CLI
命令行交互工具。

#### 4. Binary
调用系统二进制文件或 CLI 工具。

---

## 🚀 发布流程

1. 创建工具目录，编写 `booltox.json`
2. 运行 `node scripts/generate-index.js` 生成 `booltox-index.json`
3. git commit && git push
4. BoolTox 客户端通过 GitOps 自动同步

**快速创建工具**：
```bash
# 使用 BoolTox CLI 生成 booltox.json
npm install -g @booltox/cli
cd my-tool/
booltox init
```

---

## 📝 许可证

CC-BY-NC-4.0
