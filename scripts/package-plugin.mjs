#!/usr/bin/env node

/**
 * 插件打包脚本
 * 用途: 将插件打包成可分发的ZIP文件,计算哈希值
 *
 * 使用方法:
 *   node scripts/package-plugin.mjs <plugin-name> [--type=official|examples]
 *   例如: node scripts/package-plugin.mjs backend-demo --type=examples
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * 读取并解析manifest.json
 */
function readManifest(pluginDir) {
  const manifestPath = path.join(pluginDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`未找到 manifest.json: ${manifestPath}`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

/**
 * 计算文件的SHA-256哈希
 */
function calculateHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * 创建ZIP包
 */
function createZip(pluginDir, outputPath, manifest) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✅ ZIP包已创建: ${outputPath}`);
      console.log(`   大小: ${(archive.pointer() / 1024).toFixed(2)} KB`);
      resolve(archive.pointer());
    });

    archive.on('error', reject);
    archive.pipe(output);

    // 添加必需文件
    const manifestPath = path.join(pluginDir, 'manifest.json');
    archive.file(manifestPath, { name: 'manifest.json' });

    // 添加图标(如果存在)
    if (manifest.icon) {
      const iconPath = path.join(pluginDir, manifest.icon);
      if (fs.existsSync(iconPath)) {
        archive.file(iconPath, { name: manifest.icon });
      }
    }

    // 添加 dist 目录（扁平化到根目录）
    const distDir = path.join(pluginDir, 'dist');
    if (fs.existsSync(distDir)) {
      archive.directory(distDir, false);
    } else {
      console.warn('⚠️  警告: 未找到 dist 目录,请先运行 pnpm build');
    }

    // 添加 backend 目录（若存在）
    const backendDir = path.join(pluginDir, 'backend');
    if (fs.existsSync(backendDir)) {
      archive.directory(backendDir, 'backend');
    }

    // 附加 README、requirements 等单文件
    ['README.md', 'requirements.txt'].forEach((file) => {
      const filePath = path.join(pluginDir, file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
      }
    });

    archive.finalize();
  });
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  let pluginName = args[0];
  let pluginType = 'examples'; // 默认是 examples

  // 解析参数
  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      pluginType = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      pluginName = arg;
    }
  }

  if (!pluginName) {
    console.error('❌ 错误: 请提供插件名称');
    console.log('用法: node scripts/package-plugin.mjs <plugin-name> [--type=official|examples]');
    console.log('示例: node scripts/package-plugin.mjs backend-demo --type=examples');
    process.exit(1);
  }

  if (!['official', 'examples'].includes(pluginType)) {
    console.error('❌ 错误: type 必须是 official 或 examples');
    process.exit(1);
  }

  const pluginDir = path.join(ROOT_DIR, 'packages', pluginType, pluginName);

  if (!fs.existsSync(pluginDir)) {
    console.error(`❌ 错误: 插件目录不存在: ${pluginDir}`);
    process.exit(1);
  }

  console.log(`📦 开始打包插件: ${pluginName} (${pluginType})\n`);

  // 读取manifest
  const manifest = readManifest(pluginDir);
  const pluginId = manifest.id;
  console.log(`插件ID: ${pluginId}`);
  console.log(`插件名称: ${manifest.name}`);
  console.log(`版本: ${manifest.version}`);
  console.log(`作者: ${manifest.author || '未知'}\n`);

  // 创建插件专属目录: plugins/{type}/{plugin-name}/releases/
  const pluginOutputDir = path.join(ROOT_DIR, 'plugins', pluginType, pluginName, 'releases');
  if (!fs.existsSync(pluginOutputDir)) {
    fs.mkdirSync(pluginOutputDir, { recursive: true });
  }

  // 创建ZIP包 (命名: {plugin-name}-{version}.zip)
  const outputPath = path.join(pluginOutputDir, `${pluginName}-${manifest.version}.zip`);

  const fileSize = await createZip(pluginDir, outputPath, manifest);

  // 计算哈希
  const hash = await calculateHash(outputPath);
  console.log(`   SHA-256: ${hash}\n`);

  // 生成metadata.json
  const metadata = {
    id: pluginId,
    version: manifest.version,
    name: manifest.name,
    description: manifest.description || '',
    author: manifest.author || '',
    icon: manifest.icon,
    category: manifest.category || 'utility',
    keywords: manifest.keywords || [],
    verified: pluginType === 'official',
    hash,
    size: fileSize,
  };

  // 写入metadata.json 到 plugins/{type}/{plugin-name}/
  const metadataDir = path.join(ROOT_DIR, 'plugins', pluginType, pluginName);
  const metadataPath = path.join(metadataDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`✅ 插件打包完成!`);
  console.log(`   输出目录: ${metadataDir}`);
  console.log(`   - releases/${pluginName}-${manifest.version}.zip (${(fileSize / 1024).toFixed(2)} KB)`);
  console.log(`   - metadata.json\n`);

  // 输出metadata内容供参考
  console.log('📝 Metadata 内容:');
  console.log(JSON.stringify(metadata, null, 2));
  console.log('\n✨ 打包完成!');
  console.log(`\n💡 提示: 运行 "node scripts/update-registry.js" 更新插件索引`);
}

main().catch((error) => {
  console.error('❌ 打包失败:', error);
  process.exit(1);
});
