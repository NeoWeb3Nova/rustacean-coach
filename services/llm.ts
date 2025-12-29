
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Message, Language, QuizQuestion, LLMConfig } from "../types";

const getConfig = (): LLMConfig => {
  const saved = localStorage.getItem('rust_llm_config');
  if (saved) return JSON.parse(saved);
  return { provider: 'gemini', model: 'gemini-3-flash-preview', apiKey: '' };
};

/**
 * 确保已选择 API Key 的辅助函数
 */
async function ensureApiKey() {
  // @ts-ignore
  if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
    // @ts-ignore
    await window.aistudio.openSelectKey();
  }
}

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

/**
 * 将对话历史生成为结构化的学习成果
 */
export const generateArtifactFromChat = async (messages: Message[], language: Language) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langText = language === 'zh' ? 'Chinese (Simplified)' : 'English';
  
  const chatHistory = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'Learner' : 'Mentor'}: ${m.text}`)
    .join('\n\n');

  const prompt = `Based on the following Rust learning conversation, generate a high-quality, structured Markdown "Knowledge Artifact".
The content should be in the language most used in the conversation (defaulting to ${langText} if mixed).

Include:
1. **Concept Summary**: Briefly explain the core concepts discussed.
2. **Key Code Snippets**: Provide the most important code examples from the chat with comments.
3. **Common Pitfalls**: Highlight what the learner struggled with or typical Rust errors mentioned.
4. **Feynman Gap Analysis**: Identify specific areas where the learner's understanding could be deeper.

Return ONLY the Markdown content.

CONVERSATION:
${chatHistory}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: prompt }] }],
    config: { temperature: 0.3 }
  });

  return response.text;
};

export const textToSpeech = async (text: string, language: Language): Promise<Uint8Array | null> => {
  try {
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
    return null;
  }
};

export const analyzePdfForCurriculum = async (base64Pdf: string, language: Language) => {
  await ensureApiKey();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langText = language === 'zh' ? 'Chinese (Simplified)' : 'English';
  
  const prompt = `You are a professional Rust curriculum expert. 
Task: Analyze the provided PDF document and generate a structured learning roadmap.
Requirements:
1. Identify the core Rust concepts and sections present in the text.
2. Group them into 8-12 logical chapters.
3. Chapter titles MUST be in ${langText}.
4. Return ONLY a JSON object with a 'chapters' key.

Expected format: { "chapters": ["Intro to Rust", "Ownership System", ...] }`;

  try {
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
          type: Type.OBJECT,
          properties: {
            chapters: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["chapters"]
        },
      },
    });

    const text = response.text;
    const result = JSON.parse(text || '{"chapters": []}');
    return result.chapters as string[];
  } catch (err: any) {
    console.error("LLM: PDF analysis error:", err);
    throw err;
  }
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
- MIRROR THE USER: If the user speaks to you in Chinese, respond in Chinese. If they speak in English, respond in English.
- DYNAMIC DETECTION: Do not strictly follow the UI language (${langText}) if the user initiates a conversation in a different language. 
- DEFAULT: Use ${langText} only if the user's language is ambiguous or they explicitly ask to switch.
- TERMINOLOGY: Keep core Rust technical keywords in English (e.g., "Ownership", "Borrowing", "Lifetime", "Trait") even when explaining in Chinese, as this is standard practice.

PEDAGOGY:
- Use the Feynman Technique: explain complex things simply.
- Use structured Markdown with clear headers (###), bold text (**), and code blocks (\`\`\`rust).
${chapterFocus}`;
};
