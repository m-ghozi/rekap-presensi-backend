const db = require('../config/database');
const exportService = require('../services/exportService');

const getRekapPresensi = async (req, res) => {
    try {
        const { startDate, endDate, name } = req.query;
        
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
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getTableStatus = async (req, res) => {
    try {
        const [rows] = await db.query("SHOW TABLE STATUS LIKE 'rekap_presensi'");
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Fungsi BARU untuk download
const downloadExcel = async (req, res) => {
    try {
        const { startDate, endDate, name } = req.query;
        
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

        const excelBuffer = await exportService.generateExcel(rows);

        // Header agar browser mengenali ini sebagai file Excel untuk diunduh
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=rekap_presensi.xlsx');

        res.send(excelBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Gagal membuat file Excel" });
    }
};

module.exports = {
    getRekapPresensi,
    getTableStatus,
    downloadExcel
};