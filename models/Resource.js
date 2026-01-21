const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    category: {
        type: String,
        enum: ['Notes', 'Lab Manual', 'Paper', 'Project', 'Assignment', 'Reference Book'],
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    semester: {
        type: String, // e.g., "Semester 1"
        required: true
    },
    branch: {
        type: String,
        required: true // e.g., CSE, ECE, MECH, Common
    },
    year: {
        type: Number,
        required: true // 1, 2, 3, 4
    },
    fileUrl: {
        type: String,
        required: true
    },
    downloads: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Resource', ResourceSchema);
