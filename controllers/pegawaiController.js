const pegawaiModel = require('../models/pegawaiModel');

const getAutocompletePegawai = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 1) {
            return res.json({ success: true, data: [] });
        }

        const rows = await pegawaiModel.searchPegawaiData(q);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error getAutocompletePegawai:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAutocompletePegawai
};
