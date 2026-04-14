const express = require('express');
const router = express.Router();
const presensiController = require('../controllers/presensiController');
const { validatePresensiQuery } = require('../middlewares/validator');

router.get('/today', presensiController.getTodayPresensi);
router.get('/', validatePresensiQuery, presensiController.getRekapPresensi);
router.get('/status', presensiController.getTableStatus);
router.get('/download', validatePresensiQuery, presensiController.downloadExcel);

module.exports = router;