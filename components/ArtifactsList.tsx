
import React from 'react';
import { LearningArtifact } from '../types';

interface ArtifactsListProps {
  artifacts: LearningArtifact[];
}

const ArtifactsList: React.FC<ArtifactsListProps> = ({ artifacts }) => {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Local Artifacts</h1>
        <p className="text-[#8b949e]">Your personalized knowledge repository for Rust.</p>
      </header>

      {artifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-[#30363d] rounded-xl text-[#8b949e]">
          <p>No artifacts generated yet. Complete a learning session to save your progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artifacts.map((art) => (
            <div key={art.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#484f58] transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] bg-[#21262d] text-[#8b949e] px-2 py-0.5 rounded font-mono">
                  {art.date}
                </span>
                <button className="text-[#8b949e] hover:text-[#f85149] opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <h3 className="text-white font-bold mb-2">{art.title}</h3>
              <p className="text-xs text-[#8b949e] line-clamp-3 mb-4">{art.content}</p>
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
    </div>
  );
};

export default ArtifactsList;
