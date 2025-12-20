
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Language } from "../types";

const API_KEY = process.env.API_KEY || "";

export const getGeminiModel = () => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  return ai;
};

export const generateLearningResponse = async (
  messages: Message[], 
  systemInstruction: string,
  useStreaming: boolean = false
) => {
  const ai = getGeminiModel();
  const contents = messages.map(m => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.text }]
  }));

  if (useStreaming) {
    return await ai.models.generateContentStream({
      model: "gemini-3-pro-preview",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
    }
  });

  return response;
};

export const getSystemPrompt = (lang: Language) => {
  const langText = lang === 'zh' ? 'Chinese' : 'English';
  return `You are a world-class Rust Programming Mentor. 
Your goal is to help the user master Rust using the Feynman Technique. 
IMPORTANT: Please respond primarily in ${langText}.

Key principles:
1. Encourage deep understanding over rote memorization.
2. Focus on core Rust concepts: Ownership, Borrowing, Lifetimes, Safety.
3. If the user is explaining a concept (Feynman Mode), listen carefully, then identify gaps or misunderstandings.
4. Be concise but technically accurate.
5. Provide high-quality Rust code examples using Markdown.
6. Always check if the user is ready for the next level or needs more practice on current topics.`;
};

export const ARTIFACT_GENERATOR_PROMPT = `Based on the learning session provided, generate a structured markdown "Knowledge Artifact". 
Include:
- Summary of concepts discussed.
- Key code snippets learned.
- Critical insights or common pitfalls identified.
- Areas that need more review (Gap Analysis).
Output ONLY the markdown content.`;
