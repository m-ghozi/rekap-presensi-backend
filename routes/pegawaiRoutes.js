const express = require('express');
const router = express.Router();
const pegawaiController = require('../controllers/pegawaiController');

// Endpoint: GET /api/pegawai/autocomplete
router.get('/autocomplete', pegawaiController.getAutocompletePegawai);

module.exports = router;
