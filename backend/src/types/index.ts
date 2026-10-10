export type ServiceType = 'LEPAS_KUNCI' | 'DENGAN_DRIVER';

export type BodyType = 'CITY_CAR' | 'COMPACT_SUV' | 'MPV';

export type PortType = 'CCS2' | 'GB_T' | 'TYPE_2';

export type VehicleStatus = 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE';

export interface VehicleSpecs {
  batteryCapacityKwh: number;
  rangeCltcKm: number;
  rangeWltpKm?: number;
  portType: PortType;
  maxAcKw: number;
  maxDcKw?: number;
  seatingCapacity: number;
  portableChargerIncluded: boolean;
  gbtAdapterIncluded: boolean;
  chargingTimeAcHours: number;
  chargingTimeDcMinutes?: number;
}

export interface RentalRate {
  serviceType: ServiceType;
  dailyRate: number;
  depositAmount: number;
  overtimeHourlyRate: number;
}

export interface Vehicle {
  id: string;
  slug: string;
  brand: string;
  model: string;
  bodyType: BodyType;
  licensePlate: string;
  imageUrl: string;
  thumbnailUrl: string;
  status: VehicleStatus;
  isActive: boolean;
  specs: VehicleSpecs;
  rates: RentalRate[];
  tags: string[];
}

export interface BookingInquiry {
  id: string;
  inquiryCode: string;
  vehicleId: string;
  vehicleName: string;
  serviceType: ServiceType;
  startDate: string;
  durationDays: number;
  pickupLocation: string;
  returnLocation: string;
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  status: 'PENDING_WHATSAPP' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  whatsappRedirectUrl: string;
  createdAt: string;
}

export type InquiryStatus = 'PENDING_WHATSAPP' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

// Bentuk data reservasi untuk panel admin (memuat data pelanggan lengkap, jangan dipakai di endpoint publik)
export interface AdminInquiry {
  id: string;
  inquiryCode: string;
  status: InquiryStatus;
  vehicleId: string;
  vehicleName: string;
  serviceType: ServiceType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (startDate + durationDays)
  durationDays: number;
  pickupLocation: string;
  returnLocation: string;
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  estimatedTotal: number;
  createdAt: string;
  soc?: SocHandoverLog;
  driverId?: string;
  driverName?: string;
  // Ditambahkan layanan keuangan: total dibayar (sewa) dan status pelunasan
  paidAmount?: number;
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID';
}

export interface SocHandoverLog {
  id: string;
  inquiryId: string;
  vehicleId: string;
  handoverSocPct: number;
  handoverOdometerKm: number;
  returnSocPct?: number;
  returnOdometerKm?: number;
  recoveryFeeAmount: number;
  officerNotes?: string;
  createdAt: string;
}

// ---------- Driver ----------
export interface DriverTimeOff {
  id: string;
  from: string; // YYYY-MM-DD (inklusif)
  to: string; // YYYY-MM-DD (inklusif)
  reason: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber?: string;
  notes?: string;
  isActive: boolean;
  timeOff: DriverTimeOff[];
  createdAt: string;
}

// ---------- Keuangan ----------
export type PaymentType = 'DP' | 'PELUNASAN' | 'DEPOSIT' | 'REFUND_DEPOSIT' | 'DENDA';
export type PaymentMethod = 'TRANSFER' | 'QRIS' | 'TUNAI';

export interface Payment {
  id: string;
  inquiryId: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  paidAt: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
  voidedAt?: string;
  voidReason?: string;
}

export type ExpenseCategory = 'CHARGING' | 'PERAWATAN' | 'GAJI_DRIVER' | 'ASURANSI_PAJAK' | 'OPERASIONAL' | 'LAINNYA';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  vehicleId?: string;
  driverId?: string;
  note?: string;
  createdAt: string;
  voidedAt?: string;
  voidReason?: string;
}

// ---------- Live chat ----------
export interface ChatSession {
  id: string; // rahasia 128-bit, hanya diketahui pelanggan pemilik sesi
  customerName: string;
  createdAt: string;
  lastMessageAt: string;
  unreadForAdmin: number;
  unreadForCustomer: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'CUSTOMER' | 'ADMIN';
  text: string;
  createdAt: string;
}
