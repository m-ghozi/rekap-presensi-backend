const db = require('../config/database');

const getJadwalPegawaiData = async (bulan, tahun, name) => {
    let query = `
      SELECT pegawai.nama AS nama_pegawai, jadwal_pegawai.* FROM jadwal_pegawai
      JOIN pegawai ON jadwal_pegawai.id = pegawai.id
      WHERE jadwal_pegawai.bulan = ? AND jadwal_pegawai.tahun = ?
    `;
    const params = [bulan, tahun];
    if (name) {
      query += ` AND pegawai.nama LIKE ?`;
      params.push(`%${name}%`);
    }
    const [rows] = await db.query(query, params);
    return rows;
};

const getJamMasukData = async () => {
    const [rows] = await db.query("SELECT shift, jam_masuk, jam_pulang FROM jam_masuk");
    return rows;
};

const getTodayJadwalData = async (bulan, tahun, tgl) => {
    const query = `
      SELECT pegawai.nama AS nama_pegawai, jadwal_pegawai.h${tgl} AS shift_kode,
      jam_masuk.jam_masuk, jam_masuk.jam_pulang
      FROM jadwal_pegawai
      JOIN pegawai ON jadwal_pegawai.id = pegawai.id
      LEFT JOIN jam_masuk ON jadwal_pegawai.h${tgl} = jam_masuk.shift
      WHERE jadwal_pegawai.bulan = ? AND jadwal_pegawai.tahun = ?
    `;
    const [rows] = await db.query(query, [bulan, tahun]);
    return rows;
};

module.exports = {
    getJadwalPegawaiData,
    getJamMasukData,
    getTodayJadwalData
};
