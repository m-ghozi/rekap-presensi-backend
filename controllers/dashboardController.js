const jadwalModel = require('../models/jadwalModel');
const presensiModel = require('../models/presensiModel');
const { buildRekapBulananData } = require('./laporanController');
const { isExcludedPegawai } = require('../utils/excludedPegawai');

const STATUS_TEPAT_WAKTU = ['Tepat Waktu', 'Terlambat Toleransi'];
const STATUS_TERLAMBAT = ['Terlambat I', 'Terlambat II'];

const isShiftAktif = (kode) => {
    if (!kode) return false;
    const k = kode.trim().toUpperCase();
    return k !== '' && k !== 'L' && k !== 'OFF';
};

const parsePersen = (val) => {
    const num = parseFloat(String(val).replace('%', ''));
    return isNaN(num) ? 0 : num;
};

const getDashboardSummary = async (req, res) => {
    try {
        const today = new Date();
        const bulan = today.getMonth() + 1;
        const tahun = today.getFullYear();
        const tgl = today.getDate();

        const [jadwalHariIniRaw, presensiHariIniRaw, rekapBulananRaw] = await Promise.all([
            jadwalModel.getTodayJadwalData(bulan, tahun, tgl),
            presensiModel.getTodayPresensiData(),
            buildRekapBulananData(bulan, tahun),
        ]);

        // Buang akun dummy per-unit dari semua sumber data dashboard
        const jadwalHariIni = jadwalHariIniRaw.filter(j => !isExcludedPegawai(j.nama_pegawai));
        const presensiHariIni = presensiHariIniRaw.filter(p => !isExcludedPegawai(p.nama_pegawai));
        const rekapBulanan = rekapBulananRaw.filter(r => !isExcludedPegawai(r.nama_pegawai));
        
        // Pegawai yang shift-nya aktif hari ini (bukan L/OFF) = seharusnya masuk
        const pegawaiTerjadwalHariIni = jadwalHariIni
            .filter(j => isShiftAktif(j.shift_kode))
            .map(j => j.nama_pegawai);

        const namaHadirSet = new Set(presensiHariIni.map(p => p.nama_pegawai));

        const totalPegawai = pegawaiTerjadwalHariIni.length;
        const hadirHariIni = presensiHariIni.length;
        const tepatWaktu = presensiHariIni.filter(p => STATUS_TEPAT_WAKTU.includes(p.status)).length;
        const terlambatList = presensiHariIni.filter(p => STATUS_TERLAMBAT.includes(p.status));
        const terlambat = terlambatList.length;

        const pegawaiBelumHadir = pegawaiTerjadwalHariIni.filter(n => !namaHadirSet.has(n));
        const belumHadir = pegawaiBelumHadir.length;

        const rataKehadiranBulanIni = rekapBulanan.length > 0
            ? Math.round(rekapBulanan.reduce((sum, r) => sum + parsePersen(r.persentase_kehadiran), 0) / rekapBulanan.length)
            : 0;

        const pegawaiPerluPerhatian = [...rekapBulanan]
            .sort((a, b) => parsePersen(a.persentase_kehadiran) - parsePersen(b.persentase_kehadiran))
            .slice(0, 5);

        res.json({
            success: true,
            data: {
                totalPegawai,
                hadirHariIni,
                tepatWaktu,
                terlambat,
                belumHadir,
                rataKehadiranBulanIni,
                pegawaiTerlambat: terlambatList.map(p => ({
                    nama_pegawai: p.nama_pegawai,
                    shift: p.shift,
                    keterlambatan: p.keterlambatan,
                })),
                pegawaiBelumHadir,
                pegawaiPerluPerhatian,
            },
        });
    } catch (error) {
        console.error('Error getDashboardSummary:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getDashboardSummary };