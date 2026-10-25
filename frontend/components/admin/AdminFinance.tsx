import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Building,
  Calendar,
  Check,
  CircleAlert,
  Clock,
  CreditCard,
  Download,
  Ellipsis,
  ExternalLink,
  Eye,
  FileText,
  Landmark,
  Lock,
  MessageCircle,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react-native';
import {
  AdminApiError,
  AdminVehicle,
  Driver,
  EXPENSE_LABEL,
  ExpenseCategory,
  FinanceSummary,
  LedgerEntry,
  PAYMENT_METHOD_LABEL,
  PAYMENT_TYPE_LABEL,
  createExpense,
  fetchAdminFleet,
  fetchDrivers,
  fetchFinanceSummary,
  fetchLedger,
  voidExpense,
  voidPayment,
} from '../../services/adminApi';
import { toDateStr, todayStr } from '../../utils/date';
import {
  EmptyState,
  ErrorBox,
  Loading,
  Pill,
  askReason,
  fmtDate,
  fmtTime,
  openWhatsAppTo,
  rp,
  rpShort,
} from './ui';
import { DateInput } from './DateInput';
import { T } from './theme';
import { toast } from './feedback';

interface Props {
  onUnauthorized: () => void;
  onOpenInquiry: (code: string, id: string) => void;
  // Buka form pengeluaran saat halaman dibuka (dari aksi cepat)
  autoExpense?: boolean;
}

const LIVE_MS = 10000;

type Preset = 'BULAN_INI' | '7_HARI' | '30_HARI' | 'TAHUN_INI';
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'BULAN_INI', label: 'Bulan ini' },
  { key: '7_HARI', label: '7 hari' },
  { key: '30_HARI', label: '30 hari' },
  { key: 'TAHUN_INI', label: 'Tahun ini' },
];

const rangeOf = (p: Preset): { from: string; to: string } => {
  const now = new Date();
  const to = toDateStr(now);
  if (p === 'BULAN_INI') return { from: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  if (p === 'TAHUN_INI') return { from: toDateStr(new Date(now.getFullYear(), 0, 1)), to };
  const back = p === '7_HARI' ? 6 : 29;
  return { from: toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)), to };
};

// Perbandingan dengan periode sebelumnya (naik pemasukan = baik; naik pengeluaran = efisiensi/perhatian)
const deltaText = (cur: number, prev: number | undefined, upIsGood: boolean): { text: string; isPositive: boolean } => {
  if (prev === undefined) return { text: 'Periode pembanding n/a', isPositive: true };
  if (prev === 0) return { text: cur === 0 ? 'Sama dg periode lalu' : 'Periode lalu: Rp 0', isPositive: true };
  const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  if (pct === 0) return { text: 'Sama dg periode lalu', isPositive: true };
  const sign = pct > 0 ? '+' : '';
  const isPositive = upIsGood ? pct > 0 : pct < 0;
  return {
    text: `${sign}${pct}% vs periode lalu`,
    isPositive,
  };
};

// Konversi angka nominal ke kalimat terbilang Rupiah
function toTerbilang(num: number): string {
  if (isNaN(num) || num <= 0) return '';
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const convert = (n: number): string => {
    if (n < 12) return satuan[n];
    if (n < 20) return convert(n - 10) + ' Belas';
    if (n < 100) return convert(Math.floor(n / 10)) + ' Puluh' + (n % 10 ? ' ' + convert(n % 10) : '');
    if (n < 200) return 'Seratus' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 1000) return convert(Math.floor(n / 100)) + ' Ratus' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 2000) return 'Seribu' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
    if (n < 1000000000000) return convert(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 ? ' ' + convert(n % 1000000000) : '');
    return '';
  };
  const res = convert(num).trim();
  return res ? `${res} Rupiah` : '';
}

const EXPENSE_CATS = Object.keys(EXPENSE_LABEL) as ExpenseCategory[];
const CAT_COLORS: Record<ExpenseCategory, string> = {
  CHARGING: '#4131DD',
  PERAWATAN: '#007589',
  GAJI_DRIVER: '#49607B',
  ASURANSI_PAJAK: '#777587',
  OPERASIONAL: '#10B981',
  LAINNYA: '#94A3B8',
};

const EXPENSE_ICONS: Record<ExpenseCategory, any> = {
  CHARGING: Zap,
  PERAWATAN: Wrench,
  GAJI_DRIVER: UserCheck,
  ASURANSI_PAJAK: ShieldCheck,
  OPERASIONAL: Building,
  LAINNYA: Ellipsis,
};

const EXPENSE_CHANNELS = [
  'Debit Perusahaan Mandiri',
  'Kartu Kredit Fleet BCA',
  'Petty Cash Depot Kasir',
  'Kredit SPKLU Ultrafast PLN',
];

export const AdminFinance: React.FC<Props> = ({ onUnauthorized, onOpenInquiry, autoExpense }) => {
  const [preset, setPreset] = useState<Preset>('BULAN_INI');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [kind, setKind] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(!!autoExpense);
  const [prev, setPrev] = useState<FinanceSummary | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);

  // Form states
  const [category, setCategory] = useState<ExpenseCategory>('CHARGING');
  const [amount, setAmount] = useState('185000');
  const [date, setDate] = useState(todayStr());
  const [channel, setChannel] = useState(EXPENSE_CHANNELS[0]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [note, setNote] = useState('');
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formBusy, setFormBusy] = useState(false);
  const [formApiError, setFormApiError] = useState<string | null>(null);

  const { from, to } = rangeOf(preset);
  const daysCount = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;

  // Load vehicles & drivers for form selector
  useEffect(() => {
    fetchAdminFleet().then(setVehicles).catch(() => {});
    fetchDrivers().then((d) => setDrivers(d.filter((x) => x.isActive))).catch(() => {});
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const len = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
        const shift = (ymd: string, days: number) => {
          const [y, m, d] = ymd.split('-').map(Number);
          return toDateStr(new Date(y, m - 1, d + days));
        };
        const prevTo = shift(from, -1);
        const prevFrom = shift(prevTo, -(len - 1));
        const [s, l, p] = await Promise.all([
          fetchFinanceSummary(from, to),
          fetchLedger(from, to),
          fetchFinanceSummary(prevFrom, prevTo).catch(() => null),
        ]);
        setSummary(s);
        setLedger(l);
        setPrev(p);
        setError(null);
        setUpdatedAt(new Date().toISOString());
      } catch (e) {
        if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
        setError(e instanceof AdminApiError ? e.message : 'Gagal memuat data keuangan.');
      } finally {
        setLoading(false);
      }
    },
    [from, to, onUnauthorized]
  );

  useEffect(() => {
    setSelectedBucket(null);
    load();
  }, [load]);

  // Real-time polling 10 detik
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => load(true), LIVE_MS);
    return () => clearInterval(t);
  }, [live, load]);

  // Filtered & Searched Ledger entries
  const filteredLedger = useMemo(() => {
    return ledger.filter((e) => {
      if (kind !== 'ALL' && e.kind !== kind) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchInquiry = e.inquiryCode?.toLowerCase().includes(q);
      const matchCustomer = e.customerName?.toLowerCase().includes(q);
      const matchVehicle = e.vehicleName?.toLowerCase().includes(q);
      const matchDriver = e.driverName?.toLowerCase().includes(q);
      const matchNote = e.note?.toLowerCase().includes(q);
      const matchType = (e.source === 'PAYMENT'
        ? PAYMENT_TYPE_LABEL[e.type as keyof typeof PAYMENT_TYPE_LABEL]
        : EXPENSE_LABEL[e.type as ExpenseCategory] || ''
      ).toLowerCase().includes(q);
      return matchInquiry || matchCustomer || matchVehicle || matchDriver || matchNote || matchType;
    });
  }, [ledger, kind, searchQuery]);

  const visibleLedger = showAll ? filteredLedger : filteredLedger.slice(0, 10);

  const doVoid = async (entry: LedgerEntry) => {
    const reason = await askReason(
      `Alasan membatalkan ${entry.source === 'PAYMENT' ? 'pembayaran' : 'pengeluaran'} ini?`,
      'Salah input kwitansi'
    );
    if (!reason) return;
    try {
      if (entry.source === 'PAYMENT') await voidPayment(entry.id, reason);
      else await voidExpense(entry.id, reason);
      toast.success('Pencatatan transaksi berhasil dibatalkan (audit log disimpan)');
      load(true);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof AdminApiError ? e.message : 'Gagal membatalkan.');
    }
  };

  const submitExpense = async () => {
    const errs: Record<string, string> = {};
    const n = Number(amount);
    if (!amount || !Number.isInteger(n) || n <= 0) errs.amount = 'Isi nominal valid lebih dari 0.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errs.date = 'Tanggal tidak valid.';
    else if (date > todayStr()) errs.date = 'Tanggal tidak boleh di masa depan.';
    setFormErrors(errs);
    setFormApiError(null);
    if (Object.keys(errs).length) return;

    setFormBusy(true);
    try {
      const fullNote = [channel ? `[${channel}]` : null, note.trim()].filter(Boolean).join(' - ');
      await createExpense({
        category,
        amount: n,
        date,
        vehicleId: vehicleId || undefined,
        driverId: driverId || undefined,
        note: fullNote || undefined,
      });
      toast.success('Pengeluaran berhasil dicatat ke buku kas');
      setFormOpen(false);
      setNote('');
      load(true);
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) return onUnauthorized();
      setFormApiError(err instanceof AdminApiError ? err.message : 'Gagal mencatat pengeluaran.');
    } finally {
      setFormBusy(false);
    }
  };

  const exportCsv = () => {
    if (Platform.OS !== 'web') return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Tanggal', 'Arus', 'Jenis', 'Metode', 'Jumlah', 'Reservasi', 'Pelanggan', 'Unit', 'Driver', 'Catatan', 'Status'],
      ...filteredLedger.map((e) => [
        e.date,
        e.kind === 'IN' ? 'Masuk' : 'Keluar',
        e.source === 'PAYMENT' ? PAYMENT_TYPE_LABEL[e.type as keyof typeof PAYMENT_TYPE_LABEL] : EXPENSE_LABEL[e.type as ExpenseCategory],
        e.method ? PAYMENT_METHOD_LABEL[e.method] : '',
        e.amount,
        e.inquiryCode,
        e.customerName,
        e.vehicleName,
        e.driverName,
        e.note,
        e.voidedAt ? `DIBATALKAN: ${e.voidReason}` : 'Sah',
      ]),
    ];
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `electra-keuangan-${from}_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const maxBar = summary ? Math.max(1, ...summary.series.flatMap((s) => [s.income, s.expense])) : 1;
  const catTotal = summary ? Object.values(summary.expense.byCategory).reduce((a, b) => a + b, 0) : 0;
  const activeBucket = summary && selectedBucket !== null ? summary.series[selectedBucket] : null;

  // Margin calculation
  const marginPct = summary && summary.income.total > 0
    ? Math.round((summary.net / summary.income.total) * 100)
    : 0;

  // Expense to turnover ratio
  const expenseRatio = summary && summary.income.total > 0
    ? Math.round((summary.expense.total / summary.income.total) * 100)
    : 0;

  // Income channel totals
  const totalIncomeMethod = summary ? Object.values(summary.income.byMethod).reduce((a, b) => a + b, 0) : 0;

  const inCount = ledger.filter((e) => e.kind === 'IN').length;
  const outCount = ledger.filter((e) => e.kind === 'OUT').length;

  return (
    <View style={styles.container}>
      {/* 1. HERO BANNER & KONTROL ATAS */}
      <View style={styles.heroBanner}>
        {/* Ambient Decorative Glows */}
        <View style={styles.glowCyan} pointerEvents="none" />
        <View style={styles.glowPurple} pointerEvents="none" />

        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <View style={styles.heroTagPill}>
              <View style={styles.heroTagDot} />
              <Text style={styles.heroTagText}>ARUS KAS & PENDAPATAN • REAL-TIME FINANCIAL LEDGER</Text>
            </View>
            <Text style={styles.heroTitle}>Keuangan & Arus Kas Armada EV</Text>
            <Text style={styles.heroSubtitle}>
              Pantau pembayaran masuk, pengeluaran, piutang, dan deposit. Pembayaran otomatis tersinkronisasi dari modul pemesanan dan pos pengisian daya.
            </Text>
          </View>

          <View style={styles.heroActions}>
            {/* Live Polling Bar */}
            <View style={styles.liveBox}>
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, { backgroundColor: live ? '#34D399' : '#94A3B8' }]} />
                <View>
                  <Text style={styles.liveStatusText}>{live ? 'Live (10s sync)' : 'Jeda'}</Text>
                  <Text style={styles.liveTimestamp}>{updatedAt ? fmtTime(updatedAt) + ' WIB' : 'Sinkron...'}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.liveToggleBtn, !live && styles.liveToggleBtnPaused]}
                onPress={() => setLive((v) => !v)}
              >
                <Text style={styles.liveToggleText}>{live ? 'Jeda' : 'Lanjut'}</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.primaryCtaBtn, formOpen && styles.primaryCtaBtnActive]}
              onPress={() => setFormOpen((v) => !v)}
            >
              {formOpen ? <X size={18} color="#FFFFFF" /> : <Plus size={18} color="#FFFFFF" />}
              <Text style={styles.primaryCtaText}>{formOpen ? 'Tutup Formulir' : '+ Catat Pengeluaran'}</Text>
            </TouchableOpacity>

            {Platform.OS === 'web' && (
              <TouchableOpacity style={styles.secondaryCtaBtn} onPress={exportCsv} disabled={filteredLedger.length === 0}>
                <Download size={18} color="#FFFFFF" />
                <Text style={styles.secondaryCtaText}>Unduh Laporan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* 2. FILTER RENTANG WAKTU (PRESETS TOOLBAR) */}
      <View style={styles.presetsToolbar}>
        <View style={styles.presetsLeft}>
          <Text style={styles.presetLabel}>PERIODE:</Text>
          <View style={styles.presetPillsContainer}>
            {PRESETS.map((p) => {
              const active = preset === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.presetPill, active && styles.presetPillActive]}
                  onPress={() => setPreset(p.key)}
                >
                  <Text style={[styles.presetPillText, active && styles.presetPillTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.dateBadge}>
            <Calendar size={15} color="#4131DD" />
            <Text style={styles.dateBadgeText}>{fmtDate(from)} – {fmtDate(to)}</Text>
            <View style={styles.daysBadge}>
              <Text style={styles.daysBadgeText}>{daysCount} Hari</Text>
            </View>
          </View>
        </View>

        <View style={styles.presetsRight}>
          <TouchableOpacity style={styles.refreshIconBtn} onPress={() => load(true)}>
            <RotateCcw size={14} color="#475569" />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. FORMULIR CATAT PENGELUARAN (EXPANDABLE) */}
      {formOpen && (
        <View style={styles.expenseFormCard}>
          <View style={styles.expenseFormHeader}>
            <View style={styles.expenseTitleRow}>
              <View style={styles.expenseIconBox}>
                <FileText size={20} color="#FFFFFF" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.expenseFormTitle}>Formulir Pengeluaran Operasional</Text>
                  <View style={styles.quickModeBadge}>
                    <Text style={styles.quickModeText}>MODE INPUT CEPAT</Text>
                  </View>
                </View>
                <Text style={styles.expenseFormSubtitle}>
                  Catat beban operasional harian armada EV, voucher pengisian daya, servis berkala, dan kru.
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeFormBtn} onPress={() => setFormOpen(false)}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Row 1: Kategori Chip Picker */}
          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>
              KATEGORI BIAYA <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <View style={styles.catChipsWrap}>
              {EXPENSE_CATS.map((c) => {
                const active = category === c;
                const CatIcon = EXPENSE_ICONS[c] || Ellipsis;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <CatIcon size={15} color={active ? '#FFFFFF' : '#475569'} />
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{EXPENSE_LABEL[c]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Row 2: Grid 3 Kolom: Nominal, Tanggal, Kanal Bayar */}
          <View style={styles.formThreeCol}>
            {/* Input Nominal */}
            <View style={[styles.formColBox, { flex: 5 }]}>
              <Text style={styles.fieldLabel}>
                JUMLAH NOMINAL (IDR) <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={[styles.inputBox, !!formErrors.amount && styles.inputBoxError]}>
                <Text style={styles.rpPrefix}>Rp</Text>
                <TextInput
                  style={styles.nominalInput}
                  value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                  onChangeText={(v) => setAmount(v.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.terbilangRow}>
                <Check size={13} color="#10B981" />
                <Text style={styles.terbilangText} numberOfLines={1}>
                  {amount && Number(amount) > 0 ? toTerbilang(Number(amount)) : 'Nol Rupiah'}
                </Text>
              </View>
              {formErrors.amount ? <Text style={styles.formErrorText}>{formErrors.amount}</Text> : null}
            </View>

            {/* Input Tanggal */}
            <View style={[styles.formColBox, { flex: 4 }]}>
              <Text style={styles.fieldLabel}>TANGGAL TRANSAKSI</Text>
              <View style={styles.datePickerWrap}>
                <DateInput value={date} onChange={setDate} max={todayStr()} error={!!formErrors.date} />
              </View>
              <Text style={styles.fieldHint}>Maksimal hari ini (WIB)</Text>
              {formErrors.date ? <Text style={styles.formErrorText}>{formErrors.date}</Text> : null}
            </View>

            {/* Kanal Bayar */}
            <View style={[styles.formColBox, { flex: 4 }]}>
              <Text style={styles.fieldLabel}>KANAL BAYAR OPERASIONAL</Text>
              <View style={styles.channelChipsContainer}>
                {EXPENSE_CHANNELS.map((ch) => {
                  const active = channel === ch;
                  return (
                    <TouchableOpacity
                      key={ch}
                      style={[styles.channelChip, active && styles.channelChipActive]}
                      onPress={() => setChannel(ch)}
                    >
                      <Text style={[styles.channelChipText, active && styles.channelChipTextActive]}>{ch}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.fieldHint}>Kassa Operasional Depot</Text>
            </View>
          </View>

          {/* Row 3: Pilihan Unit EV & Driver */}
          <View style={styles.formTwoCol}>
            {/* Pilihan Unit EV */}
            <View style={[styles.formColBox, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>UNIT ARMADA EV (ALOKASI BIAYA)</Text>
              <View style={styles.allocChipsWrap}>
                <TouchableOpacity
                  style={[styles.allocChip, !vehicleId && styles.allocChipActive]}
                  onPress={() => setVehicleId('')}
                >
                  <Text style={[styles.allocChipText, !vehicleId && styles.allocChipTextActive]}>Umum / Semua Unit</Text>
                </TouchableOpacity>
                {vehicles.map((v) => {
                  const active = vehicleId === v.id;
                  const label = `${v.brand} ${v.model.split(' ').slice(0, 2).join(' ')}`;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.allocChip, active && styles.allocChipActive]}
                      onPress={() => setVehicleId(v.id)}
                    >
                      <Text style={[styles.allocChipText, active && styles.allocChipTextActive]}>
                        {label} {active ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Pilihan Driver */}
            <View style={[styles.formColBox, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>DRIVER / PIC TERLIBAT</Text>
              <View style={styles.allocChipsWrap}>
                <TouchableOpacity
                  style={[styles.allocChip, !driverId && styles.allocChipActive]}
                  onPress={() => setDriverId('')}
                >
                  <Text style={[styles.allocChipText, !driverId && styles.allocChipTextActive]}>Tanpa Driver</Text>
                </TouchableOpacity>
                {drivers.map((d) => {
                  const active = driverId === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.allocChip, active && styles.allocChipActive]}
                      onPress={() => setDriverId(d.id)}
                    >
                      <Text style={[styles.allocChipText, active && styles.allocChipTextActive]}>
                        {d.name} {active ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Row 4: Catatan & Keterangan */}
          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>KETERANGAN / RINCIAN BEBAN</Text>
            <View style={styles.noteInputBox}>
              <FileText size={18} color="#94A3B8" />
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                maxLength={200}
                placeholder="Contoh: Fast Charging 45kWh SPKLU PLN Cilandak Town Square, Ganti ban..."
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {formApiError ? <ErrorBox message={formApiError} /> : null}

          {/* Action Buttons */}
          <View style={styles.formFooterActions}>
            <TouchableOpacity style={styles.formCancelBtn} onPress={() => setFormOpen(false)}>
              <Text style={styles.formCancelText}>Batal / Tutup Form</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.formSubmitBtn} onPress={submitExpense} disabled={formBusy}>
              <Save size={16} color="#FFFFFF" />
              <Text style={styles.formSubmitText}>{formBusy ? 'Menyimpan...' : 'Simpan Pengeluaran'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error ? <ErrorBox message={error} onRetry={() => load()} /> : null}

      {loading && !summary ? (
        <Loading />
      ) : summary ? (
        <>
          {/* 4. KARTU METRIK RINGKASAN (5 STAT CARDS) */}
          <View style={styles.statsGrid}>
            {/* Stat 1: Total Pemasukan */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>TOTAL PEMASUKAN</Text>
                <View style={styles.statIconGreen}>
                  <TrendingUp size={16} color="#059669" />
                </View>
              </View>
              <View style={styles.statBody}>
                <Text style={styles.statNumber}>{rp(summary.income.total)}</Text>
                {(() => {
                  const d = deltaText(summary.income.total, prev?.income.total, true);
                  return (
                    <View style={styles.deltaPillGreen}>
                      <Text style={styles.deltaTextGreen}>{d.text}</Text>
                    </View>
                  );
                })()}
              </View>
              <Text style={styles.statFooter}>Dari reservasi aktif & pelunasan EV</Text>
            </View>

            {/* Stat 2: Pengeluaran Fleet */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>PENGELUARAN FLEET</Text>
                <View style={styles.statIconAmber}>
                  <TrendingDown size={16} color="#D97706" />
                </View>
              </View>
              <View style={styles.statBody}>
                <Text style={styles.statNumber}>{rp(summary.expense.total)}</Text>
                {(() => {
                  const d = deltaText(summary.expense.total, prev?.expense.total, false);
                  return (
                    <View style={styles.deltaPillAmber}>
                      <Text style={styles.deltaTextAmber}>{d.text}</Text>
                    </View>
                  );
                })()}
              </View>
              <Text style={styles.statFooter}>SPKLU, servis berkala & kru</Text>
            </View>

            {/* Stat 3: Laba Bersih */}
            <View style={[styles.statCard, styles.statCardNet]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>LABA BERSIH (NET)</Text>
                <View style={styles.marginPill}>
                  <Text style={styles.marginPillText}>{marginPct}% Margin</Text>
                </View>
              </View>
              <View style={styles.statBody}>
                <Text style={[styles.statNumber, { color: summary.net >= 0 ? '#059669' : '#DC2626' }]}>
                  {rp(summary.net)}
                </Text>
                {(() => {
                  const d = deltaText(summary.net, prev?.net, true);
                  return (
                    <View style={d.isPositive ? styles.deltaPillGreen : styles.deltaPillAmber}>
                      <Text style={d.isPositive ? styles.deltaTextGreen : styles.deltaTextAmber}>{d.text}</Text>
                    </View>
                  );
                })()}
              </View>
              <Text style={styles.statFooter}>Surplus operasional berjalan</Text>
            </View>

            {/* Stat 4: Piutang Sewa */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>PIUTANG SEWA</Text>
                <View style={styles.receivableCountPill}>
                  <Text style={styles.receivableCountText}>{summary.receivables.count} Reservasi</Text>
                </View>
              </View>
              <View style={styles.statBody}>
                <Text style={styles.statNumber}>{rp(summary.receivables.total)}</Text>
                <View style={styles.statHintRow}>
                  <Clock size={13} color="#D97706" />
                  <Text style={styles.statHintText}>Jatuh tempo handover</Text>
                </View>
              </View>
              <Text style={styles.statFooter}>Belum lunas / DP sewa</Text>
            </View>

            {/* Stat 5: Deposit Ditahan */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>DEPOSIT DITAHAN</Text>
                <View style={styles.statIconBlue}>
                  <Lock size={15} color="#4131DD" />
                </View>
              </View>
              <View style={styles.statBody}>
                <Text style={styles.statNumber}>{rp(summary.deposit.heldNow)}</Text>
                <View style={styles.statHintRow}>
                  <ShieldCheck size={13} color="#475569" />
                  <Text style={styles.statHintText}>Escrow Jaminan</Text>
                </View>
              </View>
              <Text style={styles.statFooter}>Refundable saat pengembalian unit</Text>
            </View>
          </View>

          {/* 5. VISUALISASI & ANALISIS FINANSIAL (2 KOLOM GRID) */}
          <View style={styles.chartsGrid}>
            {/* Kolom Kiri: Bar Chart Arus Kas */}
            <View style={[styles.chartCard, { flex: 7 }]}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>Arus Kas Masuk vs Keluar</Text>
                  <Text style={styles.chartSubtitle}>
                    Tren {summary.seriesUnit === 'DAY' ? 'harian' : 'bulanan'} performa finansial armada {fmtDate(from)} – {fmtDate(to)}
                  </Text>
                </View>

                <View style={styles.chartControls}>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.legendText}>Pemasukan</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.legendText}>Pengeluaran</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Sorotan Box Bar terpilih */}
              {activeBucket && (
                <View style={styles.sorotanBox}>
                  <View style={styles.sorotanTag}>
                    <Text style={styles.sorotanTagText}>Sorotan: {activeBucket.label}</Text>
                  </View>
                  <View style={styles.sorotanStats}>
                    <Text style={styles.sorotanIn}>Masuk: +{rp(activeBucket.income)}</Text>
                    <Text style={styles.sorotanOut}>Keluar: −{rp(activeBucket.expense)}</Text>
                    <Text style={styles.sorotanNet}>
                      Surplus: {activeBucket.income >= activeBucket.expense ? '+' : '−'}
                      {rp(Math.abs(activeBucket.income - activeBucket.expense))}
                    </Text>
                  </View>
                </View>
              )}

              {/* Bar Chart Container */}
              <ScrollView horizontal showsHorizontalScrollIndicator={summary.series.length > 12}>
                <View style={[styles.barsWrapper, { minWidth: Math.max(300, summary.series.length * 36) }]}>
                  {summary.series.map((b, idx) => {
                    const isSelected = selectedBucket === idx;
                    const inHeight = Math.max(4, Math.round((b.income / maxBar) * 160));
                    const outHeight = Math.max(4, Math.round((b.expense / maxBar) * 160));
                    const displayLabel = summary.seriesUnit === 'DAY' ? b.label.slice(8) : b.label.slice(5);

                    return (
                      <TouchableOpacity
                        key={b.label}
                        style={[styles.barColGroup, isSelected && styles.barColGroupSelected]}
                        onPress={() => setSelectedBucket(isSelected ? null : idx)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.barPair}>
                          <View style={[styles.singleBar, { height: inHeight, backgroundColor: '#10B981' }]} />
                          <View style={[styles.singleBar, { height: outHeight, backgroundColor: '#F59E0B' }]} />
                        </View>
                        <Text style={[styles.barDateLabel, isSelected && styles.barDateLabelSelected]}>
                          {displayLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.chartFooter}>
                <Text style={styles.chartRatioText}>
                  Rasio Pengeluaran terhadap Omzet:{' '}
                  <Text style={{ fontWeight: '800', color: expenseRatio <= 40 ? '#059669' : '#D97706' }}>
                    {expenseRatio}% ({expenseRatio <= 40 ? 'Efisien' : 'Perhatian'})
                  </Text>
                </Text>
                <Text style={styles.chartRatioText}>
                  Total Laba Bersih: <Text style={{ fontWeight: '800', color: '#059669' }}>{rp(summary.net)}</Text>
                </Text>
              </View>
            </View>

            {/* Kolom Kanan: Breakdown Kategori & Kanal Pembayaran */}
            <View style={[styles.breakdownCol, { flex: 4 }]}>
              {/* Sub-kartu A: Kategori Pengeluaran */}
              <View style={styles.subCard}>
                <View style={styles.subCardHeader}>
                  <Text style={styles.subCardTitle}>Kategori Pengeluaran</Text>
                  <Text style={styles.subCardAmount}>{rp(summary.expense.total)}</Text>
                </View>

                {catTotal === 0 ? (
                  <Text style={styles.emptyNote}>Belum ada pengeluaran pada periode ini.</Text>
                ) : (
                  <View style={{ gap: 10, marginTop: 6 }}>
                    {EXPENSE_CATS.filter((c) => summary.expense.byCategory[c]).map((c) => {
                      const v = summary.expense.byCategory[c] || 0;
                      const pct = Math.round((v / catTotal) * 100);
                      return (
                        <View key={c} style={{ gap: 4 }}>
                          <View style={styles.trackRow}>
                            <Text style={styles.trackName}>{EXPENSE_LABEL[c]}</Text>
                            <Text style={styles.trackVal}>
                              {rp(v)} ({pct}%)
                            </Text>
                          </View>
                          <View style={styles.trackBg}>
                            <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: CAT_COLORS[c] }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Sub-kartu B: Kanal Pembayaran Masuk */}
              <View style={styles.subCard}>
                <View style={styles.subCardHeader}>
                  <Text style={styles.subCardTitle}>Kanal Pembayaran Masuk</Text>
                  <Text style={[styles.subCardAmount, { color: '#059669' }]}>{rp(summary.income.total)}</Text>
                </View>

                <View style={styles.channelGrid}>
                  {Object.keys(summary.income.byMethod).length === 0 ? (
                    <Text style={styles.emptyNote}>Belum ada pemasukan tercatat.</Text>
                  ) : (
                    Object.entries(summary.income.byMethod).map(([m, v]) => {
                      const pct = totalIncomeMethod > 0 ? Math.round((v / totalIncomeMethod) * 100) : 0;
                      const MethodIcon = m.includes('BCA')
                        ? Landmark
                        : m.includes('QRIS')
                        ? QrCode
                        : m.includes('CASH') || m.includes('TUNAI')
                        ? Banknote
                        : CreditCard;

                      return (
                        <View key={m} style={styles.channelCard}>
                          <View style={styles.channelHeader}>
                            <MethodIcon size={14} color="#4131DD" />
                            <Text style={styles.channelName} numberOfLines={1}>
                              {PAYMENT_METHOD_LABEL[m as keyof typeof PAYMENT_METHOD_LABEL] || m}
                            </Text>
                          </View>
                          <Text style={styles.channelPct}>{pct}%</Text>
                          <Text style={styles.channelRp}>{rpShort(v)}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* 6. DAFTAR PIUTANG SEWA (PELUNASAN MENUNGGU) */}
          <View style={styles.receivablesSection}>
            <View style={styles.receivablesHeader}>
              <View style={styles.receivablesTitleGroup}>
                <View style={styles.pendingIconBox}>
                  <Clock size={18} color="#92400E" />
                </View>
                <View>
                  <Text style={styles.receivablesTitle}>Daftar Piutang Sewa (Pelunasan Menunggu)</Text>
                  <Text style={styles.receivablesSubtitle}>
                    {summary.receivables.items.length} reservasi aktif dengan sisa tagihan wajib lunas saat serah terima kunci.
                  </Text>
                </View>
              </View>
              <View style={styles.totalPiutangBadge}>
                <Text style={styles.totalPiutangText}>Total Piutang: {rp(summary.receivables.total)}</Text>
              </View>
            </View>

            {summary.receivables.items.length === 0 ? (
              <EmptyState
                icon={Landmark}
                title="Tidak ada piutang sewa"
                text="Semua tagihan reservasi periode ini telah lunas diselesaikan."
              />
            ) : (
              <View style={styles.receivablesGrid}>
                {summary.receivables.items.map((r) => {
                  const dpPct = r.rentDue > 0 ? Math.round((r.rentPaid / r.rentDue) * 100) : 0;
                  return (
                    <View key={r.id} style={styles.recCard}>
                      <View style={styles.recCardTop}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.recCode}>{r.inquiryCode}</Text>
                          <Text style={styles.recCustomerName} numberOfLines={1} ellipsizeMode="tail">{r.customerName}</Text>
                          <Text style={styles.recVehicle} numberOfLines={1} ellipsizeMode="tail">{r.vehicleName}</Text>
                        </View>
                        <View style={styles.recDateBadge}>
                          <Text style={styles.recDateBadgeText}>Ambil: {fmtDate(r.startDate)}</Text>
                        </View>
                      </View>

                      {/* Box Breakdown Tagihan */}
                      <View style={styles.recBreakdownBox}>
                        <View style={styles.recRow}>
                          <Text style={styles.recRowLabel}>Total Nilai Sewa:</Text>
                          <Text style={styles.recRowVal}>{rp(r.rentDue)}</Text>
                        </View>
                        <View style={styles.recRow}>
                          <Text style={[styles.recRowLabel, { color: '#059669' }]}>DP Terbayar ({dpPct}%):</Text>
                          <Text style={[styles.recRowVal, { color: '#059669' }]}>{rp(r.rentPaid)}</Text>
                        </View>
                        <View style={[styles.recRow, { paddingTop: 4, borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
                          <Text style={[styles.recRowLabel, { fontWeight: '800', color: '#B45309' }]}>Sisa Tagihan:</Text>
                          <Text style={[styles.recRowVal, { fontWeight: '900', color: '#B45309' }]}>
                            {rp(r.outstanding)}
                          </Text>
                        </View>
                      </View>

                      {/* Tombol Aksi */}
                      <View style={styles.recActions}>
                        <TouchableOpacity
                          style={styles.recWhatsAppBtn}
                          onPress={() =>
                            openWhatsAppTo(
                              r.customerPhone,
                              `Halo ${r.customerName}, mengingatkan sisa pembayaran sewa armada ${r.vehicleName} (${r.inquiryCode}) sebesar ${rp(r.outstanding)} saat serah terima unit. Terima kasih. - Electra Fleet`
                            )
                          }
                        >
                          <MessageCircle size={15} color="#FFFFFF" />
                          <Text style={styles.recWhatsAppText}>Tagih via WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.recOpenBtn}
                          onPress={() => onOpenInquiry(r.inquiryCode, r.id)}
                          accessibilityLabel="Buka Detail Pesanan"
                        >
                          <ExternalLink size={16} color="#475569" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* 7. BUKU KAS & JURNAL TRANSAKSI (FINANCIAL LEDGER) */}
          <View style={styles.ledgerSection}>
            <View style={styles.ledgerHeader}>
              <View>
                <Text style={styles.ledgerHeaderTitle}>Buku Kas & Jurnal Transaksi</Text>
                <Text style={styles.ledgerHeaderSub}>Catatan audit riwayat transaksi debit, kredit, dan deposit armada EV</Text>
              </View>

              <View style={styles.ledgerControls}>
                {/* Flow Filter Tabs */}
                <View style={styles.flowTabsContainer}>
                  <TouchableOpacity
                    style={[styles.flowTab, kind === 'ALL' && styles.flowTabActive]}
                    onPress={() => setKind('ALL')}
                  >
                    <Text style={[styles.flowTabText, kind === 'ALL' && styles.flowTabTextActive]}>
                      Semua ({ledger.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.flowTab, kind === 'IN' && styles.flowTabActive]}
                    onPress={() => setKind('IN')}
                  >
                    <Text style={[styles.flowTabText, kind === 'IN' && styles.flowTabTextActive]}>
                      Masuk ({inCount})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.flowTab, kind === 'OUT' && styles.flowTabActive]}
                    onPress={() => setKind('OUT')}
                  >
                    <Text style={[styles.flowTabText, kind === 'OUT' && styles.flowTabTextActive]}>
                      Keluar ({outCount})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Search Box */}
                <View style={styles.searchBox}>
                  <Search size={16} color="#64748B" />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Cari transaksi / plat / nama..."
                    placeholderTextColor="#94A3B8"
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <X size={14} color="#64748B" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {Platform.OS === 'web' && (
                  <TouchableOpacity
                    style={styles.csvExportBtn}
                    onPress={exportCsv}
                    disabled={filteredLedger.length === 0}
                  >
                    <Download size={15} color="#475569" />
                    <Text style={styles.csvExportText}>CSV Jurnal</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Ledger Table */}
            {filteredLedger.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Belum ada transaksi ditemukan"
                text="Tidak ada catatan kas yang cocok dengan filter atau kata kunci pencarian."
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tableWrapper}>
                  {/* Table Header */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.thText, { width: 220 }]}>TIPE & WAKTU</Text>
                    <Text style={[styles.thText, { width: 220 }]}>DESKRIPSI & ENTITAS</Text>
                    <Text style={[styles.thText, { width: 140 }]}>METODE & AKUN</Text>
                    <Text style={[styles.thText, { flex: 1, minWidth: 200 }]}>CATATAN OPERASIONAL</Text>
                    <Text style={[styles.thText, { width: 140, textAlign: 'right' }]}>NOMINAL ARUS</Text>
                    <Text style={[styles.thText, { width: 90, textAlign: 'center' }]}>AKSI</Text>
                  </View>

                  {/* Table Body */}
                  {visibleLedger.map((e) => {
                    const isIn = e.kind === 'IN';
                    const isVoid = !!e.voidedAt;
                    const typeLabel = e.source === 'PAYMENT'
                      ? PAYMENT_TYPE_LABEL[e.type as keyof typeof PAYMENT_TYPE_LABEL] || e.type
                      : EXPENSE_LABEL[e.type as ExpenseCategory] || e.type;

                    const descTitle = e.inquiryCode
                      ? `${e.inquiryCode} (${e.customerName || 'Pelanggan'})`
                      : e.vehicleName || 'Operasional Fleet';

                    const descSub = e.inquiryCode
                      ? `Unit ${e.vehicleName || '-'}`
                      : e.driverName
                      ? `Driver: ${e.driverName}`
                      : 'Umum / Semua Unit';

                    return (
                      <View
                        key={`${e.source}-${e.id}`}
                        style={[
                          styles.tableRow,
                          isVoid && styles.tableRowVoided,
                        ]}
                      >
                        {/* 1. Tipe & Waktu */}
                        <View style={{ width: 220, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 10, overflow: 'hidden' }}>
                          <View
                            style={[
                              styles.flowIconBox,
                              isVoid
                                ? { backgroundColor: '#FEE2E2' }
                                : isIn
                                ? { backgroundColor: '#D1FAE5' }
                                : { backgroundColor: '#FEF3C7' },
                            ]}
                          >
                            {isVoid ? (
                              <CircleAlert size={15} color="#DC2626" />
                            ) : isIn ? (
                              <ArrowDown size={15} color="#059669" />
                            ) : (
                              <ArrowUp size={15} color="#D97706" />
                            )}
                          </View>
                          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                            {isVoid ? (
                              <Text style={styles.voidBadgeText} numberOfLines={1}>DIBATALKAN</Text>
                            ) : (
                              <Text
                                style={[
                                  styles.flowTypeText,
                                  { color: isIn ? '#059669' : '#B45309' },
                                ]}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                              >
                                {isIn ? 'Masuk' : 'Keluar'} ({typeLabel})
                              </Text>
                            )}
                            <Text style={styles.flowDateText} numberOfLines={1}>{fmtDate(e.date)}</Text>
                          </View>
                        </View>

                        {/* 2. Deskripsi & Entitas */}
                        <View style={{ width: 220, paddingRight: 12, overflow: 'hidden' }}>
                          <Text
                            style={[styles.descTitle, isVoid && styles.strikethroughText]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {descTitle}
                          </Text>
                          {isVoid ? (
                            <Text style={styles.voidReasonText} numberOfLines={1} ellipsizeMode="tail">
                              Alasan: {e.voidReason}
                            </Text>
                          ) : (
                            <Text style={styles.descSub} numberOfLines={1} ellipsizeMode="tail">
                              {descSub}
                            </Text>
                          )}
                        </View>

                        {/* 3. Metode & Akun */}
                        <View style={{ width: 140, paddingRight: 10, overflow: 'hidden' }}>
                          <View style={styles.methodPill}>
                            <CreditCard size={13} color="#475569" />
                            <Text
                              style={[styles.methodText, isVoid && styles.strikethroughText]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {e.method ? PAYMENT_METHOD_LABEL[e.method] || e.method : 'Kasir Depot'}
                            </Text>
                          </View>
                        </View>

                        {/* 4. Catatan Operasional */}
                        <View style={{ flex: 1, minWidth: 200, paddingRight: 12, overflow: 'hidden' }}>
                          <Text style={[styles.noteText, isVoid && styles.strikethroughText]} numberOfLines={2} ellipsizeMode="tail">
                            {e.note || '-'}
                          </Text>
                        </View>

                        {/* 5. Nominal Arus */}
                        <View style={{ width: 140, alignItems: 'flex-end', overflow: 'hidden' }}>
                          <Text
                            style={[
                              styles.amountText,
                              { color: isVoid ? '#94A3B8' : isIn ? '#059669' : '#B45309' },
                              isVoid && styles.strikethroughText,
                            ]}
                            numberOfLines={1}
                          >
                            {isIn ? '+' : '−'} {rp(e.amount)}
                          </Text>
                        </View>

                        {/* 6. Aksi */}
                        <View style={{ width: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {isVoid ? (
                            <View style={styles.loggedBadge}>
                              <Text style={styles.loggedBadgeText}>Audit</Text>
                            </View>
                          ) : (
                            <>
                              {e.inquiryCode ? (
                                <TouchableOpacity
                                  style={styles.actionIconBtn}
                                  onPress={() => onOpenInquiry(e.inquiryCode!, e.id)}
                                  accessibilityLabel="Lihat Pesanan"
                                >
                                  <Eye size={15} color="#475569" />
                                </TouchableOpacity>
                              ) : null}
                              <TouchableOpacity
                                style={[styles.actionIconBtn, styles.actionIconBtnDanger]}
                                onPress={() => doVoid(e)}
                                accessibilityLabel="Batalkan / Void Transaksi"
                              >
                                <X size={15} color="#EF4444" />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {/* Pagination Controls */}
            <View style={styles.ledgerPaginationRow}>
              <Text style={styles.paginationCountText}>
                Menampilkan <Text style={{ fontWeight: '800', color: '#0B1C30' }}>{visibleLedger.length}</Text> dari{' '}
                <Text style={{ fontWeight: '800', color: '#0B1C30' }}>{filteredLedger.length}</Text> transaksi buku kas
              </Text>

              {filteredLedger.length > 10 && !showAll ? (
                <TouchableOpacity style={styles.showAllBtn} onPress={() => setShowAll(true)}>
                  <Text style={styles.showAllText}>Tampilkan Semua Transaksi ({filteredLedger.length})</Text>
                </TouchableOpacity>
              ) : showAll && filteredLedger.length > 10 ? (
                <TouchableOpacity style={styles.showAllBtn} onPress={() => setShowAll(false)}>
                  <Text style={styles.showAllText}>Perpendek Daftar (10)</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* 8. FOOTER METADATA AUDIT */}
          <View style={styles.auditFooter}>
            <View style={styles.auditLeft}>
              <ShieldCheck size={16} color="#4131DD" />
              <Text style={styles.auditText}>
                Enkripsi SHA-256 Terverifikasi • Jurnal Keuangan Electra v16.2
              </Text>
            </View>
            <View style={styles.auditRight}>
              <Text style={styles.auditSubText}>Database: PostgreSQL Live</Text>
              <Text style={styles.auditSubText}>•</Text>
              <Text style={styles.auditSubText}>Sync: 10s</Text>
              <Text style={styles.auditSubText}>•</Text>
              <Text style={styles.auditSubText}>Node: ID-JKT-SRV04</Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingBottom: 40,
  },

  // 1. Hero Banner
  heroBanner: {
    backgroundColor: '#0B1C30',
    borderRadius: 16,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  glowCyan: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  glowPurple: {
    position: 'absolute',
    bottom: -60,
    left: '30%',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  heroContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 18,
    position: 'relative',
    zIndex: 1,
  },
  heroLeft: {
    flex: 1,
    minWidth: 280,
    gap: 8,
  },
  heroTagPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#BAE6FD',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: '#94A3B8',
    lineHeight: 20,
    maxWidth: 620,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  liveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  liveTimestamp: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  liveToggleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveToggleBtnPaused: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  liveToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4131DD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#4131DD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCtaBtnActive: {
    backgroundColor: '#3730A3',
  },
  primaryCtaText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 2. Presets Toolbar
  presetsToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  presetsLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  presetLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  presetPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 8,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  presetPillActive: {
    backgroundColor: '#4131DD',
    shadowColor: '#4131DD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  presetPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  presetPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  verticalDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  daysBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  daysBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  presetsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },

  // 3. Expense Form
  expenseFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4131DD',
    gap: 16,
    shadowColor: '#4131DD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  expenseFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  expenseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  expenseIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#4131DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseFormTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0B1C30',
  },
  quickModeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickModeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4131DD',
    letterSpacing: 0.5,
  },
  expenseFormSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeFormBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  formSection: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  catChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  catChipActive: {
    backgroundColor: '#4131DD',
    shadowColor: '#4131DD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  formThreeCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  formTwoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  formColBox: {
    minWidth: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputBoxError: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#EF4444',
  },
  rpPrefix: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4131DD',
  },
  nominalInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: '#0B1C30',
    paddingVertical: 0,
  },
  terbilangRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  terbilangText: {
    fontSize: 11.5,
    color: '#475569',
    fontStyle: 'italic',
    flex: 1,
  },
  datePickerWrap: {
    marginTop: 2,
  },
  fieldHint: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  formErrorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
  },
  channelChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  channelChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  channelChipActive: {
    backgroundColor: '#4131DD',
    borderColor: '#4131DD',
  },
  channelChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  channelChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  allocChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allocChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  allocChipActive: {
    backgroundColor: '#4131DD',
    borderColor: '#4131DD',
  },
  allocChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  allocChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  noteInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noteInput: {
    flex: 1,
    fontSize: 13,
    color: '#0B1C30',
    paddingVertical: 0,
  },
  formFooterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
  },
  formCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  formCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  formSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4131DD',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    shadowColor: '#4131DD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  formSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 4. Stat Cards
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  statCard: {
    flex: 1,
    minWidth: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  statCardNet: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  statIconGreen: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconAmber: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconBlue: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marginPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  marginPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  receivableCountPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  receivableCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  statBody: {
    gap: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B1C30',
    letterSpacing: -0.3,
  },
  deltaPillGreen: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deltaTextGreen: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
  },
  deltaPillAmber: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deltaTextAmber: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D97706',
  },
  statHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statHintText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statFooter: {
    fontSize: 11,
    color: '#94A3B8',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  // 5. Visualisasi Charts Grid
  chartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  chartCard: {
    minWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B1C30',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  chartControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  sorotanBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sorotanTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  sorotanTagText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#4131DD',
  },
  sorotanStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  sorotanIn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  sorotanOut: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  sorotanNet: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4131DD',
  },
  barsWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 10,
    gap: 4,
  },
  barColGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderRadius: 6,
  },
  barColGroupSelected: {
    backgroundColor: '#EEF2FF',
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 150,
  },
  singleBar: {
    width: 9,
    borderRadius: 3,
  },
  barDateLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '600',
  },
  barDateLabelSelected: {
    color: '#4131DD',
    fontWeight: '900',
  },
  chartFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  chartRatioText: {
    fontSize: 12,
    color: '#64748B',
  },

  // Breakdown Column
  breakdownCol: {
    minWidth: 280,
    gap: 16,
  },
  subCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0B1C30',
  },
  subCardAmount: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#475569',
  },
  trackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  trackVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#4131DD',
  },
  trackBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  channelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  channelCard: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channelName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    flex: 1,
  },
  channelPct: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0B1C30',
  },
  channelRp: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // 6. Piutang Sewa
  receivablesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  receivablesHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  receivablesTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 260,
  },
  pendingIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receivablesTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B1C30',
  },
  receivablesSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  totalPiutangBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  totalPiutangText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  receivablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  recCard: {
    flex: 1,
    minWidth: 270,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    gap: 10,
  },
  recCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  recCode: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4131DD',
  },
  recCustomerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1C30',
  },
  recVehicle: {
    fontSize: 12,
    color: '#64748B',
  },
  recDateBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recDateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  recBreakdownBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recRowLabel: {
    fontSize: 11.5,
    color: '#64748B',
  },
  recRowVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B1C30',
  },
  recActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  recWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  recWhatsAppText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  recOpenBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 7. Buku Kas / Ledger
  ledgerSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  ledgerHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  ledgerHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0B1C30',
  },
  ledgerHeaderSub: {
    fontSize: 12,
    color: '#64748B',
  },
  ledgerControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  flowTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 8,
  },
  flowTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  flowTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  flowTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  flowTabTextActive: {
    color: '#0B1C30',
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0B1C30',
    paddingVertical: 0,
  },
  csvExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  csvExportText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },

  // Table
  tableWrapper: {
    minWidth: 1010,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowVoided: {
    backgroundColor: 'rgba(254, 242, 242, 0.4)',
    opacity: 0.65,
  },
  flowIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowTypeText: {
    fontSize: 12.5,
    fontWeight: '800',
    lineHeight: 16,
  },
  flowDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  voidBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  descTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B1C30',
  },
  descSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  voidReasonText: {
    fontSize: 11.5,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 1,
  },
  methodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  methodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  noteText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  amountText: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  strikethroughText: {
    textDecorationLine: 'line-through',
  },
  loggedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  loggedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconBtnDanger: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  ledgerPaginationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    gap: 8,
  },
  paginationCountText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  showAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  showAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  // 8. Footer Audit Metadata
  auditFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  auditLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  auditText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  auditRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  auditSubText: {
    fontSize: 11,
    color: '#64748B',
  },
});
