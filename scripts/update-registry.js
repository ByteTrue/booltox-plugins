#!/usr/bin/env node

/**
 * 更新插件注册表
 * 用法: node scripts/update-registry.js --plugin pomodoro --version 1.0.0 --hash abc123
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT_DIR, 'plugins/index.json');

async function main() {
  const args = process.argv.slice(2);
  const plugin = args[args.indexOf('--plugin') + 1];
  const version = args[args.indexOf('--version') + 1];
  const hash = args[args.indexOf('--hash') + 1];

  if (!plugin || !version || !hash) {
    console.error('Usage: node scripts/update-registry.js --plugin <name> --version <version> --hash <hash>');
    process.exit(1);
  }

  // 读取现有索引
  const indexContent = await fs.readFile(INDEX_FILE, 'utf-8');
  const index = JSON.parse(indexContent);

  // 更新时间戳
  index.lastUpdated = new Date().toISOString();

  // TODO: 更新或添加插件元数据

  // 写回索引文件
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));

  console.log(`✅ Updated registry for ${plugin}@${version}`);
}

main().catch(console.error);
