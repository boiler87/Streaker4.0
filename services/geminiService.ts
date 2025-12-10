import { GoogleGenAI } from "@google/genai";

// NOTE: Ideally this comes from process.env.API_KEY, but for this demo context we assume it's available.
// In a real production app, you might proxy this through a backend or use strict security rules.
const apiKey = process.env.API_KEY || ''; 

let ai: GoogleGenAI | null = null;

if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

export const getMotivationalQuote = async (currentStreakDays: number): Promise<string> => {
  if (!ai) return "Stay strong! You are doing great.";

  try {
    const model = "gemini-2.5-flash";
    const prompt = `I am currently on a streak of ${currentStreakDays} days of delayed gratification. 
    Give me a short, powerful, philosophical, or stoic motivational quote or advice (max 2 sentences) to keep me going. 
    Do not use quotes. Just the text.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error fetching motivation:", error);
    return "Discipline is freedom. Keep going.";
  }
};
