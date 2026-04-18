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

module.exports = {
    getRekapPresensiData,
    getRekapPresensiForExport,
    getTableStatusData,
    getTodayPresensiData
};
