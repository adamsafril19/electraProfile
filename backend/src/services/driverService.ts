import crypto from 'crypto';
import { AdminInquiry, Driver, DriverTimeOff, InquiryStatus } from '../types';
import { store } from '../utils/JsonStore';
import { AppError } from '../utils/AppError';
import { dateWib, rangesOverlap } from '../utils/dates';
import { inquiryService } from './inquiryService';

// Penugasan driver dihitung menempati jadwal selama reservasi belum selesai/dibatalkan
const OCCUPYING: InquiryStatus[] = ['PENDING_WHATSAPP', 'CONFIRMED', 'ACTIVE'];

export type DriverToday = 'TERSEDIA' | 'BERTUGAS' | 'CUTI' | 'NONAKTIF';

export interface DriverView extends Driver {
  today: DriverToday;
  upcoming: AdminInquiry[]; // penugasan yang belum selesai, urut tanggal
  completedCount: number;
}

const findDriver = (id: string): Driver => {
  const d = store.data.drivers.find((x) => x.id === id);
  if (!d) throw new AppError('Driver tidak ditemukan', 404);
  return d;
};

export class DriverService {
  public static async list(): Promise<DriverView[]> {
    const { items } = await inquiryService.listAdminInquiries();
    const today = dateWib();

    return store.data.drivers
      .map((d) => {
        const mine = items.filter((i) => i.driverId === d.id);
        const upcoming = mine
          .filter((i) => OCCUPYING.includes(i.status) && i.endDate > today)
          .sort((a, b) => a.startDate.localeCompare(b.startDate));
        const onLeave = d.timeOff.some((t) => t.from <= today && today <= t.to);
        const onDuty = upcoming.some((i) => i.startDate <= today && today < i.endDate && i.status !== 'PENDING_WHATSAPP');

        const state: DriverToday = !d.isActive ? 'NONAKTIF' : onLeave ? 'CUTI' : onDuty ? 'BERTUGAS' : 'TERSEDIA';
        return { ...d, today: state, upcoming, completedCount: mine.filter((i) => i.status === 'COMPLETED').length };
      })
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));
  }

  public static create(data: { name: string; phone: string; licenseNumber?: string; notes?: string }): Driver {
    const phone = data.phone;
    if (store.data.drivers.some((d) => d.isActive && d.phone === phone)) {
      throw new AppError('Sudah ada driver aktif dengan nomor tersebut', 409);
    }
    const driver: Driver = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      phone,
      licenseNumber: data.licenseNumber?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      isActive: true,
      timeOff: [],
      createdAt: new Date().toISOString(),
    };
    store.data.drivers.push(driver);
    store.save();
    return driver;
  }

  public static async update(
    id: string,
    changes: { name?: string; phone?: string; licenseNumber?: string; notes?: string; isActive?: boolean }
  ): Promise<Driver> {
    const driver = findDriver(id);

    if (changes.isActive === false && driver.isActive) {
      const { items } = await inquiryService.listAdminInquiries();
      const today = dateWib();
      const open = items.filter((i) => i.driverId === id && OCCUPYING.includes(i.status) && i.endDate > today);
      if (open.length > 0) {
        throw new AppError(
          `Driver masih punya ${open.length} penugasan aktif (${open.map((o) => o.inquiryCode).join(', ')}). Pindahkan penugasannya dulu.`,
          409,
          'DRIVER_HAS_ASSIGNMENTS'
        );
      }
    }

    if (changes.name !== undefined) driver.name = changes.name.trim();
    if (changes.phone !== undefined) driver.phone = changes.phone;
    if (changes.licenseNumber !== undefined) driver.licenseNumber = changes.licenseNumber.trim() || undefined;
    if (changes.notes !== undefined) driver.notes = changes.notes.trim() || undefined;
    if (changes.isActive !== undefined) driver.isActive = changes.isActive;
    store.save();
    return driver;
  }

  public static async addTimeOff(id: string, data: { from: string; to: string; reason: string }): Promise<Driver> {
    const driver = findDriver(id);
    const { items } = await inquiryService.listAdminInquiries();

    // Cuti tidak boleh menimpa penugasan yang sudah ada: tanggal cuti inklusif, reservasi [mulai, selesai)
    const clashes = items.filter(
      (i) => i.driverId === id && OCCUPYING.includes(i.status) && data.from < i.endDate && data.to >= i.startDate
    );
    if (clashes.length > 0) {
      throw new AppError(
        `Tanggal tersebut bentrok dengan penugasan ${clashes.map((c) => `${c.inquiryCode} (${c.startDate} s/d ${c.endDate})`).join(', ')}.`,
        409,
        'TIMEOFF_CONFLICT'
      );
    }

    const entry: DriverTimeOff = { id: crypto.randomUUID(), from: data.from, to: data.to, reason: data.reason.trim() };
    driver.timeOff.push(entry);
    driver.timeOff.sort((a, b) => a.from.localeCompare(b.from));
    store.save();
    return driver;
  }

  public static removeTimeOff(id: string, timeOffId: string): Driver {
    const driver = findDriver(id);
    const before = driver.timeOff.length;
    driver.timeOff = driver.timeOff.filter((t) => t.id !== timeOffId);
    if (driver.timeOff.length === before) throw new AppError('Data cuti tidak ditemukan', 404);
    store.save();
    return driver;
  }

  /** Tugaskan (atau lepas, bila driverId null) driver untuk sebuah reservasi, dengan pemeriksaan bentrok. */
  public static async assign(inquiryId: string, driverId: string | null): Promise<AdminInquiry> {
    const { items } = await inquiryService.listAdminInquiries();
    const inquiry = items.find((i) => i.id === inquiryId);
    if (!inquiry) throw new AppError('Reservasi tidak ditemukan', 404);

    if (driverId === null) {
      delete store.data.assignments[inquiryId];
      store.save();
      return (await inquiryService.findAdminInquiry(inquiryId))!;
    }

    if (inquiry.serviceType !== 'DENGAN_DRIVER') {
      throw new AppError('Reservasi ini layanan Lepas Kunci dan tidak memerlukan driver', 400);
    }
    if (inquiry.status === 'CANCELLED' || inquiry.status === 'COMPLETED') {
      throw new AppError(`Reservasi berstatus ${inquiry.status}, penugasan tidak dapat diubah`, 409);
    }

    const driver = findDriver(driverId);
    if (!driver.isActive) throw new AppError('Driver tidak aktif', 409);

    const clashes = items.filter(
      (o) =>
        o.id !== inquiry.id &&
        o.driverId === driverId &&
        OCCUPYING.includes(o.status) &&
        rangesOverlap(inquiry.startDate, inquiry.endDate, o.startDate, o.endDate)
    );
    const leave = driver.timeOff.filter((t) => t.from < inquiry.endDate && t.to >= inquiry.startDate);

    if (clashes.length > 0 || leave.length > 0) {
      const parts = [
        ...clashes.map((c) => `penugasan ${c.inquiryCode} (${c.startDate} s/d ${c.endDate})`),
        ...leave.map((t) => `cuti ${t.from} s/d ${t.to} (${t.reason})`),
      ];
      throw new AppError(`${driver.name} tidak tersedia: bentrok dengan ${parts.join(', ')}.`, 409, 'DRIVER_CONFLICT', {
        inquiries: clashes.map((c) => c.inquiryCode),
        timeOff: leave,
      });
    }

    store.data.assignments[inquiryId] = driverId;
    store.save();
    return (await inquiryService.findAdminInquiry(inquiryId))!;
  }
}
