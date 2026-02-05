const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");

// Helper to get model
const getModel = () => genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Explicitly use 1.5 Flash for better limits & multimodal support

const axios = require('axios');
// const pdf = require('pdf-parse'); // No longer needed for multimodal

// Helper to fetch file and return base64
async function getFilePart(url) {
    try {
        if (!url) return null;
        console.log("Fetching content from:", url);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const mimeType = response.headers['content-type'] || 'application/pdf'; // Default to PDF if unknown

        return {
            inlineData: {
                data: buffer.toString("base64"),
                mimeType: mimeType
            }
        };
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

        // 1. Build Text Context
        let textPrompt = `You are a helpful engineering tutor.
        Context: The student is studying a resource titled "${context?.title || 'Unknown'}"`;
        if (context?.subject) textPrompt += ` for the subject "${context.subject}"`;
        if (context?.branch) textPrompt += ` (${context.branch} Branch).`;

        textPrompt += `\n\nStudent Question: "${message}"\n\nAnswer concisely and helpfully based on the provided document. If the document is irrelevant to the question, politely guide them back.`;

        // 2. Prepare Parts
        const parts = [
            { text: textPrompt }
        ];

        // 3. Fetch File if available
        if (context?.fileUrl) {
            const filePart = await getFilePart(context.fileUrl);
            if (filePart) {
                parts.unshift(filePart); // Add file as the first part
            }
        }

        const result = await model.generateContent({
            contents: [{ role: "user", parts: parts }]
        });

        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (err) {
        console.error("AI Chat Error Details:", err.response ? err.response.data : err.message);
        let errorMsg = "AI Service Error";
        if (err.message.includes("429")) errorMsg = "AI Usage Limit Exceeded (Try again later)";
        if (err.message.includes("403")) errorMsg = "AI Service Access Denied (Check API Key)";
        if (err.message.includes("500")) errorMsg = "AI Server Error (Try again)";
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

        let textPrompt = `Generate a short multiple-choice quiz (5 questions).
        Subject: "${subject}"
        Topic: "${topic}"
        Target Audience: ${branch} Engineering Students.
        
        Using the provided document (if any), create relevant questions.
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

        // Prepare Parts
        const parts = [
            { text: textPrompt }
        ];

        // Fetch File if available
        if (context?.fileUrl) {
            const filePart = await getFilePart(context.fileUrl);
            if (filePart) {
                parts.unshift(filePart);
            }
        }

        const result = await model.generateContent({
            contents: [{ role: "user", parts: parts }]
        });

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
