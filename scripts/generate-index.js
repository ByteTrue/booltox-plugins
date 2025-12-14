/**
 * 生成工具注册表 index.json
 */

const fs = require('fs');
const path = require('path');

const pluginsDir = path.join(__dirname, '..');
const outputPath = path.join(pluginsDir, 'index.json');

// 读取所有工具目录
const tools = [];
const entries = fs.readdirSync(pluginsDir);

for (const entry of entries) {
  const toolPath = path.join(pluginsDir, entry);
  const manifestPath = path.join(toolPath, 'manifest.json');

  // 跳过非目录和没有 manifest.json 的目录
  if (!fs.statSync(toolPath).isDirectory()) continue;
  if (!fs.existsSync(manifestPath)) continue;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    tools.push({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      icon: manifest.icon,
      category: manifest.category || 'utilities',
      keywords: manifest.keywords || [],
      screenshots: manifest.screenshots || [],
      gitPath: entry, // Git 仓库中的路径（用于 GitOps 下载）
    });

    console.log(`✅ 加载工具: ${manifest.name} (${manifest.id})`);
  } catch (error) {
    console.error(`❌ 加载 ${entry}/manifest.json 失败:`, error.message);
  }
}

// 生成 index.json
const registry = {
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  plugins: tools, // 改为 plugins（与 GitOpsService 一致）
};

fs.writeFileSync(outputPath, JSON.stringify(registry, null, 2));

console.log(`\n📦 成功生成 index.json，包含 ${tools.length} 个工具`);
console.log(`📁 输出路径: ${outputPath}`);
