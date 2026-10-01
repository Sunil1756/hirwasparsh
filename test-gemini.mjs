import { GoogleGenAI } from '@google/genai';
async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({ model: 'gemini-flash-latest', contents: 'Say hello' });
    console.log('SUCCESS! Gemini API is connected and responding. Response:', response.text);
  } catch (e) {
    console.error('ERROR! Gemini API failed:', e.message);
  }
}
run();
