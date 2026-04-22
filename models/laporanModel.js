const db = require('../config/database');

const getRekapPenilaianData = async (startDate, endDate, name) => {
    let query = `
        SELECT 
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

    query += ` GROUP BY p.id, p.nama ORDER BY p.nama ASC`;
    
    const [rows] = await db.query(query, queryParams);
    return rows;
};

module.exports = {
    getRekapPenilaianData
};
