const laporanModel = require('../models/laporanModel');
const jadwalModel = require('../models/jadwalModel');

const getRekapPenilaian = async (req, res) => {
    try {
        // 1. Tangkap parameter dari request
        const { startDate, endDate, name } = req.query;
        
        // 5. Eksekusi query ke database memanggil dari model
        const rows = await laporanModel.getRekapPenilaianData(startDate, endDate, name);
        
        // 6. Ambil target bulan dan tahun (default ke bulan ini jika tidak ada startDate)
        let targetMonth = new Date().getMonth() + 1;
        let targetYear = new Date().getFullYear();
        if (startDate) {
            const dateObj = new Date(startDate);
            targetMonth = dateObj.getMonth() + 1;
            targetYear = dateObj.getFullYear();
        }

        // 7. Ambil data jadwal pegawai untuk bulan bersangkutan
        const jadwalRows = await jadwalModel.getJadwalPegawaiData(targetMonth, targetYear, name);
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

        // 8. Petakan total hari kerja aktual masing-masing pegawai berdasarkan jadwal
        const jadwalMap = {};
        jadwalRows.forEach(j => {
            let totalJadwalKerja = 0;
            // Cek setiap tanggal pada bulan tersebut
            for (let i = 1; i <= daysInMonth; i++) {
                const shiftCode = j[`h${i}`];
                // Hitung sebagai hari kerja jika bukan null, spasi kosong, 'L', atau 'OFF'
                if (shiftCode && shiftCode.trim() !== '' && shiftCode.trim().toUpperCase() !== 'L' && shiftCode.trim().toUpperCase() !== 'OFF') {
                    totalJadwalKerja++;
                }
            }
            jadwalMap[j.nama_pegawai] = totalJadwalKerja;
        });
        
        const resultData = rows.map(item => {
            // Ambil jumlah hari kerja pegawai dari jadwal, jika tidak ditemukan default ke 20
            const HARI_KERJA_EFEKTIF = jadwalMap[item.nama_pegawai] || 20;

            const persentase = item.total_hadir > 0 
                ? Math.round((item.total_hadir / HARI_KERJA_EFEKTIF) * 100) 
                : 0;

            // Hitung tidak hadir riil dari selisih jadwal masuk dikurangi total hadir
            const hitung_tidak_hadir = Math.max(0, HARI_KERJA_EFEKTIF - item.total_hadir);

            return {
                ...item,
                tidak_hadir: hitung_tidak_hadir, // Meng-override nilai dari query DB yang 0
                hari_kerja_efektif: HARI_KERJA_EFEKTIF,
                persentase_kehadiran: `${persentase}%`,
                // Anda bisa menambahkan logika penilaian lain di sini
                // contoh: status_performa: persentase >= 95 ? 'Baik' : 'Evaluasi'
            };
        });

        // 9. Kirim Response JSON
        res.json({ success: true, data: resultData });
        
    } catch (error) {
        console.error("Error getRekapPenilaian:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getRekapPenilaian
};