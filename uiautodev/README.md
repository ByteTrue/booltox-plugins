# UI Auto Dev 工具

移动端 UI 自动化检查工具，支持 Android/iOS/Harmony 设备的 UI 层级检查、元素定位、XPath 生成等功能。

## 特性

- ✅ **完全本地化**：使用静态文件服务，无需网络即可运行
- ✅ **完全掌控前端**：所有前端资源可自由修改（`static/` 目录）
- ✅ **架构简化**：使用标准 FastAPI StaticFiles（减少 150+ 行代码）
- ✅ **离线运行**：内置 uiautodev 源代码（14MB），无需依赖 PyPI 服务器
- ✅ **二次开发友好**：源代码可见可改，便于定制功能
- ✅ **版本锁定**：避免上游更新导致的兼容性问题
- ✅ **完整功能**：支持 Android/iOS/Harmony 设备的 UI 自动化

## 快速开始

### 通过 BoolTox 启动（推荐）

在 BoolTox 客户端中点击 "uiautodev" 工具即可启动。

### 手动启动（开发/测试）

```bash
cd packages/client/tools/uiautodev
python backend/main.py
```

访问：`http://127.0.0.1:20242`

## 自定义前端

现在你可以完全掌控前端资源！

### 修改页面标题

编辑 `static/index.html`：
```html
<title>我的 UIAuto 工具</title>
```

### 替换 Logo

```bash
cp my-logo.webp static/assets/logo.webp
```

### 添加自定义脚本

在 `static/index.html` 中添加：
```html
<script>
  console.log('我的自定义脚本');
</script>
```

## 目录结构

```
uiautodev/
├── static/                         ← 前端资源（完全掌控）
│   ├── index.html                  ← 可自由编辑
│   ├── favicon.ico
│   └── assets/
│       ├── index-9353aa21.js       ← 主程序（1 MB）
│       ├── index-3ba1a158.css      ← 样式（278 KB）
│       └── ...
├── uiautodev/                      ← Python 后端
│   ├── app.py                      ← FastAPI 应用（已简化）
│   ├── driver/                     ← 设备驱动
│   └── router/                     ← API 路由
├── backend/
│   └── main.py                     ← BoolTox 启动脚本
└── requirements.txt                ← Python 依赖
```

## 架构演进

### 之前（HTTP 缓存代理）
- 从 uiauto.dev 下载资源并缓存
- 使用哈希键名（不直观）
- 复杂度高（~150 行代理逻辑）

### 现在（静态文件服务）
- 标准 FastAPI StaticFiles
- 清晰的文件名
- 简洁（~20 行代码）

**迁移完成日期**：2025-12-13

## 常见问题

### Q1: 端口冲突（10048 错误）

```bash
# Windows
netstat -ano | findstr :20242
taskkill /F /PID <PID>

# macOS/Linux
lsof -ti:20242 | xargs kill -9
```

### Q2: 如何更新前端资源？

手动替换 `static/` 目录中的文件即可。

## 相关文档

- `MIGRATION.md`：完整的迁移指南
- `CACHE_VS_STATIC.md`：两种方案的详细对比
- `extract_cache.py`：缓存文件提取工具

## 总结

✅ **完全本地化**：无需网络
✅ **完全掌控**：可自由修改前端
✅ **架构简化**：减少 150+ 行代码

**现在 uiautodev 是一个真正属于你的工具！** 🎯

## 目录结构

```
com.booltox.uiautodev/
├── manifest.json          # 工具配置文件
├── requirements.txt       # Python 依赖（仅核心库，不含 uiautodev）
├── index.html            # 前端界面
├── backend/
│   └── main.py           # 后端服务（启动本地 uiautodev）
├── uiautodev/            # uiautodev 源代码（本地集成）
│   ├── __init__.py
│   ├── __main__.py
│   ├── app.py
│   ├── cli.py
│   ├── driver/
│   ├── remote/
│   └── ...
└── cache/                # 运行时缓存目录
```

## 架构说明

### 原架构（依赖 PyPI）
```
工具后端 → subprocess → python -m uiautodev → PyPI 安装的包
```

### 新架构（本地源代码）
```
工具后端 → subprocess → uiautodev/__main__.py → 本地源代码
```

### 关键改动

1. **源代码集成**
   - 将 `uiautodev` 源代码完整复制到工具目录
   - 通过 `sys.path.insert()` 和 `PYTHONPATH` 确保使用本地代码

2. **依赖管理**
   - `requirements.txt` 仅包含 uiautodev 的核心依赖库
   - 移除了 `uiautodev>=0.0.1` 的 PyPI 依赖

3. **启动方式**
   - 从 `python -m uiautodev` 改为直接运行 `uiautodev/__main__.py`
   - 设置 `PYTHONPATH` 环境变量指向工具目录

## 二次开发指南

### 修改源代码

直接编辑 `uiautodev/` 目录下的源代码即可：

```bash
# 例如：修改 API 路由
vim uiautodev/app.py

# 例如：添加新的设备驱动
vim uiautodev/driver/custom_driver.py
```

### 调试技巧

1. **查看日志**：工具后端会将 uiautodev 的 stdout/stderr 转发到前端
2. **端口配置**：默认端口 `20242`，可在 `backend/main.py` 中修改
3. **离线模式**：启动参数包含 `--offline`，避免网络请求

### 常见定制场景

#### 1. 添加自定义 API 端点

编辑 `uiautodev/app.py`：

```python
@app.get("/api/custom/my-feature")
async def my_custom_feature():
    return {"status": "ok", "data": "custom data"}
```

#### 2. 修改设备连接逻辑

编辑 `uiautodev/driver/` 下的对应驱动文件：
- `android.py` - Android 设备
- `ios.py` - iOS 设备
- `harmony.py` - Harmony 设备

#### 3. 自定义 UI 检查规则

编辑 `uiautodev/remote/` 下的相关文件。

## 依赖说明

### 核心依赖（requirements.txt）

```
adbutils>=2.8.10,<3      # Android 调试桥
uiautomator2>=3.2.0,<4   # Android UI 自动化
wdapy>0.2.2,<1           # iOS WebDriverAgent
fastapi>=0.115.12,<1     # Web 框架
uvicorn>=0.33.0          # ASGI 服务器
websockets>=10.4         # WebSocket 支持
Pillow>=9                # 图像处理
lxml>=6.0.2              # XML 解析
httpx>=0.28.1            # HTTP 客户端
pydantic>=2.6            # 数据验证
rich                     # 终端美化
click>=8.1.7             # CLI 框架
pygments>=2              # 语法高亮
construct                # 二进制解析
python-multipart>=0.0.18 # 文件上传
```

### 可选依赖

```
# Harmony 设备支持（需要时取消注释）
# hypium>=6.0.7.200,<7.0.0
```

## 版本信息

- **工具版本**：0.1.0
- **uiautodev 源代码版本**：基于 git clone 时的最新版本
- **协议版本**：^2.0.0

## 更新源代码

如需更新 uiautodev 源代码到最新版本：

```bash
# 1. 进入源代码仓库
cd /Users/byte/projects/TS/BoolTox/uiautodev

# 2. 拉取最新代码
git pull origin main

# 3. 复制到工具目录
cp -r uiautodev /Users/byte/projects/TS/BoolTox/packages/client/plugins/com.booltox.uiautodev/

# 4. 重启工具即可生效
```

## 故障排查

### 服务启动失败

1. 检查端口是否被占用：`lsof -i :20242`
2. 查看工具日志中的错误信息
3. 确认 Python 依赖已正确安装

### 导入错误

1. 确认 `uiautodev/` 目录完整存在
2. 检查 `backend/main.py` 中的路径设置
3. 验证 `PYTHONPATH` 环境变量

### 设备连接问题

1. Android：确认 adb 可用，设备已授权
2. iOS：确认 WDA 已安装并运行
3. Harmony：确认 hypium 依赖已安装

## 许可证

- **工具代码**：MIT License
- **uiautodev 源代码**：MIT License（原项目许可）

## 相关链接

- uiautodev 官网：https://uiauto.dev
- uiautodev 仓库：https://github.com/codeskyblue/uiautodev
- BoolTox 项目：https://github.com/your-org/booltox
