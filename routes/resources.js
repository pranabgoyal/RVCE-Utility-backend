const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');

// get resources (with filters)
// get resources (with filters)
router.get('/', async (req, res) => {
    try {
        const { branch, year, category } = req.query;
        let query = {};

        // Fix: If branch is 'All', do not apply filter
        if (branch && branch !== 'All') query.branch = branch;
        if (year) query.year = year;
        if (category) query.category = category;

        console.log('GET /resources Query:', query);

        const resources = await Resource.find(query).sort({ createdAt: -1 });

        console.log(`Found ${resources.length} resources`);
        res.json(resources);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const multer = require('multer');
const { storage } = require('../config/cloudinary');

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Accept images and pdfs
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and Image files are allowed!'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create Resource with File Upload
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { title, description, category, branch, year } = req.body;

        let fileUrl = '';
        if (req.file) {
            // Cloudinary returns the URL in `path` or `secure_url`
            fileUrl = req.file.path || req.file.secure_url;
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
