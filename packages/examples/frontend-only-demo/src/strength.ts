/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

/**
 * 密码强度分析
 */

import type { PasswordStrength } from './types';

/**
 * 计算密码熵值
 */
function calculateEntropy(password: string): number {
  let charsetSize = 0;

  // 检测字符集大小
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

  // 熵值 = log2(字符集大小^密码长度)
  return Math.log2(Math.pow(charsetSize, password.length));
}

/**
 * 估算破解时间
 */
function estimateCrackTime(entropy: number): string {
  // 假设每秒尝试 10^9 次（1 billion guesses/second）
  const guessesPerSecond = 1e9;
  const possibleCombinations = Math.pow(2, entropy);
  const seconds = possibleCombinations / guessesPerSecond / 2; // 平均需要尝试一半

  if (seconds < 1) return '瞬间';
  if (seconds < 60) return `${Math.round(seconds)} 秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} 小时`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)} 天`;
  if (seconds < 31536000) return `${Math.round(seconds / 2592000)} 个月`;
  if (seconds < 3153600000) return `${Math.round(seconds / 31536000)} 年`;
  return `${(seconds / 31536000).toExponential(2)} 年`;
}

/**
 * 分析密码强度
 */
export function analyzeStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: '无',
      entropy: 0,
      crackTime: '-',
      color: '#64748b',
    };
  }

  const entropy = calculateEntropy(password);
  const crackTime = estimateCrackTime(entropy);

  // 根据熵值评分
  let score = 0;
  let label = '弱';
  let color = '#ef4444';

  if (entropy < 28) {
    score = 0;
    label = '极弱';
    color = '#dc2626';
  } else if (entropy < 36) {
    score = 1;
    label = '弱';
    color = '#ef4444';
  } else if (entropy < 60) {
    score = 2;
    label = '中等';
    color = '#f59e0b';
  } else if (entropy < 128) {
    score = 3;
    label = '强';
    color = '#10b981';
  } else {
    score = 4;
    label = '极强';
    color = '#059669';
  }

  return {
    score,
    label,
    entropy: Math.round(entropy * 10) / 10,
    crackTime,
    color,
  };
}
