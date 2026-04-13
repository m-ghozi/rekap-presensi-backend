const ExcelJS = require('exceljs');

const generateExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Presensi');

    // Menentukan header kolom Excel sesuai dengan field database Anda
    worksheet.columns = [
        { header: 'Nama Pegawai', key: 'nama_pegawai', width: 25 },
        { header: 'Shift', key: 'shift', width: 15 },
        { header: 'Jam Datang', key: 'jam_datang', width: 25 },
        { header: 'Jam Pulang', key: 'jam_pulang', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Keterlambatan', key: 'keterlambatan', width: 15 },
        { header: 'Durasi', key: 'durasi', width: 15 },
        { header: 'Keterangan', key: 'keterangan', width: 30 },
        { header: 'Photo (Preview)', key: 'photo_preview', width: 40 },
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