/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

/**
 * 密码生成器主应用
 */

import './style.css';
import type { PasswordConfig } from './types';
import { generatePassword, generatePassphrase } from './generator';
import { analyzeStrength } from './strength';
import { PRESETS } from './presets';
import { getHistory, addHistory, clearHistory } from './storage';

// 默认配置
const defaultConfig: PasswordConfig = {
  length: 12,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: true,
  customExclude: '',
};

// 应用状态
let currentConfig: PasswordConfig = { ...defaultConfig };
let currentPassword: string = '';

// DOM 元素
const elements = {
  passwordText: document.getElementById('password-text') as HTMLDivElement,
  strengthFill: document.getElementById('strength-fill') as HTMLDivElement,
  strengthLabel: document.getElementById('strength-label') as HTMLSpanElement,
  strengthEntropy: document.getElementById('strength-entropy') as HTMLSpanElement,
  strengthCrackTime: document.getElementById('strength-crack-time') as HTMLSpanElement,

  lengthSlider: document.getElementById('length-slider') as HTMLInputElement,
  lengthValue: document.getElementById('length-value') as HTMLSpanElement,

  uppercaseCheck: document.getElementById('uppercase') as HTMLInputElement,
  lowercaseCheck: document.getElementById('lowercase') as HTMLInputElement,
  numbersCheck: document.getElementById('numbers') as HTMLInputElement,
  symbolsCheck: document.getElementById('symbols') as HTMLInputElement,
  excludeAmbiguousCheck: document.getElementById('exclude-ambiguous') as HTMLInputElement,
  customExcludeInput: document.getElementById('custom-exclude') as HTMLInputElement,

  generateBtn: document.getElementById('generate-btn') as HTMLButtonElement,
  copyBtn: document.getElementById('copy-btn') as HTMLButtonElement,
  passphraseBtn: document.getElementById('passphrase-btn') as HTMLButtonElement,

  historyList: document.getElementById('history-list') as HTMLDivElement,
  clearHistoryBtn: document.getElementById('clear-history-btn') as HTMLButtonElement,
};

/**
 * 更新密码显示
 */
function updatePasswordDisplay(password: string): void {
  currentPassword = password;

  if (password) {
    elements.passwordText.textContent = password;
    elements.passwordText.classList.remove('empty');
  } else {
    elements.passwordText.textContent = '点击生成密码';
    elements.passwordText.classList.add('empty');
  }

  // 更新强度指示器
  const strength = analyzeStrength(password);
  const percentage = password ? ((strength.score + 1) / 5) * 100 : 0;

  elements.strengthFill.style.width = `${percentage}%`;
  elements.strengthFill.style.backgroundColor = strength.color;
  elements.strengthLabel.textContent = strength.label;
  elements.strengthLabel.style.color = strength.color;
  elements.strengthEntropy.textContent = `熵值: ${strength.entropy} bits`;
  elements.strengthCrackTime.textContent = `破解时间: ${strength.crackTime}`;

  // 启用复制按钮
  elements.copyBtn.disabled = !password;
}

/**
 * 生成密码
 */
function handleGenerate(): void {
  try {
    const password = generatePassword(currentConfig);
    updatePasswordDisplay(password);

    // 添加到历史记录
    const strength = analyzeStrength(password);
    addHistory({
      password,
      timestamp: Date.now(),
      strength,
    });

    // 刷新历史记录显示
    renderHistory();
  } catch (error) {
    alert(error instanceof Error ? error.message : '生成密码失败');
  }
}

/**
 * 生成密码短语
 */
function handleGeneratePassphrase(): void {
  const passphrase = generatePassphrase(4, '-');
  updatePasswordDisplay(passphrase);

  // 添加到历史记录
  const strength = analyzeStrength(passphrase);
  addHistory({
    password: passphrase,
    timestamp: Date.now(),
    strength,
  });

  // 刷新历史记录显示
  renderHistory();
}

/**
 * 复制密码
 */
async function handleCopy(): Promise<void> {
  if (!currentPassword) return;

  try {
    await navigator.clipboard.writeText(currentPassword);

    // 显示复制成功动画
    elements.copyBtn.textContent = '✓ 已复制';
    elements.passwordText.classList.add('copy-success');

    setTimeout(() => {
      elements.copyBtn.textContent = '📋 复制';
      elements.passwordText.classList.remove('copy-success');
    }, 1500);
  } catch (error) {
    console.error('复制密码失败', error);
    alert('复制失败，请手动复制');
  }
}

/**
 * 更新配置
 */
function updateConfig(): void {
  currentConfig = {
    length: parseInt(elements.lengthSlider.value),
    uppercase: elements.uppercaseCheck.checked,
    lowercase: elements.lowercaseCheck.checked,
    numbers: elements.numbersCheck.checked,
    symbols: elements.symbolsCheck.checked,
    excludeAmbiguous: elements.excludeAmbiguousCheck.checked,
    customExclude: elements.customExcludeInput.value,
  };
}

/**
 * 应用预设
 */
function applyPreset(presetId: string): void {
  const preset = PRESETS.find(p => p.id === presetId);
  if (!preset) return;

  currentConfig = { ...preset.config };

  // 更新 UI
  elements.lengthSlider.value = currentConfig.length.toString();
  elements.lengthValue.textContent = currentConfig.length.toString();
  elements.uppercaseCheck.checked = currentConfig.uppercase;
  elements.lowercaseCheck.checked = currentConfig.lowercase;
  elements.numbersCheck.checked = currentConfig.numbers;
  elements.symbolsCheck.checked = currentConfig.symbols;
  elements.excludeAmbiguousCheck.checked = currentConfig.excludeAmbiguous;
  elements.customExcludeInput.value = currentConfig.customExclude;

  // 自动生成密码
  handleGenerate();
}

/**
 * 渲染预设模板
 */
function renderPresets(): void {
  const presetsContainer = document.getElementById('presets-container') as HTMLDivElement;

  presetsContainer.innerHTML = PRESETS.map(preset => `
    <button class="preset-btn" data-preset-id="${preset.id}">
      <div class="preset-name">${preset.name}</div>
      <div class="preset-desc">${preset.description}</div>
    </button>
  `).join('');

  // 绑定事件
  presetsContainer.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetId = (btn as HTMLElement).dataset.presetId;
      if (presetId) applyPreset(presetId);
    });
  });
}

/**
 * 渲染历史记录
 */
function renderHistory(): void {
  const history = getHistory();

  if (history.length === 0) {
    elements.historyList.innerHTML = '<div class="empty-state">暂无历史记录</div>';
    elements.clearHistoryBtn.disabled = true;
    return;
  }

  elements.clearHistoryBtn.disabled = false;

  elements.historyList.innerHTML = history.map(item => {
    const date = new Date(item.timestamp);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    return `
      <div class="history-item" data-password="${item.password}">
        <div class="history-password">${item.password}</div>
        <div class="history-meta">
          <span class="history-strength" style="color: ${item.strength.color}">${item.strength.label}</span>
          <span>${timeStr}</span>
        </div>
      </div>
    `;
  }).join('');

  // 绑定点击事件
  elements.historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const password = (item as HTMLElement).dataset.password;
      if (password) {
        updatePasswordDisplay(password);
      }
    });
  });
}

/**
 * 清空历史记录
 */
function handleClearHistory(): void {
  if (confirm('确定要清空所有历史记录吗？')) {
    clearHistory();
    renderHistory();
  }
}

/**
 * 初始化应用
 */
function init(): void {
  // 初始化长度滑块
  elements.lengthValue.textContent = currentConfig.length.toString();

  // 绑定事件
  elements.lengthSlider.addEventListener('input', () => {
    elements.lengthValue.textContent = elements.lengthSlider.value;
    updateConfig();
  });

  elements.uppercaseCheck.addEventListener('change', updateConfig);
  elements.lowercaseCheck.addEventListener('change', updateConfig);
  elements.numbersCheck.addEventListener('change', updateConfig);
  elements.symbolsCheck.addEventListener('change', updateConfig);
  elements.excludeAmbiguousCheck.addEventListener('change', updateConfig);
  elements.customExcludeInput.addEventListener('input', updateConfig);

  elements.generateBtn.addEventListener('click', handleGenerate);
  elements.copyBtn.addEventListener('click', handleCopy);
  elements.passphraseBtn.addEventListener('click', handleGeneratePassphrase);
  elements.clearHistoryBtn.addEventListener('click', handleClearHistory);

  // 渲染预设和历史记录
  renderPresets();
  renderHistory();

  // 初始化密码显示
  updatePasswordDisplay('');

  // 自动生成第一个密码
  handleGenerate();
}

// 启动应用
init();
