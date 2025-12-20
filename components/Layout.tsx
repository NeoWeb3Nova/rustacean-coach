
import React from 'react';
import { AppMode } from '../types';
import { Icons } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeMode, onModeChange }) => {
  const navItems = [
    { id: AppMode.DASHBOARD, label: 'Dashboard', icon: Icons.Home },
    { id: AppMode.LEARN, label: 'Coach Chat', icon: Icons.Chat },
    { id: AppMode.FEYNMAN, label: 'Feynman Lab', icon: Icons.Terminal },
    { id: AppMode.ARTIFACTS, label: 'Artifacts', icon: Icons.Archive },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f85149] rounded-lg flex items-center justify-center font-bold text-white">R</div>
          <h1 className="font-bold text-lg tracking-tight">Rust Mentor</h1>
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

        <div className="p-4 border-t border-[#30363d]">
          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
            <p className="text-[10px] uppercase text-[#8b949e] font-bold mb-1">Learning Status</p>
            <div className="w-full bg-[#30363d] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#238636] h-full w-[45%]"></div>
            </div>
            <p className="text-xs text-[#8b949e] mt-2">Level 4: Intermediate</p>
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
