const ExcelJS = require('exceljs');

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

const generateJadwalExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Jadwal Pegawai');

    const columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Nama Pegawai', key: 'nama_pegawai', width: 35 },
    ];

    for (let i = 1; i <= 31; i++) {
        columns.push({
            header: i.toString(),
            key: `h${i}`,
            width: 15,
            style: { alignment: { wrapText: true, vertical: 'middle', horizontal: 'center' } }
        });
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

module.exports = {
    generateExcel,
    generateJadwalExcel
};