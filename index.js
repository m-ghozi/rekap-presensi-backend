require('dotenv').config();
const express = require('express');
const cors = require('cors');
const presensiRoutes = require('./routes/presensiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', presensiRoutes);

// Cek koneksi server
app.listen(PORT, () => {
    console.log(`🚀 Server Backend "SikSayangIbu" berjalan di http://localhost:${PORT}`);
});