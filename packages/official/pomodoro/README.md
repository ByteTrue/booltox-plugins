# 番茄钟插件

基于番茄工作法的时间管理工具。

## 功能特性

- ⏱️ 25 分钟倒计时
- 🔔 系统通知提醒
- ⏯️ 开始/暂停/重置
- 🎨 优雅的 UI 设计
- 💾 状态持久化

## 技术栈

### 前端
- React 19
- Framer Motion（流畅动画）
- Lucide React（图标）
- @booltox/plugin-sdk

### 后端
- Python 3.12
- plyer（系统通知）
- JSON-RPC 2.0 协议

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build
```

## 使用

1. 启动 BoolTox Agent
2. 在插件市场安装番茄钟
3. 点击"开始"按钮启动 25 分钟计时
4. 时间到时会收到系统通知

## 许可证

CC-BY-NC-4.0 © ByteTrue
