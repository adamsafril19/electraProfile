import { AdminInquiry, BookingInquiry, InquiryStatus, SocHandoverLog, Vehicle } from '../types';
import { fleetService } from './fleetService';
import { WhatsAppService } from './whatsappService';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { store } from '../utils/JsonStore';
import { rangesOverlap } from '../utils/dates';

export class InquiryService {
  // Disimpan di JsonStore agar bertahan setelah server restart (termasuk saat PostgreSQL tidak dipakai)
  private get inquiries(): BookingInquiry[] {
    return store.data.inquiries;
  }
  private get socLogs(): SocHandoverLog[] {
    return store.data.socLogs;
  }

  public async createInquiry(data: {
    vehicleId: string;
    serviceType: 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
    startDate: string;
    durationDays: number;
    pickupLocation: string;
    returnLocation: string;
    customerName: string;
    customerPhone: string;
    customerNotes?: string;
  }): Promise<BookingInquiry> {
    const vehicle = await fleetService.getVehicleById(data.vehicleId);
    if (!vehicle) {
      throw new Error('Kendaraan tidak ditemukan atau tidak aktif');
    }

    const inquiryCode = `EV-2026-${store.data.counter++}`;
    const redirectUrl = WhatsAppService.generateRedirectUrl({
      inquiryCode,
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.brand} ${vehicle.model}`,
      serviceType: data.serviceType,
      startDate: data.startDate,
      durationDays: data.durationDays,
      pickupLocation: data.pickupLocation,
      returnLocation: data.returnLocation,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerNotes: data.customerNotes,
    });

    const newInquiry: BookingInquiry = {
      id: `inq-${Date.now()}`,
      inquiryCode,
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.brand} ${vehicle.model}`,
      serviceType: data.serviceType,
      startDate: data.startDate,
      durationDays: data.durationDays,
      pickupLocation: data.pickupLocation,
      returnLocation: data.returnLocation,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerNotes: data.customerNotes,
      status: 'PENDING_WHATSAPP',
      whatsappRedirectUrl: redirectUrl,
      createdAt: new Date().toISOString(),
    };

    // Upaya pencatatan ke database PostgreSQL
    try {
      const customer = await prisma.customer.upsert({
        where: { phoneWhatsapp: data.customerPhone },
        update: { fullName: data.customerName },
        create: {
          fullName: data.customerName,
          phoneWhatsapp: data.customerPhone,
        },
      });

      const dbInquiry = await prisma.inquiry.create({
        data: {
          inquiryCode,
          customerId: customer.id,
          vehicleId: vehicle.id,
          serviceType: data.serviceType as any,
          startDate: new Date(data.startDate),
          durationDays: data.durationDays,
          pickupLocation: data.pickupLocation,
          returnLocation: data.returnLocation,
          customerNotes: data.customerNotes,
          status: 'PENDING_WHATSAPP',
        },
      });

      newInquiry.id = dbInquiry.id;
    } catch (err: any) {
      console.warn('⚠️ [InquiryService] Database insert fallback ke in-memory:', err.message);
    }

    this.inquiries.push(newInquiry);
    store.save();
    return newInquiry;
  }

  public async getInquiryByCode(code: string): Promise<BookingInquiry | undefined> {
    try {
      const dbInquiry = await prisma.inquiry.findUnique({
        where: { inquiryCode: code },
        include: { customer: true, vehicle: true },
      });

      if (dbInquiry) {
        return {
          id: dbInquiry.id,
          inquiryCode: dbInquiry.inquiryCode,
          vehicleId: dbInquiry.vehicleId,
          vehicleName: `${dbInquiry.vehicle.brand} ${dbInquiry.vehicle.model}`,
          serviceType: dbInquiry.serviceType as any,
          startDate: dbInquiry.startDate.toISOString(),
          durationDays: dbInquiry.durationDays,
          pickupLocation: dbInquiry.pickupLocation,
          returnLocation: dbInquiry.returnLocation,
          customerName: dbInquiry.customer.fullName,
          customerPhone: dbInquiry.customer.phoneWhatsapp,
          customerNotes: dbInquiry.customerNotes || undefined,
          status: dbInquiry.status as any,
          whatsappRedirectUrl: '',
          createdAt: dbInquiry.createdAt.toISOString(),
        };
      }
    } catch (err: any) {
      console.warn('⚠️ [InquiryService] Query DB fallback ke in-memory:', err.message);
    }

    return this.inquiries.find(i => i.inquiryCode === code);
  }

  // ---------- Panel admin ----------

  private toDateOnly(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().slice(0, 10);
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private estimateTotal(vehicle: Vehicle | undefined, serviceType: string, days: number): number {
    const rate = vehicle?.rates.find((r) => r.serviceType === serviceType)?.dailyRate || 0;
    return rate * days;
  }

  private mapSoc(l: any): SocHandoverLog {
    return {
      id: l.id,
      inquiryId: l.inquiryId,
      vehicleId: l.vehicleId,
      handoverSocPct: l.handoverSocPct,
      handoverOdometerKm: Number(l.handoverOdometerKm),
      returnSocPct: l.returnSocPct ?? undefined,
      returnOdometerKm: l.returnOdometerKm != null ? Number(l.returnOdometerKm) : undefined,
      recoveryFeeAmount: Number(l.recoveryFeeAmount),
      officerNotes: l.officerNotes || undefined,
      createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
    };
  }

  /** Semua reservasi (terbaru dulu). Gabungan database + memori agar lead yang tercatat saat DB mati tidak hilang. */
  public async listAdminInquiries(): Promise<{ items: AdminInquiry[]; storage: 'database' | 'memory' }> {
    const fleet = await fleetService.listAllForAdmin();
    const fleetById = new Map(fleet.map((v) => [v.id, v]));
    const items: AdminInquiry[] = [];
    let storage: 'database' | 'memory' = 'memory';

    try {
      const rows = await prisma.inquiry.findMany({
        include: { customer: true, vehicle: true, batteryLog: true },
        orderBy: { createdAt: 'desc' },
      });
      storage = 'database';
      for (const r of rows) {
        const start = this.toDateOnly(r.startDate);
        items.push({
          id: r.id,
          inquiryCode: r.inquiryCode,
          status: r.status as InquiryStatus,
          vehicleId: r.vehicleId,
          vehicleName: `${r.vehicle.brand} ${r.vehicle.model}`,
          serviceType: r.serviceType as any,
          startDate: start,
          endDate: this.addDays(start, r.durationDays),
          durationDays: r.durationDays,
          pickupLocation: r.pickupLocation,
          returnLocation: r.returnLocation,
          customerName: r.customer.fullName,
          customerPhone: r.customer.phoneWhatsapp,
          customerNotes: r.customerNotes || undefined,
          estimatedTotal: this.estimateTotal(fleetById.get(r.vehicleId), r.serviceType, r.durationDays),
          createdAt: r.createdAt.toISOString(),
          soc: r.batteryLog ? this.mapSoc(r.batteryLog) : this.socLogs.find((l) => l.inquiryId === r.id),
        });
      }
    } catch (err: any) {
      console.warn('⚠️ [InquiryService] Daftar reservasi dari DB gagal, memakai memori:', err.message);
    }

    const seen = new Set(items.map((i) => i.inquiryCode));
    for (const m of this.inquiries) {
      if (seen.has(m.inquiryCode)) continue;
      const start = this.toDateOnly(m.startDate);
      items.push({
        id: m.id,
        inquiryCode: m.inquiryCode,
        status: m.status,
        vehicleId: m.vehicleId,
        vehicleName: m.vehicleName,
        serviceType: m.serviceType,
        startDate: start,
        endDate: this.addDays(start, m.durationDays),
        durationDays: m.durationDays,
        pickupLocation: m.pickupLocation,
        returnLocation: m.returnLocation,
        customerName: m.customerName,
        customerPhone: m.customerPhone,
        customerNotes: m.customerNotes,
        estimatedTotal: this.estimateTotal(fleetById.get(m.vehicleId), m.serviceType, m.durationDays),
        createdAt: m.createdAt,
        soc: this.socLogs.find((l) => l.inquiryId === m.id),
      });
    }

    // Penugasan driver & status pembayaran (disimpan di JsonStore)
    const driverById = new Map(store.data.drivers.map((d) => [d.id, d]));
    for (const it of items) {
      const driverId = store.data.assignments[it.id];
      if (driverId && driverById.has(driverId)) {
        it.driverId = driverId;
        it.driverName = driverById.get(driverId)!.name;
      }
      const paid = store.data.payments
        .filter((p) => p.inquiryId === it.id && !p.voidedAt && (p.type === 'DP' || p.type === 'PELUNASAN'))
        .reduce((acc, p) => acc + p.amount, 0);
      it.paidAmount = paid;
      it.paymentStatus = paid <= 0 ? 'UNPAID' : paid >= it.estimatedTotal ? 'PAID' : 'PARTIAL';
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { items, storage };
  }

  public async findAdminInquiry(id: string): Promise<AdminInquiry | undefined> {
    const { items } = await this.listAdminInquiries();
    return items.find((i) => i.id === id);
  }

  public async updateInquiryStatus(id: string, status: InquiryStatus, opts: { force?: boolean } = {}): Promise<AdminInquiry> {
    const { items } = await this.listAdminInquiries();
    const existing = items.find((i) => i.id === id);
    if (!existing) throw new AppError('Reservasi tidak ditemukan', 404);

    // Cegah dobel-booking unit saat reservasi dikonfirmasi (bisa ditimpa admin dengan force)
    if (status === 'CONFIRMED' && !opts.force) {
      const clashes = items.filter(
        (o) =>
          o.id !== existing.id &&
          o.vehicleId === existing.vehicleId &&
          (o.status === 'CONFIRMED' || o.status === 'ACTIVE') &&
          rangesOverlap(existing.startDate, existing.endDate, o.startDate, o.endDate)
      );
      if (clashes.length > 0) {
        throw new AppError(
          `${existing.vehicleName} sudah terpakai pada ${clashes.map((c) => `${c.inquiryCode} (${c.startDate} s/d ${c.endDate})`).join(', ')}.`,
          409,
          'VEHICLE_CONFLICT',
          clashes.map((c) => ({ inquiryCode: c.inquiryCode, startDate: c.startDate, endDate: c.endDate, customerName: c.customerName }))
        );
      }
      const fleet = await fleetService.listAllForAdmin();
      if (fleet.find((v) => v.id === existing.vehicleId)?.status === 'MAINTENANCE') {
        throw new AppError(`${existing.vehicleName} sedang berstatus Perawatan.`, 409, 'VEHICLE_MAINTENANCE');
      }
    }

    try {
      await prisma.inquiry.update({ where: { id }, data: { status: status as any } });
    } catch (err: any) {
      // Baris tidak ada di DB (reservasi hanya di memori) atau DB mati: cukup perbarui memori
      console.warn('⚠️ [InquiryService] Update status DB dilewati:', err.message);
    }
    const mem = this.inquiries.find((i) => i.id === id);
    if (mem) mem.status = status;
    store.save();

    return { ...existing, status };
  }

  // ---------- SoC baterai ----------

  public async recordHandoverSoc(data: {
    inquiryId: string;
    vehicleId: string;
    handoverSocPct: number;
    handoverOdometerKm: number;
    officerNotes?: string;
  }): Promise<SocHandoverLog> {
    const inquiry = await this.findAdminInquiry(data.inquiryId);
    if (!inquiry) throw new AppError('Reservasi tidak ditemukan', 404);
    if (inquiry.status === 'CANCELLED' || inquiry.status === 'COMPLETED') {
      throw new AppError(`Reservasi berstatus ${inquiry.status}, serah terima tidak dapat dicatat`, 409);
    }
    if (inquiry.soc) throw new AppError('Serah terima untuk reservasi ini sudah dicatat', 409);

    const log: SocHandoverLog = {
      id: `soc-${Date.now()}`,
      inquiryId: inquiry.id,
      vehicleId: inquiry.vehicleId, // diambil dari reservasi, bukan dari input klien
      handoverSocPct: data.handoverSocPct,
      handoverOdometerKm: data.handoverOdometerKm,
      recoveryFeeAmount: 0,
      officerNotes: data.officerNotes,
      createdAt: new Date().toISOString(),
    };

    try {
      const dbLog = await prisma.batteryLog.create({
        data: {
          inquiryId: inquiry.id,
          vehicleId: inquiry.vehicleId,
          handoverSocPct: data.handoverSocPct,
          handoverOdometerKm: data.handoverOdometerKm,
          recoveryFeeAmount: 0,
          officerNotes: data.officerNotes,
        },
      });
      log.id = dbLog.id;
    } catch (err: any) {
      console.warn('⚠️ [InquiryService] BatteryLog Handover fallback:', err.message);
    }

    this.socLogs.push(log);
    store.save();
    await this.updateInquiryStatus(inquiry.id, 'ACTIVE', { force: true });
    return log;
  }

  public async recordReturnSoc(data: {
    inquiryId: string;
    returnSocPct: number;
    returnOdometerKm: number;
    officerNotes?: string;
  }): Promise<SocHandoverLog> {
    const inquiry = await this.findAdminInquiry(data.inquiryId);
    if (!inquiry) throw new AppError('Reservasi tidak ditemukan', 404);
    if (!inquiry.soc) throw new AppError('Serah terima belum dicatat. Catat SoC serah terima terlebih dahulu.', 409);
    if (inquiry.soc.returnSocPct !== undefined) throw new AppError('Pengembalian untuk reservasi ini sudah dicatat', 409);
    if (data.returnOdometerKm < inquiry.soc.handoverOdometerKm) {
      throw new AppError('Odometer pengembalian tidak boleh lebih kecil dari odometer serah terima', 400);
    }

    // Business Logic Baterai (SoC Recovery Fee):
    let recoveryFee = 0;
    if (data.returnSocPct < 10) {
      recoveryFee = 150000;
    } else if (data.returnSocPct < 20) {
      recoveryFee = 50000;
    }

    const combinedNotes = data.officerNotes
      ? `${inquiry.soc.officerNotes || ''}${inquiry.soc.officerNotes ? ' | Return: ' : ''}${data.officerNotes}`
      : undefined;

    let dbResult: SocHandoverLog | undefined;
    try {
      const dbLog = await prisma.batteryLog.update({
        where: { inquiryId: inquiry.id },
        data: {
          returnSocPct: data.returnSocPct,
          returnOdometerKm: data.returnOdometerKm,
          recoveryFeeAmount: recoveryFee,
          officerNotes: combinedNotes,
        },
      });
      dbResult = this.mapSoc(dbLog);
    } catch (err: any) {
      console.warn('⚠️ [InquiryService] BatteryLog Return fallback:', err.message);
    }

    const mem = this.socLogs.find((l) => l.inquiryId === inquiry.id);
    if (mem) {
      mem.returnSocPct = data.returnSocPct;
      mem.returnOdometerKm = data.returnOdometerKm;
      mem.recoveryFeeAmount = recoveryFee;
      if (combinedNotes) mem.officerNotes = combinedNotes;
      store.save();
    }

    await this.updateInquiryStatus(inquiry.id, 'COMPLETED');

    return (
      dbResult ||
      mem || {
        ...inquiry.soc,
        returnSocPct: data.returnSocPct,
        returnOdometerKm: data.returnOdometerKm,
        recoveryFeeAmount: recoveryFee,
        officerNotes: combinedNotes ?? inquiry.soc.officerNotes,
      }
    );
  }
}

export const inquiryService = new InquiryService();
