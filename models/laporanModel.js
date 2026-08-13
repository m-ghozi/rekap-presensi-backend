const db = require('../config/database');

const getRekapPenilaianData = async (startDate, endDate, name) => {
    let query = `
        SELECT 
            p.nama AS nama_pegawai,
            -- Hitung total hari hadir (status selain 'Tidak Hadir')
            SUM(CASE WHEN rp.status IN ('Tepat Waktu', 'Tepat Waktu & PSW', 'Terlambat Toleransi', 'Terlambat I', 'Terlambat II', 'Terlambat II & PSW') THEN 1 ELSE 0 END) AS total_hadir,
            
            -- Breakdown status absensi
            SUM(CASE WHEN rp.status IN ('Tepat Waktu', 'Tepat Waktu & PSW', 'Terlambat Toleransi') THEN 1 ELSE 0 END) AS tepat_waktu,
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

/**
 * Query rekap bulanan: agregasi per pegawai, sudah include total_keterlambatan.
 * Parameter bulan & tahun wajib.
 */
const getRekapBulananData = async (bulan, tahun, name) => {
    // Hitung tanggal awal & akhir bulan
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
    // LAST_DAY di MySQL, tapi kita hitung di JS untuk fleksibilitas
    const lastDay = new Date(tahun, bulan, 0).getDate();
    const endDate = `${tahun}-${String(bulan).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let query = `
        SELECT
            p.id,
            p.nama                                                              AS nama_pegawai,

            -- Jumlah hari hadir (semua status kecuali Tidak Hadir)
            SUM(CASE WHEN rp.status IN ('Tepat Waktu', 'Tepat Waktu & PSW', 'Terlambat Toleransi', 'Terlambat I', 'Terlambat II', 'Terlambat II & PSW')
                THEN 1 ELSE 0 END)                                              AS jumlah_hadir,

            -- Tepat waktu (HANYA status "Tepat Waktu" atau "Tepat Waktu & PSW")
            SUM(CASE WHEN rp.status IN ('Tepat Waktu', 'Tepat Waktu & PSW')
                THEN 1 ELSE 0 END)                                              AS tepat_waktu,

            -- Total hari terlambat (I + II, termasuk II & PSW)
            SUM(CASE WHEN rp.status IN ('Terlambat I', 'Terlambat II', 'Terlambat II & PSW')
                THEN 1 ELSE 0 END)                                              AS terlambat,

            -- Akumulasi durasi keterlambatan dalam format HH:mm:ss
            SEC_TO_TIME(
                SUM(
                    CASE WHEN rp.keterlambatan IS NOT NULL AND rp.keterlambatan != '00:00:00'
                        THEN TIME_TO_SEC(rp.keterlambatan)
                        ELSE 0
                    END
                )
            )                                                                   AS total_keterlambatan,

            -- Akumulasi total jam kerja
            SEC_TO_TIME(SUM(TIME_TO_SEC(rp.durasi)))                            AS total_jam_kerja

        FROM rekap_presensi rp
        JOIN pegawai p ON rp.id = p.id
        WHERE DATE(rp.jam_datang) BETWEEN ? AND ?
    `;

    const queryParams = [startDate, endDate];

    if (name) {
        query += ` AND p.nama LIKE ?`;
        queryParams.push(`%${name}%`);
    }

    query += ` GROUP BY p.id, p.nama ORDER BY p.nama ASC`;

    const [rows] = await db.query(query, queryParams);
    return rows;
};

module.exports = {
    getRekapPenilaianData,
    getRekapBulananData,
};
