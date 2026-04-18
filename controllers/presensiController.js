const presensiModel = require('../models/presensiModel');
const exportService = require('../services/exportService');

const getRekapPresensi = async (req, res) => {
    try {
        const { startDate, endDate, name } = req.query;
        const rows = await presensiModel.getRekapPresensiData(startDate, endDate, name);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getTableStatus = async (req, res) => {
    try {
        const data = await presensiModel.getTableStatusData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Fungsi BARU untuk download
const downloadExcel = async (req, res) => {
    try {
        const { startDate, endDate, name } = req.query;
        const rows = await presensiModel.getRekapPresensiForExport(startDate, endDate, name);

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

// Tambahkan fungsi ini di presensiController.js
const getTodayPresensi = async (req, res) => {
    try {
        const rows = await presensiModel.getTodayPresensiData();
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getRekapPresensi,
    getTableStatus,
    downloadExcel,
    getTodayPresensi
};