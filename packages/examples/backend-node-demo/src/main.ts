/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

import type { MatchRow, ReplaceResult, TestResult, ValidateResult } from '../shared/regex-types';

type BooltoxBackendHandle = {
  channelId: string;
  pid?: number;
};

type ProgressEventPayload = {
  requestId?: string;
  percent?: number;
  processed: number;
  total: number;
  complete?: boolean;
};

type BooltoxBackendAPI = {
  register: () => Promise<BooltoxBackendHandle>;
  waitForReady: (channelId: string) => Promise<void>;
  call: (channelId: string, method: string, params?: Record<string, unknown>) => Promise<unknown>;
  dispose: (channelId: string) => Promise<void>;
  on: (channelId: string, event: string, handler: (payload: ProgressEventPayload) => void) => () => void;
};

declare global {
  interface Window {
    booltox: {
      backend: BooltoxBackendAPI;
    };
  }
}

type TemplateItem = {
  id: string;
  label: string;
  pattern: string;
  flags: string;
  description: string;
  sample?: string;
};

type HistoryEntry = {
  pattern: string;
  flags: string;
  createdAt: string;
};

type MatchItem = MatchRow;

type Summary = {
  totalMatches: number;
  uniqueMatches: number;
  tookMs: number;
  capturingGroups: number;
};

type ValidateResponse = ValidateResult & { tookMs: number };
type TestResponse = TestResult & {
  requestId: string;
  tookMs: number;
  limits: {
    maxTextLength: number;
    maxMatches: number;
  };
};
type ReplaceResponse = ReplaceResult & {
  requestId: string;
  tookMs: number;
  limits: {
    maxTextLength: number;
    maxPreviewLength: number;
  };
};

type AppState = {
  channelId: string | null;
  offProgress: (() => void) | null;
  templates: TemplateItem[];
  history: HistoryEntry[];
  matches: MatchItem[];
  summary: Summary | null;
  currentRequestId: string | null;
  activeRequestId: string | null;
};

const DOM = {
  statusDot: document.getElementById('status-dot') as HTMLElement,
  statusLabel: document.getElementById('status-label') as HTMLElement,
  restartBtn: document.getElementById('restart-btn') as HTMLButtonElement,
  stopBtn: document.getElementById('stop-btn') as HTMLButtonElement,
  patternInput: document.getElementById('pattern-input') as HTMLTextAreaElement,
  flagGroup: document.getElementById('flag-group') as HTMLElement,
  validateBtn: document.getElementById('validate-btn') as HTMLButtonElement,
  validateResult: document.getElementById('validate-result') as HTMLElement,
  patternList: document.getElementById('pattern-list') as HTMLElement,
  historyList: document.getElementById('history-list') as HTMLElement,
  clearHistory: document.getElementById('clear-history') as HTMLButtonElement,
  testText: document.getElementById('test-text') as HTMLTextAreaElement,
  replacementInput: document.getElementById('replacement-input') as HTMLInputElement,
  runTest: document.getElementById('run-test') as HTMLButtonElement,
  runReplace: document.getElementById('run-replace') as HTMLButtonElement,
  banner: document.getElementById('banner') as HTMLElement,
  summaryTotal: document.getElementById('summary-total') as HTMLElement,
  summaryUnique: document.getElementById('summary-unique') as HTMLElement,
  summaryTime: document.getElementById('summary-time') as HTMLElement,
  summaryGroups: document.getElementById('summary-groups') as HTMLElement,
  progressBar: document.getElementById('progress-bar') as HTMLElement,
  progressLabel: document.getElementById('progress-label') as HTMLElement,
  matchList: document.getElementById('match-list') as HTMLElement,
  highlightPreview: document.getElementById('highlight-preview') as HTMLElement,
  replacementPreview: document.getElementById('replacement-preview') as HTMLElement,
  replacementMeta: document.getElementById('replacement-meta') as HTMLElement,
  copyReplace: document.getElementById('copy-replace') as HTMLButtonElement
};

const HISTORY_KEY = 'booltox.regex.history';
const HISTORY_LIMIT = 10;
const HIGHLIGHT_LIMIT = 60_000;

const state: AppState = {
  channelId: null,
  offProgress: null,
  templates: [],
  history: loadHistory(),
  matches: [],
  summary: null,
  currentRequestId: null,
  activeRequestId: null
};

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch (error) {
    console.warn('读取历史记录失败', error);
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, HISTORY_LIMIT)));
}

function pushHistory(entry: HistoryEntry) {
  state.history = [
    entry,
    ...state.history.filter((item) => item.pattern !== entry.pattern || item.flags !== entry.flags)
  ].slice(0, HISTORY_LIMIT);
  saveHistory();
  renderHistory();
}

function renderHistory() {
  const list = state.history;
  if (!list.length) {
    DOM.historyList.innerHTML = '<p style="color: var(--muted);">暂无历史记录</p>';
    return;
  }
  DOM.historyList.innerHTML = list
    .map((item, idx) => `
      <div class="history-card" data-index="${idx}">
        <strong>${escapeHtml(item.pattern)}</strong>
        <div style="margin:4px 0;color:var(--muted);font-size:12px;">flags: ${item.flags || '无'}</div>
        <small>${item.createdAt}</small>
      </div>
    `)
    .join('');
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function copyText(text: string) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function getFlags() {
  return Array.from(DOM.flagGroup.querySelectorAll<HTMLButtonElement>('.flag-btn.active'))
    .map((btn) => btn.dataset.flag ?? '')
    .join('');
}

function setFlags(flags = '') {
  Array.from(DOM.flagGroup.children).forEach((node) => {
    const btn = node as HTMLButtonElement;
    btn.classList.toggle('active', flags.includes(btn.dataset.flag ?? ''));
  });
}

function setStatus(text: string, ready = false) {
  DOM.statusLabel.textContent = text;
  DOM.statusDot.classList.toggle('ready', ready);
}

async function registerBackend() {
  setStatus('启动后端...', false);
  try {
    if (state.channelId) {
      await window.booltox.backend.dispose(state.channelId);
      if (state.offProgress) state.offProgress();
    }
    const handle = await window.booltox.backend.register();
    state.channelId = handle.channelId;
    await window.booltox.backend.waitForReady(state.channelId);
    setStatus(`已连接 (PID ${handle.pid ?? 'N/A'})`, true);
    state.offProgress = window.booltox.backend.on(state.channelId, 'matchProgress', handleProgress);
    await fetchPatterns();
  } catch (error) {
    showBanner('error', (error as Error)?.message || '后端启动失败');
    setStatus('连接失败', false);
  }
}

async function disposeBackend() {
  if (!state.channelId) return;
  try {
    await window.booltox.backend.dispose(state.channelId);
  } finally {
    if (state.offProgress) state.offProgress();
    state.offProgress = null;
    state.channelId = null;
    setStatus('已断开', false);
  }
}

function handleProgress(event: ProgressEventPayload) {
  if (!event?.requestId) return;
  if (state.activeRequestId && event.requestId !== state.activeRequestId) return;
  if (!state.activeRequestId) state.activeRequestId = event.requestId;
  const percent = typeof event.percent === 'number'
    ? event.percent
    : event.total
      ? (event.processed / event.total) * 100
      : 0;
  DOM.progressBar.style.width = `${Math.min(100, Math.max(0, percent)).toFixed(1)}%`;
  DOM.progressLabel.textContent = event.complete ? '任务完成' : `处理中 (${Math.round(percent)}%)`;
}

async function callBackend<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
  if (!state.channelId) {
    throw new Error('后端尚未连接');
  }
  return window.booltox.backend.call(state.channelId, method, params) as Promise<T>;
}

async function fetchPatterns() {
  try {
    const { items } = await callBackend<{ items: TemplateItem[]; timestamp: string }>('getPatterns');
    state.templates = (items as TemplateItem[]) || [];
    if (!DOM.patternInput.value && state.templates.length) {
      DOM.patternInput.value = state.templates[0].pattern;
      setFlags(state.templates[0].flags || '');
      if (typeof state.templates[0].sample === 'string') {
        DOM.testText.value = state.templates[0].sample;
      }
    }
    renderTemplates();
  } catch (error) {
    console.warn('获取模式库失败', error);
  }
}

function renderTemplates() {
  if (!state.templates.length) {
    DOM.patternList.innerHTML = '<p style="color: var(--muted);">后端尚未返回模板</p>';
    return;
  }
  DOM.patternList.innerHTML = state.templates
    .map((tpl) => `
      <div class="template-card" data-id="${tpl.id}">
        <strong>${tpl.label}</strong>
        <div style="font-family:ui-monospace;font-size:13px;margin:6px 0;">${escapeHtml(tpl.pattern)}</div>
        <small style="color:var(--muted);">flags: ${tpl.flags || '无'} · ${tpl.description || ''}</small>
      </div>
    `)
    .join('');
}

function collectPayload() {
  return {
    pattern: DOM.patternInput.value.trim(),
    flags: getFlags(),
    text: DOM.testText.value,
    replacement: DOM.replacementInput.value
  };
}

function setLoading(type: 'test' | 'replace', loading: boolean) {
  if (type === 'test') DOM.runTest.disabled = loading;
  if (type === 'replace') DOM.runReplace.disabled = loading;
}

function showBanner(type?: 'error', text?: string) {
  if (type === 'error' && text) {
    DOM.banner.className = 'banner error';
    DOM.banner.textContent = text;
  } else {
    DOM.banner.className = 'banner';
    DOM.banner.textContent = '';
  }
}

function updateSummary(result: Summary | null) {
  DOM.summaryTotal.textContent = result?.totalMatches?.toString() ?? '-';
  DOM.summaryUnique.textContent = result?.uniqueMatches?.toString() ?? '-';
  DOM.summaryTime.textContent = result?.tookMs?.toString() ?? '-';
  DOM.summaryGroups.textContent = result?.capturingGroups?.toString() ?? '-';
}

function renderMatches(matches: MatchItem[]) {
  if (!matches?.length) {
    DOM.matchList.innerHTML = '<p style="color: var(--muted);">无匹配结果</p>';
    DOM.highlightPreview.textContent = '尚无匹配，点击“运行匹配”查看结果。';
    return;
  }

  DOM.matchList.innerHTML = matches
    .map((match, idx) => `
      <div class="match-row">
        <div class="match-head">
          <span>#${idx + 1} · index ${match.index}</span>
          <button class="ghost" data-match-index="${idx}" style="padding:4px 8px;font-size:12px;">复制</button>
        </div>
        <div class="match-value">${escapeHtml(match.value)}</div>
        <div class="context">${escapeHtml(match.context.before)}<mark>${escapeHtml(match.context.match)}</mark>${escapeHtml(match.context.after)}</div>
        ${match.groups?.length ? `<div style="margin-top:8px;font-size:12px;color:var(--muted);">捕获组：${match.groups.map((g) => g.name ? `${g.name}=${escapeHtml(g.value ?? '')}` : `$${g.index}=${escapeHtml(g.value ?? '')}`).join(', ')}</div>` : ''}
      </div>
    `)
    .join('');

  renderHighlight(matches);
}

function renderHighlight(matches: MatchItem[]) {
  const text = DOM.testText.value || '';
  if (!text) {
    DOM.highlightPreview.textContent = '尚无文本';
    return;
  }
  const limitedText = text.length > HIGHLIGHT_LIMIT ? text.slice(0, HIGHLIGHT_LIMIT) : text;
  let cursor = 0;
  let html = '';
  const filtered = matches
    .map((m) => ({ start: m.index, end: m.end }))
    .filter((m) => m.start < HIGHLIGHT_LIMIT)
    .sort((a, b) => a.start - b.start);
  for (const match of filtered) {
    const end = Math.min(match.end, HIGHLIGHT_LIMIT);
    html += escapeHtml(limitedText.slice(cursor, match.start));
    html += `<mark>${escapeHtml(limitedText.slice(match.start, end))}</mark>`;
    cursor = end;
  }
  html += escapeHtml(limitedText.slice(cursor));
  if (limitedText.length < text.length) {
    html += '<span style="color:var(--muted);"> … (已截断)</span>';
  }
  DOM.highlightPreview.innerHTML = html || '尚无匹配高亮';
}

function countGroups(pattern = '') {
  try {
    const regex = /(^|[^\\])\((?!\?[:=!<])/g;
    return (pattern.match(regex) || []).length;
  } catch {
    return 0;
  }
}

async function handleValidate() {
  try {
    const payload = collectPayload();
    if (!payload.pattern) {
      DOM.validateResult.textContent = '请先填写正则表达式';
      DOM.validateResult.style.color = '#f87171';
      return;
    }
    const result = await callBackend<ValidateResponse>('validate', { pattern: payload.pattern, flags: payload.flags });
    DOM.validateResult.textContent = `合法 · flags=${result.flags || '无'} · 捕获组 ${result.capturingGroups}`;
    DOM.validateResult.style.color = '#34d399';
  } catch (error) {
    DOM.validateResult.textContent = (error as Error)?.message || '校验失败';
    DOM.validateResult.style.color = '#f87171';
  }
}

async function handleTest() {
  const payload = collectPayload();
  showBanner();
  if (!payload.pattern) {
    showBanner('error', '请填写正则表达式');
    return;
  }
  if (!payload.text) {
    showBanner('error', '请输入待测文本');
    return;
  }
  state.activeRequestId = null;
  setLoading('test', true);
  DOM.progressBar.style.width = '0%';
  DOM.progressLabel.textContent = '开始执行';
  try {
    const result = await callBackend<TestResponse>('test', payload);
    state.currentRequestId = result.requestId;
    state.activeRequestId = result.requestId;
    state.matches = result.matches || [];
    state.summary = {
      totalMatches: result.totalMatches,
      uniqueMatches: result.uniqueMatches,
      tookMs: result.tookMs,
      capturingGroups: result.capturingGroups ?? countGroups(payload.pattern)
    };
    updateSummary(state.summary);
    renderMatches(state.matches);
    pushHistory({
      pattern: payload.pattern,
      flags: payload.flags,
      createdAt: new Date().toLocaleString()
    });
  } catch (error) {
    showBanner('error', (error as Error)?.message || '匹配失败');
  } finally {
    setLoading('test', false);
  }
}

async function handleReplace() {
  const payload = collectPayload();
  showBanner();
  if (!payload.pattern) {
    showBanner('error', '请填写正则表达式');
    return;
  }
  setLoading('replace', true);
  try {
    const result = await callBackend<ReplaceResponse>('replace', payload);
    DOM.replacementPreview.textContent = result.preview || '无替换结果';
    DOM.replacementMeta.textContent = `替换 ${result.replacementCount} 次 · ${result.truncated ? '显示前 ' + result.previewLength + ' 字符' : '完整输出'}`;
  } catch (error) {
    showBanner('error', (error as Error)?.message || '替换失败');
  } finally {
    setLoading('replace', false);
  }
}

function attachEvents() {
  DOM.flagGroup.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('flag-btn')) {
      target.classList.toggle('active');
    }
  });

  DOM.patternList.addEventListener('click', (event) => {
    const card = (event.target as HTMLElement).closest('.template-card') as HTMLElement | null;
    if (!card) return;
    const tpl = state.templates.find((item) => item.id === card.dataset.id);
    if (!tpl) return;
    DOM.patternInput.value = tpl.pattern;
    setFlags(tpl.flags || '');
    if (typeof tpl.sample === 'string') {
      DOM.testText.value = tpl.sample;
    }
  });

  DOM.historyList.addEventListener('click', (event) => {
    const card = (event.target as HTMLElement).closest('.history-card') as HTMLElement | null;
    if (!card) return;
    const item = state.history[Number(card.dataset.index ?? '-1')];
    if (!item) return;
    DOM.patternInput.value = item.pattern;
    setFlags(item.flags);
  });

  DOM.clearHistory.addEventListener('click', () => {
    state.history = [];
    saveHistory();
    renderHistory();
  });

  DOM.validateBtn.addEventListener('click', handleValidate);
  DOM.runTest.addEventListener('click', handleTest);
  DOM.runReplace.addEventListener('click', handleReplace);
  DOM.restartBtn.addEventListener('click', registerBackend);
  DOM.stopBtn.addEventListener('click', disposeBackend);

  DOM.copyReplace.addEventListener('click', async () => {
    const text = DOM.replacementPreview.textContent;
    if (!text || text === '暂无替换输出') return;
    await copyText(text);
  });

  DOM.matchList.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('button[data-match-index]') as HTMLButtonElement | null;
    if (!button) return;
    const idx = Number(button.dataset.matchIndex ?? '-1');
    const match = state.matches[idx];
    if (!match) return;
    copyText(match.value);
  });

  window.addEventListener('beforeunload', () => {
    disposeBackend();
  });
}

function init() {
  DOM.testText.value = 'Sample text: support@example.com, https://booltox.dev, +8613812345678';
  renderHistory();
  attachEvents();
  registerBackend();
}

init();
