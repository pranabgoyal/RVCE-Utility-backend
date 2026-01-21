const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');

// get resources (with filters)
router.get('/', async (req, res) => {
    try {
        const { branch, year, category } = req.query;
        let query = {};

        if (branch) query.branch = branch;
        if (year) query.year = year;
        if (category) query.category = category;

        const resources = await Resource.find(query).sort({ createdAt: -1 });
        res.json(resources);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Unique filename: fieldname-timestamp.extension
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// File Filter (Optional: specific types)
const fileFilter = (req, file, cb) => {
    // Accept images and pdfs
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and Image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create Resource with File Upload
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { title, description, category, branch, year } = req.body;

        let fileUrl = '';
        if (req.file) {
            // Construct accessible URL
            // Assuming server runs on same host/port. client needs to prepend base URL.
            // Or store full URL if preferred. Storing relative path is safer.
            fileUrl = `/uploads/${req.file.filename}`;
        }

        const newResource = new Resource({
            title,
            description,
            category,
            branch,
            year,
            fileUrl,
            // createdBy: req.user.id // Middleware needed to extract user to be added later
        });

        const resource = await newResource.save();
        res.json(resource);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: ' + err.message);
    }
});

module.exports = router;
