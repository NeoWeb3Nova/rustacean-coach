
import React, { useState, useRef, useEffect } from 'react';
import { Message, Language, AppMode } from '../types';
import { Icons } from '../constants';
import { generateLearningResponse, getSystemPrompt } from '../services/llm';
import { translations } from '../translations';

interface ChatWindowProps {
  mode: 'COACH' | 'FEYNMAN';
  language: Language;
  onNewArtifact?: (content: string) => void;
  chapterContext?: string;
  onStartQuiz?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ mode, language, onNewArtifact, chapterContext, onStartQuiz }) => {
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const basePrompt = getSystemPrompt(language, chapterContext);
      const systemInstruction = `${basePrompt} \nCurrently in ${mode} mode. ${
        mode === 'FEYNMAN' ? 'Wait for the user to explain a concept and then critique it.' : 'The user will ask questions or request a curriculum.'
      }`;
      
      const response = await generateLearningResponse(newMessages, systemInstruction, true);
      let fullResponse = "";
      
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: Date.now() }]);

      if (typeof response === 'object' && Symbol.asyncIterator in response) {
        // Handle stream
        // @ts-ignore
        for await (const chunk of response) {
          fullResponse += chunk.text;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].text = fullResponse;
            return updated;
          });
        }
      } else {
        // Handle single response from other providers
        // @ts-ignore
        fullResponse = response.text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].text = fullResponse;
          return updated;
        });
      }
    } catch (err) {
      console.error("LLM Error:", err);
      setMessages(prev => [...prev, { 
        role: 'system', 
        text: language === 'zh' ? "连接导师失败，请检查网络或配置。" : "Error connecting to mentor. Please check your connection or configuration.", 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateArtifact = async () => {
    if (messages.length < 2) return;
    setIsLoading(true);
    const content = messages.map(m => `**${m.role.toUpperCase()}**: ${m.text}`).join('\n\n');
    if (onNewArtifact) onNewArtifact(content);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#30363d] flex justify-between items-center bg-[#161b22]">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white">
              {mode === 'COACH' ? t.coachTitle : t.feynmanTitle}
            </h2>
            {chapterContext && (
              <span className="text-[10px] px-2 py-0.5 bg-[#1f6feb22] text-[#58a6ff] border border-[#1f6feb44] rounded uppercase font-bold">
                Chapter Focus
              </span>
            )}
          </div>
          <p className="text-xs text-[#8b949e]">
            {chapterContext ? `${chapterContext}` : (mode === 'COACH' ? t.coachSub : t.feynmanSub)}
          </p>
        </div>
        <div className="flex gap-2">
          {chapterContext && messages.length >= 4 && (
            <button 
              onClick={onStartQuiz}
              className="text-xs bg-[#1f6feb] hover:bg-[#388bfd] text-white px-3 py-1.5 rounded-md font-bold transition-all animate-pulse"
            >
              {t.takeQuiz}
            </button>
          )}
          <button 
            onClick={handleGenerateArtifact}
            className="text-xs bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1.5 rounded-md font-medium transition-colors"
          >
            {t.genArtifact}
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
            <div className="mb-4">
              <Icons.Terminal />
            </div>
            <h3 className="text-lg font-medium mb-2">{t.initSession}</h3>
            <p className="text-sm max-w-sm">
              {mode === 'COACH' ? t.coachInitSub : t.feynmanInitSub}
            </p>
          </div>
        )}
        
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-[#1f6feb] text-white rounded-br-none' 
                : m.role === 'system'
                  ? 'bg-red-900/20 text-red-400 border border-red-900/30'
                  : 'bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-bl-none'
            }`}>
              <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                {m.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#21262d] border border-[#30363d] rounded-lg p-3 rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[#8b949e] rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-[#8b949e] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-[#8b949e] rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#30363d] bg-[#0d1117]">
        <div className="relative flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={mode === 'COACH' ? t.askPlaceholder : t.explainPlaceholder}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1f6feb] min-h-[44px] max-h-32 resize-none"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            <Icons.Send />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
