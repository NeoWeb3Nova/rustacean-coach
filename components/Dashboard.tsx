
import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { analyzePdfForCurriculum } from '../services/gemini';

interface DashboardProps {
  language: Language;
  customTopics: string[] | null;
  onUpdateTopics: (topics: string[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ language, customTopics, onUpdateTopics }) => {
  const t = translations[language];
  const [isUploading, setIsUploading] = useState(false);
  
  const topicsToShow = customTopics || t.rustTopics;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        const newTopics = await analyzePdfForCurriculum(base64, language);
        if (newTopics && newTopics.length > 0) {
          onUpdateTopics(newTopics);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("PDF Upload Error:", error);
      alert(t.pdfError);
    } finally {
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
          <div className="text-3xl font-bold text-white">
            {customTopics ? '0%' : '42%'}
          </div>
          <div className="mt-4 w-full bg-[#30363d] h-2 rounded-full overflow-hidden">
            <div className="bg-[#238636] h-full" style={{ width: customTopics ? '0%' : '42%' }}></div>
          </div>
          <p className="text-xs text-[#8b949e] mt-4 italic">{t.nextTarget}</p>
        </div>
        
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1">{t.feynmanScore}</p>
          <div className="text-3xl font-bold text-[#f85149]">8.4/10</div>
          <p className="text-sm text-[#c9d1d9] mt-2">{t.feynmanScoreSub}</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1">{t.knowledgeArtifacts}</p>
          <div className="text-3xl font-bold text-white">12</div>
          <p className="text-sm text-[#8b949e] mt-2">{t.artifactsSub}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">{t.masteryRoadmap}</h2>
            <span className="text-[10px] bg-[#21262d] text-[#8b949e] px-2 py-0.5 rounded border border-[#30363d] font-mono">
              {customTopics ? t.roadmapFromDoc : t.defaultRoadmap}
            </span>
          </div>
          <div className="space-y-3">
            {topicsToShow.map((topic, i) => (
              <div key={topic} className="flex items-center gap-4 bg-[#161b22] border border-[#30363d] p-4 rounded-lg hover:border-[#484f58] transition-colors">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  !customTopics && i < 3 ? 'bg-[#238636] border-[#238636] text-white' : i === 0 && customTopics ? 'border-[#f2cc60] text-[#f2cc60]' : 'border-[#30363d] text-[#8b949e]'
                }`}>
                  {!customTopics && i < 3 ? '✓' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${(!customTopics && i < 3) ? 'text-white' : 'text-[#c9d1d9]'}`}>{topic}</p>
                  <div className="h-1 bg-[#30363d] mt-2 rounded-full overflow-hidden">
                    <div className={`h-full ${(!customTopics && i < 3) ? 'bg-[#238636] w-full' : (customTopics && i === 0) ? 'bg-[#f2cc60] w-[10%]' : 'w-0'}`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {customTopics && (
            <button 
              onClick={() => onUpdateTopics([])}
              className="mt-4 text-xs text-[#58a6ff] hover:underline"
            >
              Reset to default roadmap
            </button>
          )}
        </section>

        <section className="space-y-8">
          <div>
            <h2 className="text-lg font-bold text-white mb-4">{t.recentInsights}</h2>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg divide-y divide-[#30363d] shadow-sm">
              {[
                language === 'zh' ? "T, &T 和 &mut T 的区别终于搞明白了。" : "The difference between T, &T, and &mut T is finally clicking.",
                language === 'zh' ? "生命周期只是编译器的一个静态分析工具。" : "Lifetimes are just a static analysis tool for the compiler.",
                language === 'zh' ? "需要复习多线程环境下的 Arc vs Rc 模式。" : "Need to review Arc vs Rc patterns in multithreaded contexts."
              ].map((insight, i) => (
                <div key={i} className="p-4 flex gap-4">
                  <div className="w-1.5 h-1.5 bg-[#f85149] rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-[#c9d1d9] italic">"{insight}"</p>
                </div>
              ))}
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
