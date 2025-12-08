/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

/**
 * 密码预设模板
 */

import type { PasswordPreset } from './types';

export const PRESETS: PasswordPreset[] = [
  {
    id: 'pin',
    name: 'PIN 码',
    description: '4-6 位纯数字',
    config: {
      length: 6,
      uppercase: false,
      lowercase: false,
      numbers: true,
      symbols: false,
      excludeAmbiguous: false,
      customExclude: '',
    },
  },
  {
    id: 'simple',
    name: '简单密码',
    description: '8 位字母数字',
    config: {
      length: 8,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: false,
      excludeAmbiguous: true,
      customExclude: '',
    },
  },
  {
    id: 'standard',
    name: '标准密码',
    description: '12 位混合字符',
    config: {
      length: 12,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: true,
      customExclude: '',
    },
  },
  {
    id: 'strong',
    name: '强密码',
    description: '16 位全字符',
    config: {
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: false,
      customExclude: '',
    },
  },
  {
    id: 'ultra',
    name: '超强密码',
    description: '24 位全字符',
    config: {
      length: 24,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: false,
      customExclude: '',
    },
  },
];
