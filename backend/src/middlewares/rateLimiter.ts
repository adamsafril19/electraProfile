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

const chatLimit = (windowMs: number, max: number, message: string) =>
  rateLimit({ windowMs, max, message: { success: false, message }, standardHeaders: true, legacyHeaders: false });

export const chatSessionLimiter = chatLimit(60 * 60 * 1000, 10, 'Terlalu banyak sesi chat dari IP ini. Coba lagi nanti.');
export const chatSendLimiter = chatLimit(5 * 60 * 1000, 40, 'Terlalu banyak pesan. Mohon tunggu sebentar.');
export const chatPollLimiter = chatLimit(60 * 1000, 60, 'Terlalu sering memuat pesan. Mohon tunggu sebentar.');

// Batasi percobaan login admin agar password tidak bisa ditebak lewat brute force
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // Hanya percobaan gagal yang dihitung: admin sah yang login berulang kali tidak boleh terkunci
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Silakan coba kembali dalam 15 menit.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
