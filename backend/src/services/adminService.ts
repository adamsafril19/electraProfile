import { AdminInquiry, InquiryStatus } from '../types';
import { inquiryService } from './inquiryService';
import { fleetService } from './fleetService';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

// Operasional di Indonesia: "hari ini" dihitung dalam WIB, bukan UTC server
const dateWib = (d: Date = new Date()): string => new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);

const addDaysStr = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const STATUSES: InquiryStatus[] = ['PENDING_WHATSAPP', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export class AdminService {
  public static countByStatus(items: AdminInquiry[]): Record<InquiryStatus, number> {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<InquiryStatus, number>;
    for (const i of items) counts[i.status]++;
    return counts;
  }

  public static async getSummary() {
    const [{ items, storage }, fleet] = await Promise.all([
      inquiryService.listAdminInquiries(),
      fleetService.listAllForAdmin(),
    ]);
    const today = dateWib();
    const statusCounts = AdminService.countByStatus(items);

    const sum = (list: AdminInquiry[]) => list.reduce((acc, i) => acc + i.estimatedTotal, 0);
    const byStatus = (...s: InquiryStatus[]) => items.filter((i) => s.includes(i.status));

    // Reservasi masuk 7 hari terakhir (termasuk hari ini)
    const last7Days = Array.from({ length: 7 }, (_, idx) => {
      const date = addDaysStr(today, idx - 6);
      return { date, count: items.filter((i) => dateWib(new Date(i.createdAt)) === date).length };
    });

    // Perlu tindakan: belum dikonfirmasi, jadwal ambil dalam 3 hari ke depan (atau sudah lewat tapi belum diproses)
    const horizon = addDaysStr(today, 3);
    const upcoming = byStatus('PENDING_WHATSAPP', 'CONFIRMED')
      .filter((i) => i.startDate <= horizon)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 10);

    const active = byStatus('ACTIVE').sort((a, b) => a.endDate.localeCompare(b.endDate));
    const overdue = active.filter((i) => i.endDate < today);

    // Daftar tindakan: semua reservasi yang menunggu konfirmasi, butuh driver, atau belum dibayar menjelang jadwal
    const byStart = (a: AdminInquiry, b: AdminInquiry) => a.startDate.localeCompare(b.startDate);
    const pending = byStatus('PENDING_WHATSAPP').sort(byStart);
    const needDriver = items
      .filter((i) => i.serviceType === 'DENGAN_DRIVER' && !i.driverId && ['PENDING_WHATSAPP', 'CONFIRMED'].includes(i.status) && i.startDate <= addDaysStr(today, 7))
      .sort(byStart);
    const unpaidSoon = items
      .filter((i) => i.status === 'CONFIRMED' && i.paymentStatus === 'UNPAID' && i.startDate <= addDaysStr(today, 3))
      .sort(byStart);

    // Agenda operasional: serah terima & pengembalian hari ini dan besok
    const agendaFor = (date: string) => ({
      date,
      pickups: items.filter((i) => i.startDate === date && ['PENDING_WHATSAPP', 'CONFIRMED'].includes(i.status)),
      returns: items.filter((i) => i.endDate === date && i.status === 'ACTIVE'),
    });

    // Tren: reservasi masuk 7 hari terakhir dibanding 7 hari sebelumnya
    const countBetween = (fromDate: string, toDate: string) =>
      items.filter((i) => {
        const d = dateWib(new Date(i.createdAt));
        return d >= fromDate && d <= toDate;
      }).length;
    const weekTotal = countBetween(addDaysStr(today, -6), today);
    const prevWeekTotal = countBetween(addDaysStr(today, -13), addDaysStr(today, -7));

    const withSoc = items.filter((i) => i.soc);
    const lowBatteryReturns = withSoc.filter((i) => i.soc!.returnSocPct !== undefined && i.soc!.returnSocPct < 20);

    const inUseVehicleIds = new Set(active.map((i) => i.vehicleId));

    const perVehicle = new Map<string, { vehicleName: string; count: number }>();
    for (const i of items.filter((x) => x.status !== 'CANCELLED')) {
      const row = perVehicle.get(i.vehicleId) || { vehicleName: i.vehicleName, count: 0 };
      row.count++;
      perVehicle.set(i.vehicleId, row);
    }

    return {
      storage,
      generatedAt: new Date().toISOString(),
      today,
      totals: { inquiries: items.length, statusCounts },
      needsAction: {
        pendingConfirmation: statusCounts.PENDING_WHATSAPP,
        upcoming,
        overdueReturns: overdue,
        pending: pending.slice(0, 8),
        needDriver: needDriver.slice(0, 8),
        unpaidSoon: unpaidSoon.slice(0, 8),
      },
      agenda: { today: agendaFor(today), tomorrow: agendaFor(addDaysStr(today, 1)) },
      trend: { weekTotal, prevWeekTotal },
      activeRentals: active,
      last7Days,
      revenue: {
        // Estimasi dari tarif saat ini × durasi; bukan data pembayaran sebenarnya
        pending: sum(byStatus('PENDING_WHATSAPP')),
        confirmedAndActive: sum(byStatus('CONFIRMED', 'ACTIVE')),
        completed: sum(byStatus('COMPLETED')),
        batteryFeesCollected: withSoc.reduce((acc, i) => acc + (i.soc!.recoveryFeeAmount || 0), 0),
        lowBatteryReturnCount: lowBatteryReturns.length,
      },
      fleet: {
        total: fleet.length,
        active: fleet.filter((v) => v.isActive).length,
        inactive: fleet.filter((v) => !v.isActive).length,
        available: fleet.filter((v) => v.isActive && v.status === 'AVAILABLE' && !inUseVehicleIds.has(v.id)).length,
        inUse: fleet.filter((v) => inUseVehicleIds.has(v.id)).length,
        maintenance: fleet.filter((v) => v.status === 'MAINTENANCE').length,
      },
      topVehicles: [...perVehicle.entries()]
        .map(([vehicleId, v]) => ({ vehicleId, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }
}
