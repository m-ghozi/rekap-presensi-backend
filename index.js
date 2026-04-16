require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const presensiRoutes = require('./routes/presensiRoutes');
const jadwalRoutes = require('./routes/jadwalRoutes');
const authRoutes = require('./routes/authRoutes');
const { authenticateToken } = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(express.json());

app.set('trust proxy', 0);

// Rate limiter umum untuk semua route API
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Rate limiter khusus login (lebih ketat, untuk cegah brute force)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Terlalu banyak percobaan login, coba lagi setelah 15 menit' }
});

// Routes
app.use('/api/auth', loginLimiter, authRoutes);                              // Login (publik)
app.use('/api/presensi', limiter, authenticateToken, presensiRoutes);        // Butuh JWT
app.use('/api/jadwal', limiter, authenticateToken, jadwalRoutes);            // Butuh JWT

// Cek koneksi server
app.listen(PORT, () => {
    console.log(`🚀 Server Backend "rekap-presensi" berjalan di http://localhost:${PORT}`);
});