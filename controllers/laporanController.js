const laporanModel = require('../models/laporanModel');

const getRekapPenilaian = async (req, res) => {
    try {
        // 1. Tangkap parameter dari request
        const { startDate, endDate, name } = req.query;
        
        // 5. Eksekusi query ke database memanggil dari model
        const rows = await laporanModel.getRekapPenilaianData(startDate, endDate, name);
        
        // 6. Olah data (Hitung persentase kehadiran)
        const HARI_KERJA_EFEKTIF = 20; // Asumsi hari kerja standar sebulan
        
        const resultData = rows.map(item => {
            const persentase = item.total_hadir > 0 
                ? Math.round((item.total_hadir / HARI_KERJA_EFEKTIF) * 100) 
                : 0;

            return {
                ...item,
                persentase_kehadiran: `${persentase}%`,
                // Anda bisa menambahkan logika penilaian lain di sini
                // contoh: status_performa: persentase >= 95 ? 'Baik' : 'Evaluasi'
            };
        });

        // 7. Kirim Response JSON
        res.json({ success: true, data: resultData });
        
    } catch (error) {
        console.error("Error getRekapPenilaian:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getRekapPenilaian
};