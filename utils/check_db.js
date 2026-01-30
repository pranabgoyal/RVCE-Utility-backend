const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Resource = require('../models/Resource');

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');

        const count = await Resource.countDocuments();
        console.log(`Total Resources in DB: ${count}`);

        if (count > 0) {
            const sample = await Resource.findOne();
            console.log('Sample Resource:', sample);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkDB();
