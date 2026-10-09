import rateLimit from 'express-rate-limit';

export const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // Maks 20 inquiry per IP per 15 menit
  message: {
    success: false,
    message: 'Terlalu banyak permintaan reservasi dari IP ini. Silakan coba kembali dalam 15 menit.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
