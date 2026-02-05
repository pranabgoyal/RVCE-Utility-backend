const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");

// Helper to get model
const getModel = () => genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // Using confirmed working model alias

const axios = require('axios');
const pdf = require('pdf-parse');

// Helper to fetch and parse file content
async function getFileContent(url) {
    try {
        if (!url) return null;
        console.log("Fetching content from:", url);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // Check file type based on extension or headers (simplified here)
        if (url.toLowerCase().endsWith('.pdf')) {
            const data = await pdf(buffer);
            return data.text.substring(0, 20000); // Limit context to ~20k chars to stay within limits
        } else {
            // Assume text/code
            return buffer.toString('utf-8').substring(0, 20000);
        }
    } catch (error) {
        console.error("Error fetching file content:", error.message);
        return null;
    }
}

// Chat Endpoint
router.post('/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        // context: { title, subject, branch, fileUrl }

        if (!process.env.GEMINI_API_KEY) {
            return res.json({ reply: "⚠️ System Error: AI Service is missing API Key." });
        }

        const model = getModel();

        // 1. Build Context
        let promptContext = `Context: The student is studying a resource titled "${context?.title || 'Unknown'}"`;
        if (context?.subject) promptContext += ` for the subject "${context.subject}"`;
        if (context?.branch) promptContext += ` (${context.branch} Branch).`;

        // 2. Fetch Content if available
        if (context?.fileUrl) {
            const fileContent = await getFileContent(context.fileUrl);
            if (fileContent) {
                promptContext += `\n\n--- DOCUMENT CONTENT START ---\n${fileContent}\n--- DOCUMENT CONTENT END ---\n`;
            } else {
                promptContext += `\n(Note: Could not retrieve document content from ${context.fileUrl})`;
            }
        }

        const prompt = `You are a helpful engineering tutor.
        ${promptContext}
        
        Student Question: "${message}"
        
        Answer concisely and helpfully based on the provided document content (if any). 
        If the answer is in the document, cite it. 
        If the question is unrelated to the context, politely guide them back.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (err) {
        console.error("AI Chat Error:", err.message);
        let errorMsg = "AI Service Error";
        if (err.message.includes("429")) errorMsg = "AI Usage Limit Exceeded (Try again later)";
        if (err.message.includes("403")) errorMsg = "AI Service Access Denied (Check API Key)";
        res.status(500).json({ reply: `⚠️ ${errorMsg}` });
    }
});

// Quiz Endpoint
router.post('/quiz', async (req, res) => {
    try {
        const { context } = req.body;
        // context: { title, subject, branch, fileUrl }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: "AI Service Unavailable" });
        }

        const model = getModel();

        const subject = context?.subject || "General Engineering";
        const topic = context?.title || "Engineering Concepts";
        const branch = context?.branch || "Common";

        let contentContext = "";
        if (context?.fileUrl) {
            const fileContent = await getFileContent(context.fileUrl);
            if (fileContent) {
                contentContext = `\nBased strictly on the following content:\n${fileContent.substring(0, 15000)}\n`;
            }
        }

        const prompt = `Generate a short multiple-choice quiz (5 questions).
        Subject: "${subject}"
        Topic: "${topic}"
        Target Audience: ${branch} Engineering Students.
        ${contentContext}
        
        Return ONLY valid JSON in this exact format, with no extra text or markdown:
        
        Return ONLY valid JSON in this exact format, with no extra text or markdown:
        [
            {
                "id": 1,
                "question": "Question text here?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": 0
            }
        ]
        (correctAnswer should be the index 0-3 of the correct option)`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Cleanup markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const quiz = JSON.parse(text);
        res.json({ quiz });

    } catch (err) {
        console.error("AI Quiz Error:", err.message);
        let errorMsg = "AI Service Error";
        if (err.message.includes("429")) errorMsg = "AI Usage Limit Exceeded (Try again later)";
        res.status(500).json({ error: errorMsg });
    }
});

module.exports = router;
