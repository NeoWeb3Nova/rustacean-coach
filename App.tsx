
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ChatWindow from './components/ChatWindow';
import ArtifactsList from './components/ArtifactsList';
import { AppMode, LearningArtifact, Language } from './types';
import { translations } from './translations';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [artifacts, setArtifacts] = useState<LearningArtifact[]>([]);
  const [customTopics, setCustomTopics] = useState<string[] | null>(() => {
    const saved = localStorage.getItem('rust_custom_topics');
    return saved ? JSON.parse(saved) : null;
  });
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('rust_mentor_lang') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('rust_mentor_lang', language);
  }, [language]);

  useEffect(() => {
    if (customTopics) {
      localStorage.setItem('rust_custom_topics', JSON.stringify(customTopics));
    } else {
      localStorage.removeItem('rust_custom_topics');
    }
  }, [customTopics]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('rust_artifacts');
    if (saved) {
      try {
        setArtifacts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local artifacts");
      }
    }
  }, []);

  const handleAddArtifact = (content: string) => {
    const t = translations[language];
    const newArtifact: LearningArtifact = {
      id: Date.now().toString(),
      title: `${language === 'zh' ? '学习成果' : 'Learning Session'}: ${new Date().toLocaleDateString()}`,
      date: new Date().toLocaleDateString(),
      content: content.slice(0, 500) + (content.length > 500 ? '...' : ''),
      tags: ['Rust', 'Session', activeMode === AppMode.FEYNMAN ? 'Feynman' : 'Mentorship']
    };
    
    const updated = [newArtifact, ...artifacts];
    setArtifacts(updated);
    localStorage.setItem('rust_artifacts', JSON.stringify(updated));
    setActiveMode(AppMode.ARTIFACTS);
    alert(t.artifactSaved);
  };

  const handleLanguageToggle = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  const handleUpdateTopics = (topics: string[]) => {
    setCustomTopics(topics.length > 0 ? topics : null);
  };

  const renderContent = () => {
    switch (activeMode) {
      case AppMode.DASHBOARD:
        return (
          <Dashboard 
            language={language} 
            customTopics={customTopics} 
            onUpdateTopics={handleUpdateTopics} 
          />
        );
      case AppMode.LEARN:
        return <ChatWindow mode="COACH" language={language} onNewArtifact={handleAddArtifact} />;
      case AppMode.FEYNMAN:
        return <ChatWindow mode="FEYNMAN" language={language} onNewArtifact={handleAddArtifact} />;
      case AppMode.ARTIFACTS:
        return <ArtifactsList artifacts={artifacts} language={language} />;
      default:
        return (
          <Dashboard 
            language={language} 
            customTopics={customTopics} 
            onUpdateTopics={handleUpdateTopics} 
          />
        );
    }
  };

  return (
    <Layout 
      activeMode={activeMode} 
      onModeChange={setActiveMode} 
      language={language} 
      onLanguageToggle={handleLanguageToggle}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
