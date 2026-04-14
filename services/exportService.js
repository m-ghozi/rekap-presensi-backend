const ExcelJS = require('exceljs');

const generateExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Presensi');

    // Menentukan header kolom Excel sesuai dengan field database Anda
    worksheet.columns = [
        { header: 'Nama Pegawai', key: 'nama_pegawai', width: 35 },
        { header: 'Shift', key: 'shift', width: 30 },
        { header: 'Jam Datang', key: 'jam_datang', width: 25 },
        { header: 'Jam Pulang', key: 'jam_pulang', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Keterlambatan', key: 'keterlambatan', width: 15 },
        { header: 'Durasi', key: 'durasi', width: 10 },
        { header: 'Keterangan', key: 'keterangan', width: 55 },
    ];

    // Styling Header agar lebih profesional (Bold & Background Warna)
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Menambahkan data ke dalam baris Excel
    worksheet.addRows(data);

    // Menghasilkan buffer (data biner) untuk dikirim ke browser
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

module.exports = {
    generateExcel
};