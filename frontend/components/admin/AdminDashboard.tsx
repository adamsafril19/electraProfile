import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Car,
  CircleDollarSign,
  Clock,
  KeyRound,
  MessageCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  CalendarCheck2,
} from 'lucide-react-native';
import {
  AdminApiError,
  AdminInquiry,
  AdminSummary,
  FinanceSummary,
  fetchFinanceSummary,
  fetchSummary,
} from '../../services/adminApi';
import {
  Avatar,
  Btn,
  Card,
  Chip,
  DismissibleNotice,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  SectionTitle,
  StatTile,
  StatusBadge,
  adminStyles,
  fmtDate,
  fmtTime,
  openWhatsAppTo,
  rp,
  rpShort,
} from './ui';
import { confirmInquiryFlow } from './inquiryActions';
import { T } from './theme';

interface Props {
  onUnauthorized: () => void;
  onOpenInquiry: (inquiry: AdminInquiry) => void;
  onNavigate: (path: string) => void;
}

const REFRESH_MS = 30000;

const daysLeft = (endDate: string, today: string): number => Math.round((Date.parse(endDate) - Date.parse(today)) / 86400000);

export const AdminDashboard: React.FC<Props> = ({ onUnauthorized, onOpenInquiry, onNavigate }) => {
  const [data, setData] = useState<AdminSummary | null>(null);
  const [fin, setFin] = useState<FinanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [agendaDay, setAgendaDay] = useState<'today' | 'tomorrow'>('today');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const summary = await fetchSummary();
        // Keuangan bulan berjalan; kegagalan bagian ini tidak boleh menjatuhkan seluruh dashboard
        const finance = await fetchFinanceSummary(`${summary.today.slice(0, 8)}01`, summary.today).catch((e) => {
          if (e instanceof AdminApiError && e.status === 401) throw e;
          return null;
        });
        setData(summary);
        setFin(finance);
        setError(null);
        setUpdatedAt(new Date().toISOString());
      } catch (e) {
        if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
        setError(e instanceof AdminApiError ? e.message : 'Gagal memuat ringkasan.');
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const quickConfirm = async (i: AdminInquiry) => {
    if (busyId) return;
    setBusyId(i.id);
    try {
      if (await confirmInquiryFlow(i, onUnauthorized)) await load(true);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox message={error || 'Data tidak tersedia.'} onRetry={() => load()} />;

  const maxDay = Math.max(1, ...data.last7Days.map((d) => d.count));
  const { needsAction, agenda, trend } = data;
  const todayLabel = new Date(`${data.today}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const trendDelta = trend.weekTotal - trend.prevWeekTotal;
  const trendText = trend.prevWeekTotal === 0 && trend.weekTotal === 0 ? 'Belum ada reservasi' : `${trendDelta >= 0 ? '▲' : '▼'} ${Math.abs(trendDelta)} dari minggu lalu (${trend.prevWeekTotal})`;
  const day = agenda[agendaDay];

  const groups: { key: string; title: string; tone: 'danger' | 'warn' | 'info'; items: AdminInquiry[]; total: number; note: (i: AdminInquiry) => string; actions: (i: AdminInquiry) => React.ReactNode; allPath?: string }[] = [
    {
      key: 'overdue',
      title: 'Terlambat dikembalikan',
      tone: 'danger',
      items: needsAction.overdueReturns,
      total: needsAction.overdueReturns.length,
      note: (i) => `Seharusnya kembali ${fmtDate(i.endDate)} • ${Math.abs(daysLeft(i.endDate, data.today))} hari lewat`,
      actions: (i) => <Btn label="Hubungi" icon={MessageCircle} variant="danger" small onPress={() => openWhatsAppTo(i.customerPhone, `Halo ${i.customerName}, unit ${i.vehicleName} (${i.inquiryCode}) seharusnya sudah dikembalikan. Mohon konfirmasi posisi unit. Terima kasih.`)} />,
    },
    {
      key: 'pending',
      title: 'Menunggu konfirmasi',
      tone: 'warn',
      items: needsAction.pending,
      total: needsAction.pendingConfirmation,
      note: (i) => `${i.startDate <= data.today ? 'Ambil hari ini' : `Ambil ${fmtDate(i.startDate)}`} • ${i.durationDays} hari`,
      actions: (i) => (
        <>
          <Btn label="Konfirmasi" small onPress={() => quickConfirm(i)} loading={busyId === i.id} />
          <Btn label="Hubungi" icon={MessageCircle} variant="secondary" small onPress={() => openWhatsAppTo(i.customerPhone, `Halo ${i.customerName}, reservasi ${i.inquiryCode} (${i.vehicleName}) kami terima.`)} />
        </>
      ),
      allPath: '/admin/pesanan',
    },
    {
      key: 'driver',
      title: 'Butuh driver (≤ 7 hari)',
      tone: 'warn',
      items: needsAction.needDriver,
      total: needsAction.needDriver.length,
      note: (i) => `Ambil ${fmtDate(i.startDate)} • layanan Dengan Sopir belum punya driver`,
      actions: (i) => <Btn label="Tugaskan" small variant="secondary" onPress={() => onOpenInquiry(i)} />,
    },
    {
      key: 'unpaid',
      title: 'Belum ada pembayaran (ambil ≤ 3 hari)',
      tone: 'info',
      items: needsAction.unpaidSoon,
      total: needsAction.unpaidSoon.length,
      note: (i) => `Ambil ${fmtDate(i.startDate)} • tagihan ${rp(i.estimatedTotal)}`,
      actions: (i) => <Btn label="Tagih" icon={MessageCircle} variant="secondary" small onPress={() => openWhatsAppTo(i.customerPhone, `Halo ${i.customerName}, mengingatkan pembayaran sewa ${i.vehicleName} (${i.inquiryCode}) sebesar ${rp(i.estimatedTotal)}. Terima kasih.`)} />,
    },
  ];
  const activeGroups = groups.filter((g) => g.items.length > 0);
  const totalActions = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <View style={{ gap: 18 }}>
      <PageHeader
        title="Ringkasan"
        subtitle={`${todayLabel}${updatedAt ? ` • diperbarui ${fmtTime(updatedAt)}` : ''}`}
        right={<Btn label="Muat ulang" icon={RefreshCw} onPress={() => load()} variant="secondary" small />}
      />

      {data.storage === 'memory' && (
        <DismissibleNotice
          id="storage-memory"
          message="PostgreSQL belum terhubung. Data disimpan di berkas lokal server (backend/data/store.json), cukup untuk uji coba tetapi bukan untuk produksi."
        />
      )}
      {error ? <ErrorBox message={`Pembaruan terakhir gagal: ${error}`} onRetry={() => load()} /> : null}

      <View style={styles.tiles}>
        <StatTile
          label="Menunggu konfirmasi"
          value={needsAction.pendingConfirmation}
          icon={Clock}
          tone={needsAction.pendingConfirmation > 0 ? 'warn' : 'success'}
          hint="Reservasi baru dari pelanggan"
          onPress={() => onNavigate('/admin/pesanan?status=PENDING_WHATSAPP')}
        />
        <StatTile label="Sedang disewa" value={data.activeRentals.length} icon={KeyRound} tone="info" hint={`${data.fleet.inUse} unit di jalan`} onPress={() => onNavigate('/admin/pesanan?status=ACTIVE')} />
        <StatTile
          label="Terlambat kembali"
          value={needsAction.overdueReturns.length}
          icon={AlertTriangle}
          tone={needsAction.overdueReturns.length > 0 ? 'danger' : 'success'}
          hint={needsAction.overdueReturns.length > 0 ? 'Perlu segera dihubungi' : 'Semua sesuai jadwal'}
          onPress={needsAction.overdueReturns.length > 0 ? () => onNavigate('/admin/pesanan?flags=overdue') : undefined}
        />
        <StatTile
          label="Armada tersedia"
          value={`${data.fleet.available}/${data.fleet.active}`}
          icon={Car}
          tone="info"
          hint={`${data.fleet.maintenance} perawatan • ${data.fleet.inactive} disembunyikan`}
          onPress={() => onNavigate('/admin/armada')}
        />
        <StatTile label="Reservasi 7 hari" value={trend.weekTotal} icon={CalendarCheck2} tone={trendDelta >= 0 ? 'success' : 'warn'} hint={trendText} />
      </View>

      {fin && (
        <>
          <SectionTitle hint="Bulan berjalan, berdasarkan pembayaran yang sudah dicatat">Keuangan bulan ini</SectionTitle>
          <View style={styles.tiles}>
            <StatTile label="Pemasukan" value={rpShort(fin.income.total)} icon={TrendingUp} tone="success" hint="DP + pelunasan + denda" onPress={() => onNavigate('/admin/keuangan')} />
            <StatTile label="Pengeluaran" value={rpShort(fin.expense.total)} icon={TrendingDown} tone="warn" onPress={() => onNavigate('/admin/keuangan')} />
            <StatTile label="Laba bersih" value={rpShort(fin.net)} icon={CircleDollarSign} tone={fin.net >= 0 ? 'success' : 'danger'} onPress={() => onNavigate('/admin/keuangan')} />
            <StatTile label="Piutang sewa" value={rpShort(fin.receivables.total)} icon={CalendarClock} tone={fin.receivables.total > 0 ? 'warn' : 'success'} hint={`${fin.receivables.count} reservasi belum lunas`} onPress={() => onNavigate('/admin/pesanan?flags=unpaid')} />
          </View>
        </>
      )}

      <View style={styles.twoCol}>
        {/* Perlu tindakan: dikelompokkan menurut jenis pekerjaan */}
        <Card style={[styles.col, { flexBasis: 480, flexGrow: 1.3 }]}>
          <SectionTitle hint="Selesaikan dari sini tanpa membuka tiap reservasi" right={totalActions > 0 ? <Chip label={`${totalActions} item`} tone="warn" /> : undefined}>
            Perlu tindakan
          </SectionTitle>
          {activeGroups.length === 0 ? (
            <EmptyState title="Semua beres" text="Tidak ada reservasi yang menunggu tindakan Anda." />
          ) : (
            <View style={{ gap: 18 }}>
              {activeGroups.map((g) => (
                <View key={g.key} style={{ gap: 8 }}>
                  <View style={styles.groupHead}>
                    <View style={[styles.groupDot, { backgroundColor: g.tone === 'danger' ? '#EF4444' : g.tone === 'warn' ? '#F59E0B' : '#3B82F6' }]} />
                    <Text style={styles.groupTitle}>{g.title}</Text>
                    <Text style={styles.groupCount}>{g.total}</Text>
                  </View>
                  {g.items.slice(0, 3).map((i) => (
                    <ActionRow key={`${g.key}-${i.id}`} inquiry={i} note={g.note(i)} danger={g.tone === 'danger'} hideStatus onOpen={() => onOpenInquiry(i)}>
                      {g.actions(i)}
                    </ActionRow>
                  ))}
                  {g.total > Math.min(3, g.items.length) && (
                    <TouchableOpacity style={styles.moreLink} onPress={() => (g.allPath ? onNavigate(g.allPath) : onNavigate('/admin/pesanan'))} accessibilityRole="link">
                      <Text style={styles.moreLinkText}>Lihat {g.total - Math.min(3, g.items.length)} lainnya</Text>
                      <ArrowRight size={14} color={T.brand} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Agenda operasional hari ini / besok */}
        <Card style={[styles.col, { flexBasis: 360 }]}>
          <SectionTitle hint="Serah terima dan pengembalian unit">Agenda</SectionTitle>
          <View style={[adminStyles.row, { marginBottom: 12 }]}>
            <Chip label="Hari ini" active={agendaDay === 'today'} onPress={() => setAgendaDay('today')} count={agenda.today.pickups.length + agenda.today.returns.length} />
            <Chip label="Besok" active={agendaDay === 'tomorrow'} onPress={() => setAgendaDay('tomorrow')} count={agenda.tomorrow.pickups.length + agenda.tomorrow.returns.length} />
          </View>
          {day.pickups.length === 0 && day.returns.length === 0 ? (
            <EmptyState title="Tidak ada agenda" text="Tidak ada serah terima atau pengembalian terjadwal." />
          ) : (
            <View style={{ gap: 16 }}>
              <AgendaList title="Serah terima" tone="#0EA5E9" items={day.pickups} place={(i) => i.pickupLocation} onOpen={onOpenInquiry} />
              <AgendaList title="Pengembalian" tone="#F59E0B" items={day.returns} place={(i) => i.returnLocation} onOpen={onOpenInquiry} />
            </View>
          )}
        </Card>
      </View>

      <View style={styles.twoCol}>
        <Card style={[styles.col, { flexBasis: 420 }]}>
          <SectionTitle hint="Unit yang sedang dipakai pelanggan">Sedang disewa</SectionTitle>
          {data.activeRentals.length === 0 ? (
            <EmptyState title="Tidak ada unit di jalan" text="Unit akan muncul di sini setelah serah terima dicatat." />
          ) : (
            <View style={{ gap: 8 }}>
              {data.activeRentals.map((i) => {
                const left = daysLeft(i.endDate, data.today);
                return (
                  <ActionRow
                    key={i.id}
                    inquiry={i}
                    danger={left < 0}
                    note={left < 0 ? `Terlambat ${Math.abs(left)} hari (kembali ${fmtDate(i.endDate)})` : left === 0 ? 'Kembali hari ini' : `Kembali ${fmtDate(i.endDate)} • ${left} hari lagi`}
                    onOpen={() => onOpenInquiry(i)}
                  />
                );
              })}
            </View>
          )}
        </Card>

        <Card style={[styles.col, { flexBasis: 320 }]}>
          <SectionTitle hint="Reservasi masuk per hari">7 hari terakhir</SectionTitle>
          <View style={styles.chart}>
            {data.last7Days.map((d, idx) => {
              const isToday = idx === data.last7Days.length - 1;
              return (
                <View key={d.date} style={styles.barCol}>
                  <Text style={styles.barValue}>{d.count}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${(d.count / maxDay) * 100}%`, backgroundColor: isToday ? T.accent : T.brand }]} />
                  </View>
                  <Text style={[styles.barLabel, isToday && { color: T.brand, fontWeight: '800' }]}>{d.date.slice(8)}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.divider} />
          <Text style={styles.subTitle}>Unit paling diminati</Text>
          {data.topVehicles.length === 0 ? (
            <Text style={adminStyles.muted}>Belum ada data.</Text>
          ) : (
            data.topVehicles.slice(0, 3).map((v, idx) => (
              <View key={v.vehicleId} style={styles.topRow}>
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>
                <Text style={styles.topName} numberOfLines={1}>
                  {v.vehicleName}
                </Text>
                <Text style={styles.topCount}>{v.count}×</Text>
              </View>
            ))
          )}
        </Card>
      </View>
    </View>
  );
};

// ---------- Komponen kecil ----------

const ActionRow: React.FC<{ inquiry: AdminInquiry; note: string; danger?: boolean; hideStatus?: boolean; onOpen: () => void; children?: React.ReactNode }> = ({ inquiry, note, danger, hideStatus, onOpen, children }) => (
  <View style={[styles.row, danger && styles.rowDanger]}>
    <TouchableOpacity style={styles.rowMain} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Buka ${inquiry.inquiryCode}`}>
      <Avatar name={inquiry.customerName} size={36} tone={danger ? 'danger' : 'info'} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle}>{inquiry.customerName}</Text>
        <Text style={styles.rowVehicle}>
          {inquiry.vehicleName} • {inquiry.inquiryCode}
        </Text>
        <Text style={[styles.rowNote, danger && { color: T.danger, fontWeight: '700' }]}>{note}</Text>
      </View>
      {!hideStatus && <StatusBadge status={inquiry.status} />}
    </TouchableOpacity>
    {children ? <View style={styles.rowActions}>{children}</View> : null}
  </View>
);

const AgendaList: React.FC<{ title: string; tone: string; items: AdminInquiry[]; place: (i: AdminInquiry) => string; onOpen: (i: AdminInquiry) => void }> = ({ title, tone, items, place, onOpen }) => (
  <View style={{ gap: 8 }}>
    <View style={styles.groupHead}>
      <View style={[styles.groupDot, { backgroundColor: tone }]} />
      <Text style={styles.groupTitle}>{title}</Text>
      <Text style={styles.groupCount}>{items.length}</Text>
    </View>
    {items.length === 0 ? (
      <Text style={adminStyles.muted}>Tidak ada.</Text>
    ) : (
      items.map((i) => (
        <TouchableOpacity key={i.id} style={styles.agendaItem} onPress={() => onOpen(i)} accessibilityRole="button">
          <Text style={styles.rowTitle}>
            {i.customerName} • {i.vehicleName}
          </Text>
          <Text style={styles.rowNote} numberOfLines={2}>
            {place(i)}
            {i.driverName ? ` • Driver ${i.driverName}` : i.serviceType === 'DENGAN_DRIVER' ? ' • belum ada driver' : ''}
          </Text>
        </TouchableOpacity>
      ))
    )}
  </View>
);

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' },
  col: { flex: 1, minWidth: 0 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupDot: { width: 9, height: 9, borderRadius: 5 },
  groupTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: T.inkSoft, letterSpacing: 0.2 },
  groupCount: { fontSize: 12.5, fontWeight: '800', color: T.muted },
  moreLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, alignSelf: 'flex-start' },
  moreLinkText: { fontSize: 13, fontWeight: '700', color: T.brand },
  row: { borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt, overflow: 'hidden' },
  rowDanger: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 56 },
  rowTitle: { fontSize: 14.5, fontWeight: '800', color: T.ink },
  rowVehicle: { fontSize: 13, color: T.inkSoft, marginTop: 1 },
  rowNote: { fontSize: 12.5, color: T.muted, marginTop: 2, lineHeight: 18 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  agendaItem: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt, minHeight: 48 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 140 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: T.surfaceAlt, borderRadius: 6, overflow: 'hidden' },
  barFill: { width: '100%', minHeight: 3, borderRadius: 6 },
  barValue: { fontSize: 12, fontWeight: '800', color: T.inkSoft, marginBottom: 3 },
  barLabel: { fontSize: 12, color: T.muted, marginTop: 5 },
  divider: { height: 1, backgroundColor: T.border, marginVertical: 16 },
  subTitle: { fontSize: 13.5, fontWeight: '800', color: T.inkSoft, marginBottom: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rank: { width: 24, height: 24, borderRadius: 12, backgroundColor: T.brandSoft, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '900', color: T.brand },
  topName: { flex: 1, fontSize: 13.5, fontWeight: '700', color: T.ink },
  topCount: { fontSize: 13, color: T.muted, fontWeight: '700' },
});
