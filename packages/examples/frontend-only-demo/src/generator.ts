/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

/**
 * 密码生成核心逻辑
 */

import type { PasswordConfig } from './types';

// 字符集定义
const CHARSET = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  ambiguous: 'il1Lo0O',
};

/**
 * 生成密码
 */
export function generatePassword(config: PasswordConfig): string {
  let charset = '';

  // 构建字符集
  if (config.uppercase) charset += CHARSET.uppercase;
  if (config.lowercase) charset += CHARSET.lowercase;
  if (config.numbers) charset += CHARSET.numbers;
  if (config.symbols) charset += CHARSET.symbols;

  // 排除易混淆字符
  if (config.excludeAmbiguous) {
    charset = charset
      .split('')
      .filter((char) => !CHARSET.ambiguous.includes(char))
      .join('');
  }

  // 排除自定义字符
  if (config.customExclude) {
    charset = charset
      .split('')
      .filter((char) => !config.customExclude.includes(char))
      .join('');
  }

  if (charset.length === 0) {
    throw new Error('字符集为空，请至少选择一种字符类型');
  }

  // 使用 Crypto API 生成安全随机数
  const password: string[] = [];
  const array = new Uint32Array(config.length);
  crypto.getRandomValues(array);

  for (let i = 0; i < config.length; i++) {
    const randomIndex = array[i] % charset.length;
    password.push(charset[randomIndex]);
  }

  return password.join('');
}

/**
 * 批量生成密码
 */
export function generatePasswords(config: PasswordConfig, count: number): string[] {
  const passwords: string[] = [];
  for (let i = 0; i < count; i++) {
    passwords.push(generatePassword(config));
  }
  return passwords;
}

/**
 * 生成密码短语（多个单词组合）
 */
export function generatePassphrase(wordCount: number = 4, separator: string = '-'): string {
  // 常用单词列表（简化版）
  const words = [
    'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'garden', 'happy',
    'island', 'jungle', 'kitten', 'lemon', 'mountain', 'nature', 'ocean', 'planet',
    'queen', 'river', 'sunset', 'tiger', 'umbrella', 'valley', 'winter', 'yellow',
    'zebra', 'anchor', 'bridge', 'castle', 'diamond', 'engine', 'flower', 'guitar',
    'harbor', 'iceberg', 'journey', 'kingdom', 'lantern', 'melody', 'nebula', 'orchid',
    'phoenix', 'quantum', 'rainbow', 'sapphire', 'thunder', 'universe', 'volcano', 'whisper',
  ];

  const selectedWords: string[] = [];
  const array = new Uint32Array(wordCount);
  crypto.getRandomValues(array);

  for (let i = 0; i < wordCount; i++) {
    const randomIndex = array[i] % words.length;
    selectedWords.push(words[randomIndex]);
  }

  return selectedWords.join(separator);
}
