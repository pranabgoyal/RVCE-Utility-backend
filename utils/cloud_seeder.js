const path = require('path');
const dotenv = require('dotenv');

// Load env vars BEFORE requiring other modules
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { uploadToSupabase } = require('./supabase');
const fs = require('fs');
const Resource = require('../models/Resource');

const UPLOADS_DIR = path.join(__dirname, '../../frontend/public/uploads/1st_year');

const getCategory = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('paper') || lower.includes('qp') || lower.includes('cie') || lower.includes('see')) return 'Paper';
    if (lower.includes('manual') || lower.includes('lab')) return 'Lab Manual';
    if (lower.includes('textbook') || lower.includes('handbook')) return 'Reference Book';
    if (lower.includes('assignment')) return 'Assignment';
    if (lower.includes('project')) return 'Project';
    return 'Notes';
};

// Recursive function to get all files in a directory
const getFilesRecursively = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath));
        } else {
            // Skip hidden files or READMEs
            if (!file.startsWith('.') && file.toLowerCase() !== 'readme.md') {
                results.push(filePath);
            }
        }
    });
    return results;
};

const seedCloudResources = async () => {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        if (!fs.existsSync(UPLOADS_DIR)) {
            console.error(`Source directory not found: ${UPLOADS_DIR}`);
            process.exit(1);
        }

        // We assume 1st level is "Semester" or "Category"
        const semesterFolders = fs.readdirSync(UPLOADS_DIR).filter(f => fs.statSync(path.join(UPLOADS_DIR, f)).isDirectory());

        for (const semFolder of semesterFolders) {
            const semPath = path.join(UPLOADS_DIR, semFolder);
            let semesterName = semFolder.replace(/_/g, ' ');
            if (semFolder === '1st_sem') semesterName = 'Semester 1';
            if (semFolder === '2nd sem') semesterName = 'Semester 2';

            // Treat top-level folders like "Programming Language Course" as 'Semester 1' or generic if unclear
            // For simplicity, we just keep the folder name if it's not 1st/2nd sem

            const subjectFolders = fs.readdirSync(semPath).filter(f => fs.statSync(path.join(semPath, f)).isDirectory());

            for (const subFolder of subjectFolders) {
                const subPath = path.join(semPath, subFolder);

                // RECURSIVE SCAN: Find all files inside this subject, even in subfolders
                const allFiles = getFilesRecursively(subPath);

                console.log(`Processing ${allFiles.length} files in ${semesterName} > ${subFolder}...`);

                for (const filePath of allFiles) {
                    const file = path.basename(filePath);
                    const title = path.basename(file, path.extname(file)).replace(/_/g, ' ');

                    console.log(`Uploading to Supabase: ${file}`);

                    // We need to pass the "subject" (subFolder) as the Cloud folder
                    const folderForCloud = subFolder;

                    const cloudUrl = await uploadToSupabase(filePath, folderForCloud, file);

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
                        console.log(`Saved to DB: ${cloudUrl}`);
                    }
                }
            }
        }

        console.log('All resources migrated to Supabase!');
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

seedCloudResources();
