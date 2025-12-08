/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

/**
 * 系统监控主应用
 */

import './style.css';
import type {
  SystemInfo,
  CPUInfo,
  MemoryInfo,
  DiskInfo,
  ProcessInfo,
  MonitorData,
  BackendMessage,
  BackendHandle,
  BackendJsonRpcNotification,
} from './types';
import { formatBytes, getPercentColor, createCircularProgress } from './utils';

type BackendCommandPayload = Record<string, unknown>;
const logInfo = (...args: unknown[]): void => {
  console.warn('[SystemMonitor]', ...args);
};

// 声明全局 booltox API
declare global {
  interface Window {
    booltox: {
      backend: {
        register: () => Promise<BackendHandle>;
        postMessage: (channelId: string, payload: BackendCommandPayload) => Promise<void>;
        dispose: (channelId: string) => Promise<void>;
        onMessage: (callback: (message: BackendMessage) => void) => () => void;
      };
    };
  }
}

// 应用状态
let backendChannel: string | null = null;

// DOM 元素
const elements = {
  statusDot: document.getElementById('status-dot') as HTMLDivElement,
  statusLabel: document.getElementById('status-label') as HTMLSpanElement,
  startBtn: document.getElementById('start-btn') as HTMLButtonElement,
  stopBtn: document.getElementById('stop-btn') as HTMLButtonElement,
  refreshBtn: document.getElementById('refresh-btn') as HTMLButtonElement,

  systemInfo: document.getElementById('system-info') as HTMLDivElement,
  cpuInfo: document.getElementById('cpu-info') as HTMLDivElement,
  memoryInfo: document.getElementById('memory-info') as HTMLDivElement,
  diskInfo: document.getElementById('disk-info') as HTMLDivElement,
  processList: document.getElementById('process-list') as HTMLDivElement,
};

/**
 * 发送命令到后端
 */
async function sendCommand(command: string, params: BackendCommandPayload = {}): Promise<void> {
  if (!backendChannel) {
    console.error('后端未启动');
    return;
  }

  await window.booltox.backend.postMessage(backendChannel, {
    command,
    ...params,
  });
}

/**
 * 更新状态指示器
 */
function updateStatus(text: string, ready: boolean): void {
  elements.statusLabel.textContent = text;
  if (ready) {
    elements.statusDot.classList.add('ready');
  } else {
    elements.statusDot.classList.remove('ready');
  }
}

/**
 * 渲染系统信息
 */
function renderSystemInfo(info: SystemInfo): void {
  elements.systemInfo.innerHTML = `
    <div class="info-item">
      <span class="info-label">操作系统</span>
      <span class="info-value">${info.platform} ${info.platform_release}</span>
    </div>
    <div class="info-item">
      <span class="info-label">主机名</span>
      <span class="info-value">${info.hostname}</span>
    </div>
    <div class="info-item">
      <span class="info-label">架构</span>
      <span class="info-value">${info.architecture}</span>
    </div>
    <div class="info-item">
      <span class="info-label">处理器</span>
      <span class="info-value">${info.processor || 'N/A'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">CPU 核心</span>
      <span class="info-value">${info.cpu_count} 物理 / ${info.cpu_count_logical} 逻辑</span>
    </div>
    <div class="info-item">
      <span class="info-label">Python 版本</span>
      <span class="info-value">${info.python_version}</span>
    </div>
    <div class="info-item">
      <span class="info-label">启动时间</span>
      <span class="info-value">${info.boot_time}</span>
    </div>
  `;
}

/**
 * 渲染 CPU 信息
 */
function renderCPUInfo(cpu: CPUInfo): void {
  const color = getPercentColor(cpu.percent);

  let html = `
    <div class="stat-card">
      <div class="stat-value" style="color: ${color}">${cpu.percent.toFixed(1)}%</div>
      <div class="stat-label">总体使用率</div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${cpu.percent}%; background: ${color}"></div>
    </div>
  `;

  if (cpu.frequency) {
    html += `
      <div class="info-item">
        <span class="info-label">当前频率</span>
        <span class="info-value">${cpu.frequency.current.toFixed(0)} MHz</span>
      </div>
    `;
  }

  // CPU 核心
  if (cpu.percent_per_core && cpu.percent_per_core.length > 0) {
    html += '<div class="cpu-cores">';
    cpu.percent_per_core.forEach((percent, index) => {
      const coreColor = getPercentColor(percent);
      html += `
        <div class="cpu-core">
          <div class="cpu-core-label">核心 ${index}</div>
          <div class="cpu-core-value" style="color: ${coreColor}">${percent.toFixed(1)}%</div>
        </div>
      `;
    });
    html += '</div>';
  }

  elements.cpuInfo.innerHTML = html;
}

/**
 * 渲染内存信息
 */
function renderMemoryInfo(memory: MemoryInfo): void {
  elements.memoryInfo.innerHTML = `
    <div class="circular-progress">
      ${createCircularProgress(memory.percent)}
    </div>
    <div style="margin-top: 16px;">
      <div class="info-item">
        <span class="info-label">总内存</span>
        <span class="info-value">${formatBytes(memory.total)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">已使用</span>
        <span class="info-value">${formatBytes(memory.used)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">可用</span>
        <span class="info-value">${formatBytes(memory.available)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">交换分区</span>
        <span class="info-value">${formatBytes(memory.swap_used)} / ${formatBytes(memory.swap_total)}</span>
      </div>
    </div>
  `;
}

/**
 * 渲染磁盘信息
 */
function renderDiskInfo(disks: DiskInfo[]): void {
  if (disks.length === 0) {
    elements.diskInfo.innerHTML = '<div class="empty-state">无磁盘信息</div>';
    return;
  }

  let html = '<div class="disk-list">';
  disks.forEach((disk) => {
    const color = getPercentColor(disk.percent);
    html += `
      <div class="disk-item">
        <div class="disk-header">
          <div class="disk-name">${disk.mountpoint}</div>
          <div class="disk-percent" style="color: ${color}">${disk.percent.toFixed(1)}%</div>
        </div>
        <div class="disk-info">${disk.device} (${disk.fstype})</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${disk.percent}%; background: ${color}"></div>
        </div>
        <div class="info-item">
          <span class="info-label">已使用 / 总容量</span>
          <span class="info-value">${formatBytes(disk.used)} / ${formatBytes(disk.total)}</span>
        </div>
      </div>
    `;
  });
  html += '</div>';

  elements.diskInfo.innerHTML = html;
}

/**
 * 渲染进程列表
 */
function renderProcessList(processes: ProcessInfo[]): void {
  if (processes.length === 0) {
    elements.processList.innerHTML = '<div class="empty-state">无进程信息</div>';
    return;
  }

  let html = `
    <table class="process-table">
      <thead>
        <tr>
          <th>PID</th>
          <th>进程名</th>
          <th>CPU %</th>
          <th>内存 %</th>
        </tr>
      </thead>
      <tbody>
  `;

  processes.forEach((proc) => {
    html += `
      <tr>
        <td>${proc.pid}</td>
        <td>${proc.name}</td>
        <td>${proc.cpu_percent.toFixed(1)}%</td>
        <td>${proc.memory_percent.toFixed(1)}%</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  elements.processList.innerHTML = html;
}

/**
 * 处理后端消息
 */
function parseJsonRpcFromMessage(message: BackendMessage): BackendJsonRpcNotification | null {
  if (message.type === 'jsonrpc' && message.jsonrpc) {
    return message.jsonrpc;
  }

  if (message.type === 'stdout' && message.data) {
    try {
      const parsed = JSON.parse(message.data);
      if (parsed && parsed.jsonrpc === '2.0' && typeof parsed.method === 'string') {
        return parsed;
      }
    } catch (error) {
      console.warn('解析后端 stdout 失败:', error);
    }
  }

  return null;
}

function handleBackendMessage(message: BackendMessage): void {
  if (!backendChannel || message.channelId !== backendChannel) return;

  // 先处理进程级事件
  if (message.type === 'exit') {
    updateStatus('后端已退出', false);
    backendChannel = null;
    elements.startBtn.disabled = true;
    elements.stopBtn.disabled = true;
    elements.refreshBtn.disabled = true;
    return;
  }

  if (message.type === 'stderr') {
    console.error('后端 stderr:', message.data);
  }

  if (message.type === 'error') {
    console.error('后端错误:', message.data ?? `code=${message.code ?? '未知'}`);
    alert(`后端错误: ${message.data ?? '未知错误'}`);
    return;
  }

  const rpcMessage = parseJsonRpcFromMessage(message);
  if (!rpcMessage) {
    return;
  }

  const method = rpcMessage.method;
  const params = (rpcMessage.params ?? {}) as Record<string, unknown>;

  switch (method) {
    case 'backend_ready':
      logInfo('后端就绪:', params.message);
      sendCommand('get_system_info');
      sendCommand('get_disk_info');
      break;

    case 'system_info':
      renderSystemInfo(params.data as SystemInfo);
      break;

    case 'cpu_info':
      renderCPUInfo(params.data as CPUInfo);
      break;

    case 'memory_info':
      renderMemoryInfo(params.data as MemoryInfo);
      break;

    case 'disk_info':
      renderDiskInfo(params.data as DiskInfo[]);
      break;

    case 'processes':
      renderProcessList(params.data as ProcessInfo[]);
      break;

    case 'monitor_data': {
      const data = params.data as MonitorData | undefined;
      if (data) {
        renderCPUInfo(data.cpu);
        renderMemoryInfo(data.memory);
      }
      break;
    }

    case 'monitor_started':
      elements.startBtn.disabled = true;
      elements.stopBtn.disabled = false;
      updateStatus('监控运行中', true);
      break;

    case 'monitor_stopped':
      elements.startBtn.disabled = false;
      elements.stopBtn.disabled = true;
      updateStatus('监控已停止', true);
      break;

    case 'exit':
      updateStatus('后端已退出', false);
      backendChannel = null;
      elements.startBtn.disabled = true;
      elements.stopBtn.disabled = true;
      elements.refreshBtn.disabled = true;
      break;

    case 'error':
      console.error('后端错误:', params.message);
      alert(`错误: ${params.message}`);
      break;

    default:
      logInfo('未知事件:', method, params);
  }
}

/**
 * 启动后端
 */
async function startBackend(): Promise<void> {
  try {
    updateStatus('启动中...', false);
    const handle = await window.booltox.backend.register();
    backendChannel = handle.channelId;
    updateStatus(`后端已启动 (PID: ${handle.pid})`, true);
    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.refreshBtn.disabled = false;
    logInfo('后端已启动:', handle);
  } catch (error) {
    console.error('启动后端失败:', error);
    updateStatus('启动失败', false);
    alert(`启动失败: ${error}`);
  }
}

/**
 * 开始监控
 */
async function startMonitoring(): Promise<void> {
  await sendCommand('start_monitor');
}

/**
 * 停止监控
 */
async function stopMonitoring(): Promise<void> {
  await sendCommand('stop_monitor');
}

/**
 * 刷新数据
 */
async function refreshData(): Promise<void> {
  await sendCommand('get_system_info');
  await sendCommand('get_cpu_info');
  await sendCommand('get_memory_info');
  await sendCommand('get_disk_info');
  await sendCommand('get_processes', { sort_by: 'cpu', limit: 10 });
}

/**
 * 初始化应用
 */
function init(): void {
  // 订阅后端消息
  const unsubscribe = window.booltox.backend.onMessage(handleBackendMessage);

  // 绑定按钮事件
  elements.startBtn.addEventListener('click', startMonitoring);
  elements.stopBtn.addEventListener('click', stopMonitoring);
  elements.refreshBtn.addEventListener('click', refreshData);

  // 自动启动后端
  startBackend();

  // 清理
  window.addEventListener('beforeunload', () => {
    if (backendChannel) {
      window.booltox.backend.dispose(backendChannel);
    }
    unsubscribe();
  });
}

// 启动应用
init();
