
import React, { useState } from 'react';
import { LearningArtifact, Language } from '../types';
import { translations } from '../translations';
import { Icons } from '../constants';
import { triggerDownload } from '../services/sync';

interface ArtifactsListProps {
  artifacts: LearningArtifact[];
  language: Language;
}

const ArtifactsList: React.FC<ArtifactsListProps> = ({ artifacts, language }) => {
  const t = translations[language];
  const [selectedArtifact, setSelectedArtifact] = useState<LearningArtifact | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(language === 'zh' ? '已复制！' : 'Copied!');
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleDownload = (artifact: LearningArtifact) => {
    triggerDownload(artifact);
  };

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('#')) return <h4 key={i} className="text-xl font-bold text-white mt-6 mb-3">{line.replace(/^#+\s/, '')}</h4>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-[#58a6ff] mt-4 mb-2">{line.replace(/\*\*/g, '')}</p>;
      if (line.includes('`')) {
        const parts = line.split('`');
        return (
          <p key={i} className="mb-2 leading-relaxed">
            {parts.map((p, j) => j % 2 === 1 ? <code key={j} className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#f85149] font-mono text-xs">{p}</code> : p)}
          </p>
        );
      }
      return <p key={i} className="mb-2 leading-relaxed text-[#c9d1d9]">{line}</p>;
    });
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t.localArtifacts}</h1>
        <p className="text-[#8b949e]">{t.artifactsDesc}</p>
      </header>

      {artifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-[#30363d] rounded-xl text-[#8b949e]">
          <Icons.Archive />
          <p className="mt-4">{t.noArtifacts}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artifacts.map((art) => (
            <div 
              key={art.id} 
              onClick={() => setSelectedArtifact(art)}
              className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#1f6feb] hover:shadow-[0_0_15px_rgba(31,111,235,0.1)] transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] bg-[#21262d] text-[#8b949e] px-2 py-0.5 rounded font-mono">
                  {art.date}
                </span>
                <span className="text-[#8b949e] group-hover:text-[#1f6feb] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </span>
              </div>
              <h3 className="text-white font-bold mb-2 group-hover:text-[#58a6ff] transition-colors">{art.title}</h3>
              <p className="text-xs text-[#8b949e] line-clamp-3 mb-4 leading-relaxed">{art.content}</p>
              <div className="flex flex-wrap gap-2">
                {art.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-[#23863622] text-[#3fb950] px-2 py-0.5 rounded border border-[#23863644]">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-[#0d1117]/80 backdrop-blur-sm"
            onClick={() => setSelectedArtifact(null)}
          />
          <div className="relative bg-[#161b22] border border-[#30363d] w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#30363d] shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#23863622] rounded-lg flex items-center justify-center text-[#3fb950]">
                  <Icons.Archive />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">{selectedArtifact.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#8b949e]">{selectedArtifact.date}</span>
                    <span className="text-[#30363d]">•</span>
                    <div className="flex gap-2">
                      {selectedArtifact.tags.map(tag => (
                        <span key={tag} className="text-[9px] text-[#3fb950] font-bold uppercase tracking-wider">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDownload(selectedArtifact)}
                  className="p-2 text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#21262d] rounded-md transition-all flex items-center gap-2"
                  title={t.downloadMd}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="text-xs font-bold hidden md:block">{t.downloadMd}</span>
                </button>
                <button 
                  onClick={() => handleCopy(selectedArtifact.content)}
                  className="p-2 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-md transition-all relative group"
                  title="Copy Content"
                >
                  <Icons.Copy />
                  {copyStatus && (
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#238636] text-white text-[10px] py-1 px-2 rounded whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
                      {copyStatus}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setSelectedArtifact(null)}
                  className="p-2 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-md transition-all"
                >
                  <Icons.Close />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
              <article className="max-w-2xl mx-auto text-sm md:text-base">
                {renderContent(selectedArtifact.content)}
              </article>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#30363d] bg-[#0d1117] rounded-b-2xl shrink-0 flex justify-end">
              <button 
                onClick={() => setSelectedArtifact(null)}
                className="px-6 py-2 bg-[#21262d] text-white hover:bg-[#30363d] rounded-md text-sm font-bold border border-[#30363d] transition-all"
              >
                {language === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtifactsList;
