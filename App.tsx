
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ChatWindow from './components/ChatWindow';
import ArtifactsList from './components/ArtifactsList';
import QuizView from './components/QuizView';
import SettingsView from './components/SettingsView';
import { AppMode, LearningArtifact, Language, UserProgress, Message } from './types';
import { translations } from './translations';
import { nukeDatabase } from './services/sync';

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

  const handleAddArtifact = (content: string) => {
    const newArtifact: LearningArtifact = {
      id: Date.now().toString(),
      title: `${language === 'zh' ? '学习成果' : 'Learning Session'}: ${new Date().toLocaleDateString()}`,
      date: new Date().toLocaleDateString().replace(/\//g, '-'),
      content: content,
      tags: ['Rust', activeMode === AppMode.FEYNMAN ? 'Feynman' : 'Mentorship']
    };
    
    const updated = [newArtifact, ...artifacts];
    setArtifacts(updated);
    localStorage.setItem('rust_artifacts', JSON.stringify(updated));
    
    setActiveMode(AppMode.ARTIFACTS);
    alert(language === 'zh' ? '成果已保存到成果库！你可以随时下载为 Markdown。' : 'Artifact saved to your library! You can download it as Markdown anytime.');
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

  /**
   * 软重置逻辑：清理存储并重置所有 React 状态，而不刷新页面。
   * 这能有效防止在托管环境中出现 404。
   */
  const handleReset = async () => {
    try {
      // 1. 物理清理存储
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rust_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      await nukeDatabase();

      // 2. 重置所有 React 状态到初始值
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
      // 这里的 language 我们选择保留用户当前偏好，或者也可以重置为 'en'
      
      // 3. 导航回仪表盘
      setActiveMode(AppMode.DASHBOARD);
      
      console.log("App state reset successfully without reload.");
    } catch (e) {
      console.error("Reset encounterd error:", e);
      // 如果真的出错了，最后的手段才是刷新，但通常上述逻辑已经足够
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
