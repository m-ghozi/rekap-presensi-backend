const db = require('../config/database');

const searchPegawaiData = async (name) => {
    const query = `
        SELECT id, nama 
        FROM pegawai 
        WHERE nama LIKE ? 
        ORDER BY nama ASC 
        LIMIT 10
    `;
    const [rows] = await db.query(query, [`%${name}%`]);
    return rows;
};

module.exports = {
    searchPegawaiData
};
