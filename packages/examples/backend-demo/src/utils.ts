/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

/**
 * 工具函数
 */

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 根据百分比获取颜色
 */
export function getPercentColor(percent: number): string {
  if (percent < 50) return '#10b981'; // 绿色
  if (percent < 75) return '#f59e0b'; // 橙色
  return '#ef4444'; // 红色
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 创建环形进度 SVG
 */
export function createCircularProgress(percent: number): string {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = getPercentColor(percent);

  return `
    <svg width="120" height="120">
      <circle
        class="circular-progress-bg"
        cx="60"
        cy="60"
        r="${radius}"
      />
      <circle
        class="circular-progress-fill"
        cx="60"
        cy="60"
        r="${radius}"
        stroke="${color}"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
      />
    </svg>
    <div class="circular-progress-text">${percent.toFixed(1)}%</div>
  `;
}
