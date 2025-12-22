
import React, { useState, useRef, useEffect } from 'react';
import { Language, UserProgress } from '../types';
import { translations } from '../translations';
import { analyzePdfForCurriculum } from '../services/llm';

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
  const [notification, setNotification] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const topicsToShow = customTopics || t.rustTopics;
  const coverage = Math.round((progress.completedChapters.length / topicsToShow.length) * 100);

  // 自动关闭通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'error' | 'success' = 'error') => {
    setNotification({ message, type });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("File detected:", file.name, "Size:", file.size);

    // 验证文件大小
    if (file.size > MAX_PDF_SIZE) {
      showNotification(t.pdfSizeError, 'error');
      event.target.value = ''; // 重置以允许重新选择
      return;
    }

    setIsUploading(true);
    setNotification(null); // 上传开始时清除旧通知

    try {
      const reader = new FileReader();
      
      reader.onerror = () => {
        showNotification(t.pdfError, 'error');
        setIsUploading(false);
      };
      
      reader.onload = async (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') throw new Error("Invalid file content");
          
          const base64 = result.split(',')[1];
          if (!base64) throw new Error("Base64 extraction failed");

          const newTopics = await analyzePdfForCurriculum(base64, language);
          
          if (newTopics && newTopics.length > 0) {
            onUpdateTopics(newTopics);
            showNotification(language === 'zh' ? '学习路线规划成功！' : 'Learning roadmap generated!', 'success');
          } else {
            showNotification(language === 'zh' ? '未能解析出课程大纲，请尝试其他 PDF。' : 'Could not parse curriculum. Try another PDF.', 'error');
          }
        } catch (error: any) {
          console.error("PDF logic error:", error);
          showNotification(`${t.pdfError} (${error?.message || 'Unknown API Error'})`, 'error');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Reader error:", error);
      showNotification(t.pdfError, 'error');
      setIsUploading(false);
    }
  };

  return (
    <div className="relative p-8 space-y-8 animate-in fade-in duration-500 min-h-full">
      
      {/* Custom Notification Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[110] flex items-center gap-3 px-5 py-3 rounded-lg shadow-2xl border animate-in slide-in-from-right-10 duration-300 ${
          notification.type === 'error' ? 'bg-[#3d1b1b] border-red-900/50 text-red-200' : 'bg-[#1b3d24] border-green-900/50 text-green-200'
        }`}>
          {notification.type === 'error' ? (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          <span className="text-sm font-bold">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-[100] bg-[#0d1117]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-4 border-[#1f6feb]/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#1f6feb] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-4 border-[#f85149] border-b-transparent rounded-full animate-spin-slow"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          
          <div className="max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">{t.processingPdf}</h2>
            <p className="text-[#8b949e] mb-8 text-sm leading-relaxed">
              {language === 'zh' 
                ? '专家级 Gemini 模型正在深度扫描文档，识别 Rust 知识点并为您定制专属的学习路径。这通常需要 10-20 秒。' 
                : 'Gemini is scanning the document, identifying Rust concepts, and tailoring your roadmap. This usually takes 10-20 seconds.'}
            </p>
            
            <div className="relative w-full h-2 bg-[#21262d] rounded-full overflow-hidden border border-[#30363d]">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1f6feb] to-transparent animate-progress-flow"></div>
            </div>

            <button 
              onClick={() => setIsUploading(false)}
              className="mt-8 text-xs text-[#8b949e] hover:text-white transition-colors underline"
            >
              {language === 'zh' ? '停止等待' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{t.welcome}</h1>
          <p className="text-[#8b949e] font-medium">{t.welcomeSub}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`flex items-center gap-3 px-6 py-3 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm font-bold transition-all shadow-xl hover:shadow-[#23863622] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 relative z-10 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="relative z-10">{t.uploadPdf}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm hover:border-[#1f6feb44] transition-colors">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1 tracking-wider">{t.knowledgeCoverage}</p>
          <div className="text-4xl font-bold text-white mb-4">{coverage}%</div>
          <div className="w-full bg-[#30363d] h-2.5 rounded-full overflow-hidden">
            <div className="bg-[#238636] h-full transition-all duration-1000" style={{ width: `${coverage}%` }}></div>
          </div>
          <p className="text-xs text-[#8b949e] mt-4 italic font-medium">
            {coverage === 100 ? "Mastery achieved!" : `${t.nextTarget}: ${topicsToShow[progress.currentChapterIndex] || '---'}`}
          </p>
        </div>
        
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm relative overflow-hidden group hover:border-[#f8514944] transition-colors">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1 tracking-wider">{t.feynmanScore}</p>
          <div className="text-4xl font-bold text-[#f85149] mb-1">
            {progress.completedChapters.length > 0 ? (7 + (progress.completedChapters.length * 0.3)).toFixed(1) : '0.0'}/10
          </div>
          <p className="text-sm text-[#c9d1d9] mt-2 relative z-10 leading-snug">
            {progress.completedChapters.length === 0 ? 
              (language === 'zh' ? '开启首次费曼对话获取初始评分' : 'Start your first session to get a score') : 
              t.feynmanScoreSub
            }
          </p>
          <div className="absolute -right-4 -bottom-4 opacity-5 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
             <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm hover:border-[#58a6ff44] transition-colors">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1 tracking-wider">{t.knowledgeArtifacts}</p>
          <div className="text-4xl font-bold text-white">{artifactsCount}</div>
          <p className="text-sm text-[#8b949e] mt-2 font-medium">{t.artifactsSub}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white tracking-tight">{t.masteryRoadmap}</h2>
            <div className="flex gap-2">
              <span className="text-[10px] bg-[#21262d] text-[#8b949e] px-2.5 py-1 rounded border border-[#30363d] font-mono tracking-tight shadow-sm">
                {customTopics ? t.roadmapFromDoc : t.defaultRoadmap}
              </span>
              {customTopics && (
                <button 
                  onClick={() => onUpdateTopics([])}
                  className="text-[10px] text-[#58a6ff] hover:text-[#79c0ff] font-bold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {topicsToShow.map((topic, i) => {
              const isCompleted = progress.completedChapters.includes(i);
              const isActive = i === progress.currentChapterIndex;
              const isLocked = i > progress.currentChapterIndex;

              return (
                <div 
                  key={`${topic}-${i}`} 
                  className={`flex items-center gap-5 bg-[#161b22] border p-5 rounded-xl transition-all duration-300 ${
                    isActive ? 'border-[#1f6feb] ring-1 ring-[#1f6feb]/20 shadow-[0_0_20px_rgba(31,111,235,0.1)] translate-x-2' : 'border-[#30363d]'
                  } ${isLocked ? 'opacity-40 grayscale' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                    isCompleted ? 'bg-[#238636] text-white' : isActive ? 'bg-[#1f6feb] text-white' : 'bg-[#30363d] text-[#8b949e]'
                  }`}>
                    {isCompleted ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-semibold truncate ${isLocked ? 'text-[#8b949e]' : 'text-white'}`}>{topic}</p>
                    {isActive && (
                      <button 
                        onClick={() => onStartLesson(i)}
                        className="mt-2.5 text-xs text-[#58a6ff] font-bold hover:text-[#79c0ff] flex items-center gap-1.5 transition-colors"
                      >
                        {t.startLesson} <span className="text-lg">→</span>
                      </button>
                    )}
                    {isLocked && <p className="text-[11px] text-[#8b949e] mt-1.5 italic flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      {t.lockedLesson}
                    </p>}
                    {isCompleted && <p className="text-[11px] text-[#238636] mt-1.5 font-bold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Chapter Mastered
                    </p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-5 tracking-tight">{t.recentInsights}</h2>
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl divide-y divide-[#30363d] shadow-sm overflow-hidden">
              {progress.completedChapters.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#21262d] flex items-center justify-center text-[#484f58]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <p className="text-sm text-[#8b949e] italic">{language === 'zh' ? '还没有学习见解。完成章节挑战以解锁！' : 'No insights yet. Complete chapters to unlock them!'}</p>
                </div>
              ) : (
                [
                  language === 'zh' ? "所有权不仅仅是内存管理，更是一种思考并发的安全视角。" : "Ownership is not just memory management; it's a safety lens for concurrency.",
                  language === 'zh' ? "编译器不仅是警察，更是帮助你写出正确代码的协作伙伴。" : "The compiler is not just a cop; it's a partner help you write correct code.",
                  language === 'zh' ? "泛型让代码灵活，Trait 约束了这种灵活性使其可控。" : "Generics provide flexibility, while Traits constrain it to be controllable."
                ].slice(0, Math.min(3, progress.completedChapters.length)).map((insight, i) => (
                  <div key={i} className="p-5 flex gap-4 hover:bg-[#21262d] transition-colors group">
                    <div className="w-1.5 h-1.5 bg-[#f85149] rounded-full mt-2 flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                    <p className="text-sm text-[#c9d1d9] italic leading-relaxed">"{insight}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="p-8 bg-gradient-to-br from-[#161b22] to-[#21262d] rounded-xl border border-dashed border-[#484f58] transition-all hover:border-[#8b949e]">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {t.learningLoopTitle}
            </h3>
            <ol className="text-xs text-[#8b949e] space-y-3 list-inside font-medium">
              {t.learningLoopSteps.map((step, idx) => (
                <li key={idx} className="leading-relaxed flex gap-3">
                  <span className="text-[#1f6feb] font-mono">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes progress-flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-flow {
          animation: progress-flow 1.5s infinite linear;
          width: 60%;
        }
        .animate-spin-slow {
          animation: spin 4s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
