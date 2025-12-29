
import React, { useState, useEffect } from 'react';
import { LLMConfig, Language, LLMProvider, GithubConfig } from '../types';
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

  const [githubConfig, setGithubConfig] = useState<GithubConfig>(() => {
    const saved = localStorage.getItem('rust_github_config');
    return saved ? JSON.parse(saved) : { enabled: false, token: '', gistId: '' };
  });

  const [isSaved, setIsSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
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
    localStorage.setItem('rust_github_config', JSON.stringify(githubConfig));
    localStorage.setItem('rust_auto_sync', isAutoSync.toString());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSelectFolder = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await saveDirectoryHandle(handle);
      setHasFolderHandle(true);
    } catch (err) {
      console.error("Folder selection cancelled", err);
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

  return (
    <div className="p-8 max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-32">
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
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-white focus:ring-1 focus:ring-[#1f6feb] outline-none font-mono text-sm"
          />
        </div>
      </div>

      {/* GitHub Cloud Sync Module */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#58a6ff]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              GitHub 云端备份
            </h2>
            <p className="text-xs text-[#8b949e] mt-1">使用 GitHub Gist 永久保存你的学习成果</p>
          </div>
          <button 
            onClick={() => setGithubConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${githubConfig.enabled ? 'bg-[#238636]' : 'bg-[#30363d]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${githubConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </header>

        {githubConfig.enabled && (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-bold text-[#8b949e] mb-2 uppercase">Personal Access Token (classic)</label>
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={githubConfig.token}
                onChange={(e) => setGithubConfig(prev => ({ ...prev, token: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-white text-sm font-mono focus:ring-1 focus:ring-[#1f6feb]"
              />
              <p className="text-[10px] text-[#8b949e] mt-2 leading-relaxed">
                需开启 `gist` 权限。你的 Token 仅保存在浏览器本地，绝不上传至任何第三方服务器。
              </p>
            </div>
            {githubConfig.gistId && (
              <div className="p-3 bg-[#1c2128] border border-[#30363d] rounded-lg flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#8b949e] uppercase">当前云端 ID</span>
                  <span className="text-xs font-mono text-white">{githubConfig.gistId}</span>
                </div>
                <a 
                  href={`https://gist.github.com/${githubConfig.gistId}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-[#58a6ff] hover:underline"
                >
                  查看云端
                </a>
              </div>
            )}
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
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] rounded-md text-sm font-bold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            {t.selectFolder}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#1c2128] border border-[#238636]/30 rounded-lg">
              <span className="text-sm text-white font-medium">{t.folderConnected}</span>
              <button onClick={handleDisconnectFolder} className="text-xs text-[#f85149] hover:underline">{language === 'zh' ? '断开' : 'Disconnect'}</button>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#0d1117] border border-[#30363d] rounded-lg">
              <p className="text-sm font-bold text-white">{t.autoSync}</p>
              <button 
                onClick={() => setIsAutoSync(!isAutoSync)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAutoSync ? 'bg-[#238636]' : 'bg-[#30363d]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoSync ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex items-center justify-between border-t border-[#30363d]">
        <button
          onClick={handleSave}
          className="px-8 py-3 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          {t.saveConfig}
        </button>
        {isSaved && <span className="text-[#3fb950] text-sm font-medium">✓ {t.configSaved}</span>}
      </div>

      {/* Danger Zone */}
      <div className="pt-10 border-t border-[#30363d]">
        <button 
          onClick={handleResetApp} 
          className={`w-full py-4 rounded-xl border border-red-900/30 text-red-500 font-bold hover:bg-red-900/10 transition-all ${confirmReset ? 'bg-red-900/20 animate-pulse' : ''}`}
        >
          {confirmReset ? '确定要抹掉所有数据吗？' : '重置应用所有数据'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
