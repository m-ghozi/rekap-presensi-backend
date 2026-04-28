const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');

// Endpoint: GET /api/laporan/penilaian
router.get('/penilaian', laporanController.getRekapPenilaian);

router.get('/download', laporanController.downloadLaporanExcel);

module.exports = router;