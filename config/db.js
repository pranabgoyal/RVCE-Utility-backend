const mongoose = require('mongoose');
let mongod = null;

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 2000 // Fail fast if local DB is down
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.log('Local MongoDB credentials failed or DB not running.');
        console.log('Attempting to start In-Memory Database for development...');

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
            console.error(memErr);
            process.exit(1);
        }
    }
};

module.exports = connectDB;
