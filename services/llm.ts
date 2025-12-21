
import { GoogleGenAI, Type, Modality } from "@google/genai";
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
};

/**
 * Transforms text into audio bytes using gemini-2.5-flash-preview-tts
 */
export const textToSpeech = async (text: string, language: Language): Promise<Uint8Array | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = language === 'zh' 
      ? `用自然、清晰的中文（中国大陆口音）朗读以下 Rust 教学内容，保持专业且亲切的语调：${text}`
      : `Read this Rust programming insight naturally and clearly: ${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (base64Audio) {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langText = language === 'zh' ? 'Chinese' : 'English';
  const prompt = `Generate a 3-question multiple choice quiz for the Rust programming topic: "${chapterTitle}". 
For each question, provide 4 options, the correct answer index (0-3), and a brief explanation.
Language: ${langText}.
Return ONLY JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
