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

module.exports = { validatePresensiQuery };