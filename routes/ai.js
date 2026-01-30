const express = require('express');
const router = express.Router();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Resource = require('../models/Resource');

// Initialize Gemini
// Note: This requires GEMINI_API_KEY in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");

// Helper to get model
const getModel = () => genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Chat Endpoint
router.post('/chat', async (req, res) => {
    try {
        const { resourceId, message } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.json({ reply: "⚠️ System Error: AI Service is missing API Key. Please notify the administrator." });
        }

        // Fetch resource context
        const resource = await Resource.findById(resourceId);
        if (!resource) return res.status(404).json({ reply: "Error: Resource not found." });

        const model = getModel();
        const prompt = `You are a helpful engineering tutor.
        Context: The student is studying a resource titled "${resource.title}" for the subject "${resource.subject}" (${resource.branch} Branch).
        
        Student Question: "${message}"
        
        Answer concisely and helpfully. If the question is unrelated to the context, politely guide them back.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (err) {
        console.error("AI Chat Error:", err.message);
        res.status(500).json({ reply: "Sorry, I'm having trouble thinking right now. Please try again later." });
    }
});

// Quiz Endpoint
router.post('/quiz', async (req, res) => {
    try {
        const { resourceId } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: "AI Service Unavailable" });
        }

        const resource = await Resource.findById(resourceId);
        if (!resource) return res.status(404).json({ error: "Resource not found" });

        const model = getModel();
        const prompt = `Generate a short multiple-choice quiz (5 questions) based on the engineering subject: "${resource.subject}" and topic "${resource.title}".
        Target Audience: ${resource.branch} Engineering Students.
        
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
        res.status(500).send('Server Error');
    }
});

module.exports = router;
