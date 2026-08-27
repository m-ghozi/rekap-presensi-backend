const db = require('../config/database');

const getRekapPresensiData = async (startDate, endDate, name) => {
    let query = `
        SELECT pegawai.nama AS nama_pegawai, 
        CONCAT(rekap_presensi.shift, ' (', TIME_FORMAT(jam_masuk.jam_masuk, '%H:%i'), ' - ', TIME_FORMAT(jam_masuk.jam_pulang, '%H:%i'), ')') AS shift, 
        rekap_presensi.jam_datang, rekap_presensi.jam_pulang, rekap_presensi.status, 
        rekap_presensi.keterlambatan, rekap_presensi.durasi, rekap_presensi.keterangan 
        FROM rekap_presensi
        JOIN pegawai ON rekap_presensi.id = pegawai.id
        LEFT JOIN jam_masuk ON rekap_presensi.shift = jam_masuk.shift
        WHERE 1=1
    `;
    const queryParams = [];

    if (startDate && endDate) {
        query += ` AND DATE(rekap_presensi.jam_datang) BETWEEN ? AND ?`;
        queryParams.push(startDate, endDate);
    } else if (startDate) {
        query += ` AND DATE(rekap_presensi.jam_datang) >= ?`;
        queryParams.push(startDate);
    } else if (endDate) {
        query += ` AND DATE(rekap_presensi.jam_datang) <= ?`;
        queryParams.push(endDate);
    }

    if (name) {
        query += ` AND pegawai.nama LIKE ?`;
        queryParams.push(`%${name}%`);
    }

    query += ` ORDER BY rekap_presensi.jam_datang DESC, rekap_presensi.jam_pulang ASC, rekap_presensi.keterangan ASC LIMIT 1000`;
    
    const [rows] = await db.query(query, queryParams);
    return rows;
};

/**
 * Ambil semua pasangan (pegawai, tanggal) yang punya jadwal kerja
 * pada rentang tanggal yang diberikan, beserta info shift-nya.
 * Digunakan untuk mendeteksi ketidakhadiran.
 */
const getPegawaiDenganJadwal = async (startDate, endDate, name) => {
    // Tentukan bulan & tahun yang tercakup dalam rentang tanggal
    const start = startDate ? new Date(startDate) : new Date();
    const end   = endDate   ? new Date(endDate)   : new Date();

    // Kumpulkan semua kombinasi bulan-tahun dalam rentang
    const bulanTahunList = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cur <= endMonth) {
        bulanTahunList.push({ bulan: cur.getMonth() + 1, tahun: cur.getFullYear() });
        cur.setMonth(cur.getMonth() + 1);
    }

    if (bulanTahunList.length === 0) return [];

    // Buat kondisi WHERE untuk setiap bulan-tahun
    const monthConditions = bulanTahunList
        .map(() => `(jp.bulan = ? AND jp.tahun = ?)`)
        .join(' OR ');

    const monthParams = bulanTahunList.flatMap(bt => [bt.bulan, bt.tahun]);

    let query = `
        SELECT
            p.nama        AS nama_pegawai,
            jp.bulan,
            jp.tahun,
            jp.h1,  jp.h2,  jp.h3,  jp.h4,  jp.h5,  jp.h6,  jp.h7,
            jp.h8,  jp.h9,  jp.h10, jp.h11, jp.h12, jp.h13, jp.h14,
            jp.h15, jp.h16, jp.h17, jp.h18, jp.h19, jp.h20, jp.h21,
            jp.h22, jp.h23, jp.h24, jp.h25, jp.h26, jp.h27, jp.h28,
            jp.h29, jp.h30, jp.h31
        FROM jadwal_pegawai jp
        JOIN pegawai p ON jp.id = p.id
        WHERE (${monthConditions})
    `;

    const params = [...monthParams];

    if (name) {
        query += ` AND p.nama LIKE ?`;
        params.push(`%${name}%`);
    }

    const [rows] = await db.query(query, params);

    // Expand: satu baris per (pegawai, tanggal) yang punya shift kerja aktif
    const results = [];
    const startTs = start.setHours(0, 0, 0, 0) && start;
    const endTs   = new Date(end); endTs.setHours(23, 59, 59, 999);

    // Re-create start (setHours mutates)
    const startBoundary = new Date(startDate || new Date());
    startBoundary.setHours(0, 0, 0, 0);
    const endBoundary = new Date(endDate || new Date());
    endBoundary.setHours(23, 59, 59, 999);

    for (const row of rows) {
        for (let d = 1; d <= 31; d++) {
            const shiftCode = row[`h${d}`];

            // Lewati jika tidak ada shift atau shift libur/off
            if (!shiftCode || shiftCode.trim() === '' ||
                shiftCode.trim().toUpperCase() === 'L' ||
                shiftCode.trim().toUpperCase() === 'OFF') {
                continue;
            }

            // Cek apakah tanggal ini valid untuk bulan tersebut
            const tgl = new Date(row.tahun, row.bulan - 1, d);
            if (tgl.getMonth() !== row.bulan - 1) continue; // tanggal tidak valid (mis. 31 Feb)

            // Cek apakah tanggal ada dalam rentang filter
            if (tgl < startBoundary || tgl > endBoundary) continue;

            results.push({
                nama_pegawai: row.nama_pegawai,
                tanggal: tgl,           // objek Date
                shift_kode: shiftCode.trim(),
            });
        }
    }

    return results;
};

const getRekapPresensiForExport = async (startDate, endDate, name) => {
    let query = `SELECT pegawai.nama AS nama_pegawai, 
                   CONCAT(rekap_presensi.shift, ' (', TIME_FORMAT(jam_masuk.jam_masuk, '%H:%i'), ' - ', TIME_FORMAT(jam_masuk.jam_pulang, '%H:%i'), ')') AS shift, 
                   rekap_presensi.jam_datang, rekap_presensi.jam_pulang, rekap_presensi.status, 
                   rekap_presensi.keterlambatan, rekap_presensi.durasi, rekap_presensi.keterangan FROM rekap_presensi
                   JOIN pegawai ON rekap_presensi.id = pegawai.id
                   LEFT JOIN jam_masuk ON rekap_presensi.shift = jam_masuk.shift
                   WHERE 1=1`;
    const queryParams = [];

    if (startDate && endDate) {
        query += ` AND DATE(rekap_presensi.jam_datang) BETWEEN ? AND ?`;
        queryParams.push(startDate, endDate);
    } else if (startDate) {
        query += ` AND DATE(rekap_presensi.jam_datang) >= ?`;
        queryParams.push(startDate);
    } else if (endDate) {
        query += ` AND DATE(rekap_presensi.jam_datang) <= ?`;
        queryParams.push(endDate);
    }

    if (name) {
        query += ` AND pegawai.nama LIKE ?`;
        queryParams.push(`%${name}%`);
    }

    query += ` ORDER BY rekap_presensi.jam_datang DESC LIMIT 1000`;

    const [rows] = await db.query(query, queryParams);
    return rows;
};

const getTableStatusData = async () => {
    const [rows] = await db.query("SHOW TABLE STATUS LIKE 'rekap_presensi'");
    return rows[0];
};

const getTodayPresensiData = async () => {
    const query = `
        SELECT pegawai.nama AS nama_pegawai, 
        CONCAT(rekap_presensi.shift, ' (', TIME_FORMAT(jam_masuk.jam_masuk, '%H:%i'), ' - ', TIME_FORMAT(jam_masuk.jam_pulang, '%H:%i'), ')') AS shift, 
        rekap_presensi.jam_datang, rekap_presensi.jam_pulang, rekap_presensi.status, 
        rekap_presensi.keterlambatan, rekap_presensi.durasi, rekap_presensi.keterangan 
        FROM rekap_presensi
        JOIN pegawai ON rekap_presensi.id = pegawai.id
        LEFT JOIN jam_masuk ON rekap_presensi.shift = jam_masuk.shift
        WHERE DATE(rekap_presensi.jam_datang) = CURDATE()
        ORDER BY rekap_presensi.jam_datang DESC
    `;
    
    const [rows] = await db.query(query);
    return rows;
};

const getPresensiHarianSemuaPegawaiData = async (targetDate, name) => {
    let query = `
        SELECT 
            p.nama AS nama_pegawai, 
            CASE 
                WHEN rp.shift IS NOT NULL AND jm.jam_masuk IS NOT NULL 
                    THEN CONCAT(rp.shift, ' (', TIME_FORMAT(jm.jam_masuk, '%H:%i'), ' - ', TIME_FORMAT(jm.jam_pulang, '%H:%i'), ')')
                WHEN rp.shift IS NOT NULL 
                    THEN rp.shift
                ELSE NULL 
            END AS shift, 
            rp.jam_datang, 
            rp.jam_pulang, 
            COALESCE(rp.status, 'Belum Hadir') AS status, 
            rp.keterlambatan, 
            rp.durasi, 
            rp.keterangan 
        FROM pegawai p
        LEFT JOIN rekap_presensi rp 
            ON p.id = rp.id AND DATE(rp.jam_datang) = ?
        LEFT JOIN jam_masuk jm 
            ON rp.shift = jm.shift
        WHERE p.stts_aktif = 'AKTIF'
    `;
    const params = [targetDate];

    if (name) {
        query += ` AND p.nama LIKE ?`;
        params.push(`%${name}%`);
    }

    query += ` ORDER BY p.nama ASC`;

    const [rows] = await db.query(query, params);
    return rows;
};

module.exports = {
    getRekapPresensiData,
    getPegawaiDenganJadwal,
    getRekapPresensiForExport,
    getTableStatusData,
    getTodayPresensiData,
    getPresensiHarianSemuaPegawaiData
};