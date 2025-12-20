
export type Language = 'en' | 'zh';

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  LEARN = 'LEARN',
  FEYNMAN = 'FEYNMAN',
  ARTIFACTS = 'ARTIFACTS'
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

export interface LearningPath {
  topic: string;
  status: 'todo' | 'in-progress' | 'completed';
  description: string;
}

export interface UserProgress {
  currentLevel: string;
  completedTopics: string[];
  totalSessions: number;
  lastActive: string;
}
