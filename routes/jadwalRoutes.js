const express = require('express');
const router = express.Router();
const jadwalController = require('../controllers/jadwalController');
const { validateJadwalQuery } = require('../middlewares/validator');

router.get('/download', validateJadwalQuery, jadwalController.downloadJadwalExcel);
router.get('/', validateJadwalQuery, jadwalController.getJadwalPegawai);
router.get('/today', validateJadwalQuery, jadwalController.getTodayJadwal);

module.exports = router;