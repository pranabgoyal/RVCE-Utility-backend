const express = require('express');
const router = express.Router();

// Mock Chat Endpoint
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        res.json({
            reply: `[MOCK AI] That's a great question about "${message}". Since I don't have an API key yet, I can't read the PDF, but I'm ready to help once connected!`
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Mock Quiz Endpoint
router.post('/quiz', async (req, res) => {
    try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const mockQuiz = [
            {
                id: 1,
                question: "What is the primary purpose of this document?",
                options: ["To explain Data Structures", "To list engineering colleges", "To teach cooking", "None of the above"],
                correctAnswer: 0
            },
            {
                id: 2,
                question: "Which concept is likely covered in Unit 1?",
                options: ["Arrays & Linked Lists", "Rocket Science", "Microbiology", "Ancient History"],
                correctAnswer: 0
            },
            {
                id: 3,
                question: "What is the time complexity of binary search?",
                options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
                correctAnswer: 1
            },
            {
                id: 4,
                question: "Who is the author of this resource?",
                options: ["Unknown Student", "Alan Turing", "Elon Musk", "Faculty"],
                correctAnswer: 0
            },
            {
                id: 5,
                question: "Is this resource useful for exams?",
                options: ["Yes, absolutely", "No", "Maybe", "Only for labs"],
                correctAnswer: 0
            }
        ];

        res.json({ quiz: mockQuiz });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
