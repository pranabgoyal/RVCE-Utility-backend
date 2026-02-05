const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const Resource = require('../models/Resource');
const auth = require('../middleware/auth'); // Assuming you have an auth middleware

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer Config (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Limit to 50MB
});

// @route   POST api/upload
// @desc    Upload a resource
// @access  Private
router.post('/', [auth, upload.single('file')], async (req, res) => {
    try {
        const { title, description, subject, year, branch, semester, category } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        // 1. Upload to Supabase
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${branch}/${year}/${subject}/${fileName}`;

        const { data, error } = await supabase
            .storage
            .from('resources') // Ensure this bucket exists in Supabase
            .upload(filePath, file.buffer, {
                contentType: file.mimetype
            });

        if (error) {
            console.error('Supabase Upload Error:', error);
            return res.status(500).json({ msg: 'Error uploading file to storage' });
        }

        // 2. Get Public URL
        const { data: urlData } = supabase
            .storage
            .from('resources')
            .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // 3. Save Metadata to MongoDB
        const newResource = new Resource({
            title,
            description,
            subject,
            year,
            branch,
            semester,
            category,
            fileUrl: publicUrl,
            fileType: fileExt,
            uploadedBy: req.user.id // Provided by auth middleware
        });

        const resource = await newResource.save();

        res.json(resource);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/upload/user-resources
// @desc    Get all user uploaded resources
// @access  Public (or Private?) - Let's make it public for listing
router.get('/', async (req, res) => {
    try {
        const resources = await Resource.find().sort({ createdAt: -1 });
        res.json(resources);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/upload/:id
// @desc    Delete a resource
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ msg: 'Resource not found' });
        }

        // Check user
        if (resource.uploadedBy.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Delete from Supabase
        // Extract path from publicUrl
        // URL format: .../resources/public/branch/year/subject/filename
        // Storage path: branch/year/subject/filename

        try {
            const urlParts = resource.fileUrl.split('/resources/public/'); // Adjust based on your actual URL structure if needed
            if (urlParts.length > 1) {
                const storagePath = urlParts[1];
                const { error } = await supabase
                    .storage
                    .from('resources')
                    .remove([storagePath]);

                if (error) {
                    console.error('Supabase Delete Error:', error);
                    // Continue to delete from DB even if remote file fails? 
                    // Usually yes, or user can't remove broken links.
                }
            }
        } catch (err) {
            console.error('Error parsing URL for deletion:', err);
        }

        await resource.deleteOne();

        res.json({ msg: 'Resource removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Resource not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
