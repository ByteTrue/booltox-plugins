/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

/**
 * 系统监控类型定义
 */

export interface SystemInfo {
  platform: string;
  platform_release: string;
  platform_version: string;
  architecture: string;
  hostname: string;
  processor: string;
  python_version: string;
  cpu_count: number;
  cpu_count_logical: number;
  boot_time: string;
}

export interface CPUInfo {
  percent: number;
  percent_per_core: number[];
  frequency: {
    current: number;
    min: number;
    max: number;
  } | null;
}

export interface MemoryInfo {
  total: number;
  available: number;
  used: number;
  percent: number;
  swap_total: number;
  swap_used: number;
  swap_percent: number;
}

export interface DiskInfo {
  device: string;
  mountpoint: string;
  fstype: string;
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface NetworkInfo {
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
}

export interface MonitorData {
  cpu: CPUInfo;
  memory: MemoryInfo;
  network: NetworkInfo;
  timestamp: number;
}

export type BackendMessageType = 'stdout' | 'stderr' | 'exit' | 'error' | 'jsonrpc';

export interface BackendJsonRpcNotification<TParams = unknown> {
  jsonrpc: '2.0';
  method: string;
  params?: TParams;
}

export interface BackendMessage {
  pluginId?: string;
  channelId: string;
  type: BackendMessageType;
  data?: string;
  code?: number | null;
  jsonrpc?: BackendJsonRpcNotification;
}

export interface BackendHandle {
  channelId: string;
  pid: number;
}
