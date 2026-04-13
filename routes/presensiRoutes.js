const express = require('express');
const router = express.Router();
const presensiController = require('../controllers/presensiController');

router.get('/', presensiController.getRekapPresensi);
router.get('/status', presensiController.getTableStatus);

module.exports = router;