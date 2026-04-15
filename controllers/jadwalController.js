const db = require('../config/database');

const getJadwalPegawai = async (req, res) => {
  try {
    const { bulan, tahun, name, tanggal } = req.query;

    // PENTING: Pastikan dikonversi ke Number agar tidak dianggap String kosong atau salah tipe
    const targetMonth = bulan ? parseInt(bulan) : new Date().getMonth() + 1;
    const targetYear = tahun ? parseInt(tahun) : new Date().getFullYear();

    // Jika filter 'tanggal' (1-31) diisi, kita hanya ambil kolom spesifik (misal h15)
    // Jika tidak, kita ambil seluruh kolom jadwal_pegawai.*
    let selectColumn = "jadwal_pegawai.*";
    let joinJamMasuk = "";
    
    if (tanggal) {
      const dayCol = `h${parseInt(tanggal)}`;
      selectColumn = `jadwal_pegawai.${dayCol} AS shift_tanggal_${tanggal}, jam_masuk.jam_masuk, jam_masuk.jam_pulang`;
      joinJamMasuk = `LEFT JOIN jam_masuk ON jadwal_pegawai.${dayCol} = jam_masuk.shift`;
    }

    let query = `
            SELECT pegawai.nama AS nama_pegawai, ${selectColumn} 
            FROM jadwal_pegawai
            JOIN pegawai ON jadwal_pegawai.id = pegawai.id
            ${joinJamMasuk}
            WHERE jadwal_pegawai.bulan = ? AND jadwal_pegawai.tahun = ?
        `;

    const params = [targetMonth, targetYear];

    if (name) {
      query += ` AND pegawai.nama LIKE ?`;
      params.push(`%${name}%`);
    }

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTodayJadwal = async (req, res) => {
  try {
    const today = new Date();
    const tgl = today.getDate();
    const bln = today.getMonth() + 1;
    const thn = today.getFullYear();

    const colName = `h${tgl}`;

    // Gunakan JOIN yang sama untuk konsistensi nama pegawai
    const query = `
            SELECT pegawai.nama AS nama_pegawai, jadwal_pegawai.${colName} AS shift_hari_ini, jam_masuk.jam_masuk, jam_masuk.jam_pulang
            FROM jadwal_pegawai
            JOIN pegawai ON jadwal_pegawai.id = pegawai.id
            LEFT JOIN jam_masuk ON jadwal_pegawai.${colName} = jam_masuk.shift
            WHERE jadwal_pegawai.bulan = ? AND jadwal_pegawai.tahun = ?
        `;

    const [rows] = await db.query(query, [bln, thn]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getJadwalPegawai,
  getTodayJadwal
};