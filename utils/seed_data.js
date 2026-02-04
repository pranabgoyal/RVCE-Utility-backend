const mongoose = require('mongoose');
const Question = require('../models/Question');

// Use the local in-memory DB URL if available, otherwise default to localhost
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:5000/engineering_platform'; // Adjust if needed

const seedQuestions = [
    {
        text: "What is Supervised Learning?",
        options: [
            "Learning where the model is trained on labeled data.",
            "Learning where the model explores the environment.",
            "Learning without any data.",
            "Learning from unlabeled data."
        ],
        correctIndex: 0,
        subject: "AI&ML",
        difficulty: "Easy",
        explanation: "Supervised learning involves training a model on a labeled dataset."
    },
    {
        text: "Which algorithm is commonly used for classification?",
        options: ["K-Means", "Linear Regression", "Logistic Regression", "Apriori"],
        correctIndex: 2,
        subject: "AI&ML",
        difficulty: "Medium",
        explanation: "Logistic Regression is a popular classification algorithm despite its regression name."
    },
    {
        text: "What does NLP stand for in AI?",
        options: ["Neural Language Processing", "Natural Language Processing", "New Learning Protocol", "Network Language Protocol"],
        correctIndex: 1,
        subject: "AI&ML",
        difficulty: "Easy",
        explanation: "Natural Language Processing deals with the interaction between computers and humans."
    },
    {
        text: "Which of these is a Deep Learning framework?",
        options: ["React", "TensorFlow", "Django", "Angular"],
        correctIndex: 1,
        subject: "AI&ML",
        difficulty: "Easy",
        explanation: "TensorFlow is a comprehensive open-source platform for machine learning."
    },
    {
        text: "What is Overfitting?",
        options: [
            "When a model performs poorly on training data.",
            "When a model learns noise in training data impacting new data.",
            "When a model is too simple.",
            "When a model has too few parameters."
        ],
        correctIndex: 1,
        subject: "AI&ML",
        difficulty: "Medium",
        explanation: "Overfitting happens when a model learns the detail and noise in the training data to the extent that it negatively impacts performance on new data."
    }
];

const seedDB = async () => {
    try {
        // WE CANNOT CONNECT TO IN-MEMORY DB LIKE THIS FROM A SEPARATE PROCESS EASILY
        // UNLESS WE KNOW THE RANDOM PORT.
        // HENCE, BETTER TO ADD THIS TO server.js ON STARTUP IF EMPTY.
        // BUT FOR NOW, I WILL CREATE A ROUTE TO TRIGGER IT.
        console.log("This script is intended to be used directly or better yet via an API endpoint.");
    } catch (err) {
        console.error(err);
    }
};

module.exports = { seedQuestions };
