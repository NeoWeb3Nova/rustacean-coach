
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Message, Language, QuizQuestion } from "../types";

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

export const analyzePdfForCurriculum = async (base64Pdf: string, language: Language) => {
  const ai = getGeminiModel();
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
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Pdf,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
      },
    },
  });

  return JSON.parse(response.text || "[]") as string[];
};

export const generateQuizForChapter = async (chapterTitle: string, language: Language) => {
  const ai = getGeminiModel();
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

export const ARTIFACT_GENERATOR_PROMPT = `Based on the learning session provided, generate a structured markdown "Knowledge Artifact". 
Include:
- Summary of concepts discussed.
- Key code snippets learned.
- Critical insights or common pitfalls identified.
- Areas that need more review (Gap Analysis).
Output ONLY the markdown content.`;
