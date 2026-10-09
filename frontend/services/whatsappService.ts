import { Linking, Platform } from 'react-native';
import { BookingFormInput, Vehicle } from '../types/fleet';

const ADMIN_PHONE = '6281234567890'; // Default phone admin

// Di web, window.open setelah await (mis. menunggu API) sering diblokir browser.
// Buka tab kosong saat klik, lalu arahkan ke WhatsApp setelah URL siap.
export const openPendingTab = (): Window | null => (Platform.OS === 'web' ? window.open('', '_blank') : null);

const navigateWeb = (url: string, pendingTab?: Window | null) => {
  if (pendingTab && !pendingTab.closed) {
    pendingTab.location.href = url;
  } else {
    window.open(url, '_blank');
  }
};

// Kode sementara dibuat di perangkat, bukan kode inquiry resmi dari server
export const generateLocalReference = (): string => `WEB-${Date.now().toString(36).toUpperCase().slice(-6)}`;

export const openWhatsAppDirect = async (
  vehicle: Vehicle,
  form: BookingFormInput,
  apiRedirectUrl?: string,
  pendingTab?: Window | null
): Promise<void> => {
  if (apiRedirectUrl) {
    if (Platform.OS === 'web') {
      navigateWeb(apiRedirectUrl, pendingTab);
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
  const rate = vehicle.rates.find(r => r.serviceType === form.serviceType)?.dailyRate || 0;
  const estTotal = rate * form.durationDays;
  const message = [
    'Halo Admin Rental Mobil Listrik, saya ingin reservasi unit dengan rincian berikut:\n',
    `*KODE REFERENSI SEMENTARA: #${generateLocalReference()}* (belum tercatat di sistem)`,
    '*DETAIL RESERVASI KENDARAAN:*',
    `- Unit: *${vehicle.brand} ${vehicle.model}*`,
    `- Layanan: *${serviceLabel}*`,
    `- Tanggal Mulai: *${form.startDate}*`,
    `- Durasi Sewa: *${form.durationDays} Hari*`,
    `- Estimasi Biaya: *Rp ${estTotal.toLocaleString('id-ID')}* (Rp ${rate.toLocaleString('id-ID')} x ${form.durationDays} hari)`,
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
    navigateWeb(waWebUrl, pendingTab);
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
