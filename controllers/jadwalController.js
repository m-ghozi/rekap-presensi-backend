const jadwalModel = require('../models/jadwalModel');
const exportService = require('../services/exportService');
const { isExcludedPegawai } = require('../utils/excludedPegawai');

const getJadwalPegawai = async (req, res) => {
  try {
    const { bulan, tahun, name, tanggal } = req.query;

    const targetMonth = bulan ? parseInt(bulan) : new Date().getMonth() + 1;
    const targetYear = tahun ? parseInt(tahun) : new Date().getFullYear();

    // 1. Ambil data jadwal dasar
    const jadwalRowsRaw = await jadwalModel.getJadwalPegawaiData(targetMonth, targetYear, name);
    const jadwalRows = jadwalRowsRaw.filter(row => !isExcludedPegawai(row.nama_pegawai));

    // 2. Ambil referensi jam & format ke hh:mm (buang detik)
    const jamRows = await jadwalModel.getJamMasukData();
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
      let colsToKeep = [];
      if (tanggal.includes('-')) {
        const [startStr, endStr] = tanggal.split('-');
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) colsToKeep.push(`h${i}`);
        }
      } else {
        const parsedTgl = parseInt(tanggal);
        if (!isNaN(parsedTgl)) colsToKeep.push(`h${parsedTgl}`);
      }

      if (colsToKeep.length > 0) {
        const filteredData = detailData
          .filter(d => colsToKeep.some(col => d[col] && d[col].trim() !== '-' && d[col].trim() !== ''))
          .map(d => {
            const row = { id: d.id, nama_pegawai: d.nama_pegawai };
            colsToKeep.forEach(col => row[col] = d[col]);
            return row;
          });
        return res.json({ success: true, data: filteredData });
      }
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
    const rows = await jadwalModel.getTodayJadwalData(today.getMonth() + 1, today.getFullYear(), tgl);

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

const downloadJadwalExcel = async (req, res) => {
  try {
    const { bulan, tahun, name, tanggal } = req.query;

    const targetMonth = bulan ? parseInt(bulan) : new Date().getMonth() + 1;
    const targetYear = tahun ? parseInt(tahun) : new Date().getFullYear();

    const jadwalRowsRaw = await jadwalModel.getJadwalPegawaiData(targetMonth, targetYear, name);
    const jadwalRows = jadwalRowsRaw.filter(row => !isExcludedPegawai(row.nama_pegawai));

    const jamRows = await jadwalModel.getJamMasukData();
    const jamMap = {};
    jamRows.forEach(j => {
      const masuk = j.jam_masuk ? j.jam_masuk.substring(0, 5) : '--:--';
      const pulang = j.jam_pulang ? j.jam_pulang.substring(0, 5) : '--:--';
      jamMap[j.shift] = `${masuk} - ${pulang}`;
    });

    let detailData = jadwalRows.map(row => {
      const newRow = { ...row };
      for (let i = 1; i <= 31; i++) {
        const tglCol = `h${i}`;
        const kode = row[tglCol];
        if (kode && jamMap[kode]) {
          newRow[tglCol] = `${kode}\n(${jamMap[kode]})`;
        }
      }
      return newRow;
    });

    let colsToKeep = [];
    if (tanggal) {
      if (tanggal.includes('-')) {
        const [startStr, endStr] = tanggal.split('-');
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) colsToKeep.push(`h${i}`);
        }
      } else {
        const parsedTgl = parseInt(tanggal);
        if (!isNaN(parsedTgl)) colsToKeep.push(`h${parsedTgl}`);
      }

      if (colsToKeep.length > 0) {
        detailData = detailData
          .filter(d => colsToKeep.some(col => d[col] && d[col].trim() !== '-' && d[col].trim() !== ''))
          .map(d => {
            const row = { id: d.id, nama_pegawai: d.nama_pegawai };
            colsToKeep.forEach(col => row[col] = d[col]);
            return row;
          });
      }
    }

    const excelBuffer = await exportService.generateJadwalExcel(detailData, colsToKeep);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=jadwal_pegawai_${targetMonth}_${targetYear}.xlsx`);

    res.send(excelBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Gagal membuat file Excel jadwal" });
  }
};

module.exports = { getJadwalPegawai, getTodayJadwal, downloadJadwalExcel };