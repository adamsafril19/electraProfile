import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  TriangleAlert,
  MessageCircle,
  Key,
  UserX,
  X,
  Calendar,
  Layers,
  BatteryCharging,
  Car,
  AlertTriangle,
} from 'lucide-react-native';
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
import {
  Avatar,
  Btn,
  Card,
  Chip,
  EmptyState,
  ErrorBox,
  InfoBox,
  Loading,
  PageHeader,
  Pill,
  StatusBadge,
  WarnBox,
  adminStyles,
  fmtDate,
  openExternal,
  openWhatsAppTo,
  rp,
  statusColor,
} from './ui';
import { T, shadow } from './theme';

interface Props {
  onUnauthorized: () => void;
  onOpenInquiry: (e: CalendarEvent) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const REFRESH_MS = 30000;
const CELL_W = 38;
const ROW_H = 50;
const LANE_H = 34;
const LABEL_W = 180;

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
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1120;
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
  const [dismissConflictBanner, setDismissConflictBanner] = useState(false);

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

  const vehicleMap = useMemo(() => {
    const map = new Map<string, AdminVehicle>();
    fleet.forEach((v) => map.set(v.id, v));
    return map;
  }, [fleet]);

  const eventsOn = useCallback((day: string) => events.filter((e) => e.startDate <= day && day < e.endDate), [events]);
  const timeOffOn = useCallback((day: string) => timeOff.filter((t) => t.from <= day && day <= t.to), [timeOff]);

  const conflicts = useMemo(
    () => events.filter((e) => e.vehicleConflictWith.length > 0 || e.driverConflictWith.length > 0),
    [events]
  );
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
      setExportMsg(`Berkas jadwal ${MONTH_NAMES[cursor.m]} ${cursor.y} berhasil diunduh.`);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setExportMsg(e instanceof AdminApiError ? e.message : 'Ekspor gagal.');
    } finally {
      setExporting(false);
    }
  };

  const handleResolveConflict = () => {
    if (conflicts.length > 0) {
      const first = conflicts[0];
      setSelectedDay(first.startDate);
      setSelectedEventId(first.id);
      setView('KALENDER');
    }
  };

  const dayCells = Array.from({ length: gridDays }, (_, i) => addDays(gridStart, i));
  const weeks = Array.from({ length: gridDays / 7 }, (_, w) => dayCells.slice(w * 7, w * 7 + 7));

  return (
    <View style={{ gap: 18 }}>
      {/* 1. Header Halaman Hero Banner */}
      <PageHeader
        tag="KALENDER OPERASIONAL & TIMELINE DISPATCH"
        title="Jadwal"
        subtitle="Pantau ketersediaan armada, jadwal sewa aktif, penugasan supir, serta deteksi bentrok jadwal secara real-time."
        right={
          <>
            <Btn
              label={exporting ? 'Mengunduh…' : 'Ekspor .ics'}
              icon={Download}
              variant="secondary"
              small
              onPress={exportIcs}
              loading={exporting}
            />
            <Btn
              label="Panduan Google Calendar"
              icon={CalendarDays}
              variant="ghost"
              small
              onPress={() => setShowHow((v) => !v)}
            />
            <Btn
              label="+ Jadwal Baru"
              icon={CalendarPlus}
              variant="primary"
              small
              onPress={() => router.push('/admin/pesanan' as any)}
            />
          </>
        }
      />

      {showHow && (
        <InfoBox
          message={
            'Panduan Sinkronisasi Google Calendar:\n' +
            '1. Klik "Ekspor .ics" untuk mengunduh jadwal bulan yang tampil.\n' +
            '2. Buka Google Calendar (calendar.google.com) → ikon Roda Gigi (Setelan) → Impor & Ekspor → Impor.\n' +
            '3. Pilih berkas .ics hasil unduhan dan tentukan kalender tujuan.\n\n' +
            'Untuk menambahkan satu reservasi saja, klik kartu reservasi lalu pilih "Tambah ke Google Calendar".'
          }
        />
      )}
      {exportMsg ? <WarnBox message={exportMsg} /> : null}
      {error ? <ErrorBox message={error} onRetry={() => load()} /> : null}

      {/* 2. Peringatan Bentrok Jadwal Terdeteksi (Urgent Conflict Banner ala Stitch) */}
      {conflicts.length > 0 && !dismissConflictBanner && (
        <View style={styles.conflictBanner} accessibilityRole="alert">
          <View style={styles.conflictIconBox}>
            <AlertTriangle size={24} color="#FFFFFF" />
          </View>
          <View style={styles.conflictContent}>
            <View style={styles.conflictTitleRow}>
              <Text style={styles.conflictTitle}>PERINGATAN BENTROK JADWAL TERDETEKSI</Text>
              <View style={styles.conflictBadge}>
                <Text style={styles.conflictBadgeText}>{conflicts.length} Konflik Terdeteksi</Text>
              </View>
            </View>
            <Text style={styles.conflictDesc}>
              Terdapat reservasi yang tumpang tindih waktu unit atau penugasan driver ({conflicts.map((c) => c.inquiryCode).join(', ')}).
              Selesaikan bentrok agar operasional dan serah terima unit berjalan lancar.
            </Text>
          </View>
          <View style={styles.conflictActions}>
            <TouchableOpacity style={styles.resolveBtn} onPress={handleResolveConflict} accessibilityRole="button">
              <Text style={styles.resolveBtnText}>Selesaikan Konflik</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.conflictCloseBtn}
              onPress={() => setDismissConflictBanner(true)}
              accessibilityLabel="Tutup pemberitahuan bentrok"
            >
              <X size={18} color="#991B1B" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. Toolbar Kontrol Kalender & Navigasi Waktu + Legenda */}
      <Card style={styles.toolbarCard}>
        <View style={styles.toolbarTopRow}>
          {/* Navigasi Bulan */}
          <View style={styles.dateNavCapsule}>
            <TouchableOpacity style={styles.navArrowBtn} onPress={() => goMonth(-1)} accessibilityLabel="Bulan sebelumnya">
              <ChevronLeft size={18} color={T.ink} />
            </TouchableOpacity>
            <Text style={styles.monthTitleText}>
              {MONTH_NAMES[cursor.m]} {cursor.y}
            </Text>
            <TouchableOpacity style={styles.navArrowBtn} onPress={() => goMonth(1)} accessibilityLabel="Bulan berikutnya">
              <ChevronRight size={18} color={T.ink} />
            </TouchableOpacity>
          </View>

          {/* Tombol Hari Ini */}
          <TouchableOpacity style={styles.todayBtn} onPress={goToday} accessibilityRole="button">
            <Calendar size={15} color={T.brand} />
            <Text style={styles.todayBtnText}>Hari Ini: {fmtDate(today)}</Text>
          </TouchableOpacity>

          {/* Switcher Mode: Kalender vs Timeline */}
          <View style={styles.modeToggleWrap}>
            <TouchableOpacity
              style={[styles.modeToggleBtn, view === 'KALENDER' && styles.modeToggleBtnActive]}
              onPress={() => setView('KALENDER')}
              accessibilityRole="button"
              accessibilityState={{ selected: view === 'KALENDER' }}
            >
              <Calendar size={15} color={view === 'KALENDER' ? T.brand : T.inkSoft} />
              <Text style={[styles.modeToggleText, view === 'KALENDER' && styles.modeToggleTextActive]}>
                Kalender Bulanan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggleBtn, view === 'TIMELINE' && styles.modeToggleBtnActive]}
              onPress={() => setView('TIMELINE')}
              accessibilityRole="button"
              accessibilityState={{ selected: view === 'TIMELINE' }}
            >
              <Layers size={15} color={view === 'TIMELINE' ? T.brand : T.inkSoft} />
              <Text style={[styles.modeToggleText, view === 'TIMELINE' && styles.modeToggleTextActive]}>
                Timeline (Gantt)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sub-filter baris Timeline */}
          {view === 'TIMELINE' && (
            <View style={styles.subFilterWrap}>
              <Text style={styles.subFilterLabel}>Tampilkan:</Text>
              <Chip label="Per Unit" active={rowMode === 'UNIT'} onPress={() => setRowMode('UNIT')} />
              <Chip label="Per Driver" active={rowMode === 'DRIVER'} onPress={() => setRowMode('DRIVER')} />
            </View>
          )}
        </View>

        {/* Bar Legenda Status */}
        <View style={styles.legendBar}>
          <Text style={styles.legendLabel}>LEGENDA STATUS:</Text>
          <View style={styles.legendItemsWrap}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Menunggu (Pending)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
              <Text style={styles.legendText}>Dikonfirmasi (Confirmed)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Berjalan (Ongoing)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} />
              <Text style={styles.legendText}>Selesai (Completed)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={styles.legendText}>Cuti Driver (Driver Off)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E11D48' }]} />
              <Text style={[styles.legendText, { color: '#E11D48', fontWeight: '800' }]}>Bentrok Jadwal (Conflict)</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* 4. Grid Konten Utama (70% Kalender / Timeline + 30% Panel Detail & Agenda di Desktop) */}
      {loading && !data ? (
        <Loading />
      ) : view === 'KALENDER' ? (
        <View style={[styles.layoutWrapper, isDesktop && styles.layoutRow]}>
          {/* Kolom Kiri: Kalender Grid Interaktif */}
          <View style={isDesktop ? styles.mainCalendarCol : { width: '100%' }}>
            <Card style={styles.calendarCard}>
              {/* Header Nama Hari */}
              <View style={styles.dowRow}>
                {DOW.map((d) => (
                  <View key={d} style={styles.dowCol}>
                    <Text style={styles.dowText}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Grid 35/42 Sel Tanggal */}
              {weeks.map((week, wi) => (
                <View key={wi} style={styles.weekRow}>
                  {week.map((day) => {
                    const inMonth = day >= monthStart && day < nextMonthStart;
                    const dayEvents = eventsOn(day);
                    const dayOff = timeOffOn(day);
                    const isToday = day === today;
                    const isSelected = day === selectedDay;
                    const hasConflict = dayEvents.some((e) => e.vehicleConflictWith.length > 0 || e.driverConflictWith.length > 0);
                    const maxChips = compact ? 0 : 3;

                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.cell,
                          !inMonth && styles.cellOut,
                          isSelected && styles.cellSelected,
                          hasConflict && inMonth && styles.cellConflict,
                          compact && { minHeight: 62 },
                        ]}
                        onPress={() => {
                          setSelectedDay(day);
                          setSelectedEventId(null);
                        }}
                        accessibilityRole={compact ? 'button' : undefined}
                        accessibilityLabel={`${fmtDate(day)}, ${dayEvents.length} reservasi`}
                      >
                        {/* Header Nomor Tanggal */}
                        <View style={styles.cellHeader}>
                          <View style={[styles.dayNum, isToday && styles.dayNumToday]}>
                            <Text
                              style={[
                                styles.dayNumText,
                                isToday && { color: '#FFFFFF', fontWeight: '900' },
                                !inMonth && { color: '#94A3B8' },
                                hasConflict && inMonth && !isToday && { color: T.danger, fontWeight: '800' },
                              ]}
                            >
                              {Number(day.slice(8))}
                            </Text>
                          </View>
                          {isToday && (
                            <View style={styles.todayBadge}>
                              <Text style={styles.todayBadgeText}>Hari Ini</Text>
                            </View>
                          )}
                          {hasConflict && inMonth && !isToday && (
                            <TriangleAlert size={13} color={T.danger} style={{ marginLeft: 'auto' }} />
                          )}
                        </View>

                        {/* Event Chips */}
                        {dayEvents.slice(0, maxChips).map((e) => {
                          const c = statusColor(e.status);
                          const isEvConflict = e.vehicleConflictWith.length > 0 || e.driverConflictWith.length > 0;
                          return (
                            <TouchableOpacity
                              key={e.id}
                              style={[
                                styles.evChip,
                                { backgroundColor: c.bg, borderLeftColor: isEvConflict ? T.danger : c.dot },
                                isEvConflict && styles.evConflict,
                                selectedEventId === e.id && styles.evChipSelected,
                              ]}
                              onPress={() => {
                                setSelectedDay(day);
                                setSelectedEventId(e.id);
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={`${e.vehicleName}, ${e.customerName}`}
                            >
                              <Text
                                style={[styles.evText, { color: isEvConflict ? T.danger : c.fg }]}
                                numberOfLines={1}
                              >
                                {isEvConflict ? '⚠️ ' : ''}
                                {e.inquiryCode} · {shortVehicle(e.vehicleName)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}

                        {/* Indikator Cuti Driver */}
                        {!compact &&
                          dayOff.slice(0, 1).map((t) => (
                            <View key={t.id} style={styles.offChip}>
                              <Text style={styles.offText} numberOfLines={1}>
                                Off: {firstName(t.driverName)}
                              </Text>
                            </View>
                          ))}

                        {/* Overflow Counter */}
                        {!compact && dayEvents.length > maxChips && (
                          <Text style={styles.moreText}>+{dayEvents.length - maxChips} lainnya</Text>
                        )}

                        {/* Dot indicator di layar sempit/mobile */}
                        {compact && (dayEvents.length > 0 || dayOff.length > 0) && (
                          <View style={styles.dotsRow}>
                            {dayEvents.slice(0, 3).map((e) => (
                              <View key={e.id} style={[styles.dot, { backgroundColor: statusColor(e.status).dot }]} />
                            ))}
                            {dayOff.length > 0 && <View style={[styles.dot, { backgroundColor: '#8B5CF6' }]} />}
                            {hasConflict && <View style={[styles.dot, { backgroundColor: T.danger }]} />}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </Card>
          </View>

          {/* Kolom Kanan: Panel Detail Event Terpilih & Agenda Harian (30% Sidebar di Desktop) */}
          <View style={isDesktop ? styles.sidebarCol : { width: '100%', gap: 16 }}>
            {selectedEvent ? (
              <EventDetailCard
                event={selectedEvent}
                fleetVehicle={vehicleMap.get(selectedEvent.vehicleId)}
                onOpen={() => onOpenInquiry(selectedEvent)}
                onClose={() => setSelectedEventId(null)}
              />
            ) : null}

            {/* Agenda Harian untuk Tanggal Terpilih */}
            <Card style={styles.agendaCard}>
              <View style={styles.agendaHeader}>
                <View>
                  <Text style={styles.agendaSubHeader}>AGENDA TANGGAL TERPILIH</Text>
                  <Text style={styles.agendaTitle}>{fmtDate(selectedDay)}</Text>
                </View>
                <View style={styles.activityBadge}>
                  <Text style={styles.activityBadgeText}>
                    {eventsOn(selectedDay).length + timeOffOn(selectedDay).length} Aktivitas
                  </Text>
                </View>
              </View>

              {eventsOn(selectedDay).length === 0 && timeOffOn(selectedDay).length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Tidak ada agenda"
                  text="Tidak ada jadwal sewa aktif atau cuti driver pada tanggal ini."
                />
              ) : (
                <View style={{ gap: 10, marginTop: 12 }}>
                  {eventsOn(selectedDay).map((e) => {
                    const c = statusColor(e.status);
                    const veh = vehicleMap.get(e.vehicleId);
                    const isConflict = e.vehicleConflictWith.length > 0 || e.driverConflictWith.length > 0;
                    return (
                      <TouchableOpacity
                        key={e.id}
                        style={[
                          styles.agendaItem,
                          selectedEventId === e.id && styles.agendaItemSelected,
                          isConflict && styles.agendaItemConflict,
                        ]}
                        onPress={() => setSelectedEventId(e.id)}
                        accessibilityRole="button"
                      >
                        <View style={[styles.agendaIconCircle, { backgroundColor: c.bg }]}>
                          <Car size={18} color={c.dot} />
                        </View>
                        <View style={{ flex: 1, minWidth: 160 }}>
                          <View style={styles.agendaCodeRow}>
                            <Text style={[styles.agendaCode, { color: isConflict ? T.danger : T.brand }]}>
                              {isConflict ? '⚠️ ' : ''}
                              {e.inquiryCode}
                            </Text>
                            <StatusBadge status={e.status} />
                          </View>
                          <Text style={styles.agendaVehicleName} numberOfLines={1}>
                            {e.vehicleName}
                          </Text>
                          <Text style={styles.agendaCustomerSub}>
                            {e.customerName} • {veh?.licensePlate || 'Plat EV'}
                          </Text>
                          {e.driverName && (
                            <Text style={styles.agendaDriverText}>Driver: {e.driverName}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {timeOffOn(selectedDay).map((t) => (
                    <View key={t.id} style={styles.agendaTimeOffItem}>
                      <View style={[styles.agendaIconCircle, { backgroundColor: '#EDE9FE' }]}>
                        <UserX size={18} color="#7C3AED" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.timeOffName}>{t.driverName} (Cuti)</Text>
                        <Text style={styles.timeOffReason}>
                          {t.reason} • {fmtDate(t.from)} s/d {fmtDate(t.to)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </View>
        </View>
      ) : (
        /* 5. Tampilan Timeline / Gantt Chart */
        <View style={{ gap: 16 }}>
          <TimelineSection
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

          {selectedEvent && (
            <EventDetailCard
              event={selectedEvent}
              fleetVehicle={vehicleMap.get(selectedEvent.vehicleId)}
              onOpen={() => onOpenInquiry(selectedEvent)}
              onClose={() => setSelectedEventId(null)}
            />
          )}
        </View>
      )}
    </View>
  );
};

// ==========================================
// Sub-Komponen: Kartu Detail Event Terpilih
// ==========================================

const EventDetailCard: React.FC<{
  event: CalendarEvent;
  fleetVehicle?: AdminVehicle;
  onOpen: () => void;
  onClose: () => void;
}> = ({ event: e, fleetVehicle: veh, onOpen, onClose }) => {
  const isConflict = e.vehicleConflictWith.length > 0 || e.driverConflictWith.length > 0;
  const payLabel = { UNPAID: 'Belum dibayar', PARTIAL: 'DP / Sebagian', PAID: 'Lunas' }[e.paymentStatus || 'UNPAID'];
  const payTone = e.paymentStatus === 'PAID' ? 'success' : e.paymentStatus === 'PARTIAL' ? 'warn' : 'danger';

  return (
    <Card style={[styles.detailCard, shadow]}>
      {/* Header Detail */}
      <View style={styles.detailHeaderRow}>
        <View>
          <Text style={styles.detailCardTag}>DETAIL JADWAL TERPILIH</Text>
          <Text style={styles.detailDateText}>{fmtDate(e.startDate)}</Text>
        </View>
        <StatusBadge status={e.status} />
      </View>

      {/* Profil Pelanggan & Unit Kendaraan */}
      <View style={styles.customerBox}>
        <View style={styles.customerHeader}>
          <Avatar name={e.customerName} size={42} />
          <View style={{ flex: 1, minWidth: 150 }}>
            <View style={styles.codeRow}>
              <Text style={styles.customerNameText} numberOfLines={1}>
                {e.customerName}
              </Text>
              <Text style={styles.inquiryCodeBadge}>#{e.inquiryCode}</Text>
            </View>
            <Text style={styles.phoneText}>{e.customerPhone}</Text>
          </View>
        </View>

        <View style={styles.vehicleInfoSection}>
          <View style={styles.specLine}>
            <Text style={styles.specLineLabel}>Unit Armada:</Text>
            <Text style={styles.specLineValue}>{e.vehicleName}</Text>
          </View>
          <View style={styles.specLine}>
            <Text style={styles.specLineLabel}>Plat Nomor:</Text>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{veh?.licensePlate || 'B 2309 EVL'}</Text>
            </View>
          </View>
          {veh?.specs && (
            <View style={styles.specLine}>
              <Text style={styles.specLineLabel}>Baterai / Range:</Text>
              <View style={styles.batteryRow}>
                <BatteryCharging size={14} color="#059669" />
                <Text style={styles.batteryText}>
                  Est. {veh.specs.rangeCltcKm || veh.specs.rangeWltpKm || 300} km ({veh.specs.batteryCapacityKwh ? `${veh.specs.batteryCapacityKwh} kWh` : 'Full Spec'})
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Pill Fitur Sewa */}
      <View style={styles.pillRow}>
        <Pill label={e.serviceType === 'LEPAS_KUNCI' ? '🔑 Lepas Kunci' : '👤 Dengan Sopir'} />
        <Pill label={`✓ ${payLabel}`} tone={payTone} />
        {e.driverName ? <Pill label={`Driver: ${e.driverName}`} tone="info" /> : null}
      </View>

      {/* Konflik Box Alert */}
      {isConflict && (
        <View style={styles.detailConflictWarn}>
          <TriangleAlert size={16} color="#DC2626" />
          <Text style={styles.detailConflictWarnText}>
            {e.vehicleConflictWith.length > 0 && `Bentrok Unit dengan: ${e.vehicleConflictWith.join(', ')}. `}
            {e.driverConflictWith.length > 0 && `Bentrok Driver dengan: ${e.driverConflictWith.join(', ')}.`}
          </Text>
        </View>
      )}

      {/* Metadata Rincian Sewa */}
      <View style={styles.metaTable}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Durasi Sewa:</Text>
          <Text style={styles.metaValue}>{e.durationDays} Hari ({e.durationDays * 24} Jam)</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Mulai Sewa:</Text>
          <Text style={styles.metaValue}>{fmtDate(e.startDate)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Estimasi Selesai:</Text>
          <Text style={styles.metaValue}>{fmtDate(e.endDate)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Serah Terima:</Text>
          <Text style={styles.metaValue} numberOfLines={1}>{e.pickupLocation}</Text>
        </View>
        <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.metaLabel}>Total Biaya:</Text>
          <Text style={styles.metaTotalValue}>{rp(e.estimatedTotal)}</Text>
        </View>
      </View>

      {/* Tombol Aksi Lengkap */}
      <View style={{ gap: 8, marginTop: 4 }}>
        <Btn
          label="Buka di Menu Pesanan"
          icon={ExternalLink}
          variant="primary"
          onPress={onOpen}
        />
        <View style={styles.actionGridRow}>
          <View style={{ flex: 1 }}>
            <Btn
              label="Sync Google"
              icon={CalendarPlus}
              variant="secondary"
              small
              onPress={() => openExternal(googleCalendarLink(e))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Btn
              label="WhatsApp"
              icon={MessageCircle}
              variant="secondary"
              small
              onPress={() => openWhatsAppTo(e.customerPhone, `Halo ${e.customerName}, terkait reservasi #${e.inquiryCode}.`)}
            />
          </View>
        </View>
        <Btn label="Tutup Detail" variant="ghost" small onPress={onClose} />
      </View>
    </Card>
  );
};

// ==========================================
// Sub-Komponen: Timeline / Gantt Chart
// ==========================================

const TimelineSection: React.FC<{
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
  const monthEnd = addDays(monthStart, daysInMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));

  const rows: { id: string; label: string; sub?: string }[] =
    rowMode === 'UNIT'
      ? fleet.map((v) => ({ id: v.id, label: `${v.brand} ${v.model}`, sub: `${v.licensePlate}${v.specs?.batteryCapacityKwh ? ` • ${v.specs.batteryCapacityKwh}kWh` : ''}` }))
      : drivers.map(([id, name]) => ({ id, label: name }));

  const extraDrivers =
    rowMode === 'DRIVER' ? timeOff.filter((t) => !drivers.some(([id]) => id === t.driverId)).map((t) => ({ id: t.driverId, label: t.driverName })) : [];
  const allRows: { id: string; label: string; sub?: string }[] = [...rows, ...Array.from(new Map(extraDrivers.map((r) => [r.id, r])).values())];

  const bar = (start: string, end: string) => {
    const s = start < monthStart ? monthStart : start;
    const e = end > monthEnd ? monthEnd : end;
    return { left: diffDays(monthStart, s) * CELL_W, width: Math.max(1, diffDays(s, e)) * CELL_W - 4 };
  };

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
    return { r, placed, rowOff, height: Math.max(ROW_H, Math.max(1, laneEnds.length) * LANE_H + 14) };
  });

  if (allRows.length === 0) {
    return (
      <Card>
        <EmptyState
          title={rowMode === 'UNIT' ? 'Belum ada armada' : 'Belum ada driver bertugas atau cuti'}
          text="Tugaskan armada dan driver pada pesanan untuk melihat timeline operasional."
        />
      </Card>
    );
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={styles.tlHeaderBar}>
        <View style={adminStyles.row}>
          <Layers size={18} color={T.brand} />
          <Text style={styles.tlSectionTitle}>Timeline Disposisi Armada (Gantt Chart)</Text>
        </View>
        <Text style={styles.tlScaleHint}>Skala: 1 Hari / Kolom</Text>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {/* Kolom Tetap Kiri: Nama Unit/Driver */}
        <View style={{ width: LABEL_W, borderRightWidth: 1, borderRightColor: T.border, backgroundColor: T.surface }}>
          <View style={[styles.tlHead, { justifyContent: 'center', paddingLeft: 14 }]}>
            <Text style={styles.tlHeadLabel}>{rowMode === 'UNIT' ? 'Armada (EV)' : 'Sopir & Kru'}</Text>
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

        {/* Kolom Scroll Kanan: Tanggal & Bar Durasi */}
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
          <View style={{ width: daysInMonth * CELL_W }}>
            <View style={[styles.tlHead, { flexDirection: 'row' }]}>
              {days.map((d) => {
                const dow = (parse(d).getDay() + 6) % 7;
                const isToday = d === today;
                return (
                  <View
                    key={d}
                    style={[styles.tlDay, isToday && styles.tlDayToday, dow >= 5 && { backgroundColor: '#F8FAFC' }]}
                  >
                    <Text style={[styles.tlDow, isToday && { color: T.brand, fontWeight: '800' }]}>
                      {DOW[dow][0]}
                    </Text>
                    <Text style={[styles.tlNum, isToday && { color: T.brand, fontWeight: '900' }]}>
                      {Number(d.slice(8))}
                    </Text>
                  </View>
                );
              })}
            </View>

            {layout.map(({ r, placed, rowOff, height }) => {
              return (
                <View key={r.id} style={{ height, position: 'relative', borderTopWidth: 1, borderTopColor: T.border }}>
                  {/* Highlight Kolom Hari Ini */}
                  <View style={StyleSheet.absoluteFill as any} pointerEvents="none">
                    {days.map((d, idx) =>
                      d === today ? (
                        <View
                          key={d}
                          style={{
                            position: 'absolute',
                            left: idx * CELL_W,
                            width: CELL_W,
                            top: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(14,165,233,0.08)',
                          }}
                        />
                      ) : null
                    )}
                  </View>

                  {/* Balok Cuti Driver */}
                  {rowOff.map((t) => {
                    const b = bar(t.from, addDays(t.to, 1));
                    return (
                      <View
                        key={t.id}
                        style={[
                          styles.tlBar,
                          styles.tlOff,
                          { left: b.left, width: b.width, top: 7, height: LANE_H - 4 },
                        ]}
                      >
                        <Text style={styles.tlOffText} numberOfLines={1}>
                          Cuti • {t.reason}
                        </Text>
                      </View>
                    );
                  })}

                  {/* Balok Reservasi Sewa */}
                  {placed.map(({ e, lane }) => {
                    const b = bar(e.startDate, e.endDate);
                    const c = statusColor(e.status);
                    const conflict = e.vehicleConflictWith.length > 0 || e.driverConflictWith.length > 0;
                    const isSelected = selectedEventId === e.id;

                    return (
                      <TouchableOpacity
                        key={e.id}
                        style={[
                          styles.tlBar,
                          {
                            left: b.left,
                            width: b.width,
                            top: 7 + lane * LANE_H,
                            height: LANE_H - 4,
                            backgroundColor: c.bg,
                            borderColor: conflict ? T.danger : c.dot,
                          },
                          conflict && { borderWidth: 2 },
                          isSelected && { borderColor: T.ink, borderWidth: 2.5 },
                        ]}
                        onPress={() => onSelect(e)}
                        accessibilityRole="button"
                        accessibilityLabel={`${e.vehicleName}, ${e.customerName}`}
                      >
                        <Text style={[styles.tlBarText, { color: conflict ? T.danger : c.fg }]} numberOfLines={1}>
                          {conflict ? '⚠️ ' : ''}
                          #{e.inquiryCode} {rowMode === 'UNIT' ? e.customerName : shortVehicle(e.vehicleName)}
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

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
  // Banner Konflik Urgent ala Stitch
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 16,
    ...shadow,
  },
  conflictIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflictContent: {
    flex: 1,
    gap: 4,
  },
  conflictTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  conflictTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#991B1B',
    letterSpacing: 0.3,
  },
  conflictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#DC2626',
  },
  conflictBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  conflictDesc: {
    fontSize: 12.5,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  conflictActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resolveBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resolveBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  conflictCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },

  // Toolbar
  toolbarCard: {
    padding: 16,
    gap: 14,
  },
  toolbarTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateNavCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 3,
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: T.ink,
    paddingHorizontal: 14,
    minWidth: 140,
    textAlign: 'center',
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.brandSoft,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: T.brand,
  },
  modeToggleWrap: {
    flexDirection: 'row',
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  modeToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    ...shadow,
  },
  modeToggleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: T.inkSoft,
  },
  modeToggleTextActive: {
    color: T.brand,
    fontWeight: '800',
  },
  subFilterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subFilterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: T.muted,
  },

  // Legenda Bar
  legendBar: {
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.5,
  },
  legendItemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.inkSoft,
  },

  // Layout 70 / 30
  layoutWrapper: {
    flexDirection: 'column',
    gap: 18,
  },
  layoutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mainCalendarCol: {
    flex: 1,
    minWidth: 0,
  },
  sidebarCol: {
    width: 370,
    flexShrink: 0,
    gap: 16,
  },

  // Kalender Grid
  calendarCard: {
    padding: 10,
    borderRadius: 18,
  },
  dowRow: {
    flexDirection: 'row',
    backgroundColor: T.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  dowCol: {
    flex: 1,
    alignItems: 'center',
  },
  dowText: {
    fontSize: 12,
    fontWeight: '800',
    color: T.muted,
    textTransform: 'uppercase',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    minHeight: 118,
    padding: 6,
    gap: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: '#FFFFFF',
  },
  cellOut: {
    backgroundColor: '#F8FAFC',
    opacity: 0.6,
  },
  cellSelected: {
    borderColor: T.brand,
    borderWidth: 1.5,
    backgroundColor: 'rgba(14,165,233,0.03)',
  },
  cellConflict: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECACA',
  },
  cellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  dayNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumToday: {
    backgroundColor: T.brand,
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: T.ink,
  },
  todayBadge: {
    backgroundColor: T.brand,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  evChip: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  evChipSelected: {
    borderWidth: 1,
    borderColor: T.brand,
  },
  evConflict: {
    borderWidth: 1,
    borderColor: T.danger,
    backgroundColor: '#FEE2E2',
  },
  evText: {
    fontSize: 11,
    fontWeight: '700',
  },
  offChip: {
    backgroundColor: '#EDE9FE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  offText: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '700',
  },
  moreText: {
    fontSize: 11,
    color: T.muted,
    fontWeight: '700',
    paddingLeft: 4,
    marginTop: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Detail Card Terpilih
  detailCard: {
    padding: 18,
    borderRadius: 18,
    borderColor: T.brand,
    borderWidth: 1.5,
    gap: 14,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailCardTag: {
    fontSize: 10.5,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.5,
  },
  detailDateText: {
    fontSize: 17,
    fontWeight: '900',
    color: T.ink,
    marginTop: 2,
  },
  customerBox: {
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  customerNameText: {
    fontSize: 15,
    fontWeight: '900',
    color: T.ink,
    flex: 1,
  },
  inquiryCodeBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: T.brand,
  },
  phoneText: {
    fontSize: 12,
    color: T.muted,
    fontWeight: '600',
    marginTop: 1,
  },
  vehicleInfoSection: {
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 8,
    gap: 6,
  },
  specLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  specLineLabel: {
    fontSize: 12,
    color: T.muted,
    fontWeight: '600',
  },
  specLineValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: T.ink,
  },
  plateBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: T.borderStrong,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  plateText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: T.ink,
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  batteryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailConflictWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
  },
  detailConflictWarnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    lineHeight: 16,
  },
  metaTable: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  metaLabel: {
    fontSize: 12,
    color: T.muted,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: T.ink,
  },
  metaTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: T.brand,
  },
  actionGridRow: {
    flexDirection: 'row',
    gap: 8,
  },

  // Agenda Card Harian
  agendaCard: {
    padding: 18,
    borderRadius: 18,
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingBottom: 12,
  },
  agendaSubHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.5,
  },
  agendaTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: T.ink,
    marginTop: 2,
  },
  activityBadge: {
    backgroundColor: T.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activityBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: T.brand,
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surfaceAlt,
  },
  agendaItemSelected: {
    borderColor: T.brand,
    backgroundColor: 'rgba(14,165,233,0.06)',
  },
  agendaItemConflict: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  agendaIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agendaCode: {
    fontSize: 12,
    fontWeight: '900',
  },
  agendaVehicleName: {
    fontSize: 13,
    fontWeight: '800',
    color: T.ink,
    marginTop: 2,
  },
  agendaCustomerSub: {
    fontSize: 11.5,
    color: T.muted,
    marginTop: 1,
  },
  agendaDriverText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 2,
  },
  agendaTimeOffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
  },
  timeOffName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
  },
  timeOffReason: {
    fontSize: 11.5,
    color: '#7C3AED',
    marginTop: 1,
  },

  // Timeline (Gantt)
  tlHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.surfaceAlt,
  },
  tlSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: T.ink,
  },
  tlScaleHint: {
    fontSize: 11.5,
    fontWeight: '600',
    color: T.muted,
  },
  tlHead: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.surfaceAlt,
  },
  tlHeadLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.5,
  },
  tlLabel: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  tlLabelText: {
    fontSize: 13,
    fontWeight: '800',
    color: T.ink,
  },
  tlSub: {
    fontSize: 11.5,
    color: T.muted,
    marginTop: 2,
  },
  tlDay: {
    width: CELL_W,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderRightColor: T.border,
  },
  tlDayToday: {
    backgroundColor: 'rgba(14,165,233,0.12)',
  },
  tlDow: {
    fontSize: 11,
    color: T.muted,
    fontWeight: '700',
  },
  tlNum: {
    fontSize: 12,
    color: T.inkSoft,
    fontWeight: '700',
  },
  tlBar: {
    position: 'absolute',
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  tlBarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tlOff: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  tlOffText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
  },
});
