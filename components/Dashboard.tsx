
import React, { useState } from 'react';
import { Language, UserProgress } from '../types';
import { translations } from '../translations';
import { analyzePdfForCurriculum } from '../services/gemini';

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB limit

interface DashboardProps {
  language: Language;
  customTopics: string[] | null;
  onUpdateTopics: (topics: string[]) => void;
  progress: UserProgress;
  artifactsCount: number;
  onStartLesson: (index: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  language, 
  customTopics, 
  onUpdateTopics, 
  progress, 
  artifactsCount,
  onStartLesson 
}) => {
  const t = translations[language];
  const [isUploading, setIsUploading] = useState(false);
  
  const topicsToShow = customTopics || t.rustTopics;
  const coverage = Math.round((progress.completedChapters.length / topicsToShow.length) * 100);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PDF_SIZE) {
      alert(t.pdfSizeError);
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onerror = () => {
        alert(t.pdfError);
        setIsUploading(false);
      };
      
      reader.onload = async (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') throw new Error("Invalid file read");
          
          const base64 = result.split(',')[1];
          const newTopics = await analyzePdfForCurriculum(base64, language);
          
          if (newTopics && newTopics.length > 0) {
            onUpdateTopics(newTopics);
          } else {
            throw new Error("No topics extracted");
          }
        } catch (error) {
          console.error("PDF Processing Error:", error);
          alert(t.pdfError);
        } finally {
          setIsUploading(false);
          event.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("PDF Upload Error:", error);
      alert(t.pdfError);
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.welcome}</h1>
          <p className="text-[#8b949e]">{t.welcomeSub}</p>
        </div>
        
        <div className="relative">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            disabled={isUploading}
          />
          <button 
            className={`flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md text-sm font-medium transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t.processingPdf}
              </span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {t.uploadPdf}
              </>
            )}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1">{t.knowledgeCoverage}</p>
          <div className="text-3xl font-bold text-white">{coverage}%</div>
          <div className="mt-4 w-full bg-[#30363d] h-2 rounded-full overflow-hidden">
            <div className="bg-[#238636] h-full transition-all duration-700" style={{ width: `${coverage}%` }}></div>
          </div>
          <p className="text-xs text-[#8b949e] mt-4 italic">
            {coverage === 100 ? "Mastery achieved!" : `${t.nextTarget}: ${topicsToShow[progress.currentChapterIndex] || '---'}`}
          </p>
        </div>
        
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1">{t.feynmanScore}</p>
          <div className="text-3xl font-bold text-[#f85149]">
            {progress.completedChapters.length > 0 ? (7 + (progress.completedChapters.length * 0.3)).toFixed(1) : '0.0'}/10
          </div>
          <p className="text-sm text-[#c9d1d9] mt-2">
            {progress.completedChapters.length === 0 ? 
              (language === 'zh' ? '开始你的第一次会话以获得评分' : 'Start your first session to get a score') : 
              t.feynmanScoreSub
            }
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1">{t.knowledgeArtifacts}</p>
          <div className="text-3xl font-bold text-white">{artifactsCount}</div>
          <p className="text-sm text-[#8b949e] mt-2">{t.artifactsSub}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">{t.masteryRoadmap}</h2>
            <div className="flex gap-2">
              <span className="text-[10px] bg-[#21262d] text-[#8b949e] px-2 py-0.5 rounded border border-[#30363d] font-mono">
                {customTopics ? t.roadmapFromDoc : t.defaultRoadmap}
              </span>
              {customTopics && (
                <button 
                  onClick={() => onUpdateTopics([])}
                  className="text-[10px] text-[#58a6ff] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {topicsToShow.map((topic, i) => {
              const isCompleted = progress.completedChapters.includes(i);
              const isActive = i === progress.currentChapterIndex;
              const isLocked = i > progress.currentChapterIndex;

              return (
                <div 
                  key={topic} 
                  className={`flex items-center gap-4 bg-[#161b22] border p-4 rounded-lg transition-all ${
                    isActive ? 'border-[#1f6feb] ring-1 ring-[#1f6feb]/30 shadow-lg' : 'border-[#30363d]'
                  } ${isLocked ? 'opacity-50 grayscale' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted ? 'bg-[#238636] text-white' : isActive ? 'bg-[#1f6feb] text-white' : 'bg-[#30363d] text-[#8b949e]'
                  }`}>
                    {isCompleted ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isLocked ? 'text-[#8b949e]' : 'text-white'}`}>{topic}</p>
                    {isActive && (
                      <button 
                        onClick={() => onStartLesson(i)}
                        className="mt-2 text-xs text-[#1f6feb] font-bold hover:underline flex items-center gap-1"
                      >
                        {t.startLesson} →
                      </button>
                    )}
                    {isLocked && <p className="text-[10px] text-[#8b949e] mt-1 italic">{t.lockedLesson}</p>}
                    {isCompleted && <p className="text-[10px] text-[#238636] mt-1 font-bold">Chapter Mastered</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-8">
          <div>
            <h2 className="text-lg font-bold text-white mb-4">{t.recentInsights}</h2>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg divide-y divide-[#30363d] shadow-sm">
              {progress.completedChapters.length === 0 ? (
                <div className="p-8 text-center text-[#8b949e] italic text-sm">
                  {language === 'zh' ? '还没有学习见解。完成章节以发现！' : 'No insights yet. Complete chapters to discover them!'}
                </div>
              ) : (
                [
                  language === 'zh' ? "T, &T 和 &mut T 的区别终于搞明白了。" : "The difference between T, &T, and &mut T is finally clicking.",
                  language === 'zh' ? "生命周期只是编译器的一个静态分析工具。" : "Lifetimes are just a static analysis tool for the compiler.",
                  language === 'zh' ? "需要复习多线程环境下的 Arc vs Rc 模式。" : "Need to review Arc vs Rc patterns in multithreaded contexts."
                ].slice(0, progress.completedChapters.length).map((insight, i) => (
                  <div key={i} className="p-4 flex gap-4 animate-in slide-in-from-left duration-300">
                    <div className="w-1.5 h-1.5 bg-[#f85149] rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-[#c9d1d9] italic">"{insight}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="p-6 bg-[#21262d] rounded-lg border border-dashed border-[#484f58]">
            <h3 className="text-sm font-bold text-white mb-2">{t.learningLoopTitle}</h3>
            <ol className="text-xs text-[#8b949e] space-y-2 list-decimal list-inside">
              {t.learningLoopSteps.map((step, idx) => (
                <li key={idx} className="leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
