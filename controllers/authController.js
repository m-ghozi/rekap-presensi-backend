const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
        }

        // Ambil kredensial dari .env
        const validUsername = process.env.AUTH_USERNAME;
        const hashedPassword = process.env.AUTH_PASSWORD_HASH;

        if (!validUsername || !hashedPassword) {
            console.error('AUTH_USERNAME atau AUTH_PASSWORD_HASH belum diset di .env');
            return res.status(500).json({ success: false, message: 'Konfigurasi server tidak lengkap' });
        }

        // Cek username
        if (username !== validUsername) {
            return res.status(401).json({ success: false, message: 'Username atau password salah' });
        }

        // Verifikasi password dengan bcrypt
        const isPasswordValid = await bcrypt.compare(password, hashedPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Username atau password salah' });
        }

        // Buat JWT token
        const payload = { username };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '8h'
        });

        res.json({
            success: true,
            message: 'Login berhasil',
            token,
            expiresIn: process.env.JWT_EXPIRES_IN || '8h'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
};

module.exports = { login };