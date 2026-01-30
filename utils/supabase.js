const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Allow late binding of process.env by checking inside the function or requiring config first
// But safer to just expect env to be loaded by server.js

const getSupabaseClient = () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        throw new Error('Missing Supabase credentials in .env');
    }
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
};

const BUCKET_NAME = 'resources';

const uploadToSupabase = async (fileInput, folderName, originalFilename) => {
    try {
        const supabase = getSupabaseClient();

        let fileBuffer;
        if (Buffer.isBuffer(fileInput)) {
            fileBuffer = fileInput;
        } else {
            // Assume it's a file path string
            fileBuffer = fs.readFileSync(fileInput);
        }

        // Sanitize filename
        const safeFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${folderName}/${safeFilename}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, fileBuffer, {
                contentType: 'application/pdf', // Or auto-detect
                upsert: true
            });

        if (error) {
            console.error('Supabase Upload Error:', error.message);
            return null;
        }

        const { data: publicData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        return publicData.publicUrl;

    } catch (err) {
        console.error('File Read/Upload Error:', err);
        return null;
    }
};

module.exports = { uploadToSupabase };
