const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function testGemini() {
    console.log("Testing Gemini API Connection...");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ Error: GEMINI_API_KEY not found in .env file.");
        process.exit(1);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Say 'Hello, I am working!' if you can hear me.";
        console.log(`Sending prompt: "${prompt}"`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("✅ Success! AI Response:", text);
    } catch (error) {
        console.error("❌ Failed to connect to Gemini:", error.message);
    }
}

testGemini();
