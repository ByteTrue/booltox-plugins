/**
 * 生成工具注册表 booltox-index.json
 *
 * 新格式：仅包含工具 ID 和路径
 * 完整元数据从各工具的 booltox.json 读取
 */

const fs = require('fs');
const path = require('path');

const pluginsDir = path.join(__dirname, '..');
const outputPath = path.join(pluginsDir, 'booltox-index.json');

// 读取所有工具目录
const tools = [];
const entries = fs.readdirSync(pluginsDir);

for (const entry of entries) {
  const toolPath = path.join(pluginsDir, entry);
  const booltoxPath = path.join(toolPath, 'booltox.json');

  // 跳过非目录和没有 booltox.json 的目录
  if (!fs.statSync(toolPath).isDirectory()) continue;
  if (!fs.existsSync(booltoxPath)) continue;

  try {
    const booltox = JSON.parse(fs.readFileSync(booltoxPath, 'utf8'));

    tools.push({
      id: booltox.id,
      path: entry, // 工具在仓库中的相对路径
    });

    console.log(`✅ 发现工具: ${booltox.name} (${booltox.id}) - ${entry}/`);
  } catch (error) {
    console.error(`❌ 加载 ${entry}/booltox.json 失败:`, error.message);
  }
}

// 生成 booltox-index.json（新格式：简化的索引）
const index = {
  tools: tools,
};

fs.writeFileSync(outputPath, JSON.stringify(index, null, 2) + '\n');

console.log(`\n📦 成功生成 booltox-index.json，包含 ${tools.length} 个工具`);
console.log(`📁 输出路径: ${outputPath}`);
console.log(`\n💡 提示: 工具的完整元数据从各自的 booltox.json 读取`);
