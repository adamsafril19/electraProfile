import { BookingInquiry, SocHandoverLog } from '../types';
import { fleetService } from './fleetService';
import { WhatsAppService } from './whatsappService';
import { prisma } from '../config/database';

export class InquiryService {
  private inquiries: BookingInquiry[] = [];
  private socLogs: SocHandoverLog[] = [];
  private counter: number = 1001;

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

    const inquiryCode = `EV-2026-${this.counter++}`;
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

  public async recordHandoverSoc(data: {
    inquiryId: string;
    vehicleId: string;
    handoverSocPct: number;
    handoverOdometerKm: number;
    officerNotes?: string;
  }): Promise<SocHandoverLog> {
    const log: SocHandoverLog = {
      id: `soc-${Date.now()}`,
      inquiryId: data.inquiryId,
      vehicleId: data.vehicleId,
      handoverSocPct: data.handoverSocPct,
      handoverOdometerKm: data.handoverOdometerKm,
      recoveryFeeAmount: 0,
      officerNotes: data.officerNotes,
      createdAt: new Date().toISOString(),
    };

    try {
      const dbLog = await prisma.batteryLog.create({
        data: {
          inquiryId: data.inquiryId,
          vehicleId: data.vehicleId,
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
    return log;
  }

  public async recordReturnSoc(data: {
    inquiryId: string;
    returnSocPct: number;
    returnOdometerKm: number;
    officerNotes?: string;
  }): Promise<SocHandoverLog> {
    let log = this.socLogs.find(l => l.inquiryId === data.inquiryId);

    // Business Logic Baterai (SoC Recovery Fee):
    let recoveryFee = 0;
    if (data.returnSocPct < 10) {
      recoveryFee = 150000;
    } else if (data.returnSocPct < 20) {
      recoveryFee = 50000;
    }

    try {
      const dbLog = await prisma.batteryLog.update({
        where: { inquiryId: data.inquiryId },
        data: {
          returnSocPct: data.returnSocPct,
          returnOdometerKm: data.returnOdometerKm,
          recoveryFeeAmount: recoveryFee,
          officerNotes: data.officerNotes,
        },
      });

      return {
        id: dbLog.id,
        inquiryId: dbLog.inquiryId,
        vehicleId: dbLog.vehicleId,
        handoverSocPct: dbLog.handoverSocPct,
        handoverOdometerKm: Number(dbLog.handoverOdometerKm),
        returnSocPct: dbLog.returnSocPct || undefined,
        returnOdometerKm: dbLog.returnOdometerKm ? Number(dbLog.returnOdometerKm) : undefined,
        recoveryFeeAmount: Number(dbLog.recoveryFeeAmount),
        officerNotes: dbLog.officerNotes || undefined,
        createdAt: dbLog.createdAt.toISOString(),
      };
    } catch (err: any) {
      console.warn('⚠️ [InquiryService] BatteryLog Return fallback:', err.message);
    }

    if (!log) {
      // In-memory fallback create if not exists
      log = {
        id: `soc-${Date.now()}`,
        inquiryId: data.inquiryId,
        vehicleId: 'veh-fallback',
        handoverSocPct: 100,
        handoverOdometerKm: 10000,
        recoveryFeeAmount: recoveryFee,
        returnSocPct: data.returnSocPct,
        returnOdometerKm: data.returnOdometerKm,
        officerNotes: data.officerNotes,
        createdAt: new Date().toISOString(),
      };
      this.socLogs.push(log);
      return log;
    }

    log.returnSocPct = data.returnSocPct;
    log.returnOdometerKm = data.returnOdometerKm;
    log.recoveryFeeAmount = recoveryFee;
    if (data.officerNotes) {
      log.officerNotes = `${log.officerNotes || ''} | Return: ${data.officerNotes}`;
    }

    return log;
  }
}

export const inquiryService = new InquiryService();
