
export type Language = 'en' | 'zh';

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  LEARN = 'LEARN',
  FEYNMAN = 'FEYNMAN',
  ARTIFACTS = 'ARTIFACTS',
  QUIZ = 'QUIZ',
  SETTINGS = 'SETTINGS'
}

// Added missing LLMProvider and LLMConfig types used in Settings and LLM services
export type LLMProvider = 'gemini' | 'openai' | 'claude' | 'grok' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
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
