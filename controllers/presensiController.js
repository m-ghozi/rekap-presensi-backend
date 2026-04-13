const db = require('../config/database');

const getRekapPresensi = async (req, res) => {
    try {
        const query = `
            SELECT id, shift, jam_datang, jam_pulang, status, 
            keterlambatan, durasi, keterangan, LEFT(photo, 256) as photo_preview 
            FROM rekap_presensi 
            ORDER BY jam_datang DESC, jam_pulang ASC, keterangan ASC 
            LIMIT 1000
        `;
        const [rows] = await db.query(query);
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

module.exports = {
    getRekapPresensi,
    getTableStatus
};