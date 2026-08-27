const express = require('express');
const router = express.Router();
const presensiController = require('../controllers/presensiController');
const { validatePresensiQuery, validatePresensiHarianQuery } = require('../middlewares/validator');

router.get('/today', presensiController.getTodayPresensi);
router.get('/harian', validatePresensiHarianQuery, presensiController.getPresensiHarian);
router.get('/harian/download', validatePresensiHarianQuery, presensiController.downloadPresensiHarianExcel);
router.get('/', validatePresensiQuery, presensiController.getRekapPresensi);
router.get('/status', presensiController.getTableStatus);
router.get('/download', validatePresensiQuery, presensiController.downloadExcel);

module.exports = router;