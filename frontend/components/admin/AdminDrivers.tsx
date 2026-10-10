import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageCircle, Pencil, Plus, Trash2, UserRound } from 'lucide-react-native';
import {
  AdminApiError,
  AdminInquiry,
  Driver,
  DriverToday,
  addDriverTimeOff,
  createDriver,
  fetchDrivers,
  removeDriverTimeOff,
  updateDriver,
} from '../../services/adminApi';
import { toDateStr, todayStr } from '../../utils/date';
import { Avatar, Btn, Card, Chip, EmptyState, ErrorBox, FormField, Loading, PageHeader, Pill, adminStyles, confirmAction, fmtDate, openWhatsAppTo } from './ui';
import { DateInput } from './DateInput';
import { T } from './theme';
import { toast } from './feedback';

interface Props {
  onUnauthorized: () => void;
  onOpenInquiry: (i: AdminInquiry) => void;
  // Buka form tambah driver saat halaman dibuka (dari aksi cepat)
  autoAdd?: boolean;
}

const TODAY_META: Record<DriverToday, { label: string; tone: 'success' | 'info' | 'warn' | 'neutral' }> = {
  TERSEDIA: { label: 'Tersedia hari ini', tone: 'success' },
  BERTUGAS: { label: 'Sedang bertugas', tone: 'info' },
  CUTI: { label: 'Cuti hari ini', tone: 'warn' },
  NONAKTIF: { label: 'Nonaktif', tone: 'neutral' },
};

const FILTERS: (DriverToday | 'ALL')[] = ['ALL', 'TERSEDIA', 'BERTUGAS', 'CUTI', 'NONAKTIF'];
const STRIP_DAYS = 14;
const PHONE_RE = /^(?:\+62|62|08)[0-9]{8,13}$/;

const addDays = (s: string, n: number): string => {
  const [y, m, d] = s.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + n));
};

export const AdminDrivers: React.FC<Props> = ({ onUnauthorized, onOpenInquiry, autoAdd }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DriverToday | 'ALL'>('ALL');
  const [adding, setAdding] = useState(!!autoAdd);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        setDrivers(await fetchDrivers());
        setError(null);
      } catch (e) {
        if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
        setError(e instanceof AdminApiError ? e.message : 'Gagal memuat driver.');
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const counts = (f: DriverToday | 'ALL') => (f === 'ALL' ? drivers.length : drivers.filter((d) => d.today === f).length);
  const shown = drivers.filter((d) => filter === 'ALL' || d.today === filter);

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Driver"
        subtitle="Kelola driver, jadwal cuti, dan penugasan. Sistem menolak penugasan yang bentrok dengan jadwal lain atau cuti."
        right={<Btn label={adding ? 'Tutup form' : 'Tambah driver'} icon={Plus} onPress={() => setAdding((v) => !v)} small variant={adding ? 'secondary' : 'primary'} />}
      />

      {adding && (
        <DriverForm
          onUnauthorized={onUnauthorized}
          onDone={() => {
            setAdding(false);
            load(true);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {error ? <ErrorBox message={error} onRetry={() => load()} /> : null}

      {drivers.length > 0 && (
        <View style={adminStyles.row}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f === 'ALL' ? 'Semua' : TODAY_META[f].label.replace(' hari ini', '')} active={filter === f} onPress={() => setFilter(f)} count={counts(f)} />
          ))}
        </View>
      )}

      {loading && drivers.length === 0 ? (
        <Loading />
      ) : drivers.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={UserRound}
            title="Belum ada driver"
            text="Tambahkan driver agar bisa ditugaskan pada reservasi layanan Dengan Sopir."
            action={<Btn label="Tambah driver pertama" icon={Plus} onPress={() => setAdding(true)} />}
          />
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState title="Tidak ada driver pada filter ini" />
        </Card>
      ) : (
        <View style={styles.grid}>
          {shown.map((d) => (
            <DriverCard key={d.id} driver={d} onChanged={() => load(true)} onUnauthorized={onUnauthorized} onOpenInquiry={onOpenInquiry} />
          ))}
        </View>
      )}
    </View>
  );
};

// ---------- Form tambah / ubah ----------

const DriverForm: React.FC<{
  driver?: Driver;
  onDone: () => void;
  onCancel: () => void;
  onUnauthorized: () => void;
}> = ({ driver, onDone, onCancel, onUnauthorized }) => {
  const [name, setName] = useState(driver?.name || '');
  const [phone, setPhone] = useState(driver?.phone || '');
  const [license, setLicense] = useState(driver?.licenseNumber || '');
  const [notes, setNotes] = useState(driver?.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const submit = async () => {
    const e: Record<string, string> = {};
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (name.trim().length < 3) e.name = 'Nama minimal 3 karakter.';
    if (!PHONE_RE.test(cleanPhone)) e.phone = 'Nomor tidak valid. Contoh: 081298765432.';
    setErrors(e);
    setApiError(null);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const payload = { name: name.trim(), phone: cleanPhone, licenseNumber: license.trim(), notes: notes.trim() };
      if (driver) await updateDriver(driver.id, payload);
      else await createDriver(payload);
      toast.success(driver ? 'Data driver diperbarui' : 'Driver ditambahkan');
      onDone();
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) return onUnauthorized();
      setApiError(err instanceof AdminApiError ? err.message : 'Gagal menyimpan driver.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 12, borderColor: T.brand }}>
      <Text style={styles.formTitle}>{driver ? 'Ubah data driver' : 'Tambah driver'}</Text>
      <View style={adminStyles.row}>
        <FormField label="NAMA LENGKAP *" error={errors.name} style={{ flex: 1, minWidth: 220 }}>
          <TextInput style={[adminStyles.input, !!errors.name && adminStyles.inputError]} value={name} onChangeText={setName} placeholder="Contoh: Pak Agus Salim" placeholderTextColor="#64748B" />
        </FormField>
        <FormField label="NOMOR WHATSAPP *" error={errors.phone} style={{ flex: 1, minWidth: 220 }}>
          <TextInput
            style={[adminStyles.input, !!errors.phone && adminStyles.inputError]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="081298765432"
            placeholderTextColor="#64748B"
          />
        </FormField>
      </View>
      <View style={adminStyles.row}>
        <FormField label="NOMOR SIM (OPSIONAL)" style={{ flex: 1, minWidth: 220 }}>
          <TextInput style={adminStyles.input} value={license} onChangeText={setLicense} placeholder="Nomor SIM A" placeholderTextColor="#64748B" maxLength={40} />
        </FormField>
        <FormField label="CATATAN (OPSIONAL)" style={{ flex: 1, minWidth: 220 }}>
          <TextInput style={adminStyles.input} value={notes} onChangeText={setNotes} placeholder="Mis. fasih bahasa Inggris" placeholderTextColor="#64748B" maxLength={300} />
        </FormField>
      </View>
      {apiError ? <ErrorBox message={apiError} /> : null}
      <View style={adminStyles.row}>
        <Btn label={driver ? 'Simpan perubahan' : 'Simpan driver'} onPress={submit} loading={busy} />
        <Btn label="Batal" variant="ghost" onPress={onCancel} />
      </View>
    </Card>
  );
};

// ---------- Kartu driver ----------

const DriverCard: React.FC<{
  driver: Driver;
  onChanged: () => void;
  onUnauthorized: () => void;
  onOpenInquiry: (i: AdminInquiry) => void;
}> = ({ driver: d, onChanged, onUnauthorized, onOpenInquiry }) => {
  const [editing, setEditing] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form cuti
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [reason, setReason] = useState('');
  const [leaveErrors, setLeaveErrors] = useState<Record<string, string>>({});

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
      toast.success('Perubahan disimpan');
      onChanged();
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof AdminApiError ? e.message : 'Terjadi kesalahan tak terduga.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    const next = !d.isActive;
    if (!(await confirmAction(next ? `Aktifkan kembali ${d.name}?` : `Nonaktifkan ${d.name}? Driver tidak bisa ditugaskan lagi.`))) return;
    run(() => updateDriver(d.id, { isActive: next }));
  };

  const addLeave = () => {
    const e: Record<string, string> = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) e.from = 'Tanggal tidak valid.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) e.to = 'Tanggal tidak valid.';
    else if (from && to < from) e.to = 'Tidak boleh sebelum tanggal mulai.';
    if (reason.trim().length < 3) e.reason = 'Isi alasan (min. 3 karakter).';
    setLeaveErrors(e);
    if (Object.keys(e).length) return;
    run(() => addDriverTimeOff(d.id, { from, to, reason: reason.trim() }), () => {
      setReason('');
      setLeaveOpen(false);
    });
  };

  const removeLeave = async (id: string, label: string) => {
    if (!(await confirmAction(`Hapus cuti ${label}?`))) return;
    run(() => removeDriverTimeOff(d.id, id));
  };

  const today = todayStr();
  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => {
    const day = addDays(today, i);
    const job = d.upcoming.find((u) => u.startDate <= day && day < u.endDate);
    const off = d.timeOff.find((t) => t.from <= day && day <= t.to);
    return { day, job, off };
  });
  const meta = TODAY_META[d.today];
  const futureLeave = d.timeOff.filter((t) => t.to >= today);

  if (editing) {
    return (
      <View style={styles.cardWrap}>
        <DriverForm driver={d} onCancel={() => setEditing(false)} onUnauthorized={onUnauthorized} onDone={() => { setEditing(false); onChanged(); }} />
      </View>
    );
  }

  return (
    <Card style={[styles.card, !d.isActive && { opacity: 0.85 }]}>
      <View style={styles.head}>
        <Avatar name={d.name} size={46} tone={d.today === 'BERTUGAS' ? 'info' : d.today === 'CUTI' ? 'warn' : d.isActive ? 'success' : 'neutral'} />
        <View style={{ flex: 1, minWidth: 160 }}>
          <Text style={styles.name}>{d.name}</Text>
          <Text style={adminStyles.muted}>
            {d.phone}
            {d.licenseNumber ? ` • SIM ${d.licenseNumber}` : ''}
          </Text>
        </View>
        <Pill label={meta.label} tone={meta.tone} />
      </View>
      {d.notes ? <Text style={[adminStyles.muted, { marginTop: 6 }]}>{d.notes}</Text> : null}

      {/* Strip jadwal 14 hari */}
      <Text style={[adminStyles.label, { marginTop: 14, marginBottom: 6 }]}>JADWAL 14 HARI KE DEPAN</Text>
      <View style={styles.strip}>
        {strip.map(({ day, job, off }, i) => (
          <TouchableOpacity
            key={day}
            disabled={!job}
            onPress={() => job && onOpenInquiry(job)}
            style={[styles.stripCell, job && styles.stripJob, off && !job && styles.stripOff, i === 0 && { borderColor: T.brand, borderWidth: 1.5 }]}
            accessibilityRole={job ? 'button' : 'text'}
            accessibilityLabel={`${fmtDate(day)}: ${job ? `bertugas ${job.inquiryCode}` : off ? `cuti ${off.reason}` : 'kosong'}`}
          >
            <Text style={[styles.stripNum, (job || off) && { color: job ? '#FFFFFF' : '#475569' }]}>{Number(day.slice(8))}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[adminStyles.row, { gap: 12, marginTop: 6 }]}>
        <Text style={styles.legend}>■ <Text style={{ color: T.brand }}>bertugas</Text></Text>
        <Text style={styles.legend}>■ <Text style={{ color: '#94A3B8' }}>cuti</Text></Text>
        <Text style={styles.legend}>□ kosong</Text>
      </View>

      {/* Penugasan */}
      <Text style={[adminStyles.label, { marginTop: 14, marginBottom: 6 }]}>PENUGASAN MENDATANG ({d.upcoming.length})</Text>
      {d.upcoming.length === 0 ? (
        <Text style={adminStyles.muted}>Belum ada penugasan. Tugaskan dari menu Pesanan pada reservasi Dengan Sopir.</Text>
      ) : (
        <View style={{ gap: 6 }}>
          {d.upcoming.slice(0, 4).map((u) => (
            <TouchableOpacity key={u.id} style={styles.job} onPress={() => onOpenInquiry(u)} accessibilityRole="button">
              <Text style={styles.jobTitle} numberOfLines={1}>
                {u.inquiryCode} • {u.vehicleName}
              </Text>
              <Text style={adminStyles.muted}>
                {fmtDate(u.startDate)} – {fmtDate(u.endDate)} • {u.customerName}
              </Text>
            </TouchableOpacity>
          ))}
          {d.upcoming.length > 4 && <Text style={adminStyles.muted}>+{d.upcoming.length - 4} penugasan lain</Text>}
        </View>
      )}

      {/* Cuti */}
      <View style={[styles.rowBetween, { marginTop: 14 }]}>
        <Text style={adminStyles.label}>CUTI / TIDAK TERSEDIA</Text>
        {d.isActive && <Btn label={leaveOpen ? 'Tutup' : 'Tambah cuti'} variant="ghost" small onPress={() => setLeaveOpen((v) => !v)} />}
      </View>
      {futureLeave.length === 0 && !leaveOpen && <Text style={adminStyles.muted}>Tidak ada jadwal cuti.</Text>}
      {futureLeave.map((t) => (
        <View key={t.id} style={styles.leaveRow}>
          <Text style={{ flex: 1, fontSize: 13.5, color: T.ink }}>
            {fmtDate(t.from)}
            {t.to !== t.from ? ` – ${fmtDate(t.to)}` : ''} • {t.reason}
          </Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => removeLeave(t.id, `${fmtDate(t.from)}`)} accessibilityRole="button" accessibilityLabel="Hapus cuti">
            <Trash2 size={17} color={T.danger} />
          </TouchableOpacity>
        </View>
      ))}
      {leaveOpen && (
        <View style={styles.leaveForm}>
          <View style={adminStyles.row}>
            <FormField label="DARI" error={leaveErrors.from} style={{ flex: 1, minWidth: 150 }}>
              <DateInput value={from} onChange={setFrom} min={today} error={!!leaveErrors.from} accessibilityLabel="Cuti dari tanggal" />
            </FormField>
            <FormField label="SAMPAI (INKLUSIF)" error={leaveErrors.to} style={{ flex: 1, minWidth: 150 }}>
              <DateInput value={to} onChange={setTo} min={from || today} error={!!leaveErrors.to} accessibilityLabel="Cuti sampai tanggal" />
            </FormField>
          </View>
          <FormField label="ALASAN" error={leaveErrors.reason}>
            <TextInput style={[adminStyles.input, !!leaveErrors.reason && adminStyles.inputError]} value={reason} onChangeText={setReason} placeholder="Mis. cuti keluarga, sakit" placeholderTextColor="#64748B" maxLength={120} />
          </FormField>
          <Btn label="Simpan cuti" onPress={addLeave} loading={busy} small />
        </View>
      )}

      {error ? (
        <View style={{ marginTop: 10 }}>
          <ErrorBox message={error} />
        </View>
      ) : null}

      <View style={[adminStyles.row, { marginTop: 14 }]}>
        <Btn label="WhatsApp" icon={MessageCircle} variant="secondary" small onPress={() => openWhatsAppTo(d.phone)} />
        <Btn label="Ubah" icon={Pencil} variant="secondary" small onPress={() => setEditing(true)} />
        <Btn label={d.isActive ? 'Nonaktifkan' : 'Aktifkan'} variant={d.isActive ? 'danger' : 'secondary'} small onPress={toggleActive} disabled={busy} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' },
  cardWrap: { flexGrow: 1, flexShrink: 1, flexBasis: 420, maxWidth: 640, minWidth: 0 },
  card: { flexGrow: 1, flexShrink: 1, flexBasis: 420, maxWidth: 640, minWidth: 0 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  name: { fontSize: 17, fontWeight: '900', color: T.ink },
  formTitle: { fontSize: 16, fontWeight: '900', color: T.ink },
  strip: { flexDirection: 'row', gap: 4 },
  stripCell: { flex: 1, minWidth: 0, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.border },
  stripJob: { backgroundColor: T.brand, borderColor: T.brand },
  stripOff: { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' },
  stripNum: { fontSize: 12, fontWeight: '800', color: T.muted },
  legend: { fontSize: 12, color: T.muted, fontWeight: '600' },
  job: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt, gap: 1 },
  jobTitle: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leaveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: T.border },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  leaveForm: { gap: 10, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt },
});
