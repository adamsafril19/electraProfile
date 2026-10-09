import { INITIAL_FLEET } from '../constants/fleetData';
import { Vehicle, BookingFormInput } from '../types/fleet';

const API_BASE_URL = 'http://localhost:5000/api/v1';

export const fetchFleetList = async (): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/fleet`);
    if (!response.ok) throw new Error('Gagal mengambil data dari server');
    const result = await response.json();
    return result.data && result.data.length > 0 ? result.data : INITIAL_FLEET;
  } catch (error) {
    console.warn('[API Warning] Menggunakan offline fallback fleet data:', error);
    return INITIAL_FLEET;
  }
};

export const fetchVehicleBySlug = async (slug: string): Promise<Vehicle | undefined> => {
  try {
    const response = await fetch(`${API_BASE_URL}/fleet/${slug}`);
    if (!response.ok) throw new Error('Kendaraan tidak ditemukan di API');
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.warn('[API Warning] Menggunakan offline fallback vehicle data:', error);
    return INITIAL_FLEET.find(v => v.slug === slug);
  }
};

export const submitBookingInquiry = async (
  input: BookingFormInput
): Promise<{ success: boolean; redirectUrl?: string; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
    const result = await response.json();
    if (response.ok && result.data?.whatsappRedirectUrl) {
      return {
        success: true,
        redirectUrl: result.data.whatsappRedirectUrl
      };
    }
    return {
      success: false,
      message: result.message || 'Gagal memproses reservasi'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Koneksi ke backend gagal'
    };
  }
};
