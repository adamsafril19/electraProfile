import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { CalendarPlus, Check, ChevronDown, ChevronUp, ClipboardList, LayoutList, MessageCircle, Search, Table2, X } from 'lucide-react-native';
import {
  AdminApiError,
  AdminInquiry,
  InquiryFlag,
  InquiryListResult,
  InquirySort,
  InquiryStatus,
  STATUS_LABEL,
  fetchInquiries,
  googleCalendarLink,
  updateInquiryStatus,
} from '../../services/adminApi';
import {
  Avatar,
  Box,
  Btn,
  Card,
  Chip,
  EmptyState,
  ErrorBox,
  GBadge,
  BadgeText,
  Heading,
  HStack,
  VStack,
  Loading,
  DismissibleNotice,
  PageHeader,
  Pill,
  StatusBadge,
  WarnBox,
  adminStyles,
  confirmAction,
  fmtDate,
  fmtDateTime,
  openExternal,
  openWhatsAppTo,
  rp,
} from './ui';
import { InquiryDriver } from './InquiryDriver';
import { InquiryPayments } from './InquiryPayments';
import { HandoverForm, ReturnForm, SocSummary } from './InquirySoc';
import { confirmInquiryFlow } from './inquiryActions';
import { toast } from './feedback';
import { T } from './theme';

interface Props {
  onUnauthorized: () => void;
  focus: { id: string; code: string } | null;
  initialStatus?: InquiryStatus | null;
  initialFlags?: InquiryFlag[];
}

const STATUS_FILTERS: (InquiryStatus | 'ALL')[] = ['ALL', 'PENDING_WHATSAPP', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const FLAG_LABEL: Record<InquiryFlag, string> = { unpaid: 'Belum lunas', needDriver: 'Butuh driver', overdue: 'Terlambat kembali' };
const SORT_LABEL: Record<InquirySort, string> = { created: 'Terbaru masuk', start: 'Jadwal terdekat', amount: 'Nilai tertinggi' };
const PAGE_SIZE = 20;

const PAY_PILL = {
  UNPAID: { label: 'Belum dibayar', tone: 'danger' as const },
  PARTIAL: { label: 'Dibayar sebagian', tone: 'warn' as const },
  PAID: { label: 'Lunas', tone: 'success' as const },
};

// Baris chip yang bisa digeser horizontal (di HP tidak memakan banyak baris)
const ChipScroller: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll} keyboardShouldPersistTaps="handled">
    {children}
  </ScrollView>
);

export const AdminInquiries: React.FC<Props> = ({ onUnauthorized, focus, initialStatus, initialFlags }) => {
  const { width } = useWindowDimensions();
  const canTable = width >= 1000;

  const [filter, setFilter] = useState<InquiryStatus | 'ALL'>(initialStatus || 'ALL');
  const [flags, setFlags] = useState<InquiryFlag[]>(initialFlags || []);
  const [sort, setSort] = useState<InquirySort>('created');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState(focus?.code || '');
  const [query, setQuery] = useState(focus?.code || '');
  const [result, setResult] = useState<InquiryListResult | null>(null);
  const [items, setItems] = useState<AdminInquiry[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(focus?.id || null);
  const reqSeq = useRef(0);

  // Debounce pencarian agar tidak memanggil API di setiap ketukan
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (targetPage: number, append: boolean, silent = false) => {
      const seq = ++reqSeq.current;
      if (append) setLoadingMore(true);
      else if (!silent) setLoading(true);
      try {
        const res = await fetchInquiries({
          status: filter === 'ALL' ? undefined : filter,
          q: query || undefined,
          page: targetPage,
          pageSize: PAGE_SIZE,
          sort,
          flags,
        });
        if (seq !== reqSeq.current) return; // respons usang dari filter sebelumnya
        setResult(res);
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setPage(targetPage);
        setError(null);
      } catch (e) {
        if (seq !== reqSeq.current) return;
        if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
        setError(e instanceof AdminApiError ? e.message : 'Gagal memuat reservasi.');
      } finally {
        if (seq === reqSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filter, query, sort, flags, onUnauthorized]
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  // Daftar diperbarui otomatis (reservasi baru dari pelanggan masuk tanpa muat ulang halaman)
  useEffect(() => {
    const t = setInterval(() => {
      if (page === 1) load(1, false, true);
    }, 20000);
    return () => clearInterval(t);
  }, [load, page]);

  const reload = () => load(1, false, true);
  const hasMore = result ? items.length < result.total : false;
  const totalAll = result ? Object.values(result.statusCounts).reduce((a, b) => a + b, 0) : 0;
  const toggleFlag = (f: InquiryFlag) => setFlags((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  const filtersActive = filter !== 'ALL' || flags.length > 0 || !!query;
  const showTable = view === 'table' && canTable;

  const resetFilters = () => {
    setFilter('ALL');
    setFlags([]);
    setSearch('');
  };

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        tag="MANAJEMEN RESERVASI"
        title="Pesanan"
        subtitle="Kelola reservasi pelanggan: konfirmasi, driver, pembayaran, serah terima, dan pengembalian."
        right={
          canTable ? (
            <View style={styles.viewToggle}>
              <TouchableOpacity style={[styles.viewBtn, !showTable && styles.viewBtnActive]} onPress={() => setView('cards')} accessibilityRole="button" accessibilityLabel="Tampilan kartu" accessibilityState={{ selected: !showTable }}>
                <LayoutList size={17} color={!showTable ? '#FFFFFF' : T.inkSoft} />
                <Text style={[styles.viewBtnText, !showTable && { color: '#FFFFFF' }]}>Kartu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.viewBtn, showTable && styles.viewBtnActive]} onPress={() => setView('table')} accessibilityRole="button" accessibilityLabel="Tampilan tabel" accessibilityState={{ selected: showTable }}>
                <Table2 size={17} color={showTable ? '#FFFFFF' : T.inkSoft} />
                <Text style={[styles.viewBtnText, showTable && { color: '#FFFFFF' }]}>Tabel</Text>
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />

      {result?.storage === 'memory' && (
        <DismissibleNotice id="storage-memory" message="PostgreSQL belum terhubung. Data disimpan di berkas lokal server (backend/data/store.json), cukup untuk uji coba tetapi bukan untuk produksi." />
      )}

      <View style={styles.searchBox}>
        <Search size={18} color={T.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Cari kode, nama, nomor WhatsApp, atau unit"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          accessibilityLabel="Cari reservasi"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Hapus pencarian">
            <X size={17} color={T.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status */}
      <ChipScroller>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f}
            label={f === 'ALL' ? 'Semua' : STATUS_LABEL[f]}
            active={filter === f}
            onPress={() => setFilter(f)}
            count={result ? (f === 'ALL' ? totalAll : result.statusCounts[f]) : null}
          />
        ))}
      </ChipScroller>

      {/* Filter cepat + urutan */}
      <View style={[styles.subFilters, width >= 900 && styles.subFiltersWide]}>
        <ChipScroller>
          <Text style={styles.subLabel}>Filter cepat:</Text>
          {(Object.keys(FLAG_LABEL) as InquiryFlag[]).map((f) => (
            <Chip key={f} label={FLAG_LABEL[f]} active={flags.includes(f)} onPress={() => toggleFlag(f)} count={result ? result.flagCounts[f] : null} tone={result && result.flagCounts[f] > 0 ? 'warn' : undefined} />
          ))}
        </ChipScroller>
        <ChipScroller>
          <Text style={styles.subLabel}>Urutkan:</Text>
          {(Object.keys(SORT_LABEL) as InquirySort[]).map((s) => (
            <Chip key={s} label={SORT_LABEL[s]} active={sort === s} onPress={() => setSort(s)} />
          ))}
        </ChipScroller>
      </View>

      {error ? <ErrorBox message={error} onRetry={() => load(1, false)} /> : null}

      {loading && items.length === 0 ? (
        <Loading />
      ) : items.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title={filtersActive ? 'Tidak ada reservasi yang cocok' : 'Belum ada reservasi masuk'}
            text={filtersActive ? 'Coba ubah kata kunci atau filter.' : 'Reservasi dari situs akan muncul di sini secara otomatis.'}
            action={filtersActive ? <Btn label="Reset filter" variant="secondary" small onPress={resetFilters} /> : undefined}
          />
        </Card>
      ) : (
        <View style={{ gap: showTable ? 0 : 12, opacity: loading ? 0.6 : 1 }}>
          {showTable ? (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <View style={styles.tHead}>
                {TABLE_COLS.map((c) => (
                  <Text key={c.key} style={[styles.tHeadText, c.style]}>
                    {c.label}
                  </Text>
                ))}
              </View>
              {items.map((inq) => (
                <InquiryRow
                  key={inq.id}
                  inquiry={inq}
                  expanded={expandedId === inq.id}
                  onToggle={() => setExpandedId(expandedId === inq.id ? null : inq.id)}
                  onChanged={reload}
                  onUnauthorized={onUnauthorized}
                />
              ))}
            </Card>
          ) : (
            items.map((inq) => (
              <InquiryCard
                key={inq.id}
                inquiry={inq}
                expanded={expandedId === inq.id}
                onToggle={() => setExpandedId(expandedId === inq.id ? null : inq.id)}
                onChanged={reload}
                onUnauthorized={onUnauthorized}
              />
            ))
          )}
          {hasMore && (
            <View style={{ marginTop: 12 }}>
              <Btn label={`Muat lebih banyak (${items.length}/${result!.total})`} onPress={() => load(page + 1, true)} variant="secondary" loading={loadingMore} />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ---------- Tampilan tabel ----------

const TABLE_COLS = [
  { key: 'code', label: 'KODE', style: { width: 120 } },
  { key: 'cust', label: 'PELANGGAN', style: { flex: 1.2, minWidth: 140 } },
  { key: 'unit', label: 'UNIT', style: { flex: 1.3, minWidth: 150 } },
  { key: 'when', label: 'JADWAL', style: { width: 170 } },
  { key: 'status', label: 'STATUS', style: { width: 160 } },
  { key: 'pay', label: 'PEMBAYARAN', style: { width: 120 } },
  { key: 'total', label: 'TOTAL', style: { width: 110, textAlign: 'right' as const } },
];

const InquiryRow: React.FC<{ inquiry: AdminInquiry; expanded: boolean; onToggle: () => void; onChanged: () => void; onUnauthorized: () => void }> = ({ inquiry: i, expanded, onToggle, onChanged, onUnauthorized }) => {
  const pay = i.paymentStatus ? PAY_PILL[i.paymentStatus] : null;
  return (
    <View style={[styles.tRowWrap, expanded && { backgroundColor: T.surfaceAlt }]}>
      <TouchableOpacity style={styles.tRow} onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded }}>
        <Text style={[styles.tCode, TABLE_COLS[0].style]}>{i.inquiryCode}</Text>
        <View style={[TABLE_COLS[1].style, { gap: 2 }]}>
          <Text style={styles.tName} numberOfLines={1}>
            {i.customerName}
          </Text>
          {i.serviceType === 'DENGAN_DRIVER' && <Text style={[styles.tSub, !i.driverName && { color: T.warn, fontWeight: '700' }]}>{i.driverName ? `Driver: ${i.driverName}` : 'Butuh driver'}</Text>}
        </View>
        <Text style={[styles.tCell, TABLE_COLS[2].style]} numberOfLines={2}>
          {i.vehicleName}
        </Text>
        <Text style={[styles.tCell, TABLE_COLS[3].style]}>
          {fmtDate(i.startDate)} – {fmtDate(i.endDate)}
        </Text>
        <View style={TABLE_COLS[4].style}>
          <StatusBadge status={i.status} />
        </View>
        <View style={TABLE_COLS[5].style}>{pay && i.status !== 'CANCELLED' ? <Pill label={pay.label} tone={pay.tone} /> : <Text style={styles.tSub}>—</Text>}</View>
        <Text style={[styles.tTotal, TABLE_COLS[6].style]}>{rp(i.estimatedTotal)}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.tDetail}>
          <InquiryDetail inquiry={i} onChanged={onChanged} onUnauthorized={onUnauthorized} />
        </View>
      )}
    </View>
  );
};

// ---------- Kartu reservasi ----------

const InquiryCard: React.FC<{
  inquiry: AdminInquiry;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onUnauthorized: () => void;
}> = ({ inquiry: i, expanded, onToggle, onChanged, onUnauthorized }) => {
  const { width } = useWindowDimensions();
  const narrow = width < 560;
  const [busy, setBusy] = useState(false);
  const pay = i.paymentStatus ? PAY_PILL[i.paymentStatus] : null;
  const Chevron = expanded ? ChevronUp : ChevronDown;

  // Konfirmasi langsung dari kartu, tanpa membuka detail
  const quickConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (await confirmInquiryFlow(i, onUnauthorized)) onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={[styles.card, expanded && { borderColor: T.brand }]}>
      <TouchableOpacity onPress={onToggle} style={styles.cardHead} accessibilityRole="button" accessibilityState={{ expanded }}>
        <Avatar name={i.customerName} />
        <View style={{ flex: 1, minWidth: narrow ? 180 : 220 }}>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{i.inquiryCode}</Text>
            {narrow && <StatusBadge status={i.status} />}
          </View>
          <Text style={styles.name}>{i.customerName}</Text>
          <Text style={adminStyles.muted}>
            {i.vehicleName} • {fmtDate(i.startDate)} – {fmtDate(i.endDate)} ({i.durationDays} hari)
          </Text>
          <View style={[adminStyles.row, { marginTop: 6, gap: 6 }]}>
            {pay && i.status !== 'CANCELLED' && <Pill label={pay.label} tone={pay.tone} />}
            {i.serviceType === 'DENGAN_DRIVER' && i.status !== 'CANCELLED' && <Pill label={i.driverName ? `Driver: ${i.driverName}` : 'Butuh driver'} tone={i.driverName ? 'info' : 'warn'} />}
          </View>
        </View>
        <View style={narrow ? styles.cardSideNarrow : styles.cardSide}>
          {!narrow && <StatusBadge status={i.status} />}
          <Text style={styles.total}>{rp(i.estimatedTotal)}</Text>
          <Chevron size={18} color={T.muted} />
        </View>
      </TouchableOpacity>

      {i.status === 'PENDING_WHATSAPP' && !expanded && (
        <View style={styles.quickBar}>
          <Btn label="Konfirmasi" icon={Check} small onPress={quickConfirm} loading={busy} />
          <Btn label="Hubungi" icon={MessageCircle} variant="secondary" small onPress={() => openWhatsAppTo(i.customerPhone, `Halo ${i.customerName}, reservasi ${i.inquiryCode} (${i.vehicleName}) kami terima.`)} />
        </View>
      )}

      {expanded && (
        <View style={styles.detail}>
          <InquiryDetail inquiry={i} onChanged={onChanged} onUnauthorized={onUnauthorized} />
        </View>
      )}
    </Card>
  );
};

// ---------- Penanda progres status ----------

const STEPS: { status: InquiryStatus; label: string }[] = [
  { status: 'PENDING_WHATSAPP', label: 'Masuk' },
  { status: 'CONFIRMED', label: 'Dikonfirmasi' },
  { status: 'ACTIVE', label: 'Disewa' },
  { status: 'COMPLETED', label: 'Selesai' },
];

const StatusStepper: React.FC<{ status: InquiryStatus }> = ({ status }) => {
  if (status === 'CANCELLED') {
    return (
      <View style={styles.cancelBanner}>
        <X size={16} color="#991B1B" />
        <Text style={styles.cancelText}>Reservasi dibatalkan</Text>
      </View>
    );
  }
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <View style={styles.stepper} accessibilityLabel={`Progres: ${STATUS_LABEL[status]}`}>
      {STEPS.map((s, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <React.Fragment key={s.status}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>{done ? <Check size={13} color="#FFFFFF" /> : <Text style={[styles.stepNum, active && { color: '#FFFFFF' }]}>{idx + 1}</Text>}</View>
              <Text style={[styles.stepLabel, (done || active) && { color: T.ink, fontWeight: '800' }]}>{s.label}</Text>
            </View>
            {idx < STEPS.length - 1 && <View style={[styles.stepLine, idx < current && { backgroundColor: T.brand }]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
};

// ---------- Isi detail (dipakai kartu & tabel) ----------

const InquiryDetail: React.FC<{ inquiry: AdminInquiry; onChanged: () => void; onUnauthorized: () => void }> = ({ inquiry: i, onChanged, onUnauthorized }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const changeStatus = async (status: InquiryStatus, confirmText?: string) => {
    if (busy) return;
    if (confirmText && !(await confirmAction(confirmText))) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (status === 'CONFIRMED') {
        if (await confirmInquiryFlow(i, onUnauthorized)) onChanged();
        return;
      }
      await updateInquiryStatus(i.id, status);
      toast.success(`${i.inquiryCode}: ${STATUS_LABEL[status]}`);
      onChanged();
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof AdminApiError ? e.message : 'Terjadi kesalahan tak terduga.');
    } finally {
      setBusy(false);
    }
  };

  const canHandover = !i.soc && (i.status === 'CONFIRMED' || i.status === 'PENDING_WHATSAPP');
  const canReturn = !!i.soc && i.soc.returnSocPct === undefined && i.status === 'ACTIVE';

  return (
    <View style={{ gap: 14 }}>
      <StatusStepper status={i.status} />

      {/* Grid 4-Kotak Ringkasan Operasional ala Stitch */}
      <View style={styles.grid4}>
        <View style={styles.gridBox}>
          <Text style={styles.gridBoxLabel}>UNIT ARMADA</Text>
          <Text style={styles.gridBoxTitle} numberOfLines={1}>{i.vehicleName}</Text>
          <Text style={styles.gridBoxSub}>Unit EV Terpilih</Text>
        </View>
        <View style={styles.gridBox}>
          <Text style={styles.gridBoxLabel}>PAKET & LAYANAN</Text>
          <Text style={styles.gridBoxTitle}>
            {i.durationDays} Hari ({i.serviceType === 'LEPAS_KUNCI' ? 'Lepas Kunci' : 'Dengan Sopir'})
          </Text>
          <Text style={styles.gridBoxSub}>Total {rp(i.estimatedTotal)}</Text>
        </View>
        <View style={styles.gridBox}>
          <Text style={styles.gridBoxLabel}>JADWAL PENGAMBILAN</Text>
          <Text style={styles.gridBoxTitle}>{fmtDate(i.startDate)}</Text>
          <Text style={styles.gridBoxSub} numberOfLines={1}>{i.pickupLocation || 'Kantor Pusat'}</Text>
        </View>
        <View style={styles.gridBox}>
          <Text style={styles.gridBoxLabel}>JADWAL PENGEMBALIAN</Text>
          <Text style={styles.gridBoxTitle}>{fmtDate(i.endDate)}</Text>
          <Text style={styles.gridBoxSub} numberOfLines={1}>{i.returnLocation || 'Kantor Pusat'}</Text>
        </View>
      </View>

      {error ? <ErrorBox message={error} /> : null}
      {notice ? <WarnBox message={notice} /> : null}

      {/* Workspace 2-Kolom Panel Operasional */}
      <View style={styles.splitPanel}>
        {/* Kolom Kiri: Dokumen Pelanggan & Penugasan Driver */}
        <View style={styles.splitCol}>
          <Card style={{ padding: 14 }}>
            <HStack justifyContent="space-between" alignItems="center" pb={10} mb={10} style={{ borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
              <HStack alignItems="center" gap={7}>
                <ClipboardList size={16} color={T.brand} />
                <Text style={styles.panelSectionTitle}>Dokumen & Info Pelanggan</Text>
              </HStack>
              <GBadge size="sm" variant="solid" bg="#ECFDF5" borderRadius={6} px="$2">
                <BadgeText style={{ color: '#065F46', fontSize: 10.5, fontWeight: '800' }}>
                  ✓ Terverifikasi
                </BadgeText>
              </GBadge>
            </HStack>

            <VStack gap={8}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text style={styles.panelRowLabel}>Nama Pemesan:</Text>
                <Text style={styles.panelRowVal}>{i.customerName}</Text>
              </HStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Text style={styles.panelRowLabel}>No. WhatsApp:</Text>
                <Text style={styles.panelRowVal}>{i.customerPhone}</Text>
              </HStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Text style={styles.panelRowLabel}>Waktu Masuk:</Text>
                <Text style={styles.panelRowVal}>{fmtDateTime(i.createdAt)}</Text>
              </HStack>
              {i.customerNotes ? (
                <Box style={styles.customerNotesBox}>
                  <Text style={styles.customerNotesLabel}>Catatan Khusus Penyewa:</Text>
                  <Text style={styles.customerNotesText}>{i.customerNotes}</Text>
                </Box>
              ) : null}
            </VStack>
          </Card>

          {i.serviceType === 'DENGAN_DRIVER' && (
            <InquiryDriver inquiry={i} onChanged={onChanged} onUnauthorized={onUnauthorized} />
          )}

          {/* Bilah Tombol Aksi */}
          <HStack flexWrap="wrap" gap={8} pt={4}>
            <Btn
              label="Hubungi WhatsApp"
              icon={MessageCircle}
              variant="secondary"
              small
              onPress={() => openWhatsAppTo(i.customerPhone, `Halo ${i.customerName}, terkait reservasi #${i.inquiryCode} untuk unit ${i.vehicleName} di Electra.`)}
            />
            <Btn
              label="Google Calendar"
              icon={CalendarPlus}
              variant="secondary"
              small
              onPress={() => openExternal(googleCalendarLink(i))}
            />
            {i.status === 'PENDING_WHATSAPP' && (
              <Btn
                label="Konfirmasi 1-Klik"
                icon={Check}
                small
                onPress={() => changeStatus('CONFIRMED')}
                loading={busy}
              />
            )}
            {(i.status === 'PENDING_WHATSAPP' || i.status === 'CONFIRMED') && (
              <Btn
                label="Batalkan"
                icon={X}
                variant="danger"
                small
                disabled={busy}
                onPress={() => changeStatus('CANCELLED', `Batalkan reservasi ${i.inquiryCode} atas nama ${i.customerName}?`)}
              />
            )}
            {i.status === 'CANCELLED' && (
              <Btn
                label="Aktifkan kembali"
                variant="secondary"
                small
                disabled={busy}
                onPress={() => changeStatus('PENDING_WHATSAPP', `Kembalikan reservasi ${i.inquiryCode} ke status Menunggu Konfirmasi?`)}
              />
            )}
          </HStack>
        </View>

        {/* Kolom Kanan: Rincian Pembayaran & BAP Handover / Return */}
        <View style={styles.splitCol}>
          <InquiryPayments inquiry={i} onChanged={onChanged} onUnauthorized={onUnauthorized} />

          <SocSummary inquiry={i} />
          {canHandover && (
            <HandoverForm
              inquiry={i}
              onDone={(msg) => {
                setNotice(msg);
                toast.success('Serah terima tercatat');
                onChanged();
              }}
              onUnauthorized={onUnauthorized}
            />
          )}
          {canReturn && (
            <ReturnForm
              inquiry={i}
              onDone={(msg) => {
                setNotice(msg);
                toast.success('Pengembalian tercatat, reservasi selesai');
                onChanged();
              }}
              onUnauthorized={onUnauthorized}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.info}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} selectable>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingLeft: 14, borderRadius: 12, borderWidth: 1, borderColor: T.borderStrong, backgroundColor: T.surface },
  searchInput: { flex: 1, minHeight: 46, fontSize: 14.5, color: T.ink },
  clearBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chipScroll: { gap: 8, alignItems: 'center', paddingRight: 8 },
  subFilters: { gap: 8 },
  subFiltersWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 28 },
  subLabel: { fontSize: 12.5, fontWeight: '700', color: T.muted, marginRight: 2 },
  viewToggle: { flexDirection: 'row', backgroundColor: T.surface, borderWidth: 1, borderColor: T.borderStrong, borderRadius: 10, padding: 3, gap: 2 },
  viewBtn: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 8 },
  viewBtnActive: { backgroundColor: T.ink },
  viewBtnText: { fontSize: 13, fontWeight: '700', color: T.inkSoft },

  card: { padding: 0 },
  cardHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14, padding: 16 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  code: { fontSize: 12, fontWeight: '800', color: T.brand, letterSpacing: 0.5 },
  name: { fontSize: 16.5, fontWeight: '900', color: T.ink, marginVertical: 1 },
  cardSide: { alignItems: 'flex-end', gap: 6 },
  cardSideNarrow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: T.border },
  total: { fontSize: 15, fontWeight: '900', color: T.ink },
  quickBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  detail: { gap: 14, padding: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: T.border },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  info: { flexGrow: 1, flexBasis: 220, gap: 2 },
  infoLabel: { fontSize: 12, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  infoValue: { fontSize: 14, color: T.ink },

  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  stepItem: { alignItems: 'center', gap: 5, minWidth: 64 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: T.borderStrong },
  stepDotDone: { backgroundColor: T.brand, borderColor: T.brand },
  stepDotActive: { backgroundColor: T.accent, borderColor: T.accent },
  stepNum: { fontSize: 12, fontWeight: '800', color: T.muted },
  stepLabel: { fontSize: 12, fontWeight: '600', color: T.muted, textAlign: 'center' },
  stepLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: T.border, marginBottom: 18, marginHorizontal: 2 },
  cancelBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 12 },
  cancelText: { fontSize: 13.5, fontWeight: '800', color: '#991B1B' },

  tHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: T.surfaceAlt, borderBottomWidth: 1, borderBottomColor: T.border },
  tHeadText: { fontSize: 12, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  tRowWrap: { borderBottomWidth: 1, borderBottomColor: T.border },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
  tCode: { fontSize: 12.5, fontWeight: '800', color: T.brand },
  tName: { fontSize: 14, fontWeight: '800', color: T.ink },
  tSub: { fontSize: 12.5, color: T.muted },
  tCell: { fontSize: 13.5, color: T.inkSoft },
  tTotal: { fontSize: 14, fontWeight: '900', color: T.ink },
  tDetail: { padding: 16, paddingTop: 4 },

  grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridBox: { flex: 1, minWidth: 140, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, justifyContent: 'space-between' },
  gridBoxLabel: { fontSize: 10.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.5, marginBottom: 4 },
  gridBoxTitle: { fontSize: 13.5, fontWeight: '800', color: '#0F172A' },
  gridBoxSub: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  splitPanel: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' },
  splitCol: { flex: 1, minWidth: 280, gap: 12 },
  panelSectionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  panelRowLabel: { fontSize: 12, color: '#64748B' },
  panelRowVal: { fontSize: 12.5, fontWeight: '700', color: '#0F172A' },
  customerNotesBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 10, marginTop: 4 },
  customerNotesLabel: { fontSize: 10.5, fontWeight: '800', color: '#92400E', marginBottom: 2 },
  customerNotesText: { fontSize: 12, color: '#78350F', lineHeight: 17 },
});
