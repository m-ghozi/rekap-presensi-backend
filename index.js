require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const presensiRoutes = require('./routes/presensiRoutes');

const app = express();
const PORT = process.env.PORT;
const API_KEY = process.env.X_API_KEY;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet())
app.use(express.json());

const apiKeyMiddleware = (req, res, next) => {
    const userApiKey = req.header('X-API-KEY');
    if (userApiKey && userApiKey === API_KEY) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Unauthorized access' });
    }
};

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Routes
app.use('/api', limiter, apiKeyMiddleware, presensiRoutes);

// Cek koneksi server
app.listen(PORT, () => {
    console.log(`🚀 Server Backend "rekap-presensi" berjalan di http://localhost:${PORT}`);
});