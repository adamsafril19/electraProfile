import { z } from 'zod';

export const createInquirySchema = z.object({
  vehicleId: z.string().min(1, 'ID Kendaraan wajib diisi'),
  serviceType: z.enum(['LEPAS_KUNCI', 'DENGAN_DRIVER']),
  startDate: z.string().min(1, 'Tanggal mulai sewa wajib diisi'),
  durationDays: z.number().int().min(1, 'Durasi sewa minimal 1 hari').max(30, 'Durasi sewa maksimal 30 hari'),
  pickupLocation: z.string().min(3, 'Lokasi serah terima minimal 3 karakter'),
  returnLocation: z.string().min(3, 'Lokasi pengembalian minimal 3 karakter'),
  customerName: z.string().min(3, 'Nama lengkap penyewa minimal 3 karakter'),
  customerPhone: z.string().regex(/^(?:\+62|62|08)[0-9]{8,13}$/, 'Format nomor WhatsApp Indonesia tidak valid (cth: 08123456789)'),
  customerNotes: z.string().optional()
});

export const socHandoverSchema = z.object({
  inquiryId: z.string().min(1, 'ID Reservasi wajib diisi'),
  vehicleId: z.string().min(1, 'ID Kendaraan wajib diisi'),
  handoverSocPct: z.number().int().min(0).max(100, 'Level baterai harus antara 0% - 100%'),
  handoverOdometerKm: z.number().positive('Odometer awal harus bernilai positif'),
  officerNotes: z.string().optional()
});

export const socReturnSchema = z.object({
  inquiryId: z.string().min(1, 'ID Reservasi wajib diisi'),
  returnSocPct: z.number().int().min(0).max(100, 'Level baterai harus antara 0% - 100%'),
  returnOdometerKm: z.number().positive('Odometer akhir harus bernilai positif'),
  officerNotes: z.string().optional()
});
