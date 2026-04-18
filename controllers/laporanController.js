const db = require('../config/database');

const getRekapPenilaian = async (req, res) => {
    try {
        // 1. Tangkap parameter dari request
        const { startDate, endDate, name } = req.query;
        
        // 2. Siapkan Query SQL
        let query = `
            SELECT 
                p.id AS nik,
                p.nama AS nama_pegawai,
                -- Hitung total hari hadir (status selain 'Tidak Hadir')
                SUM(CASE WHEN rp.status IN ('Tepat Waktu', 'Terlambat I', 'Terlambat II') THEN 1 ELSE 0 END) AS total_hadir,
                
                -- Breakdown status absensi
                SUM(CASE WHEN rp.status = 'Tepat Waktu' THEN 1 ELSE 0 END) AS tepat_waktu,
                SUM(CASE WHEN rp.status = 'Terlambat I' THEN 1 ELSE 0 END) AS terlambat_1,
                SUM(CASE WHEN rp.status = 'Terlambat II' THEN 1 ELSE 0 END) AS terlambat_2,
                SUM(CASE WHEN rp.status = 'Tidak Hadir' THEN 1 ELSE 0 END) AS tidak_hadir,
                
                -- Akumulasi durasi kerja (menjumlahkan waktu)
                SEC_TO_TIME(SUM(TIME_TO_SEC(rp.durasi))) AS total_jam_kerja
                
            FROM rekap_presensi rp
            JOIN pegawai p ON rp.id = p.id
            WHERE 1=1
        `;
        
        const queryParams = [];

        // 3. Tambahkan filter dinamis jika parameter dikirim oleh frontend
        if (startDate && endDate) {
            query += ` AND DATE(rp.jam_datang) BETWEEN ? AND ?`;
            queryParams.push(startDate, endDate);
        } else if (startDate) {
            query += ` AND DATE(rp.jam_datang) >= ?`;
            queryParams.push(startDate);
        } else if (endDate) {
            query += ` AND DATE(rp.jam_datang) <= ?`;
            queryParams.push(endDate);
        }

        if (name) {
            query += ` AND p.nama LIKE ?`;
            queryParams.push(`%${name}%`);
        }

        // 4. Kelompokkan berdasarkan data pegawai
        query += ` GROUP BY p.id, p.nama ORDER BY p.nama ASC`;
        
        // 5. Eksekusi query ke database
        const [rows] = await db.query(query, queryParams);
        
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