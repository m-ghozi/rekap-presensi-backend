const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');

// Rekap penilaian individu
router.get('/penilaian', laporanController.getRekapPenilaian);
router.get('/download', laporanController.downloadLaporanExcel);

// Rekap bulanan semua pegawai
router.get('/bulanan', laporanController.getRekapBulanan);
router.get('/bulanan/download', laporanController.downloadRekapBulananExcel);

module.exports = router;