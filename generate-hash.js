/**
 * Script untuk generate bcrypt hash dari password Anda.
 * Jalankan SEKALI: node generate-hash.js
 * Lalu copy hasilnya ke AUTH_PASSWORD_HASH di file .env
 *
 * Pastikan bcryptjs sudah terinstall: npm install bcryptjs
 */

const bcrypt = require('bcryptjs');

// ====================================================
// GANTI password di bawah ini dengan password Anda
const PASSWORD_PLAIN = 'passwordanda';
// ====================================================

(async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(PASSWORD_PLAIN, salt);
    console.log('\n✅ Hash berhasil dibuat!');
    console.log('Salin baris berikut ke file .env Anda:\n');
    console.log(`AUTH_PASSWORD_HASH=${hash}`);
    console.log('\n⚠️  Hapus file ini setelah selesai digunakan.\n');
})();