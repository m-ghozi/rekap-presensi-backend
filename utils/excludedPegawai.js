// utils/excludedPegawai.js
/**
 * Akun dummy yang tidak boleh tampil di Jadwal & Dashboard.
 * 1) Pola prefix: "User untuk Instalasi Farmasi", "User untuk OK KB", dst.
 * 2) Nama spesifik (exact match) yang tidak ikut pola di atas.
 */
const EXCLUDED_NAME_PREFIX = 'user untuk';

// Tambahkan nama lain di sini kalau ada lagi yang tidak ikut pola "User untuk ..."
const EXCLUDED_EXACT_NAMES = ['x'];

const isExcludedPegawai = (nama) => {
    if (typeof nama !== 'string') return false;
    const normalized = nama.trim().toLowerCase();
    if (normalized.startsWith(EXCLUDED_NAME_PREFIX)) return true;
    return EXCLUDED_EXACT_NAMES.includes(normalized);
};

module.exports = { isExcludedPegawai };