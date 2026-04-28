const laporanModel = require('../models/laporanModel');
const jadwalModel = require('../models/jadwalModel');
const presensiModel = require('../models/presensiModel');
const { generateLaporanPenilaianExcel } = require('../services/exportService');
const { buildRowsWithAbsent } = require('./presensiController');

const getRekapPenilaian = async (req, res) => {
    try {
        // 1. Tangkap parameter dari request
        const { startDate, endDate, name } = req.query;

        // 5. Eksekusi query ke database memanggil dari model
        const rows = await laporanModel.getRekapPenilaianData(startDate, endDate, name);

        // 6. Ambil target bulan dan tahun (default ke bulan ini jika tidak ada startDate)
        let targetMonth = new Date().getMonth() + 1;
        let targetYear = new Date().getFullYear();
        if (startDate) {
            const dateObj = new Date(startDate);
            targetMonth = dateObj.getMonth() + 1;
            targetYear = dateObj.getFullYear();
        }

        // 7. Ambil data jadwal pegawai untuk bulan bersangkutan
        const jadwalRows = await jadwalModel.getJadwalPegawaiData(targetMonth, targetYear, name);
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

        // 8. Petakan total hari kerja aktual masing-masing pegawai berdasarkan jadwal
        const jadwalMap = {};
        jadwalRows.forEach(j => {
            let totalJadwalKerja = 0;
            // Cek setiap tanggal pada bulan tersebut
            for (let i = 1; i <= daysInMonth; i++) {
                const shiftCode = j[`h${i}`];
                // Hitung sebagai hari kerja jika bukan null, spasi kosong, 'L', atau 'OFF'
                if (shiftCode && shiftCode.trim() !== '' && shiftCode.trim().toUpperCase() !== 'L' && shiftCode.trim().toUpperCase() !== 'OFF') {
                    totalJadwalKerja++;
                }
            }
            jadwalMap[j.nama_pegawai] = totalJadwalKerja;
        });

        const resultData = rows.map(item => {
            // Ambil jumlah hari kerja pegawai dari jadwal, jika tidak ditemukan default ke 20
            const HARI_KERJA_EFEKTIF = jadwalMap[item.nama_pegawai] || 20;

            const persentase = item.total_hadir > 0
                ? Math.round((item.total_hadir / HARI_KERJA_EFEKTIF) * 100)
                : 0;

            // Hitung tidak hadir riil dari selisih jadwal masuk dikurangi total hadir
            const hitung_tidak_hadir = Math.max(0, HARI_KERJA_EFEKTIF - item.total_hadir);

            return {
                ...item,
                tidak_hadir: hitung_tidak_hadir, // Meng-override nilai dari query DB yang 0
                hari_kerja_efektif: HARI_KERJA_EFEKTIF,
                persentase_kehadiran: `${persentase}%`,
                // Anda bisa menambahkan logika penilaian lain di sini
                // contoh: status_performa: persentase >= 95 ? 'Baik' : 'Evaluasi'
            };
        });

        // 9. Kirim Response JSON
        res.json({ success: true, data: resultData });

    } catch (error) {
        console.error("Error getRekapPenilaian:", error);
        res.status(500).json({ success: false, message: error.message });
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

        // 1. Ambil data laporan penilaian
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

        // 2. Ambil riwayat presensi (termasuk "Tidak Hadir" yang diinjeksi)
        const rawRows = await presensiModel.getRekapPresensiData(startDate, endDate, name);
        const allRows = await buildRowsWithAbsent(rawRows, startDate, endDate, name);

        // 3. Generate Excel
        const laporan = laporanData[0] || null;
        const excelBuffer = await generateLaporanPenilaianExcel(laporan, allRows, {
            startDate, endDate, name,
        });

        const safeName = (name || 'pegawai').replace(/[^a-z0-9_\-]/gi, '_');
        const period = startDate ? `_${startDate}_${endDate || ''}` : '';

        res.setHeader('Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition',
            `attachment; filename=laporan_${safeName}${period}.xlsx`);

        res.send(excelBuffer);
    } catch (error) {
        console.error('Error downloadLaporanExcel:', error);
        res.status(500).json({ success: false, message: 'Gagal membuat file Excel laporan.' });
    }
};

module.exports = {
    getRekapPenilaian,
    downloadLaporanExcel
};