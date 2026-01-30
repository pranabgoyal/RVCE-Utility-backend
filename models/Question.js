const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    correctIndex: {
        type: Number,
        required: true
    },
    subject: {
        type: String,
        required: true,
        enum: ['Common', 'CSE', 'ECE', 'ISE', 'ME', 'CV', 'EEE', 'AI&ML']
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium'
    },
    explanation: {
        type: String // Optional explanation for the answer
    }
});

module.exports = mongoose.model('Question', QuestionSchema);
