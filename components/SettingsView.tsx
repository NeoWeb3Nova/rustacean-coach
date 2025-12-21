
import React, { useState, useEffect } from 'react';
import { LLMConfig, Language, LLMProvider } from '../types';
import { translations } from '../translations';
import { getDirectoryHandle, saveDirectoryHandle, clearDirectoryHandle } from '../services/sync';

interface SettingsViewProps {
  language: Language;
  onReset: () => void;
}

const PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI (ChatGPT)' },
  { value: 'claude', label: 'Anthropic Claude' },
  { value: 'grok', label: 'xAI Grok' },
  { value: 'custom', label: 'Custom Endpoint' },
];

const SettingsView: React.FC<SettingsViewProps> = ({ language, onReset }) => {
  const t = translations[language];
  const [config, setConfig] = useState<LLMConfig>(() => {
    const saved = localStorage.getItem('rust_llm_config');
    return saved ? JSON.parse(saved) : { provider: 'gemini', model: 'gemini-3-pro-preview', apiKey: '' };
  });

  const [isSaved, setIsSaved] = useState(false);
  const [syncHandle, setSyncHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('rust_auto_sync') === 'true');
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const loadHandle = async () => {
      try {
        const handle = await getDirectoryHandle();
        setSyncHandle(handle);
      } catch (e) {
        console.warn("Failed to retrieve directory handle from IndexedDB");
      }
    };
    loadHandle();
  }, []);

  const handleSave = () => {
    localStorage.setItem('rust_llm_config', JSON.stringify(config));
    localStorage.setItem('rust_auto_sync', autoSync.toString());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleFolderSelect = async () => {
    setSyncError(null);
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      await saveDirectoryHandle(handle);
      setSyncHandle(handle);
    } catch (e: any) {
      console.error("Folder picker error", e);
      if (e.name === 'SecurityError') {
        setSyncError(t.syncError);
      }
    }
  };

  const handleClearSync = async () => {
    await clearDirectoryHandle();
    setSyncHandle(null);
  };

  const handleGeminiKeySelect = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    } else {
      alert("AI Studio key selector is only available in the hosting environment.");
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20">
      <header>
        <h1 className="text-2xl font-bold text-white mb-2">{t.llmConfigTitle}</h1>
        <p className="text-[#8b949e]">{t.settings}</p>
      </header>

      {/* LLM Configuration */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-2">{t.llmProvider}</label>
          <select
            value={config.provider}
            onChange={(e) => setConfig({ ...config, provider: e.target.value as LLMProvider })}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-white focus:ring-1 focus:ring-[#1f6feb] outline-none"
          >
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-2">{t.modelName}</label>
          <input
            type="text"
            value={config.model}
            placeholder={config.provider === 'gemini' ? 'gemini-3-pro-preview' : 'gpt-4o'}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-white focus:ring-1 focus:ring-[#1f6feb] outline-none font-mono text-sm"
          />
        </div>

        {config.provider === 'gemini' ? (
          <div className="p-4 bg-[#1c2128] border border-[#30363d] rounded-lg">
            <p className="text-sm text-[#8b949e] mb-3">{t.geminiKeyInfo}</p>
            <button
              onClick={handleGeminiKeySelect}
              className="flex items-center gap-2 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] rounded-md text-sm font-bold transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {t.selectGeminiKey}
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-[#8b949e] mb-2">{t.apiKey}</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-white focus:ring-1 focus:ring-[#1f6feb] outline-none font-mono text-sm"
            />
          </div>
        )}
      </div>

      {/* Local Sync Configuration */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 space-y-6">
        <header>
          <h2 className="text-xl font-bold text-white mb-1">{t.localSyncTitle}</h2>
          <p className="text-sm text-[#8b949e]">{t.localSyncDesc}</p>
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#c9d1d9]">{t.autoSync}</span>
            <button
              onClick={() => setAutoSync(!autoSync)}
              className={`w-12 h-6 rounded-full transition-colors relative ${autoSync ? 'bg-[#238636]' : 'bg-[#30363d]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoSync ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg">
            {syncHandle ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#8b949e] mb-1">{t.folderConnected}:</p>
                  <p className="text-sm text-[#58a6ff] font-mono">{syncHandle.name}</p>
                </div>
                <button
                  onClick={handleClearSync}
                  className="text-xs text-[#f85149] hover:underline"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleFolderSelect}
                  className="w-full py-2 border border-dashed border-[#484f58] text-[#8b949e] rounded-md text-sm hover:border-[#58a6ff] hover:text-[#58a6ff] transition-all"
                >
                  + {t.selectFolder}
                </button>
                {syncError && (
                  <p className="text-xs text-red-400 leading-relaxed bg-red-900/10 p-3 rounded border border-red-900/20">
                    {syncError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#161b22] border border-red-900/30 rounded-xl p-8 space-y-6">
        <header>
          <h2 className="text-xl font-bold text-red-400 mb-1">{language === 'zh' ? '危险区域' : 'Danger Zone'}</h2>
          <p className="text-sm text-[#8b949e]">{language === 'zh' ? '管理敏感应用数据' : 'Manage sensitive app data'}</p>
        </header>
        
        <div className="flex items-center justify-between p-4 bg-red-900/10 border border-red-900/20 rounded-lg">
          <div>
            <p className="text-sm font-bold text-white">{language === 'zh' ? '重置所有数据' : 'Reset All Data'}</p>
            <p className="text-xs text-[#8b949e]">{language === 'zh' ? '这将清除所有进度、成果和配置。' : 'This will clear all progress, artifacts and config.'}</p>
          </div>
          <button 
            onClick={onReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition-all shadow-md active:scale-95"
          >
            {language === 'zh' ? '重置应用' : 'Reset App'}
          </button>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between">
        <button
          onClick={handleSave}
          className="px-8 py-3 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md font-bold transition-all shadow-md active:scale-95"
        >
          {t.saveConfig}
        </button>
        
        {isSaved && (
          <span className="text-[#3fb950] text-sm font-medium animate-in fade-in zoom-in duration-300">
            ✓ {t.configSaved}
          </span>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
