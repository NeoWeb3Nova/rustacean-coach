
import { GoogleGenAI, Type } from "@google/genai";
import { Message, Language, QuizQuestion, LLMConfig } from "../types";

// Helper to get config from localStorage
const getConfig = (): LLMConfig => {
  const saved = localStorage.getItem('rust_llm_config');
  if (saved) return JSON.parse(saved);
  return { provider: 'gemini', model: 'gemini-3-pro-preview', apiKey: '' };
};

export const generateLearningResponse = async (
  messages: Message[], 
  systemInstruction: string,
  useStreaming: boolean = false
) => {
  const config = getConfig();

  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contents = messages.map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    if (useStreaming) {
      return await ai.models.generateContentStream({
        model: config.model || "gemini-3-pro-preview",
        contents,
        config: { systemInstruction, temperature: 0.7 }
      });
    }

    return await ai.models.generateContent({
      model: config.model || "gemini-3-pro-preview",
      contents,
      config: { systemInstruction, temperature: 0.7 }
    });
  } else {
    // Non-Gemini implementation using standard Fetch for OpenAI/Claude/etc
    const response = await fetchLLM(messages, systemInstruction, config);
    return { text: response };
  }
};

const fetchLLM = async (messages: Message[], system: string, config: LLMConfig) => {
  let url = '';
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  let body: any = {};

  const fullMessages = [
    { role: 'system', content: system },
    ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text }))
  ];

  switch (config.provider) {
    case 'openai':
      url = 'https://api.openai.com/v1/chat/completions';
      headers["Authorization"] = `Bearer ${config.apiKey}`;
      body = { model: config.model, messages: fullMessages };
      break;
    case 'claude':
      url = 'https://api.anthropic.com/v1/messages';
      headers["x-api-key"] = config.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      body = { model: config.model, system, messages: fullMessages.filter(m => m.role !== 'system') };
      break;
    case 'grok':
      url = 'https://api.x.ai/v1/chat/completions';
      headers["Authorization"] = `Bearer ${config.apiKey}`;
      body = { model: config.model, messages: fullMessages };
      break;
    case 'custom':
      url = config.baseUrl || '';
      headers["Authorization"] = `Bearer ${config.apiKey}`;
      body = { model: config.model, messages: fullMessages };
      break;
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  
  if (config.provider === 'claude') return data.content[0].text;
  return data.choices[0].message.content;
};

export const analyzePdfForCurriculum = async (base64Pdf: string, language: Language) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langText = language === 'zh' ? 'Chinese' : 'English';
  
  const prompt = `Analyze this PDF document and extract its main chapters or learning sections to create a structured Rust programming curriculum. 
Return a JSON array of strings, where each string is a chapter title. 
The output should be primarily in ${langText}.
Ensure the chapters follow the logical order of the document.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  return JSON.parse(response.text || "[]") as string[];
};

export const generateQuizForChapter = async (chapterTitle: string, language: Language) => {
  const config = getConfig();
  const langText = language === 'zh' ? 'Chinese' : 'English';
  const prompt = `Generate a 3-question multiple choice quiz for the Rust programming topic: "${chapterTitle}". 
For each question, provide 4 options, the correct answer index (0-3), and a brief explanation.
Language: ${langText}.
Return ONLY JSON.`;

  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: config.model || 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.NUMBER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]") as QuizQuestion[];
  } else {
    const text = await fetchLLM([{ role: 'user', text: prompt, timestamp: Date.now() }], "You are a quiz generator.", config);
    // Extract JSON from text if provider doesn't support structured output schema
    const match = text.match(/\[.*\]/s);
    return JSON.parse(match ? match[0] : "[]") as QuizQuestion[];
  }
};

export const getSystemPrompt = (lang: Language, contextChapter?: string) => {
  const langText = lang === 'zh' ? 'Chinese' : 'English';
  const chapterFocus = contextChapter 
    ? `\nCURRENT CHAPTER FOCUS: "${contextChapter}". Keep explanations and exercises strictly related to this topic.`
    : "";

  return `You are a world-class Rust Programming Mentor. 
Your goal is to help the user master Rust using the Feynman Technique. 
IMPORTANT: Please respond primarily in ${langText}.${chapterFocus}

Key principles:
1. Encourage deep understanding over rote memorization.
2. Focus on core Rust concepts: Ownership, Borrowing, Lifetimes, Safety.
3. If the user is explaining a concept (Feynman Mode), listen carefully, then identify gaps or misunderstandings.
4. Be concise but technically accurate.
5. Provide high-quality Rust code examples using Markdown.
6. Always check if the user is ready for the next level or needs more practice on current topics.`;
};
