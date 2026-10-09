import { Linking, Platform } from 'react-native';
import { BookingFormInput, Vehicle } from '../types/fleet';

const ADMIN_PHONE = '6281234567890'; // Default phone admin

export const openWhatsAppDirect = async (
  vehicle: Vehicle,
  form: BookingFormInput,
  apiRedirectUrl?: string
): Promise<void> => {
  if (apiRedirectUrl) {
    if (Platform.OS === 'web') {
      window.open(apiRedirectUrl, '_blank');
      return;
    } else {
      const canOpen = await Linking.canOpenURL(apiRedirectUrl);
      if (canOpen) {
        await Linking.openURL(apiRedirectUrl);
        return;
      }
    }
  }

  // Client-side fallback message construction
  const serviceLabel = form.serviceType === 'LEPAS_KUNCI' ? 'Lepas Kunci (24 Jam)' : 'Dengan Driver (12 Jam)';
  const message = [
    'Halo Admin Rental Mobil Listrik, saya ingin reservasi unit dengan rincian berikut:\n',
    '*DETAIL RESERVASI KENDARAAN:*',
    `- Unit: *${vehicle.brand} ${vehicle.model}*`,
    `- Layanan: *${serviceLabel}*`,
    `- Tanggal Mulai: *${form.startDate}*`,
    `- Durasi Sewa: *${form.durationDays} Hari*`,
    `- Lokasi Serah Terima: *${form.pickupLocation}*`,
    `- Lokasi Pengembalian: *${form.returnLocation}*\n`,
    '*DATA PENYEWA:*',
    `- Nama: *${form.customerName}*`,
    `- No. WhatsApp: *${form.customerPhone}*`,
    `- Catatan Khusus: *${form.customerNotes || 'Tidak Ada'}*\n`,
    'Mohon informasi ketersediaan jadwal unit dan persyaratan verifikasi dokumennya. Terima kasih!'
  ].join('\n');

  const encoded = encodeURIComponent(message);
  const waWebUrl = `https://wa.me/${ADMIN_PHONE}?text=${encoded}`;

  if (Platform.OS === 'web') {
    window.open(waWebUrl, '_blank');
  } else {
    const nativeScheme = `whatsapp://send?phone=${ADMIN_PHONE}&text=${encoded}`;
    try {
      const canOpen = await Linking.canOpenURL(nativeScheme);
      if (canOpen) {
        await Linking.openURL(nativeScheme);
      } else {
        await Linking.openURL(waWebUrl);
      }
    } catch {
      await Linking.openURL(waWebUrl);
    }
  }
};
