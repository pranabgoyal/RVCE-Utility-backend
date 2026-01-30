const express = require('express');
const router = express.Router();
const Question = require('../models/Question');

// @route   POST /api/quiz/generate
// @desc    Get 10 random questions for a subject
// @access  Public (for now, can be Protected)
router.post('/generate', async (req, res) => {
    try {
        const { subject } = req.body;

        // If 'All', don't filter by subject
        const matchStage = (subject && subject !== 'All') ? { $match: { subject } } : { $match: {} };

        const questions = await Question.aggregate([
            matchStage,
            { $sample: { size: 10 } } // Randomly pick 10
        ]);

        // Hide correctIndex in response to prevent cheating if inspecting network tab
        // But for simplicity in this MVP, we might send it or check answers on backend on submit.
        // Best practice: Don't send correctIndex. Check on backend.
        // For this implementation: We will send correctIndex but handled securely on client (or just check on backend).
        // Let's REMOVE correctIndex from response for security.
        const secureQuestions = questions.map(q => ({
            _id: q._id,
            text: q.text,
            options: q.options,
            subject: q.subject,
            difficulty: q.difficulty
        }));

        res.json(secureQuestions);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/quiz/submit
// @desc    Calculate score
// @access  Public
router.post('/submit', async (req, res) => {
    try {
        const { answers } = req.body; // { questionId: selectedIndex, ... }

        if (!answers || Object.keys(answers).length === 0) {
            return res.status(400).json({ msg: "No answers submitted" });
        }

        const questionIds = Object.keys(answers);
        const questions = await Question.find({ _id: { $in: questionIds } });

        let score = 0;
        let total = questions.length;
        let results = [];

        questions.forEach(q => {
            const userAns = answers[q._id];
            const isCorrect = userAns === q.correctIndex;

            if (isCorrect) score++;

            results.push({
                questionId: q._id,
                text: q.text,
                userAnswer: q.options[userAns],
                correctAnswer: q.options[q.correctIndex],
                isCorrect,
                explanation: q.explanation
            });
        });

        res.json({
            score,
            total,
            percentage: Math.round((score / total) * 100),
            results
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/quiz/seed
// @desc    Seed dummy questions (Dev only)
router.post('/seed', async (req, res) => {
    try {
        // Only allow in dev/test
        // if (process.env.NODE_ENV === 'production') return res.status(403).send('Forbidden');

        const sampleQuestions = [
            {
                text: "What is the Time Complexity of Binary Search?",
                options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
                correctIndex: 1,
                subject: "CSE",
                difficulty: "Easy",
                explanation: "Binary search divides the search interval in half essentially."
            },
            {
                text: "Which law states V = IR?",
                options: ["Kirchhoff's Law", "Faraday's Law", "Ohm's Law", "Newton's Law"],
                correctIndex: 2,
                subject: "EEE",
                difficulty: "Easy",
                explanation: "Ohm's law relates voltage, current, and resistance."
            },
            {
                text: "In React, which hook is used for side effects?",
                options: ["useState", "useEffect", "useContext", "useReducer"],
                correctIndex: 1,
                subject: "CSE",
                difficulty: "Medium",
                explanation: "useEffect is built specifically for side effects like data fetching."
            },
            {
                text: "What does CPU stand for?",
                options: ["Central Process Unit", "Central Processing Unit", "Computer Personal Unit", "Central Processor Unit"],
                correctIndex: 1,
                subject: "Common",
                difficulty: "Easy",
                explanation: "Central Processing Unit is the brain of the computer."
            },
            {
                text: "Which material is a semiconductor?",
                options: ["Copper", "Silicon", "Rubber", "Iron"],
                correctIndex: 1,
                subject: "ECE",
                difficulty: "Easy",
                explanation: "Silicon is the most common semiconductor material."
            }
        ];

        await Question.insertMany(sampleQuestions);
        res.json({ msg: "Seeded 5 questions" });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
