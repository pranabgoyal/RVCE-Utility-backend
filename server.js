const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet()); // Secure HTTP headers
app.use(mongoSanitize()); // Prevent NoSQL Injection

// Rate Limiting (100 requests per 15 minutes)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware
app.use(cors({
    origin: '*', // Allow all origins (or specify your Vercel URL)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json({ limit: '10kb' })); // Limit body size

// Database Connection
const connectDB = require('./config/db');

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/github', require('./routes/github'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/upload', require('./routes/upload')); // New Upload Route

const path = require('path');
// Serve Uploads Static Folder (Point to Frontend Public folder for local dev)
app.use('/uploads', (req, res, next) => {
    // console.log(`📂 Request for static file: ${req.url}`);
    next();
}, express.static(path.join(__dirname, '../frontend/public/uploads')));

// Start Server
const startServer = async () => {
    try {
        await connectDB();

        // Database seeding removed (Legacy Quiz System replaced by AI)

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`GEMINI_API_KEY Status: ${process.env.GEMINI_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
