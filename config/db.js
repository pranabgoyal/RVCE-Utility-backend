const mongoose = require('mongoose');
let mongod = null;

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 2000 // Fail fast if local DB is down
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);

        // In production, we must fail if the DB isn't connected. 
        // We don't want to use an in-memory DB that loses data.
        if (process.env.NODE_ENV === 'production') {
            console.error('Fatal: Could not connect to MongoDB Atlas. Check your connection string and IP Whitelist.');
            process.exit(1);
        }

        console.log('Attempting to start In-Memory Database for local development...');

        try {
            // Lazy load to avoid requiring it in production if not needed
            const { MongoMemoryServer } = require('mongodb-memory-server');
            mongod = await MongoMemoryServer.create();
            const uri = mongod.getUri();

            console.log(`In-Memory MongoDB started at: ${uri}`);

            const conn = await mongoose.connect(uri);
            console.log(`MongoDB Connected (In-Memory): ${conn.connection.host}`);
        } catch (memErr) {
            console.error('Fatal: Could not connect to any database.');
            console.error('Ensured mongodb-memory-server is installed for dev?');
            process.exit(1);
        }
    }
};

module.exports = connectDB;
