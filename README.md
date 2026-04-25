# Rekap Presensi Backend

API Backend untuk Sistem Rekapitulasi Presensi dan Penjadwalan. Proyek ini berfungsi sebagai tulang punggung untuk mengelola data kehadiran karyawan, sinkronisasi data dari perangkat GPS/mesin absensi, penyajian jadwal, serta pembuatan laporan presensi yang dapat diekspor ke dalam format Excel.

## 🚀 Fitur Utama

- **Otentikasi & Keamanan:** Login aman berbasis JWT (JSON Web Tokens), perlindungan terhadap serangan brute force dengan rate limiting, serta pengamanan headers HTTP menggunakan Helmet.
- **Manajemen Presensi (Kehadiran):** Melihat status kehadiran terkini, riwayat kehadiran harian, serta filter data presensi berdasarkan rentang tanggal dan nama karyawan. Sinkronisasi jam masuk dan jam pulang secara otomatis.
- **Manajemen Jadwal:** Melihat jadwal karyawan per bulan/tahun, serta kemampuan untuk mengunduh (export) data jadwal langsung ke dalam format Excel (.xlsx).
- **Laporan & Penilaian:** Modul laporan untuk mendapatkan rekapitulasi penilaian kehadiran berdasarkan parameter waktu tertentu.
- **Export Excel:** Menggunakan library `exceljs` untuk melakukan generate file laporan berformat Excel secara dinamis.

## 🛠️ Tech Stack

- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express.js](https://expressjs.com/) v5
- **Database:** MySQL (via `mysql2`)
- **Security:** `bcryptjs`, `jsonwebtoken`, `helmet`, `cors`, `express-rate-limit`
- **Utility:** `dotenv`, `exceljs` (untuk export Excel), `express-validator`

## 📋 Prasyarat

Pastikan Anda telah menginstal perangkat lunak berikut sebelum menjalankan aplikasi:
- **Node.js** (versi 16.x atau lebih baru disarankan)
- **MySQL** Server (XAMPP / native) berjalan di lokal atau remote server.

## ⚙️ Variabel Lingkungan (Environment Variables)

Aplikasi ini membutuhkan file `.env` di root direktori untuk konfigurasi. Buat file `.env` (bisa mengacu pada variabel di bawah ini):

```env
# Server Config
PORT=5000

# Database Config
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=nama_database_presensi

# JWT Secret & Auth Config
JWT_SECRET=super_secret_key_anda_disini
JWT_EXPIRES_IN=8h
AUTH_USERNAME=admin_username_anda
AUTH_PASSWORD_HASH=hash_bcrypt_dari_password_anda
```

## 💻 Instalasi dan Menjalankan Server

1. **Clone repositori** (jika belum):
   ```bash
   git clone https://github.com/m-ghozi/rekap-presensi-backend.git
   cd rekap-presensi-backend
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan aplikasi (Mode Development/Production):**
   ```bash
   npm start
   ```
   *Atau gunakan `node index.js` secara langsung.*
   
Server akan berjalan secara default di `http://localhost:5000` (atau port yang Anda tentukan di file `.env`).

## 🗺️ Struktur API Route Utama

Sebagian besar API dilindungi (Protected) dan membutuhkan Header Authorization: `Bearer <token>`.

- **Auth**
  - `POST /api/auth/login` - Login pengguna (Public)
  
- **Presensi**
  - `GET /api/presensi/status` - Melihat status presensi
  - `GET /api/presensi/today` - Melihat data presensi hari ini
  - `GET /api/presensi` - Melihat semua data presensi (mendukung query parameter `startDate`, `endDate`, `name`)

- **Jadwal**
  - `GET /api/jadwal` - Menampilkan jadwal (query `bulan`, `tahun`)
  - `GET /api/jadwal/download` - Mengunduh laporan jadwal ke dalam format Excel

- **Laporan**
  - `GET /api/laporan/penilaian` - Laporan penilaian kehadiran

*Catatan: Konfigurasi Insomnia/Postman tersedia dalam file `rekap-presensi.yaml`.*

## 🔒 Security Middleware
Aplikasi dilengkapi perlindungan dasar:
- **CORS:** Diizinkan hanya dari Origin tertentu (default `http://localhost:5173`).
- **Rate Limiter:** 
  - API umum: Maksimal 100 request / 15 menit per IP.
  - Endpoint Login: Maksimal 10 percobaan gagal / 15 menit per IP.
- **Helmet:** Mengatur berbagai HTTP headers untuk keamanan aplikasi Express.

## 👤 Author
**M. Ghozi Syah Putra**
