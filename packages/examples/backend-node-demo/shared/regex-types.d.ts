export type RegexTask = 'validate' | 'test' | 'replace';

export type MatchContext = {
  before: string;
  match: string;
  after: string;
};

export type MatchGroup = {
  index?: number;
  name?: string;
  value: string | null;
};

export type MatchRow = {
  id: string;
  value: string;
  index: number;
  end: number;
  length: number;
  groups: MatchGroup[];
  context: MatchContext;
};

export type ValidatePayload = {
  pattern: string;
  flags?: string;
  requestId?: string;
};

export type ValidateResult = {
  ok: boolean;
  source: string;
  flags: string;
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  dotAll: boolean;
  unicode: boolean;
  sticky: boolean;
  capturingGroups: number;
};

export type TestPayload = {
  pattern: string;
  flags?: string;
  text?: string;
  maxMatches?: number;
  requestId?: string;
};

export type TestResult = {
  totalMatches: number;
  returnedMatches: number;
  truncated: boolean;
  uniqueMatches: number;
  capturingGroups: number;
  matches: MatchRow[];
};

export type ReplacePayload = {
  pattern: string;
  flags?: string;
  text?: string;
  replacement?: string;
  maxPreviewLength?: number;
  requestId?: string;
};

export type ReplaceResult = {
  replacementCount: number;
  preview: string;
  truncated: boolean;
  previewLength: number;
};

export type RegexTaskPayload = ValidatePayload | TestPayload | ReplacePayload;
export type RegexTaskResult = ValidateResult | TestResult | ReplaceResult;
