const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");

// Helper to get model
const getModel = () => genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Upgraded to newer model if available or stick to stable

// Chat Endpoint
router.post('/chat', async (req, res) => {
    try {
        // Now accepting direct context params instead of resourceId
        const { message, context } = req.body;
        // context object: { title, subject, branch, textContent (if available) }

        if (!process.env.GEMINI_API_KEY) {
            return res.json({ reply: "⚠️ System Error: AI Service is missing API Key." });
        }

        const model = getModel();

        let promptContext = "";
        if (context) {
            promptContext = `Context: The student is studying a resource titled "${context.title}"`;
            if (context.subject) promptContext += ` for the subject "${context.subject}"`;
            if (context.branch) promptContext += ` (${context.branch} Branch)`;
            promptContext += ".";
        }

        const prompt = `You are a helpful engineering tutor.
        ${promptContext}
        
        Student Question: "${message}"
        
        Answer concisely and helpfully. If the question is unrelated to the context, politely guide them back.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (err) {
        console.error("AI Chat Error:", err.message);
        res.status(500).json({ reply: `Error: ${err.message}` });
    }
});

// Quiz Endpoint
router.post('/quiz', async (req, res) => {
    try {
        const { context } = req.body;
        // context object: { title, subject, branch }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: "AI Service Unavailable" });
        }

        const model = getModel();

        // Fallback defaults if context is missing (e.g. random quiz)
        const subject = context?.subject || "General Engineering";
        const topic = context?.title || "Engineering Concepts";
        const branch = context?.branch || "Common";

        const prompt = `Generate a short multiple-choice quiz (5 questions) based on:
        Subject: "${subject}"
        Topic: "${topic}"
        Target Audience: ${branch} Engineering Students.
        
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
        res.status(500).json({ error: `Debug Error: ${err.message}` });
    }
});

module.exports = router;
