/**
 * Membuat data demo statis untuk mengecek tampilan panel admin dengan kondisi "ada data".
 *
 *   npm run seed:demo      -> tulis backend/data/demo-store.json
 *   npm run dev:demo       -> seed + jalankan backend memakai berkas demo (data asli tidak disentuh)
 *
 * Isinya deterministik (tanpa angka acak). Tanggal dinyatakan relatif terhadap HARI INI (WIB)
 * supaya kalender, "terlambat kembali", dan grafik selalu terisi.
 */
import fs from 'fs';
import path from 'path';
import { MOCK_FLEET } from '../data/mockFleet';
import { addDaysStr, dateWib } from '../utils/dates';
import type { StoreData } from '../utils/JsonStore';
import type { BookingInquiry, ChatMessage, ChatSession, Driver, Expense, Payment, PaymentType, SocHandoverLog } from '../types';

const today = dateWib();
const d = (offset: number) => addDaysStr(today, offset);
// Waktu lokal WIB -> ISO UTC
const at = (offset: number, hhmm = '10:00') => new Date(`${d(offset)}T${hhmm}:00+07:00`).toISOString();

const vehicle = (id: string) => MOCK_FLEET.find((v) => v.id === id)!;
const rate = (vid: string, svc: 'LEPAS_KUNCI' | 'DENGAN_DRIVER') => vehicle(vid).rates.find((r) => r.serviceType === svc)!;

// ---------- Driver ----------
const drivers: Driver[] = [
  { id: 'drv-demo-1', name: 'Pak Agus Salim', phone: '081211110001', licenseNumber: 'A 8801 2210', notes: 'Fasih bahasa Inggris, hafal rute wisata Ubud', isActive: true, timeOff: [], createdAt: at(-120) },
  { id: 'drv-demo-2', name: 'Pak Wayan Sudira', phone: '081211110002', licenseNumber: 'A 7712 0931', notes: 'Berpengalaman 8 tahun, nyaman untuk keluarga', isActive: true, timeOff: [{ id: 'to-demo-1', from: d(9), to: d(10), reason: 'Upacara keluarga' }], createdAt: at(-110) },
  { id: 'drv-demo-3', name: 'Pak Gede Arta', phone: '081211110003', licenseNumber: 'A 9015 4478', isActive: true, timeOff: [], createdAt: at(-90) },
  { id: 'drv-demo-4', name: 'Pak Ketut Rai', phone: '081211110004', licenseNumber: 'A 6620 1187', notes: 'Spesialis antar-jemput bandara', isActive: true, timeOff: [{ id: 'to-demo-2', from: d(2), to: d(4), reason: 'Sakit (surat dokter)' }], createdAt: at(-80) },
  { id: 'drv-demo-5', name: 'Pak Nyoman Adi', phone: '081211110005', isActive: false, notes: 'Mengundurkan diri', timeOff: [], createdAt: at(-200) },
];

// ---------- Reservasi ----------
interface Spec {
  n: number; // nomor kode
  name: string;
  phone: string;
  vehicleId: string;
  service: 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
  start: number; // offset hari dari hari ini
  days: number;
  status: BookingInquiry['status'];
  created: number; // offset hari saat reservasi masuk
  createdAt?: string;
  pickup: string;
  returnLoc?: string;
  notes?: string;
  driver?: string;
}

const P = {
  bandara: 'Bandara I Gusti Ngurah Rai (Kedatangan)',
  sanur: 'Hotel Sanur Paradise, Sanur',
  ubud: 'Villa Ubud Hanging Gardens, Ubud',
  seminyak: 'W Bali Seminyak',
  kuta: 'Beachwalk Kuta',
  canggu: 'Villa Canggu Breeze, Canggu',
};

const SPECS: Spec[] = [
  // Selesai
  { n: 1001, name: 'Komang Ayu Lestari', phone: '081337701001', vehicleId: 'veh-001', service: 'LEPAS_KUNCI', start: -20, days: 3, status: 'COMPLETED', created: -24, pickup: P.bandara },
  { n: 1002, name: 'Made Wirawan', phone: '081337701002', vehicleId: 'veh-003', service: 'DENGAN_DRIVER', start: -16, days: 2, status: 'COMPLETED', created: -19, pickup: P.ubud, driver: 'drv-demo-1', notes: 'Tur Ubud & Tegallalang' },
  { n: 1003, name: 'Sarah Johnson', phone: '081337701003', vehicleId: 'veh-004', service: 'LEPAS_KUNCI', start: -14, days: 5, status: 'COMPLETED', created: -18, pickup: P.bandara, notes: 'Keluarga 6 orang, butuh kursi bayi' },
  { n: 1004, name: 'Budi Hartono', phone: '081337701004', vehicleId: 'veh-002', service: 'LEPAS_KUNCI', start: -8, days: 2, status: 'COMPLETED', created: -10, pickup: P.sanur },
  { n: 1005, name: 'Putu Gede Mahendra', phone: '081337701005', vehicleId: 'veh-005', service: 'DENGAN_DRIVER', start: -7, days: 3, status: 'COMPLETED', created: -9, pickup: P.seminyak, driver: 'drv-demo-2' },
  // Dibatalkan
  { n: 1006, name: 'Linda Wijaya', phone: '081337701006', vehicleId: 'veh-001', service: 'LEPAS_KUNCI', start: -3, days: 2, status: 'CANCELLED', created: -6, pickup: P.kuta, notes: 'Penerbangan dibatalkan' },
  // Sedang disewa
  { n: 1007, name: 'Ahmad Fauzi', phone: '081337701007', vehicleId: 'veh-003', service: 'LEPAS_KUNCI', start: -2, days: 4, status: 'ACTIVE', created: -5, pickup: P.bandara },
  { n: 1008, name: 'Emma Schmidt', phone: '081337701008', vehicleId: 'veh-004', service: 'DENGAN_DRIVER', start: -1, days: 3, status: 'ACTIVE', created: -4, pickup: P.seminyak, driver: 'drv-demo-3', notes: 'Rute Ubud - Lovina' },
  { n: 1009, name: 'Kadek Dewi Anggraini', phone: '081337701009', vehicleId: 'veh-002', service: 'LEPAS_KUNCI', start: -5, days: 3, status: 'ACTIVE', created: -8, pickup: P.canggu },
  // Dikonfirmasi
  { n: 1010, name: 'Yusuf Rahman', phone: '081337701010', vehicleId: 'veh-001', service: 'DENGAN_DRIVER', start: 1, days: 2, status: 'CONFIRMED', created: -3, pickup: P.bandara, driver: 'drv-demo-1' },
  { n: 1011, name: 'Michael Tan', phone: '081337701011', vehicleId: 'veh-004', service: 'LEPAS_KUNCI', start: 2, days: 4, status: 'CONFIRMED', created: -2, pickup: P.sanur },
  { n: 1012, name: 'Ni Luh Sari Dewi', phone: '081337701012', vehicleId: 'veh-003', service: 'LEPAS_KUNCI', start: 4, days: 3, status: 'CONFIRMED', created: -1, pickup: P.kuta },
  { n: 1013, name: 'Tomoko Sato', phone: '081337701013', vehicleId: 'veh-004', service: 'DENGAN_DRIVER', start: 6, days: 5, status: 'CONFIRMED', created: -2, pickup: P.bandara, notes: 'Perlu driver berbahasa Jepang/Inggris' },
  // Bentrok sengaja: unit sama dengan #1010 dan tanggal beririsan
  { n: 1017, name: 'Hendra Wijaya', phone: '081337701017', vehicleId: 'veh-001', service: 'LEPAS_KUNCI', start: 2, days: 3, status: 'CONFIRMED', created: -1, pickup: P.canggu, notes: 'DEMO: sengaja bentrok dengan EV-2026-1010' },
  // Menunggu konfirmasi
  { n: 1014, name: 'Rizky Pratama', phone: '081337701014', vehicleId: 'veh-001', service: 'LEPAS_KUNCI', start: 0, days: 2, status: 'PENDING_WHATSAPP', created: 0, createdAt: at(0, '08:42'), pickup: P.bandara, notes: 'Mendarat pukul 13.00' },
  { n: 1015, name: 'Anna Müller', phone: '081337701015', vehicleId: 'veh-002', service: 'DENGAN_DRIVER', start: 3, days: 3, status: 'PENDING_WHATSAPP', created: 0, createdAt: at(0, '09:15'), pickup: P.ubud },
  { n: 1016, name: 'Dewa Putra Negara', phone: '081337701016', vehicleId: 'veh-002', service: 'LEPAS_KUNCI', start: 8, days: 2, status: 'PENDING_WHATSAPP', created: -1, pickup: P.sanur },
];

const inquiries: BookingInquiry[] = SPECS.map((s) => {
  const v = vehicle(s.vehicleId);
  return {
    id: `inq-demo-${s.n}`,
    inquiryCode: `EV-2026-${s.n}`,
    vehicleId: s.vehicleId,
    vehicleName: `${v.brand} ${v.model}`,
    serviceType: s.service,
    startDate: d(s.start),
    durationDays: s.days,
    pickupLocation: s.pickup,
    returnLocation: s.returnLoc || 'Sama dengan lokasi penjemputan',
    customerName: s.name,
    customerPhone: s.phone,
    customerNotes: s.notes,
    status: s.status,
    whatsappRedirectUrl: '',
    createdAt: s.createdAt || at(s.created, `${String(9 + (s.n % 8)).padStart(2, '0')}:${String((s.n * 7) % 60).padStart(2, '0')}`),
  };
});

const idOf = (n: number) => `inq-demo-${n}`;
const spec = (n: number) => SPECS.find((s) => s.n === n)!;
const total = (n: number) => {
  const s = spec(n);
  return rate(s.vehicleId, s.service).dailyRate * s.days;
};
const deposit = (n: number) => {
  const s = spec(n);
  return s.service === 'LEPAS_KUNCI' ? rate(s.vehicleId, 'LEPAS_KUNCI').depositAmount : 0;
};

// ---------- SoC ----------
const soc = (n: number, handover: number, odo: number, ret?: { pct: number; odo: number }, notes?: string): SocHandoverLog => {
  const fee = ret ? (ret.pct < 10 ? 150000 : ret.pct < 20 ? 50000 : 0) : 0;
  const s = spec(n);
  return {
    id: `soc-demo-${n}`,
    inquiryId: idOf(n),
    vehicleId: s.vehicleId,
    handoverSocPct: handover,
    handoverOdometerKm: odo,
    returnSocPct: ret?.pct,
    returnOdometerKm: ret?.odo,
    recoveryFeeAmount: fee,
    officerNotes: notes,
    createdAt: at(s.start, '10:30'),
  };
};
const socLogs: SocHandoverLog[] = [
  soc(1001, 100, 12040, { pct: 45, odo: 12310 }, 'Unit bersih, charger lengkap'),
  soc(1002, 98, 8120, { pct: 62, odo: 8290 }),
  soc(1003, 100, 20015, { pct: 8, odo: 20655 }, 'Baterai nyaris habis saat kembali'),
  soc(1004, 95, 15500, { pct: 15, odo: 15690 }),
  soc(1005, 100, 3310, { pct: 55, odo: 3498 }),
  soc(1007, 100, 6040, undefined, 'Serah terima di bandara'),
  soc(1008, 97, 9900),
  soc(1009, 100, 11000, undefined, 'Pengembalian dijadwalkan di Canggu'),
];

// ---------- Pembayaran ----------
let payN = 0;
const payments: Payment[] = [];
const pay = (n: number, type: PaymentType, amount: number, daysAgo: number, method: Payment['method'] = 'TRANSFER', note?: string, voided?: string) => {
  if (amount <= 0) return;
  payN++;
  payments.push({
    id: `pay-demo-${payN}`,
    inquiryId: idOf(n),
    type,
    method,
    amount,
    paidAt: d(-daysAgo),
    note,
    createdAt: at(-daysAgo, '14:00'),
    ...(voided ? { voidedAt: at(-daysAgo, '15:00'), voidReason: voided } : {}),
  });
};
const half = (x: number) => Math.round(x / 2 / 1000) * 1000;

// Selesai: lunas + deposit, deposit dikembalikan (dikurangi biaya baterai)
pay(1001, 'DP', half(total(1001)), 24, 'TRANSFER', 'BCA ref 8841');
pay(1001, 'PELUNASAN', total(1001) - half(total(1001)), 20, 'QRIS');
pay(1001, 'DEPOSIT', deposit(1001), 20, 'TRANSFER');
pay(1001, 'REFUND_DEPOSIT', deposit(1001), 16, 'TRANSFER');

pay(1002, 'DP', half(total(1002)), 19, 'TRANSFER');
pay(1002, 'PELUNASAN', total(1002) - half(total(1002)), 16, 'TUNAI');

pay(1003, 'DP', half(total(1003)), 18, 'TRANSFER');
pay(1003, 'PELUNASAN', total(1003) - half(total(1003)), 14, 'TRANSFER');
pay(1003, 'DEPOSIT', deposit(1003), 14, 'TRANSFER');
pay(1003, 'REFUND_DEPOSIT', deposit(1003) - 150000, 8, 'TRANSFER', 'Dipotong biaya pemulihan baterai Rp150.000');

pay(1004, 'DP', half(total(1004)), 10, 'QRIS');
pay(1004, 'PELUNASAN', total(1004) - half(total(1004)), 8, 'QRIS');
pay(1004, 'DEPOSIT', deposit(1004), 8, 'TRANSFER');
pay(1004, 'REFUND_DEPOSIT', deposit(1004) - 50000, 4, 'TRANSFER', 'Dipotong biaya pemulihan baterai Rp50.000');

pay(1005, 'DP', half(total(1005)), 9, 'TRANSFER');
pay(1005, 'PELUNASAN', total(1005) - half(total(1005)), 7, 'TRANSFER');

// Berjalan
pay(1007, 'DP', half(total(1007)), 5, 'TRANSFER'); // sisa tagihan masih ada
pay(1007, 'DEPOSIT', deposit(1007), 2, 'TRANSFER');
pay(1008, 'DP', half(total(1008)), 4, 'TRANSFER'); // sisa tagihan masih ada
pay(1009, 'DP', half(total(1009)), 8, 'QRIS');
pay(1009, 'PELUNASAN', total(1009) - half(total(1009)), 5, 'QRIS');
pay(1009, 'DEPOSIT', deposit(1009), 5, 'TRANSFER');

// Dikonfirmasi
pay(1010, 'DP', 400000, 2, 'TRANSFER', 'DP 30%');
pay(1011, 'DP', 500000, 1, 'TRANSFER', 'Nominal salah, dikoreksi', 'Salah nominal (seharusnya Rp1.500.000)');
pay(1011, 'DP', 1500000, 1, 'TRANSFER', 'DP 40%');
pay(1013, 'DP', 1000000, 1, 'QRIS');
pay(1017, 'DP', 300000, 0, 'TUNAI');

// ---------- Pengeluaran ----------
let expN = 0;
const expenses: Expense[] = [];
const exp = (category: Expense['category'], amount: number, daysAgo: number, note: string, vehicleId?: string, driverId?: string, voided?: string) => {
  expN++;
  expenses.push({
    id: `exp-demo-${expN}`,
    category,
    amount,
    date: d(-daysAgo),
    note,
    vehicleId,
    driverId,
    createdAt: at(-daysAgo, '18:00'),
    ...(voided ? { voidedAt: at(-daysAgo, '19:00'), voidReason: voided } : {}),
  });
};
exp('CHARGING', 185000, 28, 'SPKLU Sudirman, charge penuh', 'veh-003');
exp('GAJI_DRIVER', 3500000, 26, 'Gaji bulanan Pak Agus', undefined, 'drv-demo-1');
exp('GAJI_DRIVER', 3500000, 26, 'Gaji bulanan Pak Wayan', undefined, 'drv-demo-2');
exp('ASURANSI_PAJAK', 2750000, 23, 'Perpanjangan asuransi all risk Wuling Air EV', 'veh-001');
exp('CHARGING', 142000, 19, 'SPKLU Bypass Ngurah Rai', 'veh-004');
exp('PERAWATAN', 1250000, 17, 'Servis berkala + rotasi ban', 'veh-003');
exp('OPERASIONAL', 90000, 14, 'Cuci & detailing interior setelah sewa 1003', 'veh-004');
exp('CHARGING', 210000, 13, 'Fast charging sebelum serah terima', 'veh-004');
exp('LAINNYA', 150000, 11, 'Kabel roll ekstensi pengganti');
exp('CHARGING', 98000, 9, 'SPKLU Sanur', 'veh-002');
exp('PERAWATAN', 480000, 8, 'Ganti wiper & cek sistem AC', 'veh-005');
exp('OPERASIONAL', 65000, 7, 'Cuci eksterior', 'veh-002');
exp('GAJI_DRIVER', 400000, 6, 'Lembur driver Pak Gede', undefined, 'drv-demo-3');
exp('CHARGING', 175000, 5, 'SPKLU Canggu', 'veh-003');
exp('PERAWATAN', 2300000, 4, 'Perbaikan bumper depan (kesalahan input)', 'veh-005', undefined, 'Terinput ganda, sudah dicatat sebelumnya');
exp('CHARGING', 156000, 3, 'SPKLU Ubud', 'veh-004');
exp('OPERASIONAL', 120000, 2, 'Bensin mobil antar-jemput staf');
exp('CHARGING', 134000, 1, 'SPKLU Seminyak', 'veh-004');
exp('CHARGING', 188000, 0, 'SPKLU bandara', 'veh-001');

// ---------- Chat ----------
const sessions: ChatSession[] = [];
const messages: ChatMessage[] = [];
let msgN = 0;
const chat = (hex: string, name: string, created: number, convo: [('CUSTOMER' | 'ADMIN'), string, number, string][]) => {
  const unreadForAdmin = (() => {
    let n = 0;
    for (let i = convo.length - 1; i >= 0 && convo[i][0] === 'CUSTOMER'; i--) n++;
    return n;
  })();
  const last = convo[convo.length - 1];
  sessions.push({ id: hex, customerName: name, createdAt: at(created, convo[0][3]), lastMessageAt: at(last[2], last[3]), unreadForAdmin, unreadForCustomer: 0 });
  for (const [sender, text, off, time] of convo) {
    msgN++;
    messages.push({ id: `m${String(msgN).padStart(15, '0')}`, sessionId: hex, sender, text, createdAt: at(off, time) });
  }
};
chat('a1b2c3d4e5f60718293a4b5c6d7e8f01', 'Wayan (Tamu)', 0, [
  ['CUSTOMER', 'Halo, apakah BYD M6 tersedia untuk tanggal akhir pekan ini?', 0, '09:41'],
  ['CUSTOMER', 'Kami berenam, 2 hari saja. Boleh dengan sopir?', 0, '09:42'],
]);
chat('b2c3d4e5f60718293a4b5c6d7e8f0102', 'Maria Gonzalez', -1, [
  ['CUSTOMER', 'Hi, can I charge the Wuling Air EV at normal hotel sockets?', -1, '15:20'],
  ['ADMIN', 'Halo Maria! Ya, unit dilengkapi portable charger 2.2 kW. Pastikan stopkontak berarde dan daya min. 2.200 VA.', -1, '15:26'],
  ['CUSTOMER', 'Great, thank you. And what if the battery runs low?', -1, '15:31'],
  ['ADMIN', 'Kami ada layanan roadside assistance 24 jam. Hubungi 0812-3456-7890 kapan saja.', -1, '15:34'],
  ['CUSTOMER', 'Perfect, I will book tonight!', -1, '15:40'],
]);
chat('c3d4e5f60718293a4b5c6d7e8f010203', 'Pengunjung', -2, [
  ['CUSTOMER', 'Berapa deposit untuk Atto 3?', -2, '11:05'],
  ['ADMIN', 'Deposit Atto 3 untuk lepas kunci Rp1.000.000, dikembalikan penuh H+1 s/d H+3 hari kerja setelah unit kembali.', -2, '11:12'],
  ['CUSTOMER', 'Oke terima kasih.', -2, '11:13'],
]);
chat('d4e5f60718293a4b5c6d7e8f01020304', 'Dian Prasetyo', -4, [
  ['CUSTOMER', 'Siang, saya mau tanya apakah bisa antar unit ke villa di Ubud?', -4, '13:02'],
  ['ADMIN', 'Bisa kak, gratis dalam radius 15 km dari pool. Villa di Ubud bagian mana?', -4, '13:08'],
]);

const data: StoreData = {
  counter: 1018,
  inquiries,
  socLogs,
  fleetOverrides: {
    // veh-005 dalam perawatan agar status & peringatan unit terlihat
    'veh-005': { isActive: true, status: 'MAINTENANCE' },
  },
  drivers,
  assignments: Object.fromEntries(SPECS.filter((s) => s.driver).map((s) => [idOf(s.n), s.driver as string])),
  payments,
  expenses,
  chatSessions: sessions,
  chatMessages: messages,
};

const out = process.env.DEMO_FILE || path.resolve(__dirname, '../../data/demo-store.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log(`✅ Data demo ditulis ke ${out}`);
console.log(`   ${inquiries.length} reservasi, ${drivers.length} driver, ${payments.length} pembayaran, ${expenses.length} pengeluaran, ${sessions.length} chat`);
console.log(`   Tanggal acuan (hari ini WIB): ${today}`);
