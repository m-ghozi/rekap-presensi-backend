const { query, validationResult } = require('express-validator');

const validatePresensiQuery = [
  // Validasi startDate (opsional, jika ada harus format YYYY-MM-DD)
  query('startDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Format tanggal mulai harus YYYY-MM-DD'),

  // Validasi endDate
  query('endDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Format tanggal selesai harus YYYY-MM-DD'),

  // Validasi name (opsional, minimal 3 karakter jika diisi)
  query('name')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1 })
    .withMessage('Nama harus berupa teks'),

  // Middleware untuk mengecek hasil validasi
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }
    next();
  }
];

const validateJadwalQuery = [
  query('bulan')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 12 })
    .withMessage('Bulan harus berupa angka 1 sampai 12'),

  query('tahun')
    .optional({ checkFalsy: true })
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Tahun harus berupa angka tahun yang valid (2000-2100)'),

  query('tanggal')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (typeof value !== 'string' && typeof value !== 'number') return false;
      const strVal = String(value);
      if (strVal.includes('-')) {
        const parts = strVal.split('-');
        if (parts.length !== 2) throw new Error('Format range tanggal tidak valid');
        const start = parseInt(parts[0]);
        const end = parseInt(parts[1]);
        if (isNaN(start) || isNaN(end)) throw new Error('Format range tanggal tidak valid');
        if (start < 1 || end > 31 || start > end) {
          throw new Error('Tanggal harus antara 1 sampai 31, dan batas awal harus <= batas akhir');
        }
        return true;
      } else {
        const parsed = parseInt(strVal);
        if (isNaN(parsed) || parsed < 1 || parsed > 31) {
          throw new Error('Tanggal harus berupa angka 1 sampai 31 atau range valid (misal: 1-5)');
        }
        return true;
      }
    }),

  query('name')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Pencarian nama harus berupa teks'),

  // Middleware pengecekan hasil
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }
    next();
  }
];

module.exports = { validatePresensiQuery, validateJadwalQuery };