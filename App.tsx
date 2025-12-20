
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ChatWindow from './components/ChatWindow';
import ArtifactsList from './components/ArtifactsList';
import { AppMode, LearningArtifact } from './types';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [artifacts, setArtifacts] = useState<LearningArtifact[]>([]);

  // Load from local storage on mount (Simulation of local knowledge base)
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
    const newArtifact: LearningArtifact = {
      id: Date.now().toString(),
      title: `Learning Session: ${new Date().toLocaleDateString()}`,
      date: new Date().toLocaleDateString(),
      content: content.slice(0, 500) + (content.length > 500 ? '...' : ''),
      tags: ['Rust', 'Session', activeMode === AppMode.FEYNMAN ? 'Feynman' : 'Mentorship']
    };
    
    const updated = [newArtifact, ...artifacts];
    setArtifacts(updated);
    localStorage.setItem('rust_artifacts', JSON.stringify(updated));
    setActiveMode(AppMode.ARTIFACTS);
    alert("Knowledge Artifact successfully generated and saved to your local library!");
  };

  const renderContent = () => {
    switch (activeMode) {
      case AppMode.DASHBOARD:
        return <Dashboard />;
      case AppMode.LEARN:
        return <ChatWindow mode="COACH" onNewArtifact={handleAddArtifact} />;
      case AppMode.FEYNMAN:
        return <ChatWindow mode="FEYNMAN" onNewArtifact={handleAddArtifact} />;
      case AppMode.ARTIFACTS:
        return <ArtifactsList artifacts={artifacts} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeMode={activeMode} onModeChange={setActiveMode}>
      {renderContent()}
    </Layout>
  );
};

export default App;
