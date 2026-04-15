const db = require('../config/database');

const getJadwalPegawai = async (req, res) => {
  try {
    const { bulan, tahun, name } = req.query;

    const targetMonth = bulan ? parseInt(bulan) : new Date().getMonth() + 1;
    const targetYear = tahun ? parseInt(tahun) : new Date().getFullYear();

    // Query ini mengambil jadwal harian dan menggabungkannya dengan tabel jam_masuk
    // untuk mendapatkan detail jam dari setiap kode shift yang ada
    let query = `
      SELECT 
        pegawai.nama AS nama_pegawai, 
        jadwal_pegawai.*
      FROM jadwal_pegawai
      JOIN pegawai ON jadwal_pegawai.id = pegawai.id
      WHERE jadwal_pegawai.bulan = ? AND jadwal_pegawai.tahun = ?
    `;

    const params = [targetMonth, targetYear];

    if (name) {
      query += ` AND pegawai.nama LIKE ?`;
      params.push(`%${name}%`);
    }

    const [jadwalRows] = await db.query(query, params);

    // Ambil referensi jam kerja untuk mapping kode shift ke jam detail
    const [jamRows] = await db.query("SELECT shift, jam_masuk, jam_pulang FROM jam_masuk");

    // Buat map agar pencarian jam lebih cepat
    const jamMap = {};
    jamRows.forEach(j => {
      jamMap[j.shift] = `${j.jam_masuk} - ${j.jam_pulang}`;
    });

    // Tambahkan detail jam ke setiap baris jadwal
    const detailData = jadwalRows.map(row => {
      const newRow = { ...row };
      // Loop h1 sampai h31
      for (let i = 1; i <= 31; i++) {
        const tgl = `h${i}`;
        const kodeShift = row[tgl];
        if (kodeShift && jamMap[kodeShift]) {
          // Format: "P (07:00 - 14:00)"
          newRow[tgl] = `${kodeShift} (${jamMap[kodeShift]})`;
        }
      }
      return newRow;
    });

    res.json({ success: true, data: detailData });
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

    const query = `
      SELECT 
        pegawai.nama AS nama_pegawai, 
        jadwal_pegawai.${colName} AS shift_kode,
        jam_masuk.jam_masuk,
        jam_masuk.jam_pulang
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