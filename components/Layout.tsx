
import React from 'react';
import { AppMode, Language } from '../types';
import { Icons } from '../constants';
import { translations } from '../translations';

interface LayoutProps {
  children: React.ReactNode;
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  language: Language;
  onLanguageToggle: () => void;
  onReset: () => void;
  progressPercent: number;
  level: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeMode, 
  onModeChange, 
  language, 
  onLanguageToggle, 
  onReset,
  progressPercent,
  level 
}) => {
  const t = translations[language];
  
  const navItems = [
    { id: AppMode.DASHBOARD, label: t.dashboard, icon: Icons.Home },
    { id: AppMode.LEARN, label: t.coachChat, icon: Icons.Chat },
    { id: AppMode.FEYNMAN, label: t.feynmanLab, icon: Icons.Terminal },
    { id: AppMode.ARTIFACTS, label: t.artifacts, icon: Icons.Archive },
    { id: AppMode.SETTINGS, label: t.settings, icon: Icons.Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f85149] rounded-lg flex items-center justify-center font-bold text-white">R</div>
          <h1 className="font-bold text-lg tracking-tight">{t.appName}</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onModeChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                activeMode === item.id 
                  ? 'bg-[#21262d] text-white shadow-sm' 
                  : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]'
              }`}
            >
              <item.icon />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-4 border-t border-[#30363d]">
          <div className="flex flex-col gap-2">
            <button 
              onClick={onLanguageToggle}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-[#8b949e] hover:text-white bg-[#21262d] rounded-md border border-[#30363d] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {t.switchLang}
            </button>

            <button 
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold text-[#f85149] hover:bg-red-900/10 rounded-md transition-colors opacity-50 hover:opacity-100"
            >
              {language === 'zh' ? '重置应用' : 'Reset App'}
            </button>
          </div>

          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
            <p className="text-[10px] uppercase text-[#8b949e] font-bold mb-1">{t.learningStatus}</p>
            <div className="w-full bg-[#30363d] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#238636] h-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-[#8b949e] mt-2 capitalize">{level}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col bg-[#0d1117] overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
