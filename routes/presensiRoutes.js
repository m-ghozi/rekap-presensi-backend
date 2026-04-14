const express = require('express');
const router = express.Router();
const presensiController = require('../controllers/presensiController');

// Endpoint untuk load pertama kali (data hari ini)
router.get('/today', presensiController.getTodayPresensi);

router.get('/', presensiController.getRekapPresensi);
router.get('/status', presensiController.getTableStatus);
router.get('/download', presensiController.downloadExcel);

module.exports = router;