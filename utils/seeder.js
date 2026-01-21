const fs = require('fs');
const path = require('path');
const Resource = require('../models/Resource');

const UPLOADS_DIR = path.join(__dirname, '../../frontend/public/uploads/1st_year');

// Helper to determine category based on keywords
const getCategory = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('paper') || lower.includes('qp') || lower.includes('cie') || lower.includes('see')) return 'Paper';
    if (lower.includes('manual') || lower.includes('lab')) return 'Lab Manual';
    if (lower.includes('textbook') || lower.includes('handbook')) return 'Reference Book';
    if (lower.includes('assignment')) return 'Assignment';
    if (lower.includes('project')) return 'Project';
    return 'Notes'; // Default
};

const seedResources = async () => {
    try {


        console.log('Scanning for resources...');
        if (!fs.existsSync(UPLOADS_DIR)) {
            console.log(`Uploads dir not found: ${UPLOADS_DIR}`);
            return;
        }

        const bulkOps = [];

        // Level 1: Semester Folders (e.g., "1st_sem", "Emerging Technology Courses")
        const semesterFolders = fs.readdirSync(UPLOADS_DIR).filter(f => fs.statSync(path.join(UPLOADS_DIR, f)).isDirectory());

        semesterFolders.forEach(semFolder => {
            const semPath = path.join(UPLOADS_DIR, semFolder);

            // Map folder name to friendly Semester name
            let semesterName = semFolder.replace(/_/g, ' ');
            if (semFolder === '1st_sem') semesterName = 'Semester 1';
            if (semFolder === '2nd sem') semesterName = 'Semester 2';

            // Level 2: Subject Folders (e.g., "Mathematics", "Chemistry")
            const subjectFolders = fs.readdirSync(semPath).filter(f => fs.statSync(path.join(semPath, f)).isDirectory());

            subjectFolders.forEach(subFolder => {
                const subPath = path.join(semPath, subFolder);
                const files = fs.readdirSync(subPath).filter(f => !fs.statSync(path.join(subPath, f)).isDirectory());

                files.forEach(file => {
                    const filePath = path.join(subPath, file);
                    // Skip hidden files or READMEs
                    if (file.startsWith('.') || file.toLowerCase() === 'readme.md') return;

                    // Encode each path segment to handle spaces/special chars safely
                    const relativePathSegments = path.relative(path.join(__dirname, '../../frontend/public'), filePath).split(path.sep);
                    const urlPath = relativePathSegments.map(segment => encodeURIComponent(segment)).join('/');

                    // Check if exists logic moved to bulkWrite
                    bulkOps.push({
                        updateOne: {
                            filter: { fileUrl: `/${urlPath}` },
                            update: {
                                $setOnInsert: {
                                    title: path.basename(file, path.extname(file)).replace(/_/g, ' '),
                                    description: `Resource for ${subFolder}`,
                                    category: getCategory(file),
                                    branch: 'Common',
                                    year: 1,
                                    semester: semesterName,
                                    subject: subFolder,
                                    fileUrl: `/${urlPath}`,
                                    downloads: 0
                                }
                            },
                            upsert: true
                        }
                    });
                });
            });
        });

        if (bulkOps.length > 0) {
            const result = await Resource.bulkWrite(bulkOps);
            console.log(`Seeding complete. New: ${result.upsertedCount}, Matched: ${result.matchedCount}`);
        } else {
            console.log('No resources found to seed.');
        }

    } catch (err) {
        console.error('Seeding failed:', err);
    }
};

module.exports = seedResources;
