const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Resource = require('../models/Resource');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const UPLOADS_DIR = path.join(__dirname, '../../frontend/public/uploads/1st_year');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper to determine category based on keywords
const getCategory = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('paper') || lower.includes('qp') || lower.includes('cie') || lower.includes('see')) return 'Paper';
    if (lower.includes('manual') || lower.includes('lab')) return 'Lab Manual';
    if (lower.includes('textbook') || lower.includes('handbook')) return 'Reference Book';
    if (lower.includes('assignment')) return 'Assignment';
    if (lower.includes('project')) return 'Project';
    return 'Notes';
};

const uploadToCloudinary = async (filePath, folderName) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: `engineering-resources/${folderName}`,
            resource_type: 'raw', // CHANGED: 'raw' is safer for PDFs/Docs (avoids explicit image conversion)
            use_filename: true,
            unique_filename: false,
            overwrite: true // CHANGED: Force overwrite of bad files on Cloud
        });
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        return null;
    }
};

const seedCloudResources = async () => {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Scanning local files...');
        if (!fs.existsSync(UPLOADS_DIR)) {
            console.error(`Source directory not found: ${UPLOADS_DIR}`);
            process.exit(1);
        }

        const semesterFolders = fs.readdirSync(UPLOADS_DIR).filter(f => fs.statSync(path.join(UPLOADS_DIR, f)).isDirectory());

        for (const semFolder of semesterFolders) {
            const semPath = path.join(UPLOADS_DIR, semFolder);
            let semesterName = semFolder.replace(/_/g, ' ');
            if (semFolder === '1st_sem') semesterName = 'Semester 1';
            if (semFolder === '2nd sem') semesterName = 'Semester 2';

            const subjectFolders = fs.readdirSync(semPath).filter(f => fs.statSync(path.join(semPath, f)).isDirectory());

            for (const subFolder of subjectFolders) {
                const subPath = path.join(semPath, subFolder);
                const files = fs.readdirSync(subPath).filter(f => !fs.statSync(path.join(subPath, f)).isDirectory());

                console.log(`Processing ${files.length} files in ${semesterName} > ${subFolder}...`);

                for (const file of files) {
                    if (file.startsWith('.') || file.toLowerCase() === 'readme.md') continue;

                    const filePath = path.join(subPath, file);
                    const title = path.basename(file, path.extname(file)).replace(/_/g, ' ');

                    // RE-SEEDING LOGIC:
                    // We REMOVED the "skip if existing" check to force repair of broken links.
                    /*
                    const existing = await Resource.findOne({
                        title: title,
                        subject: subFolder,
                        fileUrl: { $regex: 'cloudinary' }
                    });

                    if (existing) {
                        console.log(`Skipping (Already in DB): ${file}`);
                        continue;
                    }
                    */

                    console.log(`Uploading (Raw Mode): ${file}`);
                    const cloudUrl = await uploadToCloudinary(filePath, subFolder);

                    if (cloudUrl) {
                        await Resource.updateOne(
                            { title: title, subject: subFolder },
                            {
                                $set: {
                                    title,
                                    description: `Resource for ${subFolder}`,
                                    category: getCategory(file),
                                    branch: 'Common',
                                    year: 1,
                                    semester: semesterName,
                                    subject: subFolder,
                                    fileUrl: cloudUrl,
                                    downloads: 0
                                }
                            },
                            { upsert: true }
                        );
                        console.log(`Repaired in DB: ${file}`);
                    }
                }
            }
        }

        console.log('All resources migrated to Cloud!');
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

seedCloudResources();
