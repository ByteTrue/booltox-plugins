/**
 * Copyright (c) 2025 ByteTrue
 * Licensed under CC-BY-NC-4.0
 */

/**
 * 密码生成器类型定义
 */

export interface PasswordConfig {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  customExclude: string;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: string; // '弱', '中', '强', '极强'
  entropy: number;
  crackTime: string;
  color: string;
}

export interface PasswordPreset {
  id: string;
  name: string;
  description: string;
  config: PasswordConfig;
}

export interface PasswordHistory {
  password: string;
  timestamp: number;
  strength: PasswordStrength;
}
