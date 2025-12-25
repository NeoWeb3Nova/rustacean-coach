
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
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // File Sync States
  const [hasFolderHandle, setHasFolderHandle] = useState(false);
  const [isAutoSync, setIsAutoSync] = useState(() => localStorage.getItem('rust_auto_sync') === 'true');

  useEffect(() => {
    const checkHandle = async () => {
      const handle = await getDirectoryHandle();
      setHasFolderHandle(!!handle);
    };
    checkHandle();
  }, []);

  const handleSave = () => {
    localStorage.setItem('rust_llm_config', JSON.stringify(config));
    localStorage.setItem('rust_auto_sync', isAutoSync.toString());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSelectFolder = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      await saveDirectoryHandle(handle);
      setHasFolderHandle(true);
      alert(language === 'zh' ? '成功连接到文件夹！' : 'Folder connected successfully!');
    } catch (err) {
      console.error("Folder selection cancelled or failed", err);
    }
  };

  const handleDisconnectFolder = async () => {
    await clearDirectoryHandle();
    setHasFolderHandle(false);
    setIsAutoSync(false);
  };

  const handleResetApp = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 5000);
      return;
    }
    setIsResetting(true);
    setTimeout(() => {
      onReset();
      setIsResetting(false);
      setConfirmReset(false);
    }, 800);
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
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-white focus:ring-1 focus:ring-[#1f6feb] outline-none transition-all"
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
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-white focus:ring-1 focus:ring-[#1f6feb] outline-none font-mono text-sm transition-all"
          />
        </div>

        {config.provider === 'gemini' ? (
          <div className="p-4 bg-[#1c2128] border border-[#30363d] rounded-lg">
            <p className="text-sm text-[#8b949e] mb-3">{t.geminiKeyInfo}</p>
            <button
              onClick={handleGeminiKeySelect}
              className="flex items-center gap-2 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] rounded-md text-sm font-bold transition-all active:scale-95"
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
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-white focus:ring-1 focus:ring-[#1f6feb] outline-none font-mono text-sm transition-all"
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

        {!hasFolderHandle ? (
          <button
            onClick={handleSelectFolder}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] rounded-md text-sm font-bold transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            {t.selectFolder}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#1c2128] border border-[#238636]/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#238636] rounded-full animate-pulse"></div>
                <span className="text-sm text-white font-medium">{t.folderConnected}</span>
              </div>
              <button onClick={handleDisconnectFolder} className="text-xs text-[#f85149] hover:underline font-bold">
                {language === 'zh' ? '取消连接' : 'Disconnect'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0d1117] border border-[#30363d] rounded-lg">
              <div>
                <p className="text-sm font-bold text-white">{t.autoSync}</p>
                <p className="text-xs text-[#8b949e] mt-0.5">{language === 'zh' ? '生成成果时自动写入到本地文件夹' : 'Automatically write files to your folder on generation.'}</p>
              </div>
              <button 
                onClick={() => setIsAutoSync(!isAutoSync)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isAutoSync ? 'bg-[#238636]' : 'bg-[#30363d]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoSync ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className={`bg-[#161b22] border rounded-xl p-8 space-y-6 transition-all duration-300 ${confirmReset ? 'border-red-500 ring-1 ring-red-500/20' : 'border-red-900/30'}`}>
        <header>
          <h2 className="text-xl font-bold text-red-400 mb-1">{language === 'zh' ? '危险区域' : 'Danger Zone'}</h2>
          <p className="text-sm text-[#8b949e]">{language === 'zh' ? '管理应用持久化数据' : 'Manage app persistent data'}</p>
        </header>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-red-900/10 border border-red-900/20 rounded-lg gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{language === 'zh' ? '重置所有数据' : 'Reset All Data'}</p>
            <p className="text-xs text-[#8b949e] mt-1 leading-relaxed">
              {language === 'zh' 
                ? '警告：这将永久清除所有学习进度、自定义路线图、对话历史和模型配置。操作不可撤销。' 
                : 'Warning: This will permanently clear all learning progress, custom roadmaps, histories and config. This cannot be undone.'}
            </p>
          </div>
          <button 
            onClick={handleResetApp}
            disabled={isResetting}
            className={`px-6 py-2.5 rounded-md text-xs font-bold transition-all shadow-lg active:scale-95 whitespace-nowrap ${
              isResetting 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                : confirmReset 
                  ? 'bg-red-500 hover:bg-red-400 text-white animate-pulse' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isResetting 
              ? (language === 'zh' ? '正在执行重置...' : 'Executing Reset...') 
              : confirmReset 
                ? (language === 'zh' ? '确认并执行！' : 'Confirm & Execute!') 
                : (language === 'zh' ? '重置应用' : 'Reset App')}
          </button>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between border-t border-[#30363d] mt-10">
        <button
          onClick={handleSave}
          className="px-8 py-3 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
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
