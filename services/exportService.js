const ExcelJS = require('exceljs');

const BULAN_NAMA = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const generateExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Presensi');

    // Menentukan header kolom Excel sesuai dengan field database Anda
    worksheet.columns = [
        { header: 'Nama Pegawai', key: 'nama_pegawai', width: 35 },
        { header: 'Shift', key: 'shift', width: 20 },
        {
            header: 'Jam Datang',
            key: 'jam_datang',
            width: 20,
            style: { numFmt: 'dd/mm/yyyy hh:mm:ss' }
        },
        {
            header: 'Jam Pulang',
            key: 'jam_pulang',
            width: 20,
            style: { numFmt: 'dd/mm/yyyy hh:mm:ss' }
        },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Keterlambatan', key: 'keterlambatan', width: 15 },
        { header: 'Durasi', key: 'durasi', width: 10 },
        { header: 'Keterangan', key: 'keterangan', width: 55 },
    ];

    // Styling Header agar lebih profesional (Bold & Background Warna)
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    data.forEach(item => {
        const row = { ...item };

        // Tambahkan offset 7 jam (WIB) jika data berupa Date agar ExcelJS menampilkannya dengan benar
        if (row.jam_datang) {
            const dt = new Date(row.jam_datang);
            // Menambah 7 jam ke objek date
            row.jam_datang = new Date(dt.getTime() + (7 * 60 * 60 * 1000));
        }

        if (row.jam_pulang) {
            const dp = new Date(row.jam_pulang);
            // Menambah 7 jam ke objek date
            row.jam_pulang = new Date(dp.getTime() + (7 * 60 * 60 * 1000));
        }

        // Menambahkan data ke dalam baris Excel
        worksheet.addRow(row);
    });

    // Menghasilkan buffer (data biner) untuk dikirim ke browser
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

const generateJadwalExcel = async (data, colsToKeep = []) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Jadwal Pegawai');

    const columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Nama Pegawai', key: 'nama_pegawai', width: 35 },
    ];

    if (colsToKeep && colsToKeep.length > 0) {
        colsToKeep.forEach(col => {
            const dayNum = col.replace('h', '');
            columns.push({
                header: dayNum,
                key: col,
                width: 25,
                style: { alignment: { wrapText: true, vertical: 'middle', horizontal: 'center' } }
            });
        });
    } else {
        for (let i = 1; i <= 31; i++) {
            columns.push({
                header: i.toString(),
                key: `h${i}`,
                width: 15,
                style: { alignment: { wrapText: true, vertical: 'middle', horizontal: 'center' } }
            });
        }
    }

    worksheet.columns = columns;

    worksheet.getRow(1).height = 30;
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    data.forEach((item, index) => {
        const row = { no: index + 1, ...item };
        const addedRow = worksheet.addRow(row);
        addedRow.height = 30;
        addedRow.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

        addedRow.eachCell((cell) => {
            if (typeof cell.value === 'string') {
                const valLower = cell.value.toLowerCase();
                if (valLower.includes('pagi')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }; // Hijau muda
                } else if (valLower.includes('siang')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } }; // Kuning muda
                } else if (valLower.includes('malam')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } }; // Biru muda
                }
            }
        });
    });

    return await workbook.xlsx.writeBuffer();
};

/**
 * Generate Excel laporan penilaian + riwayat presensi detail
 * @param {Object} laporan   - data dari /api/laporan/penilaian (satu objek pegawai)
 * @param {Array}  riwayat   - data dari /api/presensi
 * @param {Object} params    - { startDate, endDate, name }
 */
const generateLaporanPenilaianExcel = async (laporan, riwayat, params = {}) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Rekap Presensi';
    workbook.created = new Date();

    // ── Palette ──────────────────────────────────────────────────────────────
    const C = {
        BLUE_DARK: '1565C0',
        BLUE_MID: '1976D2',
        BLUE_LIGHT: 'E3F2FD',
        WHITE: 'FFFFFF',
        GREEN: '2E7D32',
        ORANGE: 'E65100',
        RED: 'C62828',
        GREY_LIGHT: 'F5F5F5',
        GREY_BORDER: 'BDBDBD',
    };

    const fill = (hex) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: hex } });
    const thin = (hex = C.GREY_BORDER) => ({ style: 'thin', color: { argb: hex } });
    const border = () => ({ left: thin(), right: thin(), top: thin(), bottom: thin() });
    const center = (wrap = false) => ({ horizontal: 'center', vertical: 'middle', wrapText: wrap });
    const left = (wrap = false) => ({ horizontal: 'left', vertical: 'middle', wrapText: wrap });
    const font = (opts = {}) => ({ name: 'Arial', size: 10, ...opts });

    const periodLabel = params.startDate && params.endDate
        ? `Periode: ${params.startDate} s/d ${params.endDate}`
        : 'Semua Periode';
    const nameLabel = params.name ? `  |  Nama: ${params.name}` : '';

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 1: Ringkasan Kehadiran
    // ════════════════════════════════════════════════════════════════════════
    const ws1 = workbook.addWorksheet('Ringkasan Kehadiran');

    // Title
    ws1.mergeCells('A1:I1');
    Object.assign(ws1.getCell('A1'), {
        value: 'LAPORAN REKAP KEHADIRAN PEGAWAI',
        font: font({ size: 14, bold: true, color: { argb: C.WHITE } }),
        fill: fill(C.BLUE_DARK),
        alignment: center(),
    });
    ws1.getRow(1).height = 36;

    // Subtitle
    ws1.mergeCells('A2:I2');
    Object.assign(ws1.getCell('A2'), {
        value: `${periodLabel}${nameLabel}`,
        font: font({ size: 10, color: { argb: '555555' } }),
        fill: fill('EEF2F7'),
        alignment: center(),
    });
    ws1.getRow(2).height = 22;
    ws1.getRow(3).height = 10;

    // ── Stat cards ───────────────────────────────────────────────────────────
    const STATS = [
        { label: 'PERSENTASE KEHADIRAN', value: laporan?.persentase_kehadiran ?? '-', color: C.BLUE_MID },
        { label: 'TOTAL HADIR', value: laporan?.total_hadir ?? 0, color: C.GREEN },
        { label: 'TEPAT WAKTU', value: laporan?.tepat_waktu ?? 0, color: C.GREEN },
        { label: 'TERLAMBAT I', value: laporan?.terlambat_1 ?? 0, color: C.ORANGE },
        { label: 'TERLAMBAT II', value: laporan?.terlambat_2 ?? 0, color: C.RED },
        { label: 'TIDAK HADIR / ALPHA', value: laporan?.tidak_hadir ?? 0, color: C.RED },
        { label: 'HARI KERJA EFEKTIF', value: laporan?.hari_kerja_efektif ?? 0, color: C.BLUE_MID },
        { label: 'TOTAL JAM KERJA', value: laporan?.total_jam_kerja?.split('.')[0] ?? '-', color: C.BLUE_MID },
    ];

    // 4 cards per row, columns B D F H, starting at row 4
    const CARD_COLS = ['B', 'D', 'F', 'H'];
    const CARD_START = [4, 8];

    STATS.forEach((stat, i) => {
        const col = CARD_COLS[i % 4];
        const startRow = CARD_START[Math.floor(i / 4)];

        // Label row
        const lCell = ws1.getCell(`${col}${startRow}`);
        lCell.value = stat.label;
        lCell.font = font({ size: 8, bold: true, color: { argb: '757575' } });
        lCell.fill = fill(C.GREY_LIGHT);
        lCell.alignment = center();
        lCell.border = { left: thin(), right: thin(), top: thin() };

        // Spacer row
        const sCell = ws1.getCell(`${col}${startRow + 1}`);
        sCell.fill = fill(C.GREY_LIGHT);
        sCell.border = { left: thin(), right: thin() };

        // Value row
        const vCell = ws1.getCell(`${col}${startRow + 2}`);
        let cellValue = stat.value;
        if (stat.label === 'PERSENTASE KEHADIRAN' && typeof cellValue === 'string' && cellValue.endsWith('%')) {
            cellValue = parseFloat(cellValue) / 100;
            vCell.numFmt = '0%';
        } else if (typeof cellValue === 'string' && !isNaN(cellValue) && cellValue.trim() !== '' && stat.label !== 'TOTAL JAM KERJA') {
            cellValue = Number(cellValue);
        } else if (stat.label === 'TOTAL JAM KERJA' && typeof cellValue === 'string' && !isNaN(cellValue)) {
            cellValue = Number(cellValue);
        }
        vCell.value = cellValue;
        vCell.font = font({ size: 16, bold: true, color: { argb: stat.color } });
        vCell.fill = fill(C.GREY_LIGHT);
        vCell.alignment = center();
        vCell.border = { left: thin(), right: thin(), bottom: thin() };
    });

    for (let r = 4; r <= 14; r++) ws1.getRow(r).height = 16;
    ws1.getRow(14).height = 14;

    // ── Column widths ─────────────────────────────────────────────────────────
    const COL_DEFS = [
        { key: 'A', width: 5 },
        { key: 'B', width: 28 },
        { key: 'C', width: 22 },
        { key: 'D', width: 18 },
        { key: 'E', width: 18 },
        { key: 'F', width: 16 },
        { key: 'G', width: 15 },
        { key: 'H', width: 18 },
        { key: 'I', width: 12 },
    ];
    COL_DEFS.forEach(({ key, width }) => ws1.getColumn(key).width = width);

    // ── Detail table ──────────────────────────────────────────────────────────
    const HDR_ROW = 12;
    const HEADERS = ['No', 'Nama Pegawai', 'Shift', 'Jam Datang', 'Jam Pulang',
        'Status', 'Keterlambatan', 'Durasi', 'Keterangan'];
    const HDR_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

    ws1.getRow(HDR_ROW).height = 28;
    HEADERS.forEach((h, i) => {
        const c = ws1.getCell(`${HDR_KEYS[i]}${HDR_ROW}`);
        c.value = h;
        c.font = font({ bold: true, color: { argb: C.WHITE } });
        c.fill = fill(C.BLUE_MID);
        c.alignment = center();
        c.border = border();
    });

    // Status color helper
    const statusStyle = (status) => {
        switch (status) {
            case 'Tepat Waktu': return { bg: 'E8F5E9', fg: C.GREEN };
            case 'Terlambat Toleransi': return { bg: 'E8F5E9', fg: C.GREEN };
            case 'Terlambat I': return { bg: 'FFF3E0', fg: C.ORANGE };
            case 'Terlambat II': return { bg: 'FFEBEE', fg: C.RED };
            default: return { bg: 'FFEBEE', fg: C.RED };
        }
    };

    const fmtDate = (d) => {
        if (!d) return '-';
        const dt = new Date(d);
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} `
            + `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };

    riwayat.forEach((row, idx) => {
        const r = HDR_ROW + 1 + idx;
        const bg = idx % 2 === 0 ? C.BLUE_LIGHT : C.WHITE;
        ws1.getRow(r).height = 22;

        const { bg: sBg, fg: sFg } = statusStyle(row.status);
        const rowValues = [
            idx + 1,
            row.nama_pegawai,
            row.shift,
            fmtDate(row.jam_datang),
            fmtDate(row.jam_pulang),
            row.status,
            row.keterlambatan || '-',
            row.durasi || '-',
            (row.keterangan || '-').toLowerCase().includes('mobile') ? 'Mobile' :
                (row.keterangan || '-').toLowerCase().includes('singkronisasi') ? 'Fingerprint' :
                    row.keterangan || '-',
        ];

        rowValues.forEach((val, ci) => {
            const c = ws1.getCell(`${HDR_KEYS[ci]}${r}`);
            c.value = val;
            c.alignment = center(true);
            c.border = border();

            if (ci === 5) { // Status
                c.font = font({ size: 9, bold: true, color: { argb: sFg } });
                c.fill = fill(sBg);
            } else if (ci === 6 && val !== '-') { // Keterlambatan
                c.font = font({ size: 9, bold: true, color: { argb: C.RED } });
                c.fill = fill(bg);
            } else if (ci === 7 && val !== '-') { // Durasi
                c.font = font({ size: 9, bold: true, color: { argb: C.GREEN } });
                c.fill = fill(bg);
            } else {
                c.font = font({ color: { argb: '212121' } });
                c.fill = fill(bg);
            }
        });
    });

    ws1.views = [{ state: 'frozen', ySplit: HDR_ROW }];

    // Print settings
    ws1.pageSetup.orientation = 'landscape';
    ws1.pageSetup.fitToPage = true;
    ws1.pageSetup.fitToWidth = 1;
    ws1.pageSetup.fitToHeight = 0;
    ws1.pageSetup.printTitlesRow = `1:2`;

    return workbook.xlsx.writeBuffer();
};

/**
 * Generate Excel rekap bulanan semua pegawai.
 * @param {Array}  data   - hasil dari laporanController.downloadRekapBulananExcel
 * @param {number} bulan  - 1–12
 * @param {number} tahun  - e.g. 2026
 */
const generateRekapBulananExcel = async (data, bulan, tahun) => {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Rekap Presensi';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Rekap Bulanan');

    // ── Palette ──────────────────────────────────────────────────────────────
    const C = {
        BLUE_DARK: '1565C0',
        BLUE_MID: '1976D2',
        BLUE_LIGHT: 'E3F2FD',
        WHITE: 'FFFFFF',
        GREEN: '2E7D32',
        ORANGE: 'E65100',
        RED: 'C62828',
        GREY_LIGHT: 'F5F5F5',
        GREY_BORDER: 'BDBDBD',
    };

    const fill = hex => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: hex } });
    const thin = (hex = C.GREY_BORDER) => ({ style: 'thin', color: { argb: hex } });
    const border = () => ({ left: thin(), right: thin(), top: thin(), bottom: thin() });
    const center = (wrap = false) => ({ horizontal: 'center', vertical: 'middle', wrapText: wrap });
    const left = (wrap = false) => ({ horizontal: 'left', vertical: 'middle', wrapText: wrap });
    const font = (opts = {}) => ({ name: 'Arial', size: 10, ...opts });

    // ── Title ─────────────────────────────────────────────────────────────────
    ws.mergeCells('A1:J1');
    Object.assign(ws.getCell('A1'), {
        value: 'REKAP KEHADIRAN BULANAN PEGAWAI',
        font: font({ size: 14, bold: true, color: { argb: C.WHITE } }),
        fill: fill(C.BLUE_DARK),
        alignment: center(),
    });
    ws.getRow(1).height = 36;

    ws.mergeCells('A2:J2');
    Object.assign(ws.getCell('A2'), {
        value: `Periode: ${BULAN_NAMA[bulan]} ${tahun}`,
        font: font({ size: 10, color: { argb: '555555' } }),
        fill: fill('EEF2F7'),
        alignment: center(),
    });
    ws.getRow(2).height = 22;

    // ── Column definitions ────────────────────────────────────────────────────
    ws.columns = [
        { key: 'no', width: 5 },
        { key: 'nama_pegawai', width: 35 },
        { key: 'jumlah_hadir', width: 14 },
        { key: 'tepat_waktu', width: 10 },
        { key: 'terlambat', width: 12 },
        { key: 'total_keterlambatan', width: 15 },
        { key: 'tidak_hadir', width: 10 },
        { key: 'total_jam_kerja', width: 16 },
        { key: 'hari_kerja_efektif', width: 10 },
        { key: 'persentase_kehadiran', width: 13 },
    ];

    // ── Header row ────────────────────────────────────────────────────────────
    const HDR_LABELS = [
        'No', 'Nama Pegawai', 'Jumlah Hadir', 'Tepat Waktu',
        'Terlambat', 'Total Keterlambatan', 'Tidak Hadir',
        'Total Jam Kerja', 'Hari Kerja Efektif', 'Persentase Kehadiran',
    ];
    const HDR_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const HDR_ROW = 4;

    ws.getRow(HDR_ROW).height = 30;
    HDR_LABELS.forEach((label, i) => {
        const c = ws.getCell(`${HDR_COLS[i]}${HDR_ROW}`);
        c.value = label;
        c.font = font({ bold: true, color: { argb: C.WHITE } });
        c.fill = fill(C.BLUE_MID);
        c.alignment = center(true);
        c.border = border();
    });

    // ── Data rows ─────────────────────────────────────────────────────────────
    data.forEach((item, idx) => {
        const r = HDR_ROW + 1 + idx;
        const bg = idx % 2 === 0 ? C.BLUE_LIGHT : C.WHITE;
        const row = ws.getRow(r);
        row.height = 22;

        // Parse persentase untuk pewarnaan
        const pct = parseInt(String(item.persentase_kehadiran).replace('%', '')) || 0;
        const pctColor = pct >= 90 ? C.GREEN : pct >= 75 ? C.ORANGE : C.RED;

        const values = [
            item.no,
            item.nama_pegawai,
            item.jumlah_hadir,           // sudah format "N hari" dari controller
            item.tepat_waktu,
            item.terlambat,
            item.total_keterlambatan,
            item.tidak_hadir,
            item.total_jam_kerja,
            item.hari_kerja_efektif,
            item.persentase_kehadiran,
        ];

        values.forEach((val, ci) => {
            const c = ws.getCell(`${HDR_COLS[ci]}${r}`);
            c.value = val;
            c.border = border();
            c.alignment = ci === 1 ? left(true) : center(false); // rata kiri dan wrap untuk nama

            if (ci === 9) {
                // Persentase — warna sesuai nilai
                c.font = font({ bold: true, color: { argb: pctColor } });
                c.fill = fill(bg);
            } else if (ci === 5 && val !== '00:00:00') {
                // Total keterlambatan — merah jika ada
                c.font = font({ bold: true, color: { argb: C.RED } });
                c.fill = fill(bg);
            } else if (ci === 6 && item.tidak_hadir > 0) {
                // Tidak hadir — merah jika ada
                c.font = font({ bold: true, color: { argb: C.RED } });
                c.fill = fill(bg);
            } else {
                c.font = font({ color: { argb: '212121' } });
                c.fill = fill(bg);
            }
        });
    });

    // ── Summary row ───────────────────────────────────────────────────────────
    if (data.length > 0) {
        const LAST = HDR_ROW + data.length;
        const SUM_ROW = LAST + 2;
        ws.getRow(SUM_ROW).height = 22;

        ws.mergeCells(`A${SUM_ROW}:B${SUM_ROW}`);
        const sumLabel = ws.getCell(`A${SUM_ROW}`);
        sumLabel.value = 'Total Pegawai';
        sumLabel.font = font({ bold: true, color: { argb: C.WHITE } });
        sumLabel.fill = fill(C.BLUE_DARK);
        sumLabel.alignment = center();
        sumLabel.border = border();

        const totalCell = ws.getCell(`C${SUM_ROW}`);
        totalCell.value = `${data.length} pegawai`;
        totalCell.font = font({ bold: true, color: { argb: C.WHITE } });
        totalCell.fill = fill(C.BLUE_DARK);
        totalCell.alignment = center();
        totalCell.border = border();
    }

    // ── Freeze & print ────────────────────────────────────────────────────────
    ws.views = [{ state: 'frozen', ySplit: HDR_ROW }];
    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.fitToPage = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.fitToHeight = 0;
    ws.pageSetup.printTitlesRow = `1:4`;

    return workbook.xlsx.writeBuffer();
};

module.exports = {
    generateExcel,
    generateJadwalExcel,
    generateLaporanPenilaianExcel,
    generateRekapBulananExcel
};