import { z } from 'zod';

export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi').max(100),
  password: z.string().min(1, 'Password wajib diisi').max(200)
});

export const INQUIRY_STATUSES = ['PENDING_WHATSAPP', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;

export const updateInquiryStatusSchema = z.object({
  status: z.enum(INQUIRY_STATUSES, { errorMap: () => ({ message: 'Status reservasi tidak valid' }) }),
  // true = admin sudah melihat peringatan bentrok jadwal dan tetap melanjutkan
  force: z.boolean().optional()
});

const dateStr = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} harus berformat YYYY-MM-DD`);
const phoneId = z.string().regex(/^(?:\+62|62|08)[0-9]{8,13}$/, 'Format nomor WhatsApp Indonesia tidak valid (cth: 08123456789)');

export const createDriverSchema = z.object({
  name: z.string().trim().min(3, 'Nama driver minimal 3 karakter').max(80),
  phone: phoneId,
  licenseNumber: z.string().max(40).optional(),
  notes: z.string().max(300).optional()
});

export const updateDriverSchema = z
  .object({
    name: z.string().trim().min(3, 'Nama driver minimal 3 karakter').max(80).optional(),
    phone: phoneId.optional(),
    licenseNumber: z.string().max(40).optional(),
    notes: z.string().max(300).optional(),
    isActive: z.boolean().optional()
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Tidak ada perubahan yang dikirim' });

export const timeOffSchema = z
  .object({
    from: dateStr('Tanggal mulai cuti'),
    to: dateStr('Tanggal akhir cuti'),
    reason: z.string().trim().min(3, 'Alasan cuti minimal 3 karakter').max(120)
  })
  .refine((d) => d.from <= d.to, { message: 'Tanggal akhir cuti tidak boleh sebelum tanggal mulai', path: ['to'] });

export const assignDriverSchema = z.object({
  driverId: z.string().min(1).nullable()
});

export const calendarQuerySchema = z.object({
  from: dateStr('Tanggal awal'),
  to: dateStr('Tanggal akhir')
});

const rupiah = (label: string) =>
  z
    .number({ invalid_type_error: `${label} harus berupa angka` })
    .int(`${label} harus bilangan bulat`)
    .min(1, `${label} harus lebih dari 0`)
    .max(1_000_000_000, `${label} terlalu besar`);

export const createPaymentSchema = z.object({
  inquiryId: z.string().min(1, 'Reservasi wajib dipilih'),
  type: z.enum(['DP', 'PELUNASAN', 'DEPOSIT', 'REFUND_DEPOSIT', 'DENDA'], { errorMap: () => ({ message: 'Jenis pembayaran tidak valid' }) }),
  method: z.enum(['TRANSFER', 'QRIS', 'TUNAI'], { errorMap: () => ({ message: 'Metode pembayaran tidak valid' }) }),
  amount: rupiah('Jumlah'),
  paidAt: dateStr('Tanggal pembayaran'),
  note: z.string().max(200).optional()
});

export const createExpenseSchema = z.object({
  category: z.enum(['CHARGING', 'PERAWATAN', 'GAJI_DRIVER', 'ASURANSI_PAJAK', 'OPERASIONAL', 'LAINNYA'], {
    errorMap: () => ({ message: 'Kategori pengeluaran tidak valid' })
  }),
  amount: rupiah('Jumlah'),
  date: dateStr('Tanggal pengeluaran'),
  vehicleId: z.string().min(1).optional(),
  driverId: z.string().min(1).optional(),
  note: z.string().max(200).optional()
});

export const voidSchema = z.object({
  reason: z.string().trim().min(3, 'Alasan pembatalan minimal 3 karakter').max(200)
});

export const financeRangeSchema = z.object({
  from: dateStr('Tanggal awal').optional(),
  to: dateStr('Tanggal akhir').optional(),
  kind: z.enum(['IN', 'OUT']).optional()
});

export const chatTextSchema = z.object({ text: z.string().max(5000) });

export const listInquiriesQuerySchema = z.object({
  status: z.enum(INQUIRY_STATUSES).optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(['created', 'start', 'amount']).default('created'),
  // Filter cepat dipisah koma: unpaid, needDriver, overdue
  flags: z.string().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const money = (label: string) =>
  z.number({ invalid_type_error: `${label} harus berupa angka` }).int(`${label} harus bilangan bulat`).min(0, `${label} tidak boleh negatif`).max(100_000_000, `${label} terlalu besar`);

export const updateVehicleSchema = z
  .object({
    isActive: z.boolean().optional(),
    status: z.enum(['AVAILABLE', 'BOOKED', 'MAINTENANCE']).optional(),
    rates: z
      .array(
        z.object({
          serviceType: z.enum(['LEPAS_KUNCI', 'DENGAN_DRIVER']),
          dailyRate: money('Tarif harian').refine((n) => n > 0, 'Tarif harian harus lebih dari 0'),
          depositAmount: money('Deposit')
        })
      )
      .optional()
  })
  .refine((d) => d.isActive !== undefined || d.status !== undefined || (d.rates && d.rates.length > 0), {
    message: 'Tidak ada perubahan yang dikirim'
  });
