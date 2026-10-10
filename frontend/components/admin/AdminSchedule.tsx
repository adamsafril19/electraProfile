import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Download, ExternalLink, TriangleAlert } from 'lucide-react-native';
import {
  AdminApiError,
  AdminVehicle,
  CalendarData,
  CalendarEvent,
  downloadCalendarIcs,
  fetchAdminFleet,
  fetchCalendar,
  googleCalendarLink,
} from '../../services/adminApi';
import { toDateStr, todayStr } from '../../utils/date';
import { Avatar, Btn, Card, Chip, EmptyState, ErrorBox, InfoBox, Loading, PageHeader, Pill, StatusBadge, WarnBox, adminStyles, fmtDate, openExternal, rp, statusColor } from './ui';
import { T } from './theme';

interface Props {
  onUnauthorized: () => void;
  onOpenInquiry: (e: CalendarEvent) => void;
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const REFRESH_MS = 30000;
const CELL_W = 36;
const ROW_H = 46;
const LANE_H = 34;
const LABEL_W = 170;

const parse = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s: string, n: number): string => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};
const diffDays = (a: string, b: string): number => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

const shortVehicle = (name: string) => name.split(' ').slice(0, 2).join(' ');
const firstName = (name: string) => name.split(' ')[0];

type ViewMode = 'KALENDER' | 'TIMELINE';
type RowMode = 'UNIT' | 'DRIVER';

export const AdminSchedule: React.FC<Props> = ({ onUnauthorized, onOpenInquiry }) => {
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const now = new Date();

  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [view, setView] = useState<ViewMode>('KALENDER');
  const [rowMode, setRowMode] = useState<RowMode>('UNIT');
  const [data, setData] = useState<CalendarData | null>(null);
  const [fleet, setFleet] = useState<AdminVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(todayStr());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);

  const monthStart = toDateStr(new Date(cursor.y, cursor.m, 1));
  const nextMonthStart = toDateStr(new Date(cursor.y, cursor.m + 1, 1));
  const daysInMonth = diffDays(monthStart, nextMonthStart);
  const offset = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7; // minggu dimulai Senin
  const gridStart = addDays(monthStart, -offset);
  const gridDays = Math.ceil((offset + daysInMonth) / 7) * 7;
  const fetchFrom = gridStart;
  const fetchTo = addDays(gridStart, gridDays - 1);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [cal, vehicles] = await Promise.all([fetchCalendar(fetchFrom, fetchTo), fetchAdminFleet()]);
        setData(cal);
        setFleet(vehicles);
        setError(null);
      } catch (e) {
        if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
        setError(e instanceof AdminApiError ? e.message : 'Gagal memuat jadwal.');
      } finally {
        setLoading(false);
      }
    },
    [fetchFrom, fetchTo, onUnauthorized]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const events = data?.events || [];
  const timeOff = data?.timeOff || [];
  const today = todayStr();

  const eventsOn = useCallback((day: string) => events.filter((e) => e.startDate <= day && day < e.endDate), [events]);
  const timeOffOn = useCallback((day: string) => timeOff.filter((t) => t.from <= day && day <= t.to), [timeOff]);

  const conflicts = useMemo(() => events.filter((e) => e.vehicleConflictWith.length > 0 || e.driverConflictWith.length > 0), [events]);
  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  const goMonth = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelectedEventId(null);
  };
  const goToday = () => {
    setCursor({ y: now.getFullYear(), m: now.getMonth() });
    setSelectedDay(today);
    setSelectedEventId(null);
  };

  const exportIcs = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      await downloadCalendarIcs(monthStart, addDays(nextMonthStart, -1));
      setExportMsg(`Berkas jadwal ${MONTH_NAMES[cursor.m]} ${cursor.y} diunduh.`);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setExportMsg(e instanceof AdminApiError ? e.message : 'Ekspor gagal.');
    } finally {
      setExporting(false);
    }
  };

  const dayCells = Array.from({ length: gridDays }, (_, i) => addDays(gridStart, i));
  const weeks = Array.from({ length: gridDays / 7 }, (_, w) => dayCells.slice(w * 7, w * 7 + 7));

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Jadwal"
        subtitle="Pantau pemakaian unit dan penugasan driver. Ekspor ke Google Calendar lewat berkas .ics atau tombol per reservasi."
        right={
          <>
            <Btn label={exporting ? 'Mengunduh…' : 'Ekspor .ics'} icon={Download} variant="secondary" small onPress={exportIcs} loading={exporting} />
            <Btn label="Cara pakai Google Calendar" icon={CalendarDays} variant="ghost" small onPress={() => setShowHow((v) => !v)} />
          </>
        }
      />

      {showHow && (
        <InfoBox message={'Impor jadwal ke Google Calendar:\n1. Klik "Ekspor .ics" untuk mengunduh jadwal bulan yang tampil.\n2. Buka calendar.google.com → ikon roda gigi → Setelan → Impor & ekspor → Impor.\n3. Pilih berkas .ics dan kalender tujuan.\n\nUntuk satu reservasi saja, buka Pesanan lalu klik "Tambah ke Google Calendar". Sinkronisasi otomatis dua arah butuh kredensial Google API dan belum diaktifkan.'} />
      )}
      {exportMsg ? <WarnBox message={exportMsg} /> : null}
      {error ? <ErrorBox message={error} onRetry={() => load()} /> : null}

      {/* Navigasi bulan */}
      <Card style={styles.toolbar}>
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => goMonth(-1)} accessibilityRole="button" accessibilityLabel="Bulan sebelumnya">
            <ChevronLeft size={20} color={T.ink} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[cursor.m]} {cursor.y}
          </Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => goMonth(1)} accessibilityRole="button" accessibilityLabel="Bulan berikutnya">
            <ChevronRight size={20} color={T.ink} />
          </TouchableOpacity>
          <Btn label="Hari ini" variant="secondary" small onPress={goToday} />
        </View>
        <View style={adminStyles.row}>
          <Chip label="Kalender" active={view === 'KALENDER'} onPress={() => setView('KALENDER')} />
          <Chip label="Timeline" active={view === 'TIMELINE'} onPress={() => setView('TIMELINE')} />
          {view === 'TIMELINE' && (
            <>
              <Chip label="Per unit" active={rowMode === 'UNIT'} onPress={() => setRowMode('UNIT')} />
              <Chip label="Per driver" active={rowMode === 'DRIVER'} onPress={() => setRowMode('DRIVER')} />
            </>
          )}
        </View>
      </Card>

      {conflicts.length > 0 && (
        <View style={styles.conflictBox} accessibilityRole="alert">
          <TriangleAlert size={18} color={T.danger} />
          <Text style={styles.conflictText}>
            {conflicts.length} reservasi bentrok jadwal: {conflicts.map((c) => c.inquiryCode).join(', ')}. Klik reservasi bertanda ⚠ untuk detailnya.
          </Text>
        </View>
      )}

      {loading && !data ? (
        <Loading />
      ) : view === 'KALENDER' ? (
        <Card style={{ padding: compact ? 8 : 14 }}>
          <View style={styles.dowRow}>
            {DOW.map((d) => (
              <Text key={d} style={styles.dowText}>
                {d}
              </Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day) => {
                const inMonth = day >= monthStart && day < nextMonthStart;
                const dayEvents = eventsOn(day);
                const dayOff = timeOffOn(day);
                const isToday = day === today;
                const isSelected = day === selectedDay;
                const maxChips = compact ? 0 : 3;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.cell, !inMonth && styles.cellOut, isSelected && styles.cellSelected, compact && { minHeight: 58 }]}
                    onPress={() => {
                      setSelectedDay(day);
                      setSelectedEventId(null);
                    }}
                    // Di layar lebar sel berisi chip yang bisa diketuk sendiri; hindari tombol di dalam tombol
                    accessibilityRole={compact ? 'button' : undefined}
                    accessibilityLabel={`${fmtDate(day)}, ${dayEvents.length} reservasi`}
                  >
                    <View style={[styles.dayNum, isToday && styles.dayNumToday]}>
                      <Text style={[styles.dayNumText, isToday && { color: '#FFFFFF' }, !inMonth && { color: '#94A3B8' }]}>{Number(day.slice(8))}</Text>
                    </View>
                    {dayEvents.slice(0, maxChips).map((e) => {
                      const c = statusColor(e.status);
                      const hasConflict = e.vehicleConflictWith.length > 0 || e.driverConflictWith.length > 0;
                      return (
                        <TouchableOpacity
                          key={e.id}
                          style={[styles.evChip, { backgroundColor: c.bg, borderLeftColor: c.dot }, hasConflict && styles.evConflict]}
                          onPress={() => {
                            setSelectedDay(day);
                            setSelectedEventId(e.id);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`${e.vehicleName}, ${e.customerName}`}
                        >
                          <Text style={[styles.evText, { color: c.fg }]} numberOfLines={1}>
                            {hasConflict ? '⚠ ' : ''}
                            {shortVehicle(e.vehicleName)} · {firstName(e.customerName)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {!compact && dayEvents.length > maxChips && <Text style={styles.more}>+{dayEvents.length - maxChips} lagi</Text>}
                    {!compact && dayOff.slice(0, 1).map((t) => (
                      <View key={t.id} style={styles.offChip}>
                        <Text style={styles.offText} numberOfLines={1}>
                          Cuti: {t.driverName}
                        </Text>
                      </View>
                    ))}
                    {compact && (dayEvents.length > 0 || dayOff.length > 0) && (
                      <View style={styles.dots}>
                        {dayEvents.slice(0, 4).map((e) => (
                          <View key={e.id} style={[styles.dot, { backgroundColor: statusColor(e.status).dot }]} />
                        ))}
                        {dayOff.length > 0 && <View style={[styles.dot, { backgroundColor: '#94A3B8' }]} />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </Card>
      ) : (
        <Timeline
          monthStart={monthStart}
          daysInMonth={daysInMonth}
          today={today}
          events={events}
          timeOff={timeOff}
          fleet={fleet}
          drivers={Array.from(new Map(events.filter((e) => e.driverId).map((e) => [e.driverId!, e.driverName!])).entries())}
          allDriverTimeOff={timeOff}
          rowMode={rowMode}
          selectedEventId={selectedEventId}
          onSelect={(e) => {
            setSelectedEventId(e.id);
            setSelectedDay(e.startDate);
          }}
        />
      )}

      <Legend />

      {/* Detail reservasi terpilih, atau agenda hari terpilih */}
      {selectedEvent ? (
        <EventDetail event={selectedEvent} onOpen={() => onOpenInquiry(selectedEvent)} onClose={() => setSelectedEventId(null)} />
      ) : (
        <Card>
          <Text style={styles.agendaTitle}>Agenda {fmtDate(selectedDay)}</Text>
          {eventsOn(selectedDay).length === 0 && timeOffOn(selectedDay).length === 0 ? (
            <EmptyState icon={CalendarDays} title="Tidak ada agenda" text="Tidak ada unit terpakai atau driver cuti pada tanggal ini." />
          ) : (
            <View style={{ gap: 8, marginTop: 10 }}>
              {eventsOn(selectedDay).map((e) => (
                <TouchableOpacity key={e.id} style={styles.agendaRow} onPress={() => setSelectedEventId(e.id)} accessibilityRole="button">
                  <Avatar name={e.customerName} size={36} />
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Text style={styles.agendaName}>
                      {e.vehicleConflictWith.length + e.driverConflictWith.length > 0 ? '⚠ ' : ''}
                      {e.vehicleName} — {e.customerName}
                    </Text>
                    <Text style={adminStyles.muted}>
                      {fmtDate(e.startDate)} – {fmtDate(e.endDate)}
                      {e.driverName ? ` • Driver ${e.driverName}` : e.serviceType === 'DENGAN_DRIVER' ? ' • belum ada driver' : ''}
                    </Text>
                  </View>
                  <StatusBadge status={e.status} />
                </TouchableOpacity>
              ))}
              {timeOffOn(selectedDay).map((t) => (
                <View key={t.id} style={styles.agendaRow}>
                  <Avatar name={t.driverName} size={36} tone="neutral" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.agendaName}>{t.driverName} — cuti</Text>
                    <Text style={adminStyles.muted}>
                      {fmtDate(t.from)} – {fmtDate(t.to)} • {t.reason}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}
    </View>
  );
};

// ---------- Timeline ----------

const Timeline: React.FC<{
  monthStart: string;
  daysInMonth: number;
  today: string;
  events: CalendarEvent[];
  timeOff: CalendarData['timeOff'];
  allDriverTimeOff: CalendarData['timeOff'];
  fleet: AdminVehicle[];
  drivers: [string, string][];
  rowMode: RowMode;
  selectedEventId: string | null;
  onSelect: (e: CalendarEvent) => void;
}> = ({ monthStart, daysInMonth, today, events, timeOff, fleet, drivers, rowMode, selectedEventId, onSelect }) => {
  const monthEnd = addDays(monthStart, daysInMonth); // eksklusif
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));

  const rows: { id: string; label: string; sub?: string }[] =
    rowMode === 'UNIT'
      ? fleet.map((v) => ({ id: v.id, label: `${v.brand} ${v.model}`, sub: v.licensePlate }))
      : drivers.map(([id, name]) => ({ id, label: name }));

  // Driver yang hanya punya cuti (tanpa penugasan bulan ini) tetap perlu tampil
  const extraDrivers =
    rowMode === 'DRIVER' ? timeOff.filter((t) => !drivers.some(([id]) => id === t.driverId)).map((t) => ({ id: t.driverId, label: t.driverName })) : [];
  const allRows: { id: string; label: string; sub?: string }[] = [...rows, ...Array.from(new Map(extraDrivers.map((r) => [r.id, r])).values())];

  const bar = (start: string, end: string) => {
    const s = start < monthStart ? monthStart : start;
    const e = end > monthEnd ? monthEnd : end;
    return { left: diffDays(monthStart, s) * CELL_W, width: Math.max(1, diffDays(s, e)) * CELL_W - 3 };
  };

  // Reservasi yang beririsan pada satu baris disusun bertingkat (lane) supaya bentrok tetap terlihat
  const layout = allRows.map((r) => {
    const rowEvents = events
      .filter((e) => (rowMode === 'UNIT' ? e.vehicleId === r.id : e.driverId === r.id) && e.startDate < monthEnd && e.endDate > monthStart)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const laneEnds: string[] = [];
    const placed = rowEvents.map((e) => {
      let lane = laneEnds.findIndex((end) => end <= e.startDate);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(e.endDate);
      } else laneEnds[lane] = e.endDate;
      return { e, lane };
    });
    const rowOff = rowMode === 'DRIVER' ? timeOff.filter((t) => t.driverId === r.id && t.from < monthEnd && addDays(t.to, 1) > monthStart) : [];
    return { r, placed, rowOff, height: Math.max(ROW_H, Math.max(1, laneEnds.length) * LANE_H + 12) };
  });

  if (allRows.length === 0) {
    return (
      <Card>
        <EmptyState title={rowMode === 'UNIT' ? 'Belum ada armada' : 'Belum ada driver bertugas atau cuti bulan ini'} text="Tugaskan driver pada reservasi Dengan Sopir untuk melihatnya di sini." />
      </Card>
    );
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: LABEL_W, borderRightWidth: 1, borderRightColor: T.border }}>
          <View style={[styles.tlHead, { justifyContent: 'center', paddingLeft: 12 }]}>
            <Text style={styles.tlHeadLabel}>{rowMode === 'UNIT' ? 'Unit' : 'Driver'}</Text>
          </View>
          {layout.map(({ r, height }) => (
            <View key={r.id} style={[styles.tlLabel, { height }]}>
              <Text style={styles.tlLabelText} numberOfLines={1}>
                {r.label}
              </Text>
              {r.sub ? <Text style={styles.tlSub}>{r.sub}</Text> : null}
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
          <View style={{ width: daysInMonth * CELL_W }}>
            <View style={[styles.tlHead, { flexDirection: 'row' }]}>
              {days.map((d) => {
                const dow = (parse(d).getDay() + 6) % 7;
                return (
                  <View key={d} style={[styles.tlDay, d === today && styles.tlDayToday, dow >= 5 && { backgroundColor: '#F8FAFC' }]}>
                    <Text style={[styles.tlDow, d === today && { color: T.brand }]}>{DOW[dow][0]}</Text>
                    <Text style={[styles.tlNum, d === today && { color: T.brand, fontWeight: '900' }]}>{Number(d.slice(8))}</Text>
                  </View>
                );
              })}
            </View>

            {layout.map(({ r, placed, rowOff, height }) => {
              return (
                <View key={r.id} style={{ height, position: 'relative', borderTopWidth: 1, borderTopColor: T.border }}>
                  {/* garis kolom + penanda hari ini */}
                  <View style={StyleSheet.absoluteFill as any} pointerEvents="none">
                    {days.map((d, idx) =>
                      d === today ? <View key={d} style={{ position: 'absolute', left: idx * CELL_W, width: CELL_W, top: 0, bottom: 0, backgroundColor: 'rgba(14,165,233,0.08)' }} /> : null
                    )}
                  </View>
                  {rowOff.map((t) => {
                    const b = bar(t.from, addDays(t.to, 1));
                    return (
                      <View key={t.id} style={[styles.tlBar, styles.tlOff, { left: b.left, width: b.width, top: 6, height: LANE_H - 4 }]}>
                        <Text style={styles.tlOffText} numberOfLines={1}>
                          Cuti • {t.reason}
                        </Text>
                      </View>
                    );
                  })}
                  {placed.map(({ e, lane }) => {
                    const b = bar(e.startDate, e.endDate);
                    const c = statusColor(e.status);
                    const conflict = e.vehicleConflictWith.length > 0 || e.driverConflictWith.length > 0;
                    return (
                      <TouchableOpacity
                        key={e.id}
                        style={[
                          styles.tlBar,
                          { left: b.left, width: b.width, top: 6 + lane * LANE_H, height: LANE_H - 4, backgroundColor: c.bg, borderColor: conflict ? T.danger : c.dot },
                          conflict && { borderWidth: 2 },
                          selectedEventId === e.id && { borderColor: T.ink, borderWidth: 2 },
                        ]}
                        onPress={() => onSelect(e)}
                        accessibilityRole="button"
                        accessibilityLabel={`${e.vehicleName}, ${e.customerName}, ${fmtDate(e.startDate)} sampai ${fmtDate(e.endDate)}`}
                      >
                        <Text style={[styles.tlBarText, { color: c.fg }]} numberOfLines={1}>
                          {conflict ? '⚠ ' : ''}
                          {rowMode === 'UNIT' ? e.customerName : shortVehicle(e.vehicleName)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Card>
  );
};

const LEGEND_LABEL = { PENDING_WHATSAPP: 'Menunggu', CONFIRMED: 'Dikonfirmasi', ACTIVE: 'Berjalan', COMPLETED: 'Selesai' } as const;

const Legend: React.FC = () => (
  <View style={[adminStyles.row, { gap: 14 }]}>
    {(Object.keys(LEGEND_LABEL) as (keyof typeof LEGEND_LABEL)[]).map((s) => (
      <View key={s} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: statusColor(s).dot }]} />
        <Text style={styles.legendText}>{LEGEND_LABEL[s]}</Text>
      </View>
    ))}
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} />
      <Text style={styles.legendText}>Cuti driver</Text>
    </View>
    <View style={styles.legendItem}>
      <Text style={[styles.legendText, { color: T.danger, fontWeight: '800' }]}>⚠ Bentrok jadwal</Text>
    </View>
  </View>
);

const EventDetail: React.FC<{ event: CalendarEvent; onOpen: () => void; onClose: () => void }> = ({ event: e, onOpen, onClose }) => (
  <Card style={{ borderColor: T.brand, gap: 12 }}>
    <View style={styles.detailHead}>
      <Avatar name={e.customerName} />
      <View style={{ flex: 1, minWidth: 200 }}>
        <Text style={styles.agendaName}>
          {e.vehicleName} — {e.customerName}
        </Text>
        <Text style={adminStyles.muted}>
          {e.inquiryCode} • {fmtDate(e.startDate)} – {fmtDate(e.endDate)} ({e.durationDays} hari) • {rp(e.estimatedTotal)}
        </Text>
      </View>
      <StatusBadge status={e.status} />
    </View>

    <View style={[adminStyles.row, { gap: 6 }]}>
      <Pill label={e.serviceType === 'LEPAS_KUNCI' ? 'Lepas Kunci' : 'Dengan Sopir'} />
      {e.driverName ? <Pill label={`Driver: ${e.driverName}`} tone="info" /> : e.serviceType === 'DENGAN_DRIVER' ? <Pill label="Belum ada driver" tone="warn" /> : null}
      {e.paymentStatus && <Pill label={{ UNPAID: 'Belum dibayar', PARTIAL: 'Dibayar sebagian', PAID: 'Lunas' }[e.paymentStatus]} tone={e.paymentStatus === 'PAID' ? 'success' : e.paymentStatus === 'PARTIAL' ? 'warn' : 'danger'} />}
    </View>

    {e.vehicleConflictWith.length > 0 && <WarnBox message={`Unit bentrok dengan ${e.vehicleConflictWith.join(', ')} (tanggal beririsan).`} />}
    {e.driverConflictWith.length > 0 && <WarnBox message={`Driver bentrok dengan ${e.driverConflictWith.join(', ')} (tanggal beririsan).`} />}

    <Text style={adminStyles.muted}>
      Serah terima: {e.pickupLocation} • Pengembalian: {e.returnLocation}
    </Text>

    <View style={adminStyles.row}>
      <Btn label="Buka pesanan" icon={ExternalLink} small onPress={onOpen} />
      <Btn label="Tambah ke Google Calendar" icon={CalendarPlus} variant="secondary" small onPress={() => openExternal(googleCalendarLink(e))} />
      <Btn label="Tutup" variant="ghost" small onPress={onClose} />
    </View>
  </Card>
);

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', maxWidth: '100%' },
  navBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.border },
  monthTitle: { fontSize: 19, fontWeight: '900', color: T.ink, minWidth: 110, flexShrink: 1, textAlign: 'center' },
  conflictBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: T.radiusSm, padding: 12 },
  conflictText: { flex: 1, color: '#991B1B', fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
  dowRow: { flexDirection: 'row', marginBottom: 6 },
  dowText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, minHeight: 112, padding: 4, gap: 3, borderWidth: 0.5, borderColor: T.border, backgroundColor: T.surface },
  cellOut: { backgroundColor: '#F8FAFC' },
  cellSelected: { backgroundColor: T.brandSoft, borderColor: T.brand },
  dayNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayNumToday: { backgroundColor: T.brand },
  dayNumText: { fontSize: 12.5, fontWeight: '800', color: T.ink },
  evChip: { borderLeftWidth: 3, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  evConflict: { borderWidth: 1.5, borderColor: T.danger },
  evText: { fontSize: 12, fontWeight: '700' },
  more: { fontSize: 12, color: T.muted, fontWeight: '700', paddingLeft: 4 },
  offChip: { backgroundColor: '#E2E8F0', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  offText: { fontSize: 12, color: '#475569', fontWeight: '700' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, paddingLeft: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tlHead: { height: 46, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surfaceAlt },
  tlHeadLabel: { fontSize: 12, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
  tlLabel: { justifyContent: 'center', paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: T.border },
  tlLabelText: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  tlSub: { fontSize: 12, color: T.muted },
  tlDay: { width: CELL_W, alignItems: 'center', justifyContent: 'center', borderRightWidth: 0.5, borderRightColor: T.border },
  tlDayToday: { backgroundColor: 'rgba(14,165,233,0.12)' },
  tlDow: { fontSize: 12, color: T.muted, fontWeight: '700' },
  tlNum: { fontSize: 12.5, color: T.inkSoft, fontWeight: '700' },
  tlBar: { position: 'absolute', borderRadius: 7, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 6, overflow: 'hidden' },
  tlBarText: { fontSize: 12, fontWeight: '800' },
  tlOff: { backgroundColor: '#E2E8F0', borderColor: '#94A3B8' },
  tlOffText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12.5, color: T.inkSoft, fontWeight: '600' },
  agendaTitle: { fontSize: 16, fontWeight: '900', color: T.ink },
  agendaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt },
  agendaName: { fontSize: 14.5, fontWeight: '800', color: T.ink },
  detailHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
});
