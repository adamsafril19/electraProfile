import { AdminApiError, AdminInquiry, updateInquiryStatus } from '../../services/adminApi';
import { confirmAction } from './ui';
import { toast } from './feedback';

/**
 * Mengonfirmasi reservasi dengan penanganan bentrok jadwal: bila unit sudah terpakai / dalam perawatan,
 * admin diminta memutuskan dulu, lalu konfirmasi diulang dengan force. Dipakai dashboard dan halaman Pesanan.
 * Mengembalikan true bila reservasi berhasil dikonfirmasi.
 */
export const confirmInquiryFlow = async (i: AdminInquiry, onUnauthorized: () => void): Promise<boolean> => {
  try {
    try {
      await updateInquiryStatus(i.id, 'CONFIRMED');
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 409 && (e.code === 'VEHICLE_CONFLICT' || e.code === 'VEHICLE_MAINTENANCE')) {
        if (!(await confirmAction(`${e.message}\n\nTetap konfirmasi reservasi ini?`))) return false;
        await updateInquiryStatus(i.id, 'CONFIRMED', true);
      } else {
        throw e;
      }
    }
    toast.success(`${i.inquiryCode}: dikonfirmasi`);
    return true;
  } catch (e) {
    if (e instanceof AdminApiError && e.status === 401) {
      onUnauthorized();
      return false;
    }
    toast.error(e instanceof AdminApiError ? e.message : 'Gagal mengonfirmasi reservasi.');
    return false;
  }
};
