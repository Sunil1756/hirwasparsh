require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Say hello' });
    console.log('SUCCESS! Gemini API is working.');
  } catch (e) {
    console.error('ERROR! Gemini API failed:', e.message);
  }
}
run();
