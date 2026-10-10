import crypto from 'crypto';
import { AdminInquiry, Expense, ExpenseCategory, Payment, PaymentMethod, PaymentType } from '../types';
import { store } from '../utils/JsonStore';
import { AppError } from '../utils/AppError';
import { addDaysStr, dateWib } from '../utils/dates';
import { inquiryService } from './inquiryService';
import { fleetService } from './fleetService';

const RENT_TYPES: PaymentType[] = ['DP', 'PELUNASAN'];
// Pendapatan sewa = DP + pelunasan + denda. Deposit adalah dana titipan, bukan pendapatan.
const REVENUE_TYPES: PaymentType[] = ['DP', 'PELUNASAN', 'DENDA'];

const live = <T extends { voidedAt?: string }>(list: T[]): T[] => list.filter((x) => !x.voidedAt);
const sum = (list: { amount: number }[]): number => list.reduce((acc, x) => acc + x.amount, 0);

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

export class FinanceService {
  public static inquiryFinance(inquiry: AdminInquiry): InquiryFinance {
    const payments = store.data.payments.filter((p) => p.inquiryId === inquiry.id);
    const ok = live(payments);
    const rentPaid = sum(ok.filter((p) => RENT_TYPES.includes(p.type)));
    const depositPaid = sum(ok.filter((p) => p.type === 'DEPOSIT'));
    const depositRefunded = sum(ok.filter((p) => p.type === 'REFUND_DEPOSIT'));
    const batteryFee = inquiry.soc?.recoveryFeeAmount || 0;
    return {
      rentDue: inquiry.estimatedTotal,
      rentPaid,
      outstanding: Math.max(0, inquiry.estimatedTotal - rentPaid),
      depositPaid,
      depositRefunded,
      batteryFee,
      depositHeld: Math.max(0, depositPaid - depositRefunded - batteryFee),
      payments: payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  public static async getInquiryFinance(inquiryId: string): Promise<InquiryFinance> {
    const inquiry = await inquiryService.findAdminInquiry(inquiryId);
    if (!inquiry) throw new AppError('Reservasi tidak ditemukan', 404);
    return FinanceService.inquiryFinance(inquiry);
  }

  // ---------- Pembayaran ----------

  public static async addPayment(data: {
    inquiryId: string;
    type: PaymentType;
    method: PaymentMethod;
    amount: number;
    paidAt: string;
    note?: string;
  }): Promise<Payment> {
    const inquiry = await inquiryService.findAdminInquiry(data.inquiryId);
    if (!inquiry) throw new AppError('Reservasi tidak ditemukan', 404);
    if (inquiry.status === 'CANCELLED' && data.type !== 'REFUND_DEPOSIT') {
      throw new AppError('Reservasi sudah dibatalkan, pembayaran baru tidak dapat dicatat', 409);
    }
    if (data.paidAt > dateWib()) throw new AppError('Tanggal pembayaran tidak boleh di masa depan', 400);

    const fin = FinanceService.inquiryFinance(inquiry);

    if (RENT_TYPES.includes(data.type) && data.amount > fin.outstanding) {
      throw new AppError(
        `Jumlah melebihi sisa tagihan sewa (Rp ${fin.outstanding.toLocaleString('id-ID')}). Kelebihan bayar tidak dapat dicatat sebagai sewa.`,
        409,
        'OVERPAYMENT'
      );
    }
    if (data.type === 'REFUND_DEPOSIT') {
      if (inquiry.status !== 'COMPLETED' && inquiry.status !== 'CANCELLED') {
        throw new AppError('Deposit hanya dapat dikembalikan setelah unit kembali (status Selesai) atau reservasi dibatalkan', 409);
      }
      // Pada reservasi batal tidak ada unit kembali, jadi potongan baterai tidak berlaku
      const refundable = inquiry.status === 'COMPLETED' ? fin.depositHeld : Math.max(0, fin.depositPaid - fin.depositRefunded);
      if (data.amount > refundable) {
        throw new AppError(`Pengembalian melebihi deposit yang dapat dikembalikan (Rp ${refundable.toLocaleString('id-ID')})`, 409, 'REFUND_EXCEEDS');
      }
    }

    const payment: Payment = {
      id: crypto.randomUUID(),
      inquiryId: inquiry.id,
      type: data.type,
      method: data.method,
      amount: data.amount,
      paidAt: data.paidAt,
      note: data.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    store.data.payments.push(payment);
    store.save();
    return payment;
  }

  public static voidPayment(id: string, reason: string): Payment {
    const p = store.data.payments.find((x) => x.id === id);
    if (!p) throw new AppError('Pembayaran tidak ditemukan', 404);
    if (p.voidedAt) throw new AppError('Pembayaran ini sudah dibatalkan', 409);
    p.voidedAt = new Date().toISOString();
    p.voidReason = reason.trim();
    store.save();
    return p;
  }

  // ---------- Pengeluaran ----------

  public static async addExpense(data: {
    category: ExpenseCategory;
    amount: number;
    date: string;
    vehicleId?: string;
    driverId?: string;
    note?: string;
  }): Promise<Expense> {
    if (data.date > dateWib()) throw new AppError('Tanggal pengeluaran tidak boleh di masa depan', 400);
    if (data.vehicleId) {
      const fleet = await fleetService.listAllForAdmin();
      if (!fleet.some((v) => v.id === data.vehicleId)) throw new AppError('Unit tidak ditemukan', 404);
    }
    if (data.driverId && !store.data.drivers.some((d) => d.id === data.driverId)) {
      throw new AppError('Driver tidak ditemukan', 404);
    }
    const expense: Expense = {
      id: crypto.randomUUID(),
      category: data.category,
      amount: data.amount,
      date: data.date,
      vehicleId: data.vehicleId || undefined,
      driverId: data.driverId || undefined,
      note: data.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    store.data.expenses.push(expense);
    store.save();
    return expense;
  }

  public static voidExpense(id: string, reason: string): Expense {
    const e = store.data.expenses.find((x) => x.id === id);
    if (!e) throw new AppError('Pengeluaran tidak ditemukan', 404);
    if (e.voidedAt) throw new AppError('Pengeluaran ini sudah dibatalkan', 409);
    e.voidedAt = new Date().toISOString();
    e.voidReason = reason.trim();
    store.save();
    return e;
  }

  // ---------- Ringkasan & buku kas ----------

  private static async labels() {
    const [{ items }, fleet] = await Promise.all([inquiryService.listAdminInquiries(), fleetService.listAllForAdmin()]);
    return {
      inquiries: new Map(items.map((i) => [i.id, i])),
      vehicles: new Map(fleet.map((v) => [v.id, `${v.brand} ${v.model}`])),
      drivers: new Map(store.data.drivers.map((d) => [d.id, d.name])),
      all: items,
    };
  }

  public static async getLedger(from: string, to: string, kind?: 'IN' | 'OUT') {
    const l = await FinanceService.labels();
    const entries: any[] = [];

    if (kind !== 'OUT') {
      for (const p of store.data.payments) {
        if (p.paidAt < from || p.paidAt > to) continue;
        const inq = l.inquiries.get(p.inquiryId);
        entries.push({
          id: p.id,
          kind: p.type === 'REFUND_DEPOSIT' ? 'OUT' : 'IN',
          source: 'PAYMENT',
          type: p.type,
          method: p.method,
          amount: p.amount,
          date: p.paidAt,
          note: p.note,
          inquiryCode: inq?.inquiryCode,
          customerName: inq?.customerName,
          createdAt: p.createdAt,
          voidedAt: p.voidedAt,
          voidReason: p.voidReason,
        });
      }
    }
    if (kind !== 'IN') {
      for (const e of store.data.expenses) {
        if (e.date < from || e.date > to) continue;
        entries.push({
          id: e.id,
          kind: 'OUT',
          source: 'EXPENSE',
          type: e.category,
          amount: e.amount,
          date: e.date,
          note: e.note,
          vehicleName: e.vehicleId ? l.vehicles.get(e.vehicleId) : undefined,
          driverName: e.driverId ? l.drivers.get(e.driverId) : undefined,
          createdAt: e.createdAt,
          voidedAt: e.voidedAt,
          voidReason: e.voidReason,
        });
      }
    }
    const filtered = kind ? entries.filter((e) => e.kind === kind) : entries;
    return filtered.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 500);
  }

  public static async getSummary(from: string, to: string) {
    const l = await FinanceService.labels();
    const pays = live(store.data.payments).filter((p) => p.paidAt >= from && p.paidAt <= to);
    const exps = live(store.data.expenses).filter((e) => e.date >= from && e.date <= to);

    const revenuePays = pays.filter((p) => REVENUE_TYPES.includes(p.type));
    const refunds = pays.filter((p) => p.type === 'REFUND_DEPOSIT');
    const depositsIn = pays.filter((p) => p.type === 'DEPOSIT');

    const income = sum(revenuePays);
    const expense = sum(exps);

    const byCategory: Record<string, number> = {};
    for (const e of exps) byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    const byMethod: Record<string, number> = {};
    for (const p of revenuePays) byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;

    // Piutang & deposit ditahan: kondisi saat ini (bukan per periode)
    let outstandingTotal = 0;
    let depositHeldTotal = 0;
    const receivables: any[] = [];
    for (const i of l.all) {
      const fin = FinanceService.inquiryFinance(i);
      if (i.status !== 'CANCELLED' && fin.outstanding > 0) {
        outstandingTotal += fin.outstanding;
        receivables.push({
          id: i.id,
          inquiryCode: i.inquiryCode,
          customerName: i.customerName,
          customerPhone: i.customerPhone,
          vehicleName: i.vehicleName,
          status: i.status,
          startDate: i.startDate,
          rentDue: fin.rentDue,
          rentPaid: fin.rentPaid,
          outstanding: fin.outstanding,
        });
      }
      if (i.status !== 'CANCELLED') depositHeldTotal += fin.depositHeld;
    }
    receivables.sort((a, b) => a.startDate.localeCompare(b.startDate));

    // Deret waktu: harian bila rentang <= 62 hari, selain itu bulanan
    const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
    const monthly = days > 62;
    const bucket = (d: string) => (monthly ? d.slice(0, 7) : d);
    const series = new Map<string, { label: string; income: number; expense: number }>();
    if (!monthly) {
      for (let k = 0; k < days; k++) {
        const d = addDaysStr(from, k);
        series.set(d, { label: d, income: 0, expense: 0 });
      }
    }
    for (const p of revenuePays) {
      const b = bucket(p.paidAt);
      const row = series.get(b) || { label: b, income: 0, expense: 0 };
      row.income += p.amount;
      series.set(b, row);
    }
    for (const e of exps) {
      const b = bucket(e.date);
      const row = series.get(b) || { label: b, income: 0, expense: 0 };
      row.expense += e.amount;
      series.set(b, row);
    }

    return {
      serverTime: new Date().toISOString(),
      from,
      to,
      income: { total: income, byType: Object.fromEntries(REVENUE_TYPES.map((t) => [t, sum(revenuePays.filter((p) => p.type === t))])), byMethod },
      expense: { total: expense, byCategory },
      net: income - expense,
      deposit: { receivedInPeriod: sum(depositsIn), refundedInPeriod: sum(refunds), heldNow: depositHeldTotal },
      receivables: { total: outstandingTotal, count: receivables.length, items: receivables.slice(0, 10) },
      series: [...series.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
      seriesUnit: monthly ? 'MONTH' : 'DAY',
    };
  }
}
