
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Language } from '../types';
import { Icons } from '../constants';
import { generateLearningResponse, getSystemPrompt, textToSpeech, generateArtifactFromChat } from '../services/llm';
import { translations } from '../translations';

interface ChatWindowProps {
  mode: 'COACH' | 'FEYNMAN';
  language: Language;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onNewArtifact?: (content: string) => void;
  chapterContext?: string;
  onStartQuiz?: () => void;
}

const MarkdownMessage: React.FC<{ text: string; isModel: boolean }> = ({ text, isModel }) => {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 break-words overflow-hidden text-sm">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          const lang = match?.[1] || 'text';
          const code = match?.[2] || '';
          return (
            <div key={i} className="my-2 rounded-md overflow-hidden border border-[#30363d] bg-[#0d1117]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider">{lang}</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="text-[10px] text-[#8b949e] hover:text-white transition-colors flex items-center gap-1"
                >
                  <Icons.Copy /> Copy
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-[13px] font-mono leading-relaxed text-[#c9d1d9]">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return lines.map((line, j) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return <div key={`${i}-${j}`} className="h-1" />;

          if (line.startsWith('### ')) {
            return <h3 key={`${i}-${j}`} className="text-sm font-bold text-white mt-3 mb-1 flex items-center gap-2 border-l-2 border-[#1f6feb] pl-2">{line.replace('### ', '')}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={`${i}-${j}`} className="text-base font-bold text-white mt-4 mb-2 border-b border-[#30363d] pb-1">{line.replace('## ', '')}</h2>;
          }

          if (trimmedLine.match(/^[-*+]\s/)) {
            return (
              <div key={`${i}-${j}`} className="flex gap-2 pl-2 py-0.5">
                <span className="text-[#1f6feb] mt-1 shrink-0">●</span>
                <span className="flex-1 leading-relaxed text-[#c9d1d9]">{parseInline(line.replace(/^[-*+]\s/, ''))}</span>
              </div>
            );
          }
          if (trimmedLine.match(/^\d+\.\s/)) {
            const num = trimmedLine.match(/^\d+/)?.[0];
            return (
              <div key={`${i}-${j}`} className="flex gap-2 pl-2 py-0.5">
                <span className="text-[#8b949e] font-mono text-xs mt-1 shrink-0">{num}.</span>
                <span className="flex-1 leading-relaxed text-[#c9d1d9]">{parseInline(line.replace(/^\d+\.\s/, ''))}</span>
              </div>
            );
          }

          return <p key={`${i}-${j}`} className="leading-relaxed mb-1 text-[#c9d1d9]">{parseInline(line)}</p>;
        });
      })}
    </div>
  );
};

function parseInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-[#58a6ff] font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-[#21262d] px-1.5 rounded text-[#f85149] font-mono text-[0.9em] mx-0.5">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  mode, 
  language, 
  messages, 
  setMessages, 
  onNewArtifact, 
  chapterContext, 
  onStartQuiz 
}) => {
  const t = translations[language];
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingArtifact, setIsGeneratingArtifact] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isInitializingVoice, setIsInitializingVoice] = useState(false);
  const [isAutoSpeak, setIsAutoSpeak] = useState(() => localStorage.getItem('rust_auto_speak') === 'true');
  const [volume, setVolume] = useState(0);
  
  const [inputAreaHeight, setInputAreaHeight] = useState(130);
  const [isResizing, setIsResizing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    localStorage.setItem('rust_auto_speak', isAutoSpeak.toString());
  }, [isAutoSpeak]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 80 && newHeight <= 450) {
        setInputAreaHeight(newHeight);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    return () => {
      stopAudioMonitoring();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (playbackContextRef.current) {
        playbackContextRef.current.close();
      }
    };
  }, []);

  const stopAudioMonitoring = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setVolume(0);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const speakText = async (text: string) => {
    if (!text || text.trim().length === 0) return;
    try {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = playbackContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      
      const plainText = text.replace(/```[\s\S]*?```/g, '').replace(/[#*`]/g, '');
      const audioData = await textToSpeech(plainText, language);
      if (!audioData) return;
      
      const buffer = await decodeAudioData(audioData, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.warn("Speech playback error:", e);
    }
  };

  const startAudioMonitoring = async (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    audioContextRef.current = audioContext;
    const updateVolume = () => {
      if (!analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      setVolume(sum / dataArray.length);
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };
    updateVolume();
  };

  const initRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'zh' ? 'zh-CN' : 'en-US';
    recognition.onstart = () => {
      setIsListening(true);
      setIsInitializingVoice(false);
    };
    recognition.onresult = (event: any) => {
      let currentResult = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) currentResult += event.results[i][0].transcript;
      }
      if (currentResult) {
        setInput(prev => {
          const needsSpace = language === 'en' && prev.length > 0 && !prev.endsWith(' ');
          return prev + (needsSpace ? ' ' : '') + currentResult;
        });
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setIsInitializingVoice(false);
      stopAudioMonitoring();
    };
    recognition.onend = () => {
      if (isListening) recognition.start();
    };
    recognitionRef.current = recognition;
    return recognition;
  };

  const toggleVoiceInput = async () => {
    if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
      stopAudioMonitoring();
      return;
    }
    setIsInitializingVoice(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      await startAudioMonitoring(stream);
      if (!recognitionRef.current) initRecognition();
      recognitionRef.current.lang = language === 'zh' ? 'zh-CN' : 'en-US';
      recognitionRef.current.start();
    } catch (err) {
      setIsInitializingVoice(false);
      stopAudioMonitoring();
      alert(language === 'zh' ? '请允许麦克风访问权限。' : 'Please allow mic access.');
    }
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;
    
    if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
      stopAudioMonitoring();
    }

    const userMessage: Message = { role: 'user', text: trimmedInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemInstruction = getSystemPrompt(language, chapterContext);
      const response = await generateLearningResponse([...messages, userMessage], systemInstruction, true);
      let fullResponse = "";
      
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: Date.now() }]);
      
      if (typeof response === 'object' && Symbol.asyncIterator in response) {
        for await (const chunk of (response as any)) {
          fullResponse += chunk.text;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].text = fullResponse;
            return updated;
          });
        }
      }
      if (isAutoSpeak) speakText(fullResponse);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', text: "Connection error.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArtifactGeneration = async () => {
    if (messages.length < 2 || isGeneratingArtifact) return;
    setIsGeneratingArtifact(true);
    try {
      const artifactContent = await generateArtifactFromChat(messages, language);
      if (artifactContent && onNewArtifact) {
        onNewArtifact(artifactContent);
      }
    } catch (error) {
      console.error("Artifact generation error:", error);
      alert(language === 'zh' ? '生成失败。' : 'Failed.');
    } finally {
      setIsGeneratingArtifact(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#c9d1d9]">
      <div className="p-3 border-b border-[#30363d] flex justify-between items-center bg-[#161b22] shrink-0">
        <div className="flex-1 overflow-hidden">
          <h2 className="font-bold text-white text-sm">{mode === 'COACH' ? t.coachTitle : t.feynmanTitle}</h2>
          <p className="text-[10px] text-[#8b949e] truncate">{chapterContext || (mode === 'COACH' ? t.coachSub : t.feynmanSub)}</p>
        </div>
        <div className="flex gap-2 items-center">
          {onNewArtifact && (
            <button 
              onClick={handleArtifactGeneration}
              disabled={messages.length < 2 || isGeneratingArtifact}
              className="text-[10px] bg-[#238636] hover:bg-[#2ea043] disabled:opacity-30 text-white px-2.5 py-1.5 rounded-md font-bold transition-all flex items-center gap-2"
            >
              {isGeneratingArtifact ? <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Icons.Archive />}
              {t.genArtifact}
            </button>
          )}
          {onStartQuiz && (
            <button 
              onClick={onStartQuiz} 
              className="text-[10px] bg-[#1f6feb] text-white px-2.5 py-1.5 rounded-md font-bold hover:bg-[#388bfd] transition-colors"
            >
              {t.takeQuiz}
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center p-8">
            <div className="w-16 h-16 bg-[#21262d] rounded-full flex items-center justify-center mb-4">
              <Icons.Chat />
            </div>
            <p className="text-sm font-medium">{mode === 'COACH' ? t.coachInitSub : t.feynmanInitSub}</p>
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2`}>
            {m.role === 'user' ? (
              <div className="max-w-[85%] bg-[#1f6feb] text-white rounded-2xl px-4 py-2 text-sm shadow-md leading-relaxed">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[95%] bg-[#161b22] border border-[#30363d] text-[#c9d1d9] rounded-2xl px-5 py-4 relative shadow-lg">
                <MarkdownMessage text={m.text} isModel={true} />
                <button 
                  onClick={() => speakText(m.text)}
                  className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-[#8b949e] hover:text-white"
                >
                  <Icons.Microphone />
                </button>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="p-3 bg-[#161b22] w-12 h-7 flex items-center justify-center rounded-full border border-[#30363d] animate-pulse">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-[#8b949e] rounded-full animate-bounce" />
              <div className="w-1 h-1 bg-[#8b949e] rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1 h-1 bg-[#8b949e] rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div 
        className="border-t border-[#30363d] bg-[#0d1117] shrink-0 relative flex flex-col"
        style={{ height: `${inputAreaHeight}px` }}
      >
        <div 
          onMouseDown={handleMouseDown}
          className="absolute -top-1 left-0 w-full h-2 cursor-row-resize z-20 group flex items-center justify-center"
        >
          <div className={`h-[2px] w-16 rounded-full transition-all ${isResizing ? 'bg-[#58a6ff] w-32' : 'bg-[#30363d] group-hover:bg-[#484f58]'}`}></div>
        </div>

        <div className="flex-1 p-3 overflow-hidden">
          <div className="max-w-4xl mx-auto h-full flex flex-col gap-2">
            {isListening && (
              <div className="flex items-center gap-3 px-2">
                <span className="text-[10px] font-bold text-[#58a6ff] animate-pulse">{t.listening}</span>
                <div className="flex-1 bg-[#21262d] h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-[#58a6ff] transition-all" style={{ width: `${Math.min(100, volume * 1.5)}%` }}></div>
                </div>
              </div>
            )}
            <div className="flex items-end gap-3 flex-1 min-h-0">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={isListening ? t.listening : (mode === 'COACH' ? t.askPlaceholder : t.explainPlaceholder)}
                className="flex-1 bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-sm focus:ring-1 focus:ring-[#1f6feb] outline-none h-full resize-none transition-all placeholder:text-[#484f58] custom-scrollbar"
              />
              <div className="flex gap-2 pb-1">
                <button
                  onClick={toggleVoiceInput}
                  disabled={isInitializingVoice}
                  className={`p-3 rounded-xl transition-all ${isListening ? 'bg-[#f85149] text-white scale-110 shadow-lg' : 'bg-[#21262d] text-[#8b949e] border border-[#30363d] hover:text-white'}`}
                >
                  {isInitializingVoice ? '...' : <Icons.Microphone />}
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-[#1f6feb] text-white rounded-xl disabled:opacity-30 hover:bg-[#388bfd] transition-all active:scale-95"
                >
                  <Icons.Send />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
