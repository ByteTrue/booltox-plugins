/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

/**
 * 本地存储管理
 */

import type { PasswordHistory } from './types';

const STORAGE_KEY = 'password-generator-history';
const MAX_HISTORY = 20;

/**
 * 获取历史记录
 */
export function getHistory(): PasswordHistory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('读取历史记录失败:', error);
    return [];
  }
}

/**
 * 保存历史记录
 */
export function saveHistory(history: PasswordHistory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
}

/**
 * 添加历史记录
 */
export function addHistory(item: PasswordHistory): void {
  const history = getHistory();
  history.unshift(item);

  // 限制历史记录数量
  if (history.length > MAX_HISTORY) {
    history.splice(MAX_HISTORY);
  }

  saveHistory(history);
}

/**
 * 清空历史记录
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('清空历史记录失败:', error);
  }
}
