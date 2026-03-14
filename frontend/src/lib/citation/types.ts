export interface Citation {
  id: string;
  original: string;
  formatted: string;
  style: CitationStyle;
  provider: AIProvider;
  level?: string; 
  rankDetail?: {
    tags: Array<{ label: string; value: string; type: string }>;
    isNegative?: boolean;
  };
  timestamp: number;
}

export enum TargetLanguage {
  ZH = 'zh',
  EN = 'en',
  DE = 'de',
  FR = 'fr',
  JA = 'ja'
}

export enum CitationStyle {
  LEGAL = 'legal',
  SOCIAL_SCIENCE = 'social_science',
  GB7714 = 'gb7714'
}

export enum AIProvider {
  QWEN = 'qwen',
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek'
}
