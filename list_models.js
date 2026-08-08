require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // Actually the SDK doesn't expose ListModels directly, let's use fetch
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("AVAILABLE MODELS:");
    if (data.models) {
        data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
    } else {
        console.log(data);
    }
  } catch (e) {
    console.error(e);
  }
}
run();