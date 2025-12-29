
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ChatWindow from './components/ChatWindow';
import ArtifactsList from './components/ArtifactsList';
import QuizView from './components/QuizView';
import SettingsView from './components/SettingsView';
import { AppMode, LearningArtifact, Language, UserProgress, Message } from './types';
import { translations } from './translations';
import { nukeDatabase, getDirectoryHandle, syncArtifactToLocal, syncToGithubGist } from './services/sync';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [artifacts, setArtifacts] = useState<LearningArtifact[]>([]);
  
  const [coachHistory, setCoachHistory] = useState<Message[]>(() => {
    const saved = localStorage.getItem('rust_coach_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [feynmanHistory, setFeynmanHistory] = useState<Message[]>(() => {
    const saved = localStorage.getItem('rust_feynman_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [customTopics, setCustomTopics] = useState<string[] | null>(() => {
    const saved = localStorage.getItem('rust_custom_topics');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('rust_user_progress');
    return saved ? JSON.parse(saved) : {
      currentLevel: 'Beginner',
      completedChapters: [],
      currentChapterIndex: 0,
      totalSessions: 0
    };
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('rust_mentor_lang') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('rust_coach_history', JSON.stringify(coachHistory));
    localStorage.setItem('rust_feynman_history', JSON.stringify(feynmanHistory));
    localStorage.setItem('rust_mentor_lang', language);
    localStorage.setItem('rust_user_progress', JSON.stringify(progress));
    if (customTopics) localStorage.setItem('rust_custom_topics', JSON.stringify(customTopics));
    else localStorage.removeItem('rust_custom_topics');
  }, [coachHistory, feynmanHistory, language, progress, customTopics]);

  useEffect(() => {
    const saved = localStorage.getItem('rust_artifacts');
    if (saved) {
      try {
        setArtifacts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse artifacts");
      }
    }
  }, []);

  const handleAddArtifact = async (content: string) => {
    const newArtifact: LearningArtifact = {
      id: Date.now().toString(),
      title: `${language === 'zh' ? '学习成果' : 'Learning Session'}: ${new Date().toLocaleDateString()}`,
      date: new Date().toLocaleDateString().replace(/\//g, '-'),
      content: content,
      tags: ['Rust', activeMode === AppMode.FEYNMAN ? 'Feynman' : 'Mentorship']
    };
    
    // 1. 同步到本地物理文件夹
    const isAutoSync = localStorage.getItem('rust_auto_sync') === 'true';
    if (isAutoSync) {
      const handle = await getDirectoryHandle();
      if (handle) {
        await syncArtifactToLocal(newArtifact, handle);
      }
    }

    // 2. 同步到 GitHub Gist (云端)
    const githubConfigSaved = localStorage.getItem('rust_github_config');
    if (githubConfigSaved) {
      const gConfig = JSON.parse(githubConfigSaved);
      if (gConfig.enabled && gConfig.token) {
        const gistUrl = await syncToGithubGist(newArtifact, gConfig);
        if (gistUrl) {
          newArtifact.gistUrl = gistUrl;
        }
      }
    }
    
    // 3. 更新状态
    const updated = [newArtifact, ...artifacts];
    setArtifacts(updated);
    localStorage.setItem('rust_artifacts', JSON.stringify(updated));
    
    setActiveMode(AppMode.ARTIFACTS);
    alert(language === 'zh' ? '成果已保存！已同步至云端和本地磁盘。' : 'Artifact saved! Synced to cloud and local disk.');
  };

  const handleLanguageToggle = () => setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  const handleUpdateTopics = (topics: string[]) => {
    setCustomTopics(topics.length > 0 ? topics : null);
    setProgress(prev => ({ ...prev, currentChapterIndex: 0, completedChapters: [] }));
  };

  const handlePassQuiz = () => {
    setProgress(prev => ({
      ...prev,
      completedChapters: [...new Set([...prev.completedChapters, prev.currentChapterIndex])],
      currentChapterIndex: prev.currentChapterIndex + 1
    }));
    setActiveMode(AppMode.DASHBOARD);
  };

  const handleReset = async () => {
    localStorage.clear();
    await nukeDatabase();
    window.location.reload();
  };

  const currentChapterTitle = (customTopics || translations[language].rustTopics)[progress.currentChapterIndex];

  return (
    <Layout 
      activeMode={activeMode} 
      onModeChange={setActiveMode} 
      language={language} 
      onLanguageToggle={handleLanguageToggle}
      progressPercent={Math.round((progress.completedChapters.length / (customTopics?.length || translations[language].rustTopics.length)) * 100)}
      level={progress.completedChapters.length > 5 ? 'Intermediate' : 'Beginner'}
    >
      {activeMode === AppMode.DASHBOARD && <Dashboard language={language} customTopics={customTopics} onUpdateTopics={handleUpdateTopics} progress={progress} artifactsCount={artifacts.length} onStartLesson={(i) => { setProgress(p=>({...p, currentChapterIndex:i})); setActiveMode(AppMode.LEARN); }} />}
      {activeMode === AppMode.LEARN && <ChatWindow mode="COACH" language={language} messages={coachHistory} setMessages={setCoachHistory} onNewArtifact={handleAddArtifact} chapterContext={currentChapterTitle} onStartQuiz={() => setActiveMode(AppMode.QUIZ)} />}
      {activeMode === AppMode.QUIZ && <QuizView language={language} chapterTitle={currentChapterTitle} onPass={handlePassQuiz} onFail={() => setActiveMode(AppMode.DASHBOARD)} />}
      {activeMode === AppMode.FEYNMAN && <ChatWindow mode="FEYNMAN" language={language} messages={feynmanHistory} setMessages={setFeynmanHistory} onNewArtifact={handleAddArtifact} />}
      {activeMode === AppMode.ARTIFACTS && <ArtifactsList artifacts={artifacts} language={language} />}
      {activeMode === AppMode.SETTINGS && <SettingsView language={language} onReset={handleReset} />}
    </Layout>
  );
};

export default App;
