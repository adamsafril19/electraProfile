import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Download, Landmark, MessageCircle, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';
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
import { Btn, Card, Chip, EmptyState, ErrorBox, FormField, Loading, PageHeader, Pill, SectionTitle, StatTile, adminStyles, askReason, fmtDate, fmtTime, openWhatsAppTo, rp, rpShort } from './ui';
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

// Perbandingan dengan periode sebelumnya (naik pemasukan = baik; naik pengeluaran = perlu perhatian)
const deltaText = (cur: number, prev: number | undefined, upIsGood: boolean): string => {
  if (prev === undefined) return '';
  if (prev === 0) return cur === 0 ? 'Sama dengan periode lalu' : 'Periode lalu: Rp 0';
  const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  if (pct === 0) return 'Sama dengan periode lalu';
  return `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% dari periode lalu`;
};

const EXPENSE_CATS = Object.keys(EXPENSE_LABEL) as ExpenseCategory[];
const CAT_COLORS: Record<ExpenseCategory, string> = {
  CHARGING: '#0EA5E9',
  PERAWATAN: '#F59E0B',
  GAJI_DRIVER: '#8B5CF6',
  ASURANSI_PAJAK: '#64748B',
  OPERASIONAL: '#14B8A6',
  LAINNYA: '#94A3B8',
};

export const AdminFinance: React.FC<Props> = ({ onUnauthorized, onOpenInquiry, autoExpense }) => {
  const [preset, setPreset] = useState<Preset>('BULAN_INI');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [kind, setKind] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(!!autoExpense);
  const [prev, setPrev] = useState<FinanceSummary | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);

  const { from, to } = rangeOf(preset);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        // Periode pembanding: rentang sama panjang tepat sebelum periode ini
        const len = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
        const shift = (ymd: string, days: number) => {
          const [y, m, d] = ymd.split('-').map(Number);
          return toDateStr(new Date(y, m - 1, d + days));
        };
        const prevTo = shift(from, -1);
        const prevFrom = shift(prevTo, -(len - 1));
        const [s, l, p] = await Promise.all([fetchFinanceSummary(from, to), fetchLedger(from, to), fetchFinanceSummary(prevFrom, prevTo).catch(() => null)]);
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

  // "Real-time": polling berkala selama mode Live aktif
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => load(true), LIVE_MS);
    return () => clearInterval(t);
  }, [live, load]);

  const filtered = ledger.filter((e) => kind === 'ALL' || e.kind === kind);
  const visible = showAll ? filtered : filtered.slice(0, 25);

  const doVoid = async (entry: LedgerEntry) => {
    const reason = await askReason(`Alasan membatalkan ${entry.source === 'PAYMENT' ? 'pembayaran' : 'pengeluaran'} ini?`, 'Salah input');
    if (!reason) return;
    try {
      if (entry.source === 'PAYMENT') await voidPayment(entry.id, reason);
      else await voidExpense(entry.id, reason);
      toast.success('Pencatatan dibatalkan');
      load(true);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof AdminApiError ? e.message : 'Gagal membatalkan.');
    }
  };

  const exportCsv = () => {
    if (Platform.OS !== 'web') return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Tanggal', 'Arus', 'Jenis', 'Metode', 'Jumlah', 'Reservasi', 'Pelanggan', 'Unit', 'Driver', 'Catatan', 'Status'],
      ...filtered.map((e) => [
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
    const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
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
  const sel = summary && selectedBucket !== null ? summary.series[selectedBucket] : null;

  return (
    <View style={{ gap: 18 }}>
      <PageHeader
        title="Keuangan"
        subtitle="Pantau pembayaran masuk, pengeluaran, piutang, dan deposit. Pembayaran dicatat dari menu Pesanan."
        right={
          <>
            <TouchableOpacity style={[styles.liveBtn, live && styles.liveBtnOn]} onPress={() => setLive((v) => !v)} accessibilityRole="switch" accessibilityState={{ checked: live }}>
              <View style={[styles.liveDot, { backgroundColor: live ? '#22C55E' : '#94A3B8' }]} />
              <Text style={[styles.liveText, live && { color: '#166534' }]}>{live ? 'Live' : 'Jeda'}</Text>
              {updatedAt ? <Text style={styles.liveTime}>{fmtTime(updatedAt)}</Text> : null}
            </TouchableOpacity>
            <Btn label="Catat pengeluaran" icon={Plus} small onPress={() => setFormOpen((v) => !v)} variant={formOpen ? 'secondary' : 'primary'} />
          </>
        }
      />

      <View style={adminStyles.row}>
        {PRESETS.map((p) => (
          <Chip key={p.key} label={p.label} active={preset === p.key} onPress={() => setPreset(p.key)} />
        ))}
        <Text style={[adminStyles.muted, { alignSelf: 'center' }]}>
          {fmtDate(from)} – {fmtDate(to)}
        </Text>
      </View>

      {formOpen && (
        <ExpenseForm
          onUnauthorized={onUnauthorized}
          onDone={() => {
            setFormOpen(false);
            load(true);
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {error ? <ErrorBox message={error} onRetry={() => load()} /> : null}

      {loading && !summary ? (
        <Loading />
      ) : summary ? (
        <>
          <View style={styles.tiles}>
            <StatTile label="Pemasukan" value={rpShort(summary.income.total)} icon={TrendingUp} tone="success" hint={deltaText(summary.income.total, prev?.income.total, true)} />
            <StatTile label="Pengeluaran" value={rpShort(summary.expense.total)} icon={TrendingDown} tone="warn" hint={deltaText(summary.expense.total, prev?.expense.total, false)} />
            <StatTile label="Laba bersih" value={rpShort(summary.net)} icon={Wallet} tone={summary.net >= 0 ? 'success' : 'danger'} hint={deltaText(summary.net, prev?.net, true)} />
            <StatTile label="Piutang sewa" value={rpShort(summary.receivables.total)} icon={Landmark} tone={summary.receivables.total > 0 ? 'warn' : 'success'} hint={`${summary.receivables.count} reservasi belum lunas`} />
            <StatTile label="Deposit ditahan" value={rpShort(summary.deposit.heldNow)} icon={Wallet} tone="info" hint="Dana titipan, bukan pendapatan" />
          </View>

          <View style={styles.twoCol}>
            {/* Grafik */}
            <Card style={[styles.col, { flexBasis: 480 }]}>
              <SectionTitle hint={summary.seriesUnit === 'DAY' ? 'Per hari' : 'Per bulan'}>Pemasukan vs pengeluaran</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={summary.series.length > 14}>
                <View style={[styles.chart, { minWidth: Math.max(280, summary.series.length * 26) }]}>
                  {summary.series.map((b, idx) => (
                    <TouchableOpacity key={b.label} style={[styles.barGroup, selectedBucket === idx && styles.barGroupSel]} onPress={() => setSelectedBucket(selectedBucket === idx ? null : idx)} accessibilityRole="button" accessibilityLabel={`${b.label}: masuk ${rp(b.income)}, keluar ${rp(b.expense)}`}>
                      <View style={styles.bars}>
                        <View style={[styles.bar, { height: `${(b.income / maxBar) * 100}%`, backgroundColor: '#22C55E' }]} />
                        <View style={[styles.bar, { height: `${(b.expense / maxBar) * 100}%`, backgroundColor: '#F59E0B' }]} />
                      </View>
                      <Text style={styles.barLabel}>{summary.seriesUnit === 'DAY' ? b.label.slice(8) : b.label.slice(5)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={[adminStyles.row, { gap: 14, marginTop: 8 }]}>
                <Text style={styles.legend}><Text style={{ color: '#22C55E' }}>■</Text> Pemasukan</Text>
                <Text style={styles.legend}><Text style={{ color: '#F59E0B' }}>■</Text> Pengeluaran</Text>
              </View>
              {sel && (
                <View style={styles.selBox}>
                  <Text style={styles.selTitle}>{sel.label}</Text>
                  <Text style={styles.selLine}>Masuk {rp(sel.income)} • Keluar {rp(sel.expense)} • Bersih {rp(sel.income - sel.expense)}</Text>
                </View>
              )}
            </Card>

            {/* Rincian */}
            <Card style={[styles.col, { flexBasis: 320 }]}>
              <SectionTitle>Pengeluaran per kategori</SectionTitle>
              {catTotal === 0 ? (
                <Text style={adminStyles.muted}>Belum ada pengeluaran pada periode ini.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {EXPENSE_CATS.filter((c) => summary.expense.byCategory[c]).map((c) => {
                    const v = summary.expense.byCategory[c];
                    return (
                      <View key={c} style={{ gap: 4 }}>
                        <View style={styles.catRow}>
                          <Text style={styles.catName}>{EXPENSE_LABEL[c]}</Text>
                          <Text style={styles.catVal}>{rp(v)}</Text>
                        </View>
                        <View style={styles.catTrack}>
                          <View style={[styles.catFill, { width: `${(v / catTotal) * 100}%`, backgroundColor: CAT_COLORS[c] }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
              <View style={styles.divider} />
              <SectionTitle>Pemasukan per metode</SectionTitle>
              {Object.keys(summary.income.byMethod).length === 0 ? (
                <Text style={adminStyles.muted}>Belum ada pemasukan.</Text>
              ) : (
                Object.entries(summary.income.byMethod).map(([m, v]) => (
                  <View key={m} style={styles.catRow}>
                    <Text style={styles.catName}>{PAYMENT_METHOD_LABEL[m as keyof typeof PAYMENT_METHOD_LABEL] || m}</Text>
                    <Text style={styles.catVal}>{rp(v)}</Text>
                  </View>
                ))
              )}
            </Card>
          </View>

          {/* Piutang */}
          <Card>
            <SectionTitle hint="Reservasi aktif dengan tagihan sewa yang belum lunas, urut jadwal ambil terdekat">Piutang sewa</SectionTitle>
            {summary.receivables.items.length === 0 ? (
              <EmptyState icon={Landmark} title="Tidak ada piutang" text="Semua reservasi aktif sudah lunas." />
            ) : (
              <View style={{ gap: 8 }}>
                {summary.receivables.items.map((r) => (
                  <View key={r.id} style={styles.recRow}>
                    <TouchableOpacity style={{ flex: 1, minWidth: 200 }} onPress={() => onOpenInquiry(r.inquiryCode, r.id)} accessibilityRole="button">
                      <Text style={styles.recName}>
                        {r.customerName} • {r.vehicleName}
                      </Text>
                      <Text style={adminStyles.muted}>
                        {r.inquiryCode} • ambil {fmtDate(r.startDate)} • dibayar {rp(r.rentPaid)} dari {rp(r.rentDue)}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.recAmount}>{rp(r.outstanding)}</Text>
                    <Btn
                      label="Tagih"
                      icon={MessageCircle}
                      variant="secondary"
                      small
                      onPress={() => openWhatsAppTo(r.customerPhone, `Halo ${r.customerName}, mengingatkan sisa pembayaran sewa ${r.vehicleName} (${r.inquiryCode}) sebesar ${rp(r.outstanding)}. Terima kasih.`)}
                    />
                  </View>
                ))}
                {summary.receivables.count > summary.receivables.items.length && (
                  <Text style={adminStyles.muted}>+{summary.receivables.count - summary.receivables.items.length} reservasi lain belum lunas.</Text>
                )}
              </View>
            )}
          </Card>

          {/* Buku kas */}
          <Card>
            <SectionTitle
              hint="Semua pembayaran dan pengeluaran pada periode ini. Yang dibatalkan tetap tercatat (dicoret) sebagai jejak audit."
              right={Platform.OS === 'web' ? <Btn label="Unduh CSV" icon={Download} variant="secondary" small onPress={exportCsv} disabled={filtered.length === 0} /> : null}
            >
              Buku kas
            </SectionTitle>
            <View style={[adminStyles.row, { marginBottom: 12 }]}>
              <Chip label="Semua" active={kind === 'ALL'} onPress={() => setKind('ALL')} count={ledger.length} />
              <Chip label="Masuk" active={kind === 'IN'} onPress={() => setKind('IN')} count={ledger.filter((e) => e.kind === 'IN').length} />
              <Chip label="Keluar" active={kind === 'OUT'} onPress={() => setKind('OUT')} count={ledger.filter((e) => e.kind === 'OUT').length} />
            </View>

            {filtered.length === 0 ? (
              <EmptyState icon={Wallet} title="Belum ada transaksi" text="Catat pembayaran dari menu Pesanan, atau catat pengeluaran dengan tombol di atas." />
            ) : (
              <View>
                {visible.map((e) => {
                  const isIn = e.kind === 'IN';
                  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
                  const title = e.source === 'PAYMENT' ? PAYMENT_TYPE_LABEL[e.type as keyof typeof PAYMENT_TYPE_LABEL] : EXPENSE_LABEL[e.type as ExpenseCategory];
                  const sub = [
                    fmtDate(e.date),
                    e.method ? PAYMENT_METHOD_LABEL[e.method] : null,
                    e.inquiryCode ? `${e.inquiryCode} • ${e.customerName}` : null,
                    e.vehicleName,
                    e.driverName ? `Driver ${e.driverName}` : null,
                    e.note,
                  ]
                    .filter(Boolean)
                    .join(' • ');
                  return (
                    <View key={`${e.source}-${e.id}`} style={[styles.ledgerRow, e.voidedAt ? { opacity: 0.5 } : null]}>
                      <View style={[styles.ledgerIcon, { backgroundColor: isIn ? T.successSoft : T.warnSoft }]}>
                        <Icon size={16} color={isIn ? T.success : T.warn} />
                      </View>
                      <View style={{ flex: 1, minWidth: 180 }}>
                        <Text style={[styles.ledgerTitle, e.voidedAt ? { textDecorationLine: 'line-through' } : null]}>{title}</Text>
                        <Text style={adminStyles.muted}>{sub}</Text>
                        {e.voidedAt ? <Text style={{ fontSize: 12, color: T.danger, fontWeight: '700' }}>Dibatalkan: {e.voidReason}</Text> : null}
                      </View>
                      <Text style={[styles.ledgerAmount, { color: isIn ? T.success : T.warn }, e.voidedAt ? { textDecorationLine: 'line-through' } : null]}>
                        {isIn ? '+' : '−'}
                        {rp(e.amount)}
                      </Text>
                      {!e.voidedAt ? <Btn label="Batalkan" variant="ghost" small onPress={() => doVoid(e)} /> : <Pill label="Batal" tone="danger" />}
                    </View>
                  );
                })}
                {filtered.length > 25 && !showAll && <Btn label={`Tampilkan semua (${filtered.length})`} variant="secondary" onPress={() => setShowAll(true)} />}
              </View>
            )}
          </Card>
        </>
      ) : null}
    </View>
  );
};

// ---------- Form pengeluaran ----------

const ExpenseForm: React.FC<{ onDone: () => void; onCancel: () => void; onUnauthorized: () => void }> = ({ onDone, onCancel, onUnauthorized }) => {
  const [category, setCategory] = useState<ExpenseCategory>('CHARGING');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [note, setNote] = useState('');
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // Pilihan unit/driver bersifat opsional; kegagalan memuatnya tidak menghalangi pencatatan
    fetchAdminFleet().then(setVehicles).catch(() => {});
    fetchDrivers().then((d) => setDrivers(d.filter((x) => x.isActive))).catch(() => {});
  }, []);

  const submit = async () => {
    const e: Record<string, string> = {};
    const n = Number(amount);
    if (!amount || !Number.isInteger(n) || n <= 0) e.amount = 'Isi jumlah lebih dari 0.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'Tanggal tidak valid.';
    else if (date > todayStr()) e.date = 'Tanggal tidak boleh di masa depan.';
    setErrors(e);
    setApiError(null);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      await createExpense({ category, amount: n, date, vehicleId: vehicleId || undefined, driverId: driverId || undefined, note: note.trim() || undefined });
      toast.success('Pengeluaran dicatat');
      onDone();
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) return onUnauthorized();
      setApiError(err instanceof AdminApiError ? err.message : 'Gagal mencatat pengeluaran.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 12, borderColor: T.brand }}>
      <Text style={styles.formTitle}>Catat pengeluaran</Text>
      <View style={adminStyles.row}>
        {EXPENSE_CATS.map((c) => (
          <Chip key={c} label={EXPENSE_LABEL[c]} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>
      <View style={adminStyles.row}>
        <FormField label="JUMLAH (RP)" error={errors.amount} hint={amount ? rp(Number(amount)) : undefined} style={{ flex: 1, minWidth: 180 }}>
          <TextInput
            style={[adminStyles.input, !!errors.amount && adminStyles.inputError]}
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/\D/g, '').slice(0, 10))}
            keyboardType="number-pad"
            placeholder="Contoh: 150000"
            placeholderTextColor="#64748B"
            accessibilityLabel="Jumlah pengeluaran"
          />
        </FormField>
        <FormField label="TANGGAL" error={errors.date} style={{ flex: 1, minWidth: 170 }}>
          <DateInput value={date} onChange={setDate} max={todayStr()} error={!!errors.date} accessibilityLabel="Tanggal pengeluaran" />
        </FormField>
      </View>

      {vehicles.length > 0 && (
        <FormField label="UNIT TERKAIT (OPSIONAL)">
          <View style={adminStyles.row}>
            <Chip label="Tidak ada" active={!vehicleId} onPress={() => setVehicleId('')} />
            {vehicles.map((v) => (
              <Chip key={v.id} label={`${v.brand} ${v.model.split(' ').slice(0, 2).join(' ')}`} active={vehicleId === v.id} onPress={() => setVehicleId(v.id)} />
            ))}
          </View>
        </FormField>
      )}
      {(category === 'GAJI_DRIVER' || drivers.length > 0) && drivers.length > 0 && (
        <FormField label="DRIVER TERKAIT (OPSIONAL)">
          <View style={adminStyles.row}>
            <Chip label="Tidak ada" active={!driverId} onPress={() => setDriverId('')} />
            {drivers.map((d) => (
              <Chip key={d.id} label={d.name} active={driverId === d.id} onPress={() => setDriverId(d.id)} />
            ))}
          </View>
        </FormField>
      )}

      <FormField label="CATATAN (OPSIONAL)">
        <TextInput style={adminStyles.input} value={note} onChangeText={setNote} maxLength={200} placeholder="Mis. SPKLU Sudirman, ganti ban" placeholderTextColor="#64748B" />
      </FormField>

      {apiError ? <ErrorBox message={apiError} /> : null}
      <View style={adminStyles.row}>
        <Btn label="Simpan pengeluaran" onPress={submit} loading={busy} />
        <Btn label="Batal" variant="ghost" onPress={onCancel} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' },
  col: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  liveBtn: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: T.borderStrong, backgroundColor: '#FFFFFF' },
  liveBtnOn: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  liveText: { fontSize: 13, fontWeight: '800', color: T.inkSoft },
  liveTime: { fontSize: 12, color: T.muted },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 190 },
  barGroup: { flex: 1, minWidth: 20, height: '100%', alignItems: 'center', borderRadius: 6, paddingTop: 4 },
  barGroupSel: { backgroundColor: T.brandSoft },
  bars: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  bar: { width: 8, minHeight: 2, borderRadius: 3 },
  barLabel: { fontSize: 12, color: T.muted, marginTop: 4 },
  legend: { fontSize: 12.5, color: T.inkSoft, fontWeight: '600' },
  selBox: { marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: T.brandSoft },
  selTitle: { fontSize: 13, fontWeight: '900', color: T.brand },
  selLine: { fontSize: 13, color: T.inkSoft, marginTop: 2 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  catName: { fontSize: 13.5, fontWeight: '700', color: T.inkSoft },
  catVal: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  catTrack: { height: 8, borderRadius: 4, backgroundColor: T.surfaceAlt, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 4 },
  divider: { height: 1, backgroundColor: T.border, marginVertical: 14 },
  recRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt },
  recName: { fontSize: 14, fontWeight: '800', color: T.ink },
  recAmount: { fontSize: 15, fontWeight: '900', color: T.warn },
  ledgerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  ledgerIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  ledgerTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  ledgerAmount: { fontSize: 14.5, fontWeight: '900' },
  formTitle: { fontSize: 16, fontWeight: '900', color: T.ink },
});
