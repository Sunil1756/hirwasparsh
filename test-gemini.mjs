import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Tell me a quick 1 sentence joke about trees.",
    });
    console.log(response.text);
  } catch (e) {
    console.error("API error:", e);
  }
}

test();
