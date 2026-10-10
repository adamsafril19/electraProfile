import { Request, Response, NextFunction } from 'express';
import { AdminAuth } from '../services/adminAuth';
import { AdminService } from '../services/adminService';
import { inquiryService } from '../services/inquiryService';
import { fleetService } from '../services/fleetService';
import { DriverService } from '../services/driverService';
import { FinanceService } from '../services/financeService';
import { ChatService } from '../services/chatService';
import { dateWib, isValidDateStr } from '../utils/dates';
import { AppError } from '../utils/AppError';
import { store } from '../utils/JsonStore';
import {
  chatTextSchema,
  createExpenseSchema,
  createPaymentSchema,
  financeRangeSchema,
  voidSchema
} from '../validators/adminValidator';
import { ScheduleService } from '../services/scheduleService';
import {
  assignDriverSchema,
  calendarQuerySchema,
  createDriverSchema,
  timeOffSchema,
  updateDriverSchema,
  adminLoginSchema,
  listInquiriesQuerySchema,
  updateInquiryStatusSchema,
  updateVehicleSchema
} from '../validators/adminValidator';

export class AdminController {
  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = adminLoginSchema.parse(req.body);

      if (!AdminAuth.isEnabled()) {
        return res.status(503).json({
          success: false,
          message: 'Login admin belum dikonfigurasi. Set ADMIN_PASSWORD di environment server.'
        });
      }
      if (!AdminAuth.checkCredentials(username, password)) {
        return res.status(401).json({ success: false, message: 'Username atau password salah' });
      }

      const { token, expiresAt } = AdminAuth.issueToken(username);
      return res.status(200).json({ success: true, data: { token, expiresAt, username } });
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: Request, res: Response) {
    // requireAdmin sudah memvalidasi token; endpoint ini dipakai frontend untuk mengecek sesi
    return res.status(200).json({ success: true });
  }

  public static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({ success: true, data: await AdminService.getSummary() });
    } catch (error) {
      next(error);
    }
  }

  public static async listInquiries(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, q, page, pageSize, sort, flags } = listInquiriesQuerySchema.parse(req.query);
      const { items, storage } = await inquiryService.listAdminInquiries();
      const statusCounts = AdminService.countByStatus(items);
      const today = dateWib();

      // Filter cepat untuk pekerjaan harian operator
      const FLAG_TESTS: Record<string, (i: (typeof items)[number]) => boolean> = {
        unpaid: (i) => i.status !== 'CANCELLED' && i.paymentStatus !== 'PAID',
        needDriver: (i) => i.serviceType === 'DENGAN_DRIVER' && !i.driverId && ['PENDING_WHATSAPP', 'CONFIRMED', 'ACTIVE'].includes(i.status),
        overdue: (i) => i.status === 'ACTIVE' && i.endDate < today
      };
      const activeFlags = (flags || '').split(',').map((f) => f.trim()).filter((f) => f in FLAG_TESTS);
      const flagCounts = Object.fromEntries(Object.entries(FLAG_TESTS).map(([k, fn]) => [k, items.filter(fn).length]));

      const needle = q?.trim().toLowerCase();
      const filtered = items.filter((i) => {
        if (status && i.status !== status) return false;
        if (!activeFlags.every((f) => FLAG_TESTS[f](i))) return false;
        if (!needle) return true;
        return [i.inquiryCode, i.customerName, i.customerPhone, i.vehicleName, i.pickupLocation]
          .some((f) => f.toLowerCase().includes(needle));
      });

      if (sort === 'start') {
        // Yang masih berjalan/akan datang di depan (terdekat dulu), selesai & batal di belakang
        const live = (s: string) => (s === 'COMPLETED' || s === 'CANCELLED' ? 1 : 0);
        filtered.sort((a, b) => live(a.status) - live(b.status) || (live(a.status) === 0 ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate)));
      } else if (sort === 'amount') {
        filtered.sort((a, b) => b.estimatedTotal - a.estimatedTotal);
      }

      const start = (page - 1) * pageSize;
      return res.status(200).json({
        success: true,
        data: {
          items: filtered.slice(start, start + pageSize),
          total: filtered.length,
          page,
          pageSize,
          statusCounts,
          flagCounts,
          storage
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateInquiryStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, force } = updateInquiryStatusSchema.parse(req.body);
      const updated = await inquiryService.updateInquiryStatus(req.params.id, status, { force });
      return res.status(200).json({ success: true, message: 'Status reservasi diperbarui', data: updated });
    } catch (error) {
      next(error);
    }
  }

  public static async listFleet(req: Request, res: Response, next: NextFunction) {
    try {
      const vehicles = await fleetService.listAllForAdmin();
      return res.status(200).json({ success: true, count: vehicles.length, data: vehicles });
    } catch (error) {
      next(error);
    }
  }

  public static async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = updateVehicleSchema.parse(req.body);
      const vehicle = await fleetService.updateVehicle(req.params.id, changes);
      return res.status(200).json({ success: true, message: 'Data armada diperbarui', data: vehicle });
    } catch (error) {
      next(error);
    }
  }

  // ---------- Driver ----------

  public static async listDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({ success: true, data: await DriverService.list() });
    } catch (error) {
      next(error);
    }
  }

  public static async createDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = DriverService.create(createDriverSchema.parse(req.body));
      return res.status(201).json({ success: true, message: 'Driver ditambahkan', data: driver });
    } catch (error) {
      next(error);
    }
  }

  public static async updateDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = await DriverService.update(req.params.id, updateDriverSchema.parse(req.body));
      return res.status(200).json({ success: true, message: 'Data driver diperbarui', data: driver });
    } catch (error) {
      next(error);
    }
  }

  public static async addDriverTimeOff(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = await DriverService.addTimeOff(req.params.id, timeOffSchema.parse(req.body));
      return res.status(201).json({ success: true, message: 'Jadwal cuti ditambahkan', data: driver });
    } catch (error) {
      next(error);
    }
  }

  public static async removeDriverTimeOff(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = DriverService.removeTimeOff(req.params.id, req.params.timeOffId);
      return res.status(200).json({ success: true, message: 'Jadwal cuti dihapus', data: driver });
    } catch (error) {
      next(error);
    }
  }

  public static async assignDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const { driverId } = assignDriverSchema.parse(req.body);
      const updated = await DriverService.assign(req.params.id, driverId);
      return res.status(200).json({ success: true, message: driverId ? 'Driver ditugaskan' : 'Penugasan driver dilepas', data: updated });
    } catch (error) {
      next(error);
    }
  }

  // ---------- Kalender ----------

  public static async calendar(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = calendarQuerySchema.parse(req.query);
      return res.status(200).json({ success: true, data: await ScheduleService.getCalendar(from, to) });
    } catch (error) {
      next(error);
    }
  }

  public static async calendarIcs(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = calendarQuerySchema.parse(req.query);
      const ics = await ScheduleService.buildIcs(from, to);
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="electra-jadwal-${from}_${to}.ics"`);
      return res.status(200).send(ics);
    } catch (error) {
      next(error);
    }
  }

  // ---------- Keuangan ----------

  private static range(q: { from?: string; to?: string }) {
    const today = dateWib();
    const from = q.from || `${today.slice(0, 8)}01`; // default: awal bulan berjalan
    const to = q.to || today;
    if (!isValidDateStr(from) || !isValidDateStr(to)) throw new AppError('Format tanggal harus YYYY-MM-DD', 400);
    if (from > to) throw new AppError('Tanggal awal tidak boleh setelah tanggal akhir', 400);
    if ((Date.parse(to) - Date.parse(from)) / 86400000 > 730) throw new AppError('Rentang laporan maksimal 2 tahun', 400);
    return { from, to };
  }

  public static async financeSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const q = financeRangeSchema.parse(req.query);
      const { from, to } = AdminController.range(q);
      return res.status(200).json({ success: true, data: await FinanceService.getSummary(from, to) });
    } catch (error) {
      next(error);
    }
  }

  public static async financeLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const q = financeRangeSchema.parse(req.query);
      const { from, to } = AdminController.range(q);
      return res.status(200).json({ success: true, data: await FinanceService.getLedger(from, to, q.kind) });
    } catch (error) {
      next(error);
    }
  }

  public static async inquiryFinance(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({ success: true, data: await FinanceService.getInquiryFinance(req.params.id) });
    } catch (error) {
      next(error);
    }
  }

  public static async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await FinanceService.addPayment(createPaymentSchema.parse(req.body));
      return res.status(201).json({ success: true, message: 'Pembayaran dicatat', data: payment });
    } catch (error) {
      next(error);
    }
  }

  public static async voidPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = voidSchema.parse(req.body);
      return res.status(200).json({ success: true, message: 'Pembayaran dibatalkan', data: FinanceService.voidPayment(req.params.id, reason) });
    } catch (error) {
      next(error);
    }
  }

  public static async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await FinanceService.addExpense(createExpenseSchema.parse(req.body));
      return res.status(201).json({ success: true, message: 'Pengeluaran dicatat', data: expense });
    } catch (error) {
      next(error);
    }
  }

  public static async voidExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = voidSchema.parse(req.body);
      return res.status(200).json({ success: true, message: 'Pengeluaran dibatalkan', data: FinanceService.voidExpense(req.params.id, reason) });
    } catch (error) {
      next(error);
    }
  }

  // ---------- Live chat (sisi admin) ----------

  public static async chatSessions(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({ success: true, data: ChatService.adminList() });
    } catch (error) {
      next(error);
    }
  }

  public static async chatMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const after = typeof req.query.after === 'string' ? req.query.after : undefined;
      return res.status(200).json({ success: true, data: ChatService.adminMessages(req.params.id, after) });
    } catch (error) {
      next(error);
    }
  }

  public static async chatReply(req: Request, res: Response, next: NextFunction) {
    try {
      const { text } = chatTextSchema.parse(req.body);
      return res.status(201).json({ success: true, data: ChatService.adminReply(req.params.id, text) });
    } catch (error) {
      next(error);
    }
  }

  // ---------- Badge sidebar (ringan, dipanggil berkala) ----------

  public static async badges(req: Request, res: Response, next: NextFunction) {
    try {
      const { items } = await inquiryService.listAdminInquiries();
      const today = dateWib();
      return res.status(200).json({
        success: true,
        data: {
          pendingInquiries: items.filter((i) => i.status === 'PENDING_WHATSAPP').length,
          overdueReturns: items.filter((i) => i.status === 'ACTIVE' && i.endDate < today).length,
          unreadChats: ChatService.unreadTotal(),
          unpaid: items.filter((i) => (i.status === 'CONFIRMED' || i.status === 'ACTIVE') && i.paymentStatus === 'UNPAID').length,
          drivers: store.data.drivers.filter((d) => d.isActive).length
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
