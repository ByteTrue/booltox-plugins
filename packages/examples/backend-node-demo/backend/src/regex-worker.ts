/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

import { parentPort } from 'worker_threads';
import type {
  MatchContext,
  MatchGroup,
  MatchRow,
  ReplacePayload,
  TestPayload,
  ValidatePayload,
} from '../../shared/regex-types';

const SAFE_FLAGS = new Set(['g', 'i', 'm', 's', 'u', 'y']);
const CONTEXT_WINDOW = 28;

type WorkerMessage =
  | { task: 'validate'; payload?: ValidatePayload }
  | { task: 'test'; payload?: TestPayload }
  | { task: 'replace'; payload?: ReplacePayload };

function normalizeFlags(flags = '') {
  const unique: string[] = [];
  for (const ch of String(flags)) {
    if (SAFE_FLAGS.has(ch) && !unique.includes(ch)) {
      unique.push(ch);
    }
  }
  return unique.join('');
}

function buildRegex(pattern: string, flags: string, { forceGlobal = false } = {}) {
  let normalized = normalizeFlags(flags);
  if (forceGlobal && !normalized.includes('g')) {
    normalized += 'g';
  }
  return new RegExp(pattern, normalized);
}

function countCapturingGroups(pattern: string) {
  let count = 0;
  let escaped = false;
  let insideClass = false;
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '[') {
      insideClass = true;
      continue;
    }
    if (char === ']' && insideClass) {
      insideClass = false;
      continue;
    }
    if (insideClass) continue;
    if (char !== '(') continue;

    const next = pattern[i + 1];
    if (next === '?') {
      const lookahead = pattern.slice(i + 2, i + 4);
      if (lookahead === ':') continue;
      if (lookahead === '=' || lookahead === '!') continue;
      const lookbehind = pattern.slice(i + 2, i + 5);
      if (lookbehind === '<=' || lookbehind === '<!') continue;
    }
    count += 1;
  }
  return count;
}

function formatGroups(match: RegExpExecArray): MatchGroup[] {
  const groups: MatchGroup[] = [];
  for (let i = 1; i < match.length; i += 1) {
    groups.push({ index: i, value: match[i] ?? null });
  }
  if (match.groups) {
    for (const [name, value] of Object.entries(match.groups)) {
      groups.push({ name, value: value ?? null });
    }
  }
  return groups;
}

function createContext(text: string, start: number, end: number): MatchContext {
  const beforeStart = Math.max(0, start - CONTEXT_WINDOW);
  const afterEnd = Math.min(text.length, end + CONTEXT_WINDOW);
  return {
    before: text.slice(beforeStart, start),
    match: text.slice(start, end),
    after: text.slice(end, afterEnd)
  };
}

function runValidate(payload: ValidatePayload) {
  const { pattern, flags = '' } = payload;
  const regex = buildRegex(pattern, flags);
  return {
    ok: true,
    source: regex.source,
    flags: regex.flags,
    global: regex.global,
    ignoreCase: regex.ignoreCase,
    multiline: regex.multiline,
    dotAll: regex.dotAll,
    unicode: regex.unicode,
    sticky: regex.sticky,
    capturingGroups: countCapturingGroups(regex.source)
  };
}

function runTest(payload: TestPayload) {
  const { pattern, flags = '', text = '', maxMatches = 500, requestId } = payload;
  const regex = buildRegex(pattern, flags, { forceGlobal: true });
  const matches: MatchRow[] = [];
  const unique = new Set<string>();
  const totalLength = text.length;
  let totalMatches = 0;
  let iterations = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;
    totalMatches += 1;
    unique.add(value);

    if (matches.length < maxMatches) {
      matches.push({
        id: `${requestId || 'test'}-${totalMatches}`,
        value,
        index: start,
        end,
        length: value.length,
        groups: formatGroups(match),
        context: createContext(text, start, end)
      });
    }

    if (value.length === 0) {
      regex.lastIndex += 1;
    }

    iterations += 1;
    if (iterations % 200 === 0) {
      parentPort?.postMessage({
        type: 'progress',
        data: {
          processed: Math.min(regex.lastIndex, totalLength),
          total: totalLength,
          percent: totalLength ? Number(((regex.lastIndex / totalLength) * 100).toFixed(2)) : 100,
          batch: iterations
        }
      });
    }
  }

  parentPort?.postMessage({
    type: 'progress',
    data: {
      processed: totalLength,
      total: totalLength,
      percent: 100,
      complete: true,
      batch: iterations
    }
  });

  return {
    totalMatches,
    returnedMatches: matches.length,
    truncated: totalMatches > matches.length,
    uniqueMatches: unique.size,
    capturingGroups: countCapturingGroups(pattern),
    matches
  };
}

function runReplace(payload: ReplacePayload) {
  const { pattern, flags = '', text = '', replacement = '', maxPreviewLength = 5000 } = payload;
  const replaceRegex = buildRegex(pattern, flags);
  const counterRegex = new RegExp(pattern, replaceRegex.flags || '');

  let replacementCount = 0;
  if (counterRegex.global) {
    let match: RegExpExecArray | null;
    while ((match = counterRegex.exec(text)) !== null) {
      replacementCount += 1;
      if (match[0].length === 0) {
        counterRegex.lastIndex += 1;
      }
    }
  } else {
    replacementCount = counterRegex.test(text) ? 1 : 0;
  }

  const replacedText = text.replace(replaceRegex, replacement);
  const truncated = replacedText.length > maxPreviewLength;
  const preview = truncated ? `${replacedText.slice(0, maxPreviewLength)}…` : replacedText;

  return {
    replacementCount,
    preview,
    truncated,
    previewLength: preview.length
  };
}

function handleMessage(message?: WorkerMessage) {
  try {
    if (!message?.task) {
      parentPort?.postMessage({ type: 'error', error: '缺少任务类型' });
      return;
    }

    switch (message.task) {
      case 'validate': {
        const payload = message.payload ?? { pattern: '' };
        const result = runValidate(payload);
        parentPort?.postMessage({ type: 'result', result });
        return;
      }
      case 'test': {
        const payload = message.payload ?? { pattern: '', text: '' };
        const result = runTest(payload);
        parentPort?.postMessage({ type: 'result', result });
        return;
      }
      case 'replace': {
        const payload = message.payload ?? { pattern: '', text: '' };
        const result = runReplace(payload);
        parentPort?.postMessage({ type: 'result', result });
        return;
      }
      default: {
        // 使用类型断言来处理未知的 task 类型
        parentPort?.postMessage({
          type: 'error',
          error: `未知任务: ${String((message as { task: string }).task)}`
        });
      }
    }
  } catch (error) {
    parentPort?.postMessage({ type: 'error', error: (error as Error)?.message || String(error) });
  }
}

parentPort?.on('message', handleMessage);
