import fs from 'fs';
import path from 'path';
import {
  BookingInquiry,
  ChatMessage,
  ChatSession,
  Driver,
  Expense,
  Payment,
  SocHandoverLog,
} from '../types';

export interface FleetOverride {
  isActive?: boolean;
  status?: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE';
  rates?: { serviceType: string; dailyRate: number; depositAmount: number }[];
}

export interface StoreData {
  counter: number;
  inquiries: BookingInquiry[];
  socLogs: SocHandoverLog[];
  fleetOverrides: Record<string, FleetOverride>;
  drivers: Driver[];
  assignments: Record<string, string>; // inquiryId -> driverId
  payments: Payment[];
  expenses: Expense[];
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
}

const emptyData = (): StoreData => ({
  counter: 1001,
  inquiries: [],
  socLogs: [],
  fleetOverrides: {},
  drivers: [],
  assignments: {},
  payments: [],
  expenses: [],
  chatSessions: [],
  chatMessages: [],
});

/**
 * Penyimpanan berkas JSON untuk data operasional saat PostgreSQL belum dipakai.
 * Data dimuat sekali saat start dan ditulis ulang (atomik) setelah setiap perubahan.
 */
class JsonStore {
  public data: StoreData;
  private file: string;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.file = process.env.DATA_FILE || path.resolve(__dirname, '../../data/store.json');
    this.data = this.load();
  }

  private load(): StoreData {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      // Field yang belum ada di berkas lama diisi default agar upgrade tidak merusak data
      return { ...emptyData(), ...JSON.parse(raw) };
    } catch (err: any) {
      if (err.code === 'ENOENT') return emptyData();
      // Berkas rusak: simpan salinannya, jangan ditimpa diam-diam
      const backup = `${this.file}.corrupt-${Date.now()}`;
      try {
        fs.renameSync(this.file, backup);
        console.error(`⚠️ [Store] Berkas data rusak, disimpan ke ${backup}. Memulai dengan data kosong.`);
      } catch {
        console.error('⚠️ [Store] Berkas data rusak dan tidak bisa dicadangkan:', err.message);
      }
      return emptyData();
    }
  }

  /** Jadwalkan penulisan (digabung bila banyak perubahan beruntun). */
  public save(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 200);
  }

  public flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.file);
    } catch (err: any) {
      console.error('⚠️ [Store] Gagal menulis data ke disk:', err.message);
    }
  }
}

export const store = new JsonStore();

// Pastikan perubahan terakhir tidak hilang saat server dimatikan
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    store.flush();
    process.exit(0);
  });
}
process.on('exit', () => store.flush());
