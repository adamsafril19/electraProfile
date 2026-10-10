import { Platform } from 'react-native';
import { Vehicle } from '../types/fleet';

const API_BASE_URL = 'http://localhost:5000/api/v1';
const REQUEST_TIMEOUT_MS = 15000;

// ---------- Tipe ----------

export type InquiryStatus = 'PENDING_WHATSAPP' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  PENDING_WHATSAPP: 'Menunggu Konfirmasi',
  CONFIRMED: 'Dikonfirmasi',
  ACTIVE: 'Sedang Disewa',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export interface SocLog {
  id: string;
  inquiryId: string;
  vehicleId: string;
  handoverSocPct: number;
  handoverOdometerKm: number;
  returnSocPct?: number;
  returnOdometerKm?: number;
  recoveryFeeAmount: number;
  officerNotes?: string;
}

export interface AdminInquiry {
  id: string;
  inquiryCode: string;
  status: InquiryStatus;
  vehicleId: string;
  vehicleName: string;
  serviceType: 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
  startDate: string;
  endDate: string;
  durationDays: number;
  pickupLocation: string;
  returnLocation: string;
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  estimatedTotal: number;
  createdAt: string;
  soc?: SocLog;
  driverId?: string;
  driverName?: string;
  paidAmount?: number;
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID';
}

export interface InquiryListResult {
  items: AdminInquiry[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<InquiryStatus, number>;
  flagCounts: { unpaid: number; needDriver: number; overdue: number };
  storage: 'database' | 'memory';
}

export type InquirySort = 'created' | 'start' | 'amount';
export type InquiryFlag = 'unpaid' | 'needDriver' | 'overdue';

export interface AgendaDay {
  date: string;
  pickups: AdminInquiry[];
  returns: AdminInquiry[];
}

export interface AdminSummary {
  storage: 'database' | 'memory';
  today: string;
  totals: { inquiries: number; statusCounts: Record<InquiryStatus, number> };
  needsAction: {
    pendingConfirmation: number;
    upcoming: AdminInquiry[];
    overdueReturns: AdminInquiry[];
    pending: AdminInquiry[];
    needDriver: AdminInquiry[];
    unpaidSoon: AdminInquiry[];
  };
  agenda: { today: AgendaDay; tomorrow: AgendaDay };
  trend: { weekTotal: number; prevWeekTotal: number };
  activeRentals: AdminInquiry[];
  last7Days: { date: string; count: number }[];
  revenue: {
    pending: number;
    confirmedAndActive: number;
    completed: number;
    batteryFeesCollected: number;
    lowBatteryReturnCount: number;
  };
  fleet: { total: number; active: number; inactive: number; available: number; inUse: number; maintenance: number };
  topVehicles: { vehicleId: string; vehicleName: string; count: number }[];
}

export type AdminVehicle = Vehicle & { isActive: boolean; status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' };

// ---------- Sesi ----------
// Token disimpan di sessionStorage (hilang saat tab ditutup). Di native hanya di memori karena
// belum ada secure storage; admin panel ditujukan untuk dibuka dari browser.

const TOKEN_KEY = 'electra_admin_token';
let memoryToken: string | null = null;

export const getAdminToken = (): string | null => {
  if (Platform.OS === 'web') {
    try {
      return window.sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return memoryToken;
    }
  }
  return memoryToken;
};

export const setAdminToken = (token: string | null) => {
  memoryToken = token;
  if (Platform.OS === 'web') {
    try {
      if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
      else window.sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // storage diblokir: cukup memori
    }
  }
};

// ---------- Request ----------

export class AdminApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public details?: any) {
    super(message);
  }
}

const request = async <T>(path: string, init: RequestInit = {}, auth = true): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const token = getAdminToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
  } catch (e: any) {
    throw new AdminApiError(
      e?.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Tidak dapat terhubung ke server.',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    // bukan JSON
  }

  if (!response.ok) {
    const fieldErrors = Array.isArray(body?.errors) ? body.errors.map((e: any) => e.message).join(' ') : '';
    throw new AdminApiError(fieldErrors || body?.message || `Permintaan gagal (${response.status}).`, response.status, body?.code, body?.details);
  }
  return body?.data as T;
};

const post = <T>(path: string, data: unknown, auth = true) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data) }, auth);
const patch = <T>(path: string, data: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });

// ---------- Endpoint ----------

export const adminLogin = async (username: string, password: string) => {
  const data = await post<{ token: string; expiresAt: string; username: string }>(
    '/admin/login',
    { username, password },
    false
  );
  setAdminToken(data.token);
  return data;
};

export const adminLogout = () => setAdminToken(null);

export const checkAdminSession = async (): Promise<boolean> => {
  if (!getAdminToken()) return false;
  try {
    await request('/admin/me');
    return true;
  } catch (e) {
    // Hanya sesi yang benar-benar ditolak yang dianggap berakhir; gangguan jaringan tidak
    if (e instanceof AdminApiError && e.status === 401) setAdminToken(null);
    else if (e instanceof AdminApiError && e.status === 0) throw e;
    return false;
  }
};

export const fetchSummary = () => request<AdminSummary>('/admin/summary');

export const fetchInquiries = (params: {
  status?: InquiryStatus;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: InquirySort;
  flags?: InquiryFlag[];
}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.sort && params.sort !== 'created') qs.set('sort', params.sort);
  if (params.flags && params.flags.length) qs.set('flags', params.flags.join(','));
  if (params.q) qs.set('q', params.q);
  qs.set('page', String(params.page || 1));
  qs.set('pageSize', String(params.pageSize || 20));
  return request<InquiryListResult>(`/admin/inquiries?${qs.toString()}`);
};

export const updateInquiryStatus = (id: string, status: InquiryStatus, force = false) =>
  patch<AdminInquiry>(`/admin/inquiries/${encodeURIComponent(id)}/status`, force ? { status, force: true } : { status });

export const fetchAdminFleet = () => request<AdminVehicle[]>('/admin/fleet');

export const updateVehicle = (
  id: string,
  changes: {
    isActive?: boolean;
    status?: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE';
    rates?: { serviceType: 'LEPAS_KUNCI' | 'DENGAN_DRIVER'; dailyRate: number; depositAmount: number }[];
  }
) => patch<AdminVehicle>(`/admin/fleet/${encodeURIComponent(id)}`, changes);

export const recordHandover = (data: {
  inquiryId: string;
  vehicleId: string;
  handoverSocPct: number;
  handoverOdometerKm: number;
  officerNotes?: string;
}) => post<SocLog>('/soc/handover', data);

export const recordReturn = (data: {
  inquiryId: string;
  returnSocPct: number;
  returnOdometerKm: number;
  officerNotes?: string;
}) => post<{ log: SocLog; recoveryFee: number; warningMessage: string }>('/soc/return', data);

// ---------- Driver ----------

export interface DriverTimeOff {
  id: string;
  from: string;
  to: string;
  reason: string;
}

export type DriverToday = 'TERSEDIA' | 'BERTUGAS' | 'CUTI' | 'NONAKTIF';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber?: string;
  notes?: string;
  isActive: boolean;
  timeOff: DriverTimeOff[];
  createdAt: string;
  today: DriverToday;
  upcoming: AdminInquiry[];
  completedCount: number;
}

const put = <T>(path: string, data: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(data) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export const fetchDrivers = () => request<Driver[]>('/admin/drivers');
export const createDriver = (data: { name: string; phone: string; licenseNumber?: string; notes?: string }) =>
  post<Driver>('/admin/drivers', data);
export const updateDriver = (
  id: string,
  data: { name?: string; phone?: string; licenseNumber?: string; notes?: string; isActive?: boolean }
) => patch<Driver>(`/admin/drivers/${encodeURIComponent(id)}`, data);
export const addDriverTimeOff = (id: string, data: { from: string; to: string; reason: string }) =>
  post<Driver>(`/admin/drivers/${encodeURIComponent(id)}/time-off`, data);
export const removeDriverTimeOff = (id: string, timeOffId: string) =>
  del<Driver>(`/admin/drivers/${encodeURIComponent(id)}/time-off/${encodeURIComponent(timeOffId)}`);
export const assignDriver = (inquiryId: string, driverId: string | null) =>
  put<AdminInquiry>(`/admin/inquiries/${encodeURIComponent(inquiryId)}/driver`, { driverId });

// ---------- Kalender ----------

export interface CalendarEvent extends AdminInquiry {
  vehicleConflictWith: string[];
  driverConflictWith: string[];
}

export interface CalendarData {
  from: string;
  to: string;
  events: CalendarEvent[];
  timeOff: (DriverTimeOff & { driverId: string; driverName: string })[];
}

export const fetchCalendar = (from: string, to: string) =>
  request<CalendarData>(`/admin/calendar?from=${from}&to=${to}`);

/** Unduh berkas .ics (perlu header Authorization, jadi tidak bisa lewat link biasa). Hanya web. */
export const downloadCalendarIcs = async (from: string, to: string): Promise<void> => {
  if (Platform.OS !== 'web') throw new AdminApiError('Ekspor kalender hanya tersedia di versi web.', 0);
  const token = getAdminToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/admin/calendar.ics?from=${from}&to=${to}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new AdminApiError('Tidak dapat terhubung ke server.', 0);
  }
  if (!res.ok) {
    let msg = `Ekspor gagal (${res.status}).`;
    try {
      msg = (await res.json())?.message || msg;
    } catch {
      // bukan JSON
    }
    throw new AdminApiError(msg, res.status);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `electra-jadwal-${from}_${to}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

/** Tautan "Tambah ke Google Calendar" untuk satu reservasi (acara seharian, akhir eksklusif). */
export const googleCalendarLink = (e: AdminInquiry): string => {
  const d = (s: string) => s.replace(/-/g, '');
  const service = e.serviceType === 'LEPAS_KUNCI' ? 'Lepas Kunci' : 'Dengan Sopir';
  const details = [
    `Kode: ${e.inquiryCode}`,
    `Pelanggan: ${e.customerName} (${e.customerPhone})`,
    `Layanan: ${service}`,
    e.driverName ? `Driver: ${e.driverName}` : '',
    `Pengembalian: ${e.returnLocation}`,
    e.customerNotes ? `Catatan: ${e.customerNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const qs = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${e.vehicleName} - ${e.customerName}`,
    dates: `${d(e.startDate)}/${d(e.endDate)}`,
    details,
    location: e.pickupLocation,
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
};

// ---------- Keuangan ----------

export type PaymentType = 'DP' | 'PELUNASAN' | 'DEPOSIT' | 'REFUND_DEPOSIT' | 'DENDA';
export type PaymentMethod = 'TRANSFER' | 'QRIS' | 'TUNAI';
export type ExpenseCategory = 'CHARGING' | 'PERAWATAN' | 'GAJI_DRIVER' | 'ASURANSI_PAJAK' | 'OPERASIONAL' | 'LAINNYA';

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  DP: 'DP',
  PELUNASAN: 'Pelunasan',
  DEPOSIT: 'Deposit',
  REFUND_DEPOSIT: 'Pengembalian deposit',
  DENDA: 'Denda',
};
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = { TRANSFER: 'Transfer', QRIS: 'QRIS', TUNAI: 'Tunai' };
export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  CHARGING: 'Charging / SPKLU',
  PERAWATAN: 'Perawatan',
  GAJI_DRIVER: 'Gaji driver',
  ASURANSI_PAJAK: 'Asuransi & pajak',
  OPERASIONAL: 'Operasional',
  LAINNYA: 'Lainnya',
};

export interface Payment {
  id: string;
  inquiryId: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  paidAt: string;
  note?: string;
  createdAt: string;
  voidedAt?: string;
  voidReason?: string;
}

export interface InquiryFinance {
  rentDue: number;
  rentPaid: number;
  outstanding: number;
  depositPaid: number;
  depositRefunded: number;
  batteryFee: number;
  depositHeld: number;
  payments: Payment[];
}

export interface FinanceSummary {
  serverTime: string;
  from: string;
  to: string;
  income: { total: number; byType: Record<string, number>; byMethod: Record<string, number> };
  expense: { total: number; byCategory: Record<string, number> };
  net: number;
  deposit: { receivedInPeriod: number; refundedInPeriod: number; heldNow: number };
  receivables: {
    total: number;
    count: number;
    items: {
      id: string;
      inquiryCode: string;
      customerName: string;
      customerPhone: string;
      vehicleName: string;
      status: InquiryStatus;
      startDate: string;
      rentDue: number;
      rentPaid: number;
      outstanding: number;
    }[];
  };
  series: { label: string; income: number; expense: number }[];
  seriesUnit: 'DAY' | 'MONTH';
}

export interface LedgerEntry {
  id: string;
  kind: 'IN' | 'OUT';
  source: 'PAYMENT' | 'EXPENSE';
  type: string;
  method?: PaymentMethod;
  amount: number;
  date: string;
  note?: string;
  inquiryCode?: string;
  customerName?: string;
  vehicleName?: string;
  driverName?: string;
  createdAt: string;
  voidedAt?: string;
  voidReason?: string;
}

export const fetchFinanceSummary = (from: string, to: string) =>
  request<FinanceSummary>(`/admin/finance/summary?from=${from}&to=${to}`);
export const fetchLedger = (from: string, to: string, kind?: 'IN' | 'OUT') =>
  request<LedgerEntry[]>(`/admin/finance/ledger?from=${from}&to=${to}${kind ? `&kind=${kind}` : ''}`);
export const fetchInquiryFinance = (inquiryId: string) =>
  request<InquiryFinance>(`/admin/inquiries/${encodeURIComponent(inquiryId)}/finance`);
export const createPayment = (data: {
  inquiryId: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  paidAt: string;
  note?: string;
}) => post<Payment>('/admin/payments', data);
export const voidPayment = (id: string, reason: string) => post<Payment>(`/admin/payments/${encodeURIComponent(id)}/void`, { reason });
export const createExpense = (data: {
  category: ExpenseCategory;
  amount: number;
  date: string;
  vehicleId?: string;
  driverId?: string;
  note?: string;
}) => post<unknown>('/admin/expenses', data);
export const voidExpense = (id: string, reason: string) => post<unknown>(`/admin/expenses/${encodeURIComponent(id)}/void`, { reason });

// ---------- Live chat ----------

export interface ChatSessionItem {
  id: string;
  customerName: string;
  createdAt: string;
  lastMessageAt: string;
  unread: number;
  lastMessage: { sender: 'CUSTOMER' | 'ADMIN'; text: string } | null;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'CUSTOMER' | 'ADMIN';
  text: string;
  createdAt: string;
}

export const fetchChatSessions = () => request<ChatSessionItem[]>('/admin/chat/sessions');
export const fetchChatMessages = (sessionId: string, afterId?: string) =>
  request<{ session: { id: string; customerName: string; createdAt: string }; messages: ChatMessage[] }>(
    `/admin/chat/sessions/${encodeURIComponent(sessionId)}/messages${afterId ? `?after=${encodeURIComponent(afterId)}` : ''}`
  );
export const sendChatReply = (sessionId: string, text: string) =>
  post<ChatMessage>(`/admin/chat/sessions/${encodeURIComponent(sessionId)}/messages`, { text });

// ---------- Badge sidebar ----------

export interface AdminBadges {
  pendingInquiries: number;
  overdueReturns: number;
  unreadChats: number;
  unpaid: number;
  drivers: number;
}
export const fetchBadges = () => request<AdminBadges>('/admin/badges');
