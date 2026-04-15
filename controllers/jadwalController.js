const db = require('../config/database');

const getJadwalPegawai = async (req, res) => {
  try {
    const { bulan, tahun, name, tanggal } = req.query;

    const targetMonth = bulan ? parseInt(bulan) : new Date().getMonth() + 1;
    const targetYear = tahun ? parseInt(tahun) : new Date().getFullYear();

    // 1. Ambil data jadwal dasar
    let query = `
      SELECT pegawai.nama AS nama_pegawai, jadwal_pegawai.* FROM jadwal_pegawai
      JOIN pegawai ON jadwal_pegawai.id = pegawai.id
      WHERE jadwal_pegawai.bulan = ? AND jadwal_pegawai.tahun = ?
    `;
    const params = [targetMonth, targetYear];
    if (name) {
      query += ` AND pegawai.nama LIKE ?`;
      params.push(`%${name}%`);
    }

    const [jadwalRows] = await db.query(query, params);

    // 2. Ambil referensi jam & format ke hh:mm (buang detik)
    const [jamRows] = await db.query("SELECT shift, jam_masuk, jam_pulang FROM jam_masuk");
    const jamMap = {};
    jamRows.forEach(j => {
      // substring(0, 5) mengambil "HH:mm" dari "HH:mm:ss"
      const masuk = j.jam_masuk ? j.jam_masuk.substring(0, 5) : '--:--';
      const pulang = j.jam_pulang ? j.jam_pulang.substring(0, 5) : '--:--';
      jamMap[j.shift] = `${masuk} - ${pulang}`;
    });

    // 3. Mapping data h1-h31 dengan format 2 baris (\n)
    const detailData = jadwalRows.map(row => {
      const newRow = { ...row };
      for (let i = 1; i <= 31; i++) {
        const tglCol = `h${i}`;
        const kode = row[tglCol];
        if (kode && jamMap[kode]) {
          // Menggunakan \n agar di frontend bisa dipisah menjadi 2 baris
          newRow[tglCol] = `${kode}\n(${jamMap[kode]})`;
        }
      }
      return newRow;
    });

    // 4. Fitur filter tanggal spesifik (jika param 'tanggal' diisi)
    if (tanggal) {
      const targetCol = `h${parseInt(tanggal)}`;
      const filteredData = detailData.map(d => ({
        id: d.id,
        nama_pegawai: d.nama_pegawai,
        [targetCol]: d[targetCol]
      }));
      return res.json({ success: true, data: filteredData });
    }

    res.json({ success: true, data: detailData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTodayJadwal = async (req, res) => {
  try {
    const today = new Date();
    const tgl = today.getDate();
    const query = `
      SELECT pegawai.nama AS nama_pegawai, jadwal_pegawai.h${tgl} AS shift_kode,
      jam_masuk.jam_masuk, jam_masuk.jam_pulang
      FROM jadwal_pegawai
      JOIN pegawai ON jadwal_pegawai.id = pegawai.id
      LEFT JOIN jam_masuk ON jadwal_pegawai.h${tgl} = jam_masuk.shift
      WHERE jadwal_pegawai.bulan = ? AND jadwal_pegawai.tahun = ?
    `;
    const [rows] = await db.query(query, [today.getMonth() + 1, today.getFullYear()]);

    const formattedRows = rows.map(r => ({
      ...r,
      jam_masuk: r.jam_masuk ? r.jam_masuk.substring(0, 5) : null,
      jam_pulang: r.jam_pulang ? r.jam_pulang.substring(0, 5) : null
    }));

    res.json({ success: true, data: formattedRows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getJadwalPegawai, getTodayJadwal };