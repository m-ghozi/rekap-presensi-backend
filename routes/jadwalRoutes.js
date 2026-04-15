const express = require('express');
const router = express.Router();
const jadwalController = require('../controllers/jadwalController');
// Jika Anda menggunakan validator, import di sini
// const { validateJadwalQuery } = require('../middlewares/validator'); 

router.get('/', jadwalController.getJadwalPegawai);
router.get('/today', jadwalController.getTodayJadwal);

module.exports = router;