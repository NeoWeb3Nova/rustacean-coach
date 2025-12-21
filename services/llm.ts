
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Message, Language, QuizQuestion, LLMConfig } from "../types";

const getConfig = (): LLMConfig => {
  const saved = localStorage.getItem('rust_llm_config');
  if (saved) return JSON.parse(saved);
  return { provider: 'gemini', model: 'gemini-3-flash-preview', apiKey: '' };
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

  const modelName = config.model || "gemini-3-flash-preview";

  if (useStreaming) {
    return await ai.models.generateContentStream({
      model: modelName,
      contents,
      config: { systemInstruction, temperature: 0.7 }
    });
  }

  return await ai.models.generateContent({
    model: modelName,
    contents,
    config: { systemInstruction, temperature: 0.7 }
  });
};

export const textToSpeech = async (text: string, language: Language): Promise<Uint8Array | null> => {
  try {
    // Check if key selection is needed for high-tier preview models
    // @ts-ignore
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
       // @ts-ignore
       await window.aistudio.openSelectKey();
       // Procedural assumption as per guidelines: proceed after trigger
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = language === 'zh' 
      ? `朗读以下 Rust 教学内容：${text}`
      : `Read this Rust content: ${text}`;

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

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const base64Audio = part?.inlineData?.data;

    if (base64Audio) {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
    return null;
  } catch (error: any) {
    console.error("TTS Error:", error);
    // Handle the "entity not found" error by prompting for key selection
    if (error?.message?.includes("Requested entity was not found") || error?.message?.includes("Rpc failed")) {
      // @ts-ignore
      if (window.aistudio) {
        window.aistudio.openSelectKey();
      }
    }
    return null;
  }
};

export const analyzePdfForCurriculum = async (base64Pdf: string, language: Language) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langText = language === 'zh' ? 'Chinese' : 'English';
  
  const prompt = `Analyze this PDF document and extract its main chapters for a Rust curriculum. Return JSON array of strings in ${langText}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  const prompt = `Generate a 3-question quiz for "${chapterTitle}" in ${langText}. Return JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  const langText = lang === 'zh' ? 'Chinese (Simplified)' : 'English';
  const chapterFocus = contextChapter 
    ? `\nCURRENT CHAPTER FOCUS: "${contextChapter}".`
    : "";

  return `You are a world-class Rust Programming Mentor. 

LANGUAGE RULE:
- ALWAYS explain concepts in the user's requested language: ${langText}.
- While you can keep technical keywords in English (e.g., "Ownership", "Borrowing", "Trait"), your main explanation and logic MUST be in ${langText}.
- DO NOT tell the user you only communicate in English. You are multilingual.

PEDAGOGY:
- Use the Feynman Technique: explain complex things simply.
- If in FEYNMAN mode, critique the user's explanation.
- Use structured Markdown with clear headers (###), bold text (**), and code blocks (\`\`\`rust).
${chapterFocus}`;
};
