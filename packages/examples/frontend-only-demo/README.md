# 密码生成器插件

专业的密码生成工具，支持自定义规则、实时强度分析、预设模板和历史记录管理。

## 功能特性

### 🔐 密码生成
- **可配置长度**: 4-128 位可调
- **字符类型选择**: 大写字母、小写字母、数字、特殊符号
- **排除易混淆字符**: 自动排除 0/O, 1/l/I 等易混淆字符
- **自定义排除**: 支持自定义排除特定字符
- **密码短语**: 生成易记的多单词组合密码

### 📊 强度分析
- **实时评估**: 即时显示密码强度（极弱/弱/中等/强/极强）
- **熵值计算**: 显示密码的信息熵值
- **破解时间估算**: 估算暴力破解所需时间
- **可视化指示器**: 彩色进度条直观展示强度

### 📋 预设模板
- **PIN 码**: 4-6 位纯数字
- **简单密码**: 8 位字母数字
- **标准密码**: 12 位混合字符
- **强密码**: 16 位全字符
- **超强密码**: 24 位全字符

### 📜 历史记录
- **本地存储**: 最近 20 条生成记录
- **一键复制**: 快速复制历史密码
- **强度标记**: 显示每条记录的强度等级
- **时间戳**: 记录生成时间

### 🎨 UI 设计
- **深色主题**: 护眼的深色配色方案
- **玻璃拟态**: 现代化的玻璃拟态卡片设计
- **流畅动画**: 复制成功等交互反馈动画
- **响应式布局**: 适配不同窗口尺寸

## 技术栈

- **TypeScript**: 类型安全的核心逻辑
- **Vite**: 快速的构建工具
- **纯 CSS**: 无框架依赖的样式实现
- **Web Crypto API**: 安全的随机数生成
- **LocalStorage**: 历史记录持久化

## 项目结构

```
com.booltox.frontend-only-demo/
├── src/
│   ├── index.html          # HTML 入口
│   ├── main.ts             # 主应用逻辑
│   ├── style.css           # 样式文件
│   ├── types.ts            # TypeScript 类型定义
│   ├── generator.ts        # 密码生成核心
│   ├── strength.ts         # 强度分析算法
│   ├── presets.ts          # 预设模板
│   └── storage.ts          # 本地存储管理
├── dist/                   # 构建输出
├── manifest.json           # 插件清单
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 构建配置
└── README.md               # 本文档
```

## 开发指南

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建插件

```bash
pnpm build
```

构建产物将输出到 `dist/` 目录。

### 打包插件

在项目根目录执行：

```bash
pnpm --filter @booltox/client plugin:pack com.booltox.frontend-only-demo
```

## 代码亮点

### 1. 安全的随机数生成

使用 Web Crypto API 生成密码学安全的随机数：

```typescript
const array = new Uint32Array(config.length);
crypto.getRandomValues(array);
```

### 2. 科学的强度评估

基于信息熵理论计算密码强度：

```typescript
const entropy = Math.log2(Math.pow(charsetSize, password.length));
```

### 3. 模块化架构

清晰的职责分离：
- `generator.ts`: 密码生成逻辑
- `strength.ts`: 强度分析算法
- `storage.ts`: 数据持久化
- `main.ts`: UI 交互控制

### 4. 类型安全

完整的 TypeScript 类型定义，确保代码质量：

```typescript
interface PasswordConfig {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  customExclude: string;
}
```

## 使用示例

### 生成标准密码

1. 调整长度滑块到 12 位
2. 勾选所需字符类型
3. 点击"生成密码"按钮
4. 点击"复制"按钮使用密码

### 使用预设模板

点击任意预设模板按钮，自动应用配置并生成密码。

### 查看历史记录

在历史记录区域点击任意记录，即可在密码显示区查看该密码。

## 性能优化

- **按需渲染**: 仅在数据变化时更新 DOM
- **事件委托**: 历史记录列表使用事件委托减少监听器
- **CSS 动画**: 使用 GPU 加速的 CSS 动画
- **代码分割**: Vite 自动进行代码分割优化

## 安全考虑

1. **密码学安全随机数**: 使用 `crypto.getRandomValues()` 而非 `Math.random()`
2. **不记录敏感信息**: 历史记录仅存储在本地，不上传服务器
3. **内存清理**: 密码字符串在使用后及时清理
4. **XSS 防护**: 使用 `textContent` 而非 `innerHTML` 防止注入

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 许可证

本插件为 BoolTox 工具箱的示例插件，遵循项目主许可证。

## 作者

BoolTox Team

## 更新日志

### v2.0.0 (2025-12-01)

- ✨ 完全重写为 TypeScript 项目
- ✨ 新增密码强度实时分析
- ✨ 新增 5 种预设模板
- ✨ 新增密码短语生成
- ✨ 新增历史记录管理
- 🎨 全新玻璃拟态 UI 设计
- 🔒 使用 Web Crypto API 提升安全性
- 📦 使用 Vite 构建系统

### v1.0.0

- 初始版本，基础密码生成功能
