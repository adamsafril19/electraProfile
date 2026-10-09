import { ENV } from '../config/env';
import { BookingInquiry } from '../types';

export class WhatsAppService {
  public static generateRedirectUrl(inquiry: Omit<BookingInquiry, 'whatsappRedirectUrl' | 'id' | 'status' | 'createdAt'>): string {
    const adminPhone = ENV.ADMIN_WHATSAPP_NUMBER;
    const serviceLabel = inquiry.serviceType === 'LEPAS_KUNCI' ? 'Lepas Kunci (24 Jam)' : 'Dengan Driver (12 Jam)';

    const message = [
      'Halo Admin Rental Mobil Listrik, saya ingin reservasi unit dengan rincian berikut:\n',
      `*KODE INQUIRY: #${inquiry.inquiryCode}*`,
      '*DETAIL RESERVASI KENDARAAN:*',
      `- Unit: *${inquiry.vehicleName}*`,
      `- Layanan: *${serviceLabel}*`,
      `- Tanggal Mulai: *${inquiry.startDate}*`,
      `- Durasi Sewa: *${inquiry.durationDays} Hari*`,
      `- Lokasi Serah Terima: *${inquiry.pickupLocation}*`,
      `- Lokasi Pengembalian: *${inquiry.returnLocation}*\n`,
      '*DATA PENYEWA:*',
      `- Nama: *${inquiry.customerName}*`,
      `- No. WhatsApp: *${inquiry.customerPhone}*`,
      `- Catatan Khusus: *${inquiry.customerNotes || 'Tidak Ada'}*\n`,
      'Mohon informasi ketersediaan jadwal unit dan persyaratan verifikasi dokumennya. Terima kasih!'
    ].join('\n');

    const encodedText = encodeURIComponent(message);
    return `https://wa.me/${adminPhone}?text=${encodedText}`;
  }
}
