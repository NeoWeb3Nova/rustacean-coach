
import React, { useState, useEffect } from 'react';
import { LLMConfig, Language, LLMProvider } from '../types';
import { translations } from '../translations';

interface SettingsViewProps {
  language: Language;
}

const SettingsView: React.FC<SettingsViewProps> = ({ language }) => {
  const t = translations[language];
  const [config, setConfig] = useState<LLMConfig>(() => {
    const saved = localStorage.getItem('rust_llm_config');
    return saved ? JSON.parse(saved) : { provider: 'gemini', model: 'gemini-3-pro-preview', apiKey: '' };
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('rust_llm_config', JSON.stringify(config));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
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

  const providers: { value: LLMProvider; label: string }[] = [
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'openai', label: 'OpenAI (ChatGPT)' },
    { value: 'claude', label: 'Anthropic Claude' },
    { value: 'grok', label: 'xAI Grok' },
    { value: 'custom', label: 'Custom Endpoint' },
  ];

  return (
    <div className="p-8 max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">{t.llmConfigTitle}</h1>
        <p className="text-[#8b949e]">{t.settings}</p>
      </header>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-2">{t.llmProvider}</label>
          <select
            value={config.provider}
            onChange={(e) => setConfig({ ...config, provider: e.target.value as LLMProvider })}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-white focus:ring-1 focus:ring-[#1f6feb] outline-none"
          >
            {providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
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

        {config.provider === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-[#8b949e] mb-2">{t.baseUrl}</label>
            <input
              type="text"
              value={config.baseUrl || ''}
              placeholder="https://api.yourprovider.com/v1"
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-white focus:ring-1 focus:ring-[#1f6feb] outline-none font-mono text-sm"
            />
          </div>
        )}

        <div className="pt-4 flex items-center justify-between">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md font-bold transition-all shadow-md active:scale-95"
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
    </div>
  );
};

export default SettingsView;
