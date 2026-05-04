const laporanModel = require('../models/laporanModel');
const jadwalModel = require('../models/jadwalModel');
const presensiModel = require('../models/presensiModel');
const { generateLaporanPenilaianExcel, generateRekapBulananExcel } = require('../services/exportService');
const { buildRowsWithAbsent } = require('./presensiController');

const getRekapPenilaian = async (req, res) => {
    try {
        const { startDate, endDate, name } = req.query;

        const rows = await laporanModel.getRekapPenilaianData(startDate, endDate, name);

        let targetMonth = new Date().getMonth() + 1;
        let targetYear = new Date().getFullYear();
        if (startDate) {
            const dateObj = new Date(startDate);
            targetMonth = dateObj.getMonth() + 1;
            targetYear = dateObj.getFullYear();
        }

        const jadwalRows = await jadwalModel.getJadwalPegawaiData(targetMonth, targetYear, name);
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

        const jadwalMap = {};
        jadwalRows.forEach(j => {
            let totalJadwalKerja = 0;
            for (let i = 1; i <= daysInMonth; i++) {
                const shiftCode = j[`h${i}`];
                if (shiftCode && shiftCode.trim() !== '' &&
                    shiftCode.trim().toUpperCase() !== 'L' &&
                    shiftCode.trim().toUpperCase() !== 'OFF') {
                    totalJadwalKerja++;
                }
            }
            jadwalMap[j.nama_pegawai] = totalJadwalKerja;
        });

        const resultData = rows.map(item => {
            const HARI_KERJA_EFEKTIF = jadwalMap[item.nama_pegawai] || 20;
            const persentase = item.total_hadir > 0
                ? Math.round((item.total_hadir / HARI_KERJA_EFEKTIF) * 100)
                : 0;
            const hitung_tidak_hadir = Math.max(0, HARI_KERJA_EFEKTIF - item.total_hadir);

            return {
                ...item,
                tidak_hadir: hitung_tidak_hadir,
                hari_kerja_efektif: HARI_KERJA_EFEKTIF,
                persentase_kehadiran: `${persentase}%`,
            };
        });

        res.json({ success: true, data: resultData });

    } catch (error) {
        console.error("Error getRekapPenilaian:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/laporan/bulanan?bulan=5&tahun=2026&name=...
 * Rekap per pegawai untuk satu bulan penuh.
 */
const getRekapBulanan = async (req, res) => {
    try {
        const bulan = req.query.bulan ? parseInt(req.query.bulan) : new Date().getMonth() + 1;
        const tahun = req.query.tahun ? parseInt(req.query.tahun) : new Date().getFullYear();
        const { name } = req.query;

        if (isNaN(bulan) || bulan < 1 || bulan > 12) {
            return res.status(400).json({ success: false, message: 'Parameter bulan tidak valid (1-12).' });
        }
        if (isNaN(tahun) || tahun < 2000) {
            return res.status(400).json({ success: false, message: 'Parameter tahun tidak valid.' });
        }

        // 1. Ambil agregasi presensi dari DB
        const rows = await laporanModel.getRekapBulananData(bulan, tahun, name);

        // 2. Ambil jadwal untuk menghitung hari kerja efektif & tidak hadir
        const jadwalRows = await jadwalModel.getJadwalPegawaiData(bulan, tahun, name);
        const daysInMonth = new Date(tahun, bulan, 0).getDate();

        const jadwalMap = {};
        jadwalRows.forEach(j => {
            let totalJadwalKerja = 0;
            for (let i = 1; i <= daysInMonth; i++) {
                const shiftCode = j[`h${i}`];
                if (shiftCode && shiftCode.trim() !== '' &&
                    shiftCode.trim().toUpperCase() !== 'L' &&
                    shiftCode.trim().toUpperCase() !== 'OFF') {
                    totalJadwalKerja++;
                }
            }
            jadwalMap[j.nama_pegawai] = totalJadwalKerja;
        });

        // 3. Gabungkan & hitung kolom turunan
        const resultData = rows.map((item, index) => {
            const hariKerjaEfektif = jadwalMap[item.nama_pegawai] || 20;
            const jumlahHadir = parseInt(item.jumlah_hadir) || 0;
            const tidakHadir = Math.max(0, hariKerjaEfektif - jumlahHadir);
            const persentase = hariKerjaEfektif > 0
                ? Math.round((jumlahHadir / hariKerjaEfektif) * 100)
                : 0;

            // Format total_jam_kerja: buang .000000 jika ada
            const totalJamKerja = item.total_jam_kerja
                ? String(item.total_jam_kerja).split('.')[0]
                : '00:00:00';

            // Format total_keterlambatan
            const totalKeterlambatan = item.total_keterlambatan
                ? String(item.total_keterlambatan).split('.')[0]
                : '00:00:00';

            return {
                no: index + 1,
                nama_pegawai: item.nama_pegawai,
                jumlah_hadir: `${jumlahHadir} hari`,
                tepat_waktu: parseInt(item.tepat_waktu) || 0,
                terlambat: parseInt(item.terlambat) || 0,
                total_keterlambatan: totalKeterlambatan,
                tidak_hadir: tidakHadir,
                total_jam_kerja: totalJamKerja,
                hari_kerja_efektif: hariKerjaEfektif,
                persentase_kehadiran: `${persentase}%`,
            };
        });

        res.json({
            success: true,
            bulan,
            tahun,
            data: resultData,
        });

    } catch (error) {
        console.error('Error getRekapBulanan:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/laporan/bulanan/download?bulan=5&tahun=2026&name=...
 */
const downloadRekapBulananExcel = async (req, res) => {
    try {
        const bulan = req.query.bulan ? parseInt(req.query.bulan) : new Date().getMonth() + 1;
        const tahun = req.query.tahun ? parseInt(req.query.tahun) : new Date().getFullYear();
        const { name } = req.query;

        // Reuse getRekapBulanan logic — panggil langsung ke model
        const rows = await laporanModel.getRekapBulananData(bulan, tahun, name);
        const jadwalRows = await jadwalModel.getJadwalPegawaiData(bulan, tahun, name);
        const daysInMonth = new Date(tahun, bulan, 0).getDate();

        const jadwalMap = {};
        jadwalRows.forEach(j => {
            let total = 0;
            for (let i = 1; i <= daysInMonth; i++) {
                const s = j[`h${i}`];
                if (s && s.trim() !== '' &&
                    s.trim().toUpperCase() !== 'L' &&
                    s.trim().toUpperCase() !== 'OFF') total++;
            }
            jadwalMap[j.nama_pegawai] = total;
        });

        const data = rows.map((item, index) => {
            const hariKerjaEfektif = jadwalMap[item.nama_pegawai] || 20;
            const jumlahHadir = parseInt(item.jumlah_hadir) || 0;
            const tidakHadir = Math.max(0, hariKerjaEfektif - jumlahHadir);
            const persentase = hariKerjaEfektif > 0
                ? Math.round((jumlahHadir / hariKerjaEfektif) * 100)
                : 0;

            return {
                no: index + 1,
                nama_pegawai: item.nama_pegawai,
                jumlah_hadir: jumlahHadir,
                tepat_waktu: parseInt(item.tepat_waktu) || 0,
                terlambat: parseInt(item.terlambat) || 0,
                total_keterlambatan: item.total_keterlambatan
                    ? String(item.total_keterlambatan).split('.')[0]
                    : '00:00:00',
                tidak_hadir: tidakHadir,
                total_jam_kerja: item.total_jam_kerja
                    ? String(item.total_jam_kerja).split('.')[0]
                    : '00:00:00',
                hari_kerja_efektif: hariKerjaEfektif,
                persentase_kehadiran: `${persentase}%`,
            };
        });

        const excelBuffer = await generateRekapBulananExcel(data, bulan, tahun);

        const bulanStr = String(bulan).padStart(2, '0');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=rekap_bulanan_${bulanStr}_${tahun}.xlsx`);
        res.send(excelBuffer);

    } catch (error) {
        console.error('Error downloadRekapBulananExcel:', error);
        res.status(500).json({ success: false, message: 'Gagal membuat file Excel rekap bulanan.' });
    }
};

const downloadLaporanExcel = async (req, res) => {
    try {
        const { startDate, endDate, name } = req.query;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Parameter "name" wajib diisi untuk export Excel laporan.',
            });
        }

        const laporanRows = await laporanModel.getRekapPenilaianData(startDate, endDate, name);

        let targetMonth = new Date().getMonth() + 1;
        let targetYear = new Date().getFullYear();
        if (startDate) {
            const d = new Date(startDate);
            targetMonth = d.getMonth() + 1;
            targetYear = d.getFullYear();
        }

        const jadwalRows = await jadwalModel.getJadwalPegawaiData(targetMonth, targetYear, name);
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
        const jadwalMap = {};
        jadwalRows.forEach(j => {
            let totalJadwalKerja = 0;
            for (let i = 1; i <= daysInMonth; i++) {
                const shiftCode = j[`h${i}`];
                if (shiftCode && shiftCode.trim() !== '' &&
                    shiftCode.trim().toUpperCase() !== 'L' &&
                    shiftCode.trim().toUpperCase() !== 'OFF') {
                    totalJadwalKerja++;
                }
            }
            jadwalMap[j.nama_pegawai] = totalJadwalKerja;
        });

        const laporanData = laporanRows.map(item => {
            const HARI_KERJA_EFEKTIF = jadwalMap[item.nama_pegawai] || 20;
            const persentase = item.total_hadir > 0
                ? Math.round((item.total_hadir / HARI_KERJA_EFEKTIF) * 100) : 0;
            return {
                ...item,
                tidak_hadir: Math.max(0, HARI_KERJA_EFEKTIF - item.total_hadir),
                hari_kerja_efektif: HARI_KERJA_EFEKTIF,
                persentase_kehadiran: `${persentase}%`,
            };
        });

        const rawRows = await presensiModel.getRekapPresensiData(startDate, endDate, name);
        const allRows = await buildRowsWithAbsent(rawRows, startDate, endDate, name);

        const laporan = laporanData[0] || null;
        const excelBuffer = await generateLaporanPenilaianExcel(laporan, allRows, {
            startDate, endDate, name,
        });

        const safeName = (name || 'pegawai').replace(/[^a-z0-9_\-]/gi, '_');
        const period = startDate ? `_${startDate}_${endDate || ''}` : '';

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=laporan_${safeName}${period}.xlsx`);
        res.send(excelBuffer);

    } catch (error) {
        console.error('Error downloadLaporanExcel:', error);
        res.status(500).json({ success: false, message: 'Gagal membuat file Excel laporan.' });
    }
};

module.exports = {
    getRekapPenilaian,
    getRekapBulanan,
    downloadRekapBulananExcel,
    downloadLaporanExcel,
};