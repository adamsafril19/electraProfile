import { INITIAL_FLEET } from '../constants/fleetData';
import { Vehicle, BookingFormInput } from '../types/fleet';

const API_BASE_URL = 'http://localhost:5000/api/v1';
const REQUEST_TIMEOUT_MS = 10000;

// fetch tanpa batas waktu bisa menggantung selamanya saat server mati/lambat
const fetchWithTimeout = async (url: string, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const describeNetworkError = (error: any): string =>
  error?.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Tidak dapat terhubung ke server.';

export interface FleetResult {
  vehicles: Vehicle[];
  // true = data berasal dari cadangan offline, harga bisa berbeda dari server
  offline: boolean;
}

export interface VehicleResult {
  vehicle?: Vehicle;
  offline: boolean;
}

export const fetchFleetResult = async (): Promise<FleetResult> => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/fleet`);
    if (!response.ok) throw new Error('Gagal mengambil data dari server');
    const result = await response.json();
    if (result.data && result.data.length > 0) return { vehicles: result.data, offline: false };
    return { vehicles: INITIAL_FLEET, offline: true };
  } catch (error) {
    console.warn('[API Warning] Menggunakan offline fallback fleet data:', error);
    return { vehicles: INITIAL_FLEET, offline: true };
  }
};

export const fetchVehicleResult = async (slug: string): Promise<VehicleResult> => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/fleet/${slug}`);
    // 404 dari server berarti unit memang tidak ada, bukan masalah koneksi
    if (response.status === 404) return { vehicle: undefined, offline: false };
    if (!response.ok) throw new Error('Gagal mengambil data kendaraan');
    const result = await response.json();
    return { vehicle: result.data, offline: false };
  } catch (error) {
    console.warn('[API Warning] Menggunakan offline fallback vehicle data:', error);
    return { vehicle: INITIAL_FLEET.find((v) => v.slug === slug), offline: true };
  }
};

export const fetchFleetList = async (): Promise<Vehicle[]> => (await fetchFleetResult()).vehicles;

export const fetchVehicleBySlug = async (slug: string): Promise<Vehicle | undefined> =>
  (await fetchVehicleResult(slug)).vehicle;

export type InquiryResult =
  | { success: true; redirectUrl: string }
  // 'network' = server tidak terjangkau (boleh lanjut via WhatsApp tanpa kode); 'rejected' = ditolak server (mis. validasi)
  | { success: false; kind: 'network' | 'rejected'; message: string };

export const submitBookingInquiry = async (input: BookingFormInput): Promise<InquiryResult> => {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (error: any) {
    return { success: false, kind: 'network', message: describeNetworkError(error) };
  }

  let result: any = null;
  try {
    result = await response.json();
  } catch {
    // Body bukan JSON (mis. halaman error proxy)
  }

  if (response.ok && result?.data?.whatsappRedirectUrl) {
    return { success: true, redirectUrl: result.data.whatsappRedirectUrl };
  }

  // 5xx dianggap masalah server (boleh fallback); 4xx berarti data ditolak
  const kind = response.status >= 500 ? 'network' : 'rejected';
  const fieldErrors: string = Array.isArray(result?.errors) ? result.errors.map((e: any) => e.message).join(' ') : '';
  return {
    success: false,
    kind,
    message:
      fieldErrors ||
      result?.message ||
      (kind === 'network' ? 'Server sedang bermasalah.' : 'Data reservasi ditolak server.'),
  };
};
