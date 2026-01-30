const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const multer = require('multer');
const { uploadToSupabase } = require('../utils/supabase');

// get resources (with filters)
router.get('/', async (req, res) => {
    try {
        const { branch, year, category } = req.query;
        let query = {};

        // Fix: If branch is 'All', do not apply filter
        if (branch && branch !== 'All') query.branch = branch;
        if (year) query.year = year;
        if (category) query.category = category;

        const resources = await Resource.find(query).sort({ createdAt: -1 }).lean();
        res.json(resources);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Configure Multer for Memory Storage (Buffers)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and Image files are allowed!'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create Resource with File Upload (to Supabase)
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { title, description, category, branch, year } = req.body;

        let fileUrl = '';
        if (req.file) {
            // Upload buffer to Supabase
            // Use 'uploads' or specific folder based on category/branch if desired
            // For now, mirroring the seeder logic or just putting in a general folder
            const folderName = req.body.subject || 'general';
            fileUrl = await uploadToSupabase(req.file.buffer, folderName, req.file.originalname);

            if (!fileUrl) {
                return res.status(500).send('Failed to upload file to storage');
            }
        }

        const newResource = new Resource({
            title,
            description,
            category,
            branch,
            year,
            fileUrl,
            // createdBy: req.user.id // Middleware needed later
        });

        const resource = await newResource.save();
        res.json(resource);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: ' + err.message);
    }
});

module.exports = router;
