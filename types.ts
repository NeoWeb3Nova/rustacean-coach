
export type Language = 'en' | 'zh';

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  LEARN = 'LEARN',
  FEYNMAN = 'FEYNMAN',
  ARTIFACTS = 'ARTIFACTS',
  QUIZ = 'QUIZ'
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
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
  completedChapters: number[]; // Array of indices
  currentChapterIndex: number;
  totalSessions: number;
}
