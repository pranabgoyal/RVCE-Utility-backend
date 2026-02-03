const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    subject: {
        type: String,
        required: true
    },
    year: {
        type: String, // '1', '2', '3', '4'
        required: true
    },
    branch: {
        type: String, // 'CSE', 'ECE', etc.
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: 'Notes'
    },
    fileUrl: {
        type: String, // Supabase Public URL
        required: true
    },
    fileType: {
        type: String // 'pdf', 'image', etc.
    },
    details: {
        type: Object // Extra metadata from Supabase if needed
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Resource', ResourceSchema);
