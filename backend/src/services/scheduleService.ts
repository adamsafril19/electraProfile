import { AdminInquiry } from '../types';
import { store } from '../utils/JsonStore';
import { AppError } from '../utils/AppError';
import { addDaysStr, isValidDateStr, rangesOverlap } from '../utils/dates';
import { inquiryService } from './inquiryService';

export interface CalendarEvent extends AdminInquiry {
  // Bentrok dengan reservasi lain yang sama-sama aktif (unit atau driver yang sama)
  vehicleConflictWith: string[];
  driverConflictWith: string[];
}

const LIVE = ['PENDING_WHATSAPP', 'CONFIRMED', 'ACTIVE'];

export class ScheduleService {
  private static checkRange(from: string, to: string) {
    if (!isValidDateStr(from) || !isValidDateStr(to)) throw new AppError('Format tanggal harus YYYY-MM-DD', 400);
    if (from > to) throw new AppError('Tanggal awal tidak boleh setelah tanggal akhir', 400);
    if (addDaysStr(from, 400) < to) throw new AppError('Rentang kalender maksimal 400 hari', 400);
  }

  /** Reservasi yang menyentuh rentang [from, to] (inklusif) beserta penanda bentrok. */
  public static async getCalendar(from: string, to: string) {
    ScheduleService.checkRange(from, to);
    const { items } = await inquiryService.listAdminInquiries();
    const live = items.filter((i) => LIVE.includes(i.status));

    const events: CalendarEvent[] = items
      .filter((i) => i.status !== 'CANCELLED' && i.startDate <= to && i.endDate > from)
      .map((i) => {
        const isLive = LIVE.includes(i.status);
        const overlapping = (o: AdminInquiry) => o.id !== i.id && rangesOverlap(i.startDate, i.endDate, o.startDate, o.endDate);
        return {
          ...i,
          vehicleConflictWith: isLive ? live.filter((o) => o.vehicleId === i.vehicleId && overlapping(o)).map((o) => o.inquiryCode) : [],
          driverConflictWith:
            isLive && i.driverId ? live.filter((o) => o.driverId === i.driverId && overlapping(o)).map((o) => o.inquiryCode) : [],
        };
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    const timeOff = store.data.drivers.flatMap((d) =>
      d.timeOff.filter((t) => t.from <= to && t.to >= from).map((t) => ({ ...t, driverId: d.id, driverName: d.name }))
    );

    return { from, to, events, timeOff };
  }

  // ---------- ICS (impor ke Google Calendar / Apple Calendar / Outlook) ----------

  private static esc(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  // RFC 5545: baris maksimal 75 oktet, lanjutan diawali spasi
  private static fold(line: string): string {
    const out: string[] = [];
    let rest = line;
    while (Buffer.byteLength(rest, 'utf8') > 75) {
      let cut = 74;
      while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > 74) cut--;
      out.push(rest.slice(0, cut));
      rest = ' ' + rest.slice(cut);
    }
    out.push(rest);
    return out.join('\r\n');
  }

  public static async buildIcs(from: string, to: string): Promise<string> {
    const { events } = await ScheduleService.getCalendar(from, to);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ymd = (s: string) => s.replace(/-/g, '');

    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Electra EV Rental//Jadwal//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Electra - Jadwal Sewa'];
    for (const e of events) {
      const service = e.serviceType === 'LEPAS_KUNCI' ? 'Lepas Kunci' : 'Dengan Sopir';
      const description = [
        `Kode: ${e.inquiryCode}`,
        `Status: ${e.status}`,
        `Pelanggan: ${e.customerName} (${e.customerPhone})`,
        `Layanan: ${service}`,
        e.driverName ? `Driver: ${e.driverName}` : '',
        `Serah terima: ${e.pickupLocation}`,
        `Pengembalian: ${e.returnLocation}`,
        e.customerNotes ? `Catatan: ${e.customerNotes}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      lines.push(
        'BEGIN:VEVENT',
        `UID:${e.inquiryCode}@electra-rental`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(e.startDate)}`,
        `DTEND;VALUE=DATE:${ymd(e.endDate)}`, // eksklusif, sesuai standar ICS untuk acara seharian
        `SUMMARY:${ScheduleService.esc(`${e.vehicleName} - ${e.customerName}`)}`,
        `DESCRIPTION:${ScheduleService.esc(description)}`,
        `LOCATION:${ScheduleService.esc(e.pickupLocation)}`,
        `STATUS:${e.status === 'PENDING_WHATSAPP' ? 'TENTATIVE' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    }
    lines.push('END:VCALENDAR');
    return lines.map((l) => ScheduleService.fold(l)).join('\r\n') + '\r\n';
  }
}
