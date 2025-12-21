
import React, { useState, useRef, useEffect } from 'react';
import { Message, Language, AppMode } from '../types';
import { Icons } from '../constants';
import { generateLearningResponse, getSystemPrompt, textToSpeech } from '../services/llm';
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
  const [isListening, setIsListening] = useState(false);
  const [isInitializingVoice, setIsInitializingVoice] = useState(false);
  const [isAutoSpeak, setIsAutoSpeak] = useState(() => localStorage.getItem('rust_auto_speak') === 'true');
  const [volume, setVolume] = useState(0);
  
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

  useEffect(() => {
    // Re-initialize recognition if language changes while active
    if (isListening) {
      recognitionRef.current?.stop();
      initRecognition();
      recognitionRef.current?.start();
    }
  }, [language]);

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
    
    // Resume audio context on user action if suspended
    if (playbackContextRef.current?.state === 'suspended') {
      await playbackContextRef.current.resume();
    }

    const plainText = text.replace(/```[\s\S]*?```/g, '').replace(/`([^`]+)`/g, '$1');
    const audioData = await textToSpeech(plainText, language);
    if (!audioData) return;

    if (!playbackContextRef.current) {
      playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = playbackContextRef.current;
    const buffer = await decodeAudioData(audioData, ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  };

  const startAudioMonitoring = async (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    source.connect(analyser);
    
    analyserRef.current = analyser;
    audioContextRef.current = audioContext;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVolume = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      setVolume(average);
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
        if (event.results[i].isFinal) {
          currentResult += event.results[i][0].transcript;
        }
      }
      
      if (currentResult) {
        setInput(prev => {
          // Chinese doesn't need spaces, English does.
          const needsSpace = language === 'en' && prev.length > 0 && !prev.endsWith(' ');
          return prev + (needsSpace ? ' ' : '') + currentResult;
        });
      }
    };

    recognition.onerror = (event: any) => {
      // ignore no-speech errors to prevent constant interruptions
      if (event.error === 'no-speech') return;
      
      console.warn("Recognition Error:", event.error);
      setIsListening(false);
      setIsInitializingVoice(false);
      stopAudioMonitoring();
      
      if (event.error !== 'aborted') {
        alert(`${t.voiceError}: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we didn't manually stop
      if (isListening && !isInitializingVoice) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
          stopAudioMonitoring();
        }
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const toggleVoiceInput = async () => {
    // Ensure we have a gesture to resume audio
    if (playbackContextRef.current?.state === 'suspended') {
      playbackContextRef.current.resume();
    }

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

      if (!recognitionRef.current) {
        initRecognition();
      }
      
      recognitionRef.current.lang = language === 'zh' ? 'zh-CN' : 'en-US';
      recognitionRef.current.start();
      
    } catch (err: any) {
      console.error("Voice Access Failed", err);
      setIsInitializingVoice(false);
      stopAudioMonitoring();
      alert(language === 'zh' ? `无法开启麦克风，请检查权限。` : `Mic Access Denied: ${err.message}`);
    }
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userWasUsingVoice = isListening;
    // Don't stop listening if we want continuous, but often better to stop during processing
    if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
      stopAudioMonitoring();
    }

    const userMessage: Message = {
      role: 'user',
      text: trimmedInput,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const basePrompt = getSystemPrompt(language, chapterContext);
      const systemInstruction = `${basePrompt} \nCurrently in ${mode} mode. ${
        mode === 'FEYNMAN' ? 'The user will explain a concept. Critique it.' : 'Mentor the user.'
      } ALWAYS respond in ${language === 'zh' ? 'Chinese (Simplified)' : 'English'}.`;
      
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
      } else {
        fullResponse = (response as any).text || "";
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].text = fullResponse;
          return updated;
        });
      }

      if (userWasUsingVoice || isAutoSpeak) {
        speakText(fullResponse);
      }

    } catch (err) {
      console.error("LLM Error:", err);
      setMessages(prev => [...prev, { 
        role: 'system', 
        text: language === 'zh' ? "通信失败，请检查设置。" : "Communication error.", 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      <div className="p-4 border-b border-[#30363d] flex justify-between items-center bg-[#161b22] shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white text-base">
              {mode === 'COACH' ? t.coachTitle : t.feynmanTitle}
            </h2>
          </div>
          <p className="text-xs text-[#8b949e]">
            {chapterContext || (mode === 'COACH' ? t.coachSub : t.feynmanSub)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <button 
            onClick={() => setIsAutoSpeak(!isAutoSpeak)}
            className={`p-2 rounded-md transition-all ${isAutoSpeak ? 'text-[#58a6ff] bg-[#1f6feb22]' : 'text-[#8b949e] hover:text-white'}`}
            title={language === 'zh' ? '自动朗读回复' : 'Auto Speak Replies'}
          >
            <Icons.Microphone />
          </button>
          {onStartQuiz && <button onClick={onStartQuiz} className="text-xs bg-[#1f6feb] text-white px-3 py-1.5 rounded-md font-bold">{t.takeQuiz}</button>}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] rounded-2xl p-4 text-sm relative ${
              m.role === 'user' ? 'bg-[#1f6feb] text-white' : 'bg-[#161b22] text-[#c9d1d9] border border-[#30363d]'
            }`}>
              {m.text}
              {m.role === 'model' && (
                <button 
                  onClick={() => speakText(m.text)}
                  className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#8b949e] hover:text-white"
                >
                  <Icons.Microphone />
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && <div className="p-4 bg-[#161b22] w-12 rounded-full animate-pulse">...</div>}
      </div>

      <div className="p-4 border-t border-[#30363d] bg-[#0d1117] shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {isListening && (
            <div className="flex items-center gap-3 px-2">
              <span className="text-[10px] font-bold text-[#58a6ff] animate-pulse">
                {language === 'zh' ? '正在听取中文...' : 'Listening in English...'}
              </span>
              <div className="flex-1 bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#58a6ff] transition-all duration-75"
                  style={{ width: `${Math.min(100, (volume / 150) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={isListening ? t.listening : (mode === 'COACH' ? t.askPlaceholder : t.explainPlaceholder)}
              className={`flex-1 bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-sm focus:ring-1 focus:ring-[#1f6feb] outline-none min-h-[50px] max-h-48 resize-none ${isListening ? 'border-[#1f6feb] ring-1 ring-[#1f6feb]' : ''}`}
            />
            <div className="flex gap-2">
              <button
                onClick={toggleVoiceInput}
                disabled={isInitializingVoice}
                className={`p-3.5 rounded-xl transition-all ${isListening ? 'bg-[#f85149] text-white animate-pulse' : 'bg-[#21262d] text-[#8b949e] hover:text-white border border-[#30363d]'}`}
              >
                {isInitializingVoice ? '...' : <Icons.Microphone />}
              </button>
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-3.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white rounded-xl disabled:opacity-50"
              >
                <Icons.Send />
              </button>
            </div>
          </div>
          {isListening && volume < 5 && (
            <p className="text-[10px] text-center text-[#8b949e]">
              {language === 'zh' ? '未检测到声音，请检查输入设备' : 'No sound detected, check mic.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
