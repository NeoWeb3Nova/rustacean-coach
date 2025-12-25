
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ChatWindow from './components/ChatWindow';
import ArtifactsList from './components/ArtifactsList';
import QuizView from './components/QuizView';
import SettingsView from './components/SettingsView';
import { AppMode, LearningArtifact, Language, UserProgress, Message } from './types';
import { translations } from './translations';
import { nukeDatabase, getDirectoryHandle, syncArtifactToLocal } from './services/sync';

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
  }, [coachHistory]);

  useEffect(() => {
    localStorage.setItem('rust_feynman_history', JSON.stringify(feynmanHistory));
  }, [feynmanHistory]);

  useEffect(() => {
    localStorage.setItem('rust_mentor_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('rust_user_progress', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    if (customTopics) {
      localStorage.setItem('rust_custom_topics', JSON.stringify(customTopics));
    } else {
      localStorage.removeItem('rust_custom_topics');
    }
  }, [customTopics]);

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
    
    // 1. 保存到内部状态和 localStorage
    const updated = [newArtifact, ...artifacts];
    setArtifacts(updated);
    localStorage.setItem('rust_artifacts', JSON.stringify(updated));
    
    // 2. 尝试自动同步到本地文件夹
    const isAutoSync = localStorage.getItem('rust_auto_sync') === 'true';
    if (isAutoSync) {
      const handle = await getDirectoryHandle();
      if (handle) {
        const success = await syncArtifactToLocal(newArtifact, handle);
        if (success) {
          console.log("Artifact synced to local filesystem successfully.");
        } else {
          console.warn("Auto-sync failed. Permission might have expired.");
        }
      }
    }
    
    setActiveMode(AppMode.ARTIFACTS);
    alert(language === 'zh' ? '成果已保存！如果开启了自动同步，文件已写入本地。' : 'Artifact saved! If auto-sync is on, it has been written to your folder.');
  };

  const handleLanguageToggle = () => setLanguage(prev => prev === 'en' ? 'zh' : 'en');

  const handleUpdateTopics = (topics: string[]) => {
    setCustomTopics(topics.length > 0 ? topics : null);
    setProgress(prev => ({ ...prev, currentChapterIndex: 0, completedChapters: [] }));
    setCoachHistory([]);
    setFeynmanHistory([]);
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
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rust_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      await nukeDatabase();

      setCoachHistory([]);
      setFeynmanHistory([]);
      setArtifacts([]);
      setCustomTopics(null);
      setProgress({
        currentLevel: 'Beginner',
        completedChapters: [],
        currentChapterIndex: 0,
        totalSessions: 0
      });
      
      setActiveMode(AppMode.DASHBOARD);
    } catch (e) {
      console.error("Reset encounterd error:", e);
    }
  };

  const topicsCount = customTopics ? customTopics.length : translations[language].rustTopics.length;
  const currentChapterTitle = (customTopics || translations[language].rustTopics)[progress.currentChapterIndex];

  const renderContent = () => {
    switch (activeMode) {
      case AppMode.DASHBOARD:
        return (
          <Dashboard 
            language={language} 
            customTopics={customTopics} 
            onUpdateTopics={handleUpdateTopics} 
            progress={progress}
            artifactsCount={artifacts.length}
            onStartLesson={(index) => {
              setProgress(prev => ({ ...prev, currentChapterIndex: index }));
              setActiveMode(AppMode.LEARN);
            }}
          />
        );
      case AppMode.LEARN:
        return (
          <ChatWindow 
            mode="COACH" 
            language={language} 
            messages={coachHistory}
            setMessages={setCoachHistory}
            onNewArtifact={handleAddArtifact} 
            chapterContext={currentChapterTitle}
            onStartQuiz={() => setActiveMode(AppMode.QUIZ)}
          />
        );
      case AppMode.QUIZ:
        return (
          <QuizView 
            language={language} 
            chapterTitle={currentChapterTitle}
            onPass={handlePassQuiz}
            onFail={() => setActiveMode(AppMode.DASHBOARD)}
          />
        );
      case AppMode.FEYNMAN:
        return (
          <ChatWindow 
            mode="FEYNMAN" 
            language={language} 
            messages={feynmanHistory}
            setMessages={setFeynmanHistory}
            onNewArtifact={handleAddArtifact} 
          />
        );
      case AppMode.ARTIFACTS:
        return <ArtifactsList artifacts={artifacts} language={language} />;
      case AppMode.SETTINGS:
        return <SettingsView language={language} onReset={handleReset} />;
      default:
        return <Dashboard language={language} customTopics={customTopics} onUpdateTopics={handleUpdateTopics} progress={progress} artifactsCount={artifacts.length} onStartLesson={() => setActiveMode(AppMode.LEARN)} />;
    }
  };

  return (
    <Layout 
      activeMode={activeMode} 
      onModeChange={setActiveMode} 
      language={language} 
      onLanguageToggle={handleLanguageToggle}
      progressPercent={Math.round((progress.completedChapters.length / topicsCount) * 100)}
      level={progress.completedChapters.length > 5 ? 'Intermediate' : 'Beginner'}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
