// utils/excludedPegawai.js
/**
 * Akun dummy & Dokter yang tidak boleh tampil di Presensi Harian, Jadwal, & Dashboard.
 * 1) Pola prefix: "User untuk Instalasi Farmasi", "User untuk OK KB", dst.
 * 2) Dokter: Nama berawalan "dr.", "Dr.", "dr ", dsb.
 * 3) Nama spesifik (exact match) yang tidak ikut pola di atas.
 */
const EXCLUDED_NAME_PREFIX = 'user untuk';

// Tambahkan nama lain di sini kalau ada lagi yang tidak ikut pola di atas
const EXCLUDED_EXACT_NAMES = ['x'];

const isDokter = (nama) => {
    if (typeof nama !== 'string') return false;
    const n = nama.trim();
    return /^dr\.?\s/i.test(n) || /^dr\.[a-z]/i.test(n) || /^Dr\./i.test(n);
};

const isExcludedPegawai = (nama) => {
    if (typeof nama !== 'string') return false;
    const normalized = nama.trim().toLowerCase();
    if (normalized.startsWith(EXCLUDED_NAME_PREFIX)) return true;
    if (EXCLUDED_EXACT_NAMES.includes(normalized)) return true;
    if (isDokter(nama)) return true;
    return false;
};

module.exports = { isExcludedPegawai, isDokter };