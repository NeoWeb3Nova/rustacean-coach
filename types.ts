
export type Language = 'en' | 'zh';

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  LEARN = 'LEARN',
  FEYNMAN = 'FEYNMAN',
  ARTIFACTS = 'ARTIFACTS',
  QUIZ = 'QUIZ',
  SETTINGS = 'SETTINGS'
}

export type LLMProvider = 'gemini' | 'openai' | 'claude' | 'grok' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
}

export interface GithubConfig {
  enabled: boolean;
  token: string;
  gistId?: string;
}

export interface Message {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
}

export interface LearningArtifact {
  id: string;
  title: string;
  date: string;
  content: string;
  tags: string[];
  gistUrl?: string; // 新增：保存云端链接
}

export interface UserProgress {
  currentLevel: string;
  completedChapters: number[];
  currentChapterIndex: number;
  totalSessions: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}
