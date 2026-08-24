const presensiModel = require('../models/presensiModel');
const jadwalModel   = require('../models/jadwalModel');
const exportService = require('../services/exportService');
const { isExcludedPegawai } = require('../utils/excludedPegawai');

const getLocalYYYYMMDD = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Helper: gabungkan data presensi aktual dengan baris "Tidak Hadir"
 * untuk setiap (pegawai, tanggal) yang ada jadwal kerja tapi tidak presensi.
 */
const buildRowsWithAbsent = async (rows, startDate, endDate, name) => {
    // Ambil semua pasangan (pegawai, tanggal) yang punya jadwal kerja
    const jadwalList = await presensiModel.getPegawaiDenganJadwal(startDate, endDate, name);

    // Ambil referensi jam shift untuk label teks
    const jamRows = await jadwalModel.getJamMasukData();
    const jamMap  = {};
    jamRows.forEach(j => {
        const masuk  = j.jam_masuk  ? j.jam_masuk.substring(0, 5)  : '--:--';
        const pulang = j.jam_pulang ? j.jam_pulang.substring(0, 5) : '--:--';
        jamMap[j.shift] = `${masuk} - ${pulang}`;
    });

    // Bangun Set dari presensi yang sudah ada: key = "nama_pegawai|YYYY-MM-DD"
    const presensiSet = new Set();
    rows.forEach(r => {
        if (r.jam_datang) {
            const key = `${r.nama_pegawai}|${getLocalYYYYMMDD(r.jam_datang)}`;
            presensiSet.add(key);
        }
    });

    // Buat baris "Tidak Hadir" untuk jadwal yang tidak ada record presensinya
    const tidakHadirRows = [];
    jadwalList.forEach(({ nama_pegawai, tanggal, shift_kode }) => {
        const tglStr = getLocalYYYYMMDD(tanggal);
        const key    = `${nama_pegawai}|${tglStr}`;

        if (!presensiSet.has(key)) {
            const jamLabel = jamMap[shift_kode]
                ? `${shift_kode} (${jamMap[shift_kode]})`
                : shift_kode;

            tidakHadirRows.push({
                nama_pegawai,
                shift         : jamLabel,
                jam_datang    : new Date(`${tglStr}T00:00:00`),
                jam_pulang    : null,
                status        : 'Tidak Hadir',
                keterlambatan : null,
                durasi        : null,
                keterangan    : null,
            });
        }
    });

    // Gabung & urutkan descending tanggal, lalu nama pegawai
    return [...rows, ...tidakHadirRows].sort((a, b) => {
        const tA = a.jam_datang ? new Date(a.jam_datang).getTime() : 0;
        const tB = b.jam_datang ? new Date(b.jam_datang).getTime() : 0;
        if (tB !== tA) return tB - tA;
        return (a.nama_pegawai || '').localeCompare(b.nama_pegawai || '');
    });
};

const getRekapPresensi = async (req, res) => {
    try {
        const { startDate, endDate, name } = req.query;

        const rows    = await presensiModel.getRekapPresensiData(startDate, endDate, name);
        const allRows = await buildRowsWithAbsent(rows, startDate, endDate, name);

        res.json({ success: true, data: allRows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getTableStatus = async (req, res) => {
    try {
        const data = await presensiModel.getTableStatusData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Download Excel — inject baris tidak hadir sama seperti endpoint rekap
const downloadExcel = async (req, res) => {
    try {
        const { startDate, endDate, name } = req.query;

        const rows    = await presensiModel.getRekapPresensiForExport(startDate, endDate, name);
        const allRows = await buildRowsWithAbsent(rows, startDate, endDate, name);

        const excelBuffer = await exportService.generateExcel(allRows);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=rekap_presensi.xlsx');

        res.send(excelBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Gagal membuat file Excel" });
    }
};

// Today: hanya tampilkan yang sudah absen — TIDAK diubah
const getTodayPresensi = async (req, res) => {
    try {
        const rows = await presensiModel.getTodayPresensiData();
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Presensi Harian Seluruh Pegawai (Tanpa Terpaku Jadwal)
 * GET /api/presensi/harian?date=YYYY-MM-DD&name=...
 */
const getPresensiHarian = async (req, res) => {
    try {
        const targetDate = req.query.date || getLocalYYYYMMDD(new Date());
        const { name } = req.query;

        const rawRows = await presensiModel.getPresensiHarianSemuaPegawaiData(targetDate, name);
        const rows = rawRows.filter(r => !isExcludedPegawai(r.nama_pegawai));

        res.json({ success: true, date: targetDate, data: rows });
    } catch (error) {
        console.error('Error getPresensiHarian:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    buildRowsWithAbsent,
    getRekapPresensi,
    getTableStatus,
    downloadExcel,
    getTodayPresensi,
    getPresensiHarian
};