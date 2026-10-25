import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ArrowRight,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  FileText,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  UserX,
  X,
} from 'lucide-react-native';
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
import {
  Avatar,
  Btn,
  Card,
  Chip,
  EmptyState,
  ErrorBox,
  FormField,
  Loading,
  PageHeader,
  Pill,
  adminStyles,
  confirmAction,
  fmtDate,
  openWhatsAppTo,
} from './ui';
import { DateInput } from './DateInput';
import { T, shadow } from './theme';
import { toast } from './feedback';

interface Props {
  onUnauthorized: () => void;
  onOpenInquiry: (i: AdminInquiry) => void;
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
const DOW_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Telemetry Calculations
  const totalCount = drivers.length;
  const availableCount = drivers.filter((d) => d.today === 'TERSEDIA').length;
  const onDutyCount = drivers.filter((d) => d.today === 'BERTUGAS').length;
  const onLeaveCount = drivers.filter((d) => d.today === 'CUTI').length;
  const inactiveCount = drivers.filter((d) => !d.isActive || d.today === 'NONAKTIF').length;

  const counts = (f: DriverToday | 'ALL') => {
    if (f === 'ALL') return totalCount;
    if (f === 'NONAKTIF') return inactiveCount;
    return drivers.filter((d) => d.today === f).length;
  };

  // Filtered & Searched Drivers
  const shown = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return drivers.filter((d) => {
      // Status filter
      if (filter !== 'ALL' && d.today !== filter) return false;
      // Search query
      if (q) {
        const text = `${d.name} ${d.phone} ${d.licenseNumber || ''} ${d.notes || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [drivers, filter, searchQuery]);

  return (
    <View style={{ gap: 18 }}>
      {/* 1. Hero Command Header */}
      <PageHeader
        tag="OPERASIONAL DRIVER • Real-Time Dispatch & Roster"
        title="Sopir & Kru"
        subtitle={
          drivers.length
            ? `Kelola data driver internal dan mitra, jadwal cuti, serta penugasan armada layanan Dengan Sopir. Total ${totalCount} kru terdaftar • ${availableCount} tersedia siap jalan hari ini.`
            : 'Kelola data driver internal dan mitra, jadwal cuti, serta penugasan armada.'
        }
        right={
          <>
            <Btn label="Muat ulang" icon={RefreshCw} variant="secondary" small onPress={() => load()} />
            <Btn
              label={adding ? 'Tutup Form' : '+ Tambah Driver Baru'}
              icon={Plus}
              onPress={() => setAdding((v) => !v)}
              small
              variant={adding ? 'secondary' : 'primary'}
            />
          </>
        }
      />

      {/* Form Tambah Driver */}
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

      {/* 2. Stat Ribbon Mini Grid (4 Quick Metric Tiles ala Stitch) */}
      <View style={styles.statRibbon}>
        {/* Stat 1: Total Driver */}
        <Card style={styles.statCard}>
          <View style={styles.statCardHead}>
            <Text style={styles.statCardLabel}>TOTAL DRIVER</Text>
            <View style={[styles.statIconBox, { backgroundColor: T.brandSoft }]}>
              <Users size={18} color={T.brand} />
            </View>
          </View>
          <View style={styles.statValRow}>
            <Text style={styles.statNum}>{totalCount}</Text>
            <Text style={styles.statUnit}>Kru</Text>
          </View>
          <Text style={styles.statSubText}>Internal & Mitra Resmi</Text>
        </Card>

        {/* Stat 2: Tersedia Hari Ini */}
        <Card style={styles.statCard}>
          <View style={styles.statCardHead}>
            <Text style={[styles.statCardLabel, { color: '#047857' }]}>TERSEDIA HARI INI</Text>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle2 size={18} color="#059669" />
            </View>
          </View>
          <View style={styles.statValRow}>
            <Text style={[styles.statNum, { color: '#059669' }]}>{availableCount}</Text>
            <Text style={styles.statPercentText}>
              ({totalCount ? Math.round((availableCount / totalCount) * 100) : 0}%)
            </Text>
          </View>
          <Text style={styles.statSubText}>Siap on-demand / reserve</Text>
        </Card>

        {/* Stat 3: Sedang Bertugas */}
        <Card style={styles.statCard}>
          <View style={styles.statCardHead}>
            <Text style={[styles.statCardLabel, { color: '#0369A1' }]}>SEDANG BERTUGAS</Text>
            <View style={[styles.statIconBox, { backgroundColor: '#F0F9FF' }]}>
              <Car size={18} color="#0284C7" />
            </View>
          </View>
          <View style={styles.statValRow}>
            <Text style={[styles.statNum, { color: '#0284C7' }]}>{onDutyCount}</Text>
            <Text style={styles.statPercentText}>
              ({totalCount ? Math.round((onDutyCount / totalCount) * 100) : 0}%)
            </Text>
          </View>
          <Text style={styles.statSubText}>Live di jalur perjalanan</Text>
        </Card>

        {/* Stat 4: Sedang Cuti / Izin */}
        <Card style={styles.statCard}>
          <View style={styles.statCardHead}>
            <Text style={[styles.statCardLabel, { color: '#B45309' }]}>SEDANG CUTI / IZIN</Text>
            <View style={[styles.statIconBox, { backgroundColor: '#FFFBEB' }]}>
              <UserX size={18} color="#D97706" />
            </View>
          </View>
          <View style={styles.statValRow}>
            <Text style={[styles.statNum, { color: '#D97706' }]}>{onLeaveCount}</Text>
            <Text style={styles.statPercentText}>
              ({totalCount ? Math.round((onLeaveCount / totalCount) * 100) : 0}%)
            </Text>
          </View>
          <Text style={styles.statSubText}>Izin / Sakit terverifikasi</Text>
        </Card>
      </View>

      {/* 3. Filter Chips & Quick Search Bar Toolbar */}
      <Card style={styles.toolbarCard}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={17} color={T.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama driver, nomor WhatsApp, atau SIM..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Hapus pencarian">
                <X size={16} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.chipRow}>
          {FILTERS.map((f) => (
            <Chip
              key={f}
              label={f === 'ALL' ? 'Semua' : TODAY_META[f].label.replace(' hari ini', '')}
              active={filter === f}
              onPress={() => setFilter(f)}
              count={counts(f)}
            />
          ))}
        </View>
      </Card>

      {/* 4. Daftar Kartu Driver */}
      {loading && drivers.length === 0 ? (
        <Loading />
      ) : drivers.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={UserRound}
            title="Belum ada driver"
            text="Tambahkan pengemudi agar dapat dialokasikan pada reservasi layanan Dengan Sopir."
            action={<Btn label="Tambah driver pertama" icon={Plus} onPress={() => setAdding(true)} />}
          />
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            title="Tidak ada driver yang cocok"
            text={searchQuery ? 'Coba ubah kata kunci pencarian atau ganti filter status.' : 'Tidak ada driver pada filter ini.'}
          />
        </Card>
      ) : (
        <View style={styles.driverList}>
          {shown.map((d) => (
            <DriverCard
              key={d.id}
              driver={d}
              onChanged={() => load(true)}
              onUnauthorized={onUnauthorized}
              onOpenInquiry={onOpenInquiry}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ==========================================
// Sub-Komponen: Form Tambah / Ubah Driver
// ==========================================

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
      const payload = {
        name: name.trim(),
        phone: cleanPhone,
        licenseNumber: license.trim(),
        notes: notes.trim(),
      };
      if (driver) await updateDriver(driver.id, payload);
      else await createDriver(payload);
      toast.success(driver ? 'Data driver berhasil diperbarui' : 'Driver baru berhasil ditambahkan');
      onDone();
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) return onUnauthorized();
      setApiError(err instanceof AdminApiError ? err.message : 'Gagal menyimpan driver.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={[styles.formCard, shadow]}>
      <View style={styles.formHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UserRound size={18} color={T.brand} />
          <Text style={styles.formTitle}>{driver ? `Ubah Data Driver (${driver.name})` : 'Tambah Driver Baru'}</Text>
        </View>
        <TouchableOpacity onPress={onCancel} accessibilityLabel="Tutup formulir">
          <X size={18} color={T.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.formGrid}>
        <FormField label="NAMA LENGKAP *" error={errors.name} style={{ flex: 1, minWidth: 220 }}>
          <TextInput
            style={[adminStyles.input, !!errors.name && adminStyles.inputError]}
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Bambang Pamungkas"
            placeholderTextColor="#64748B"
          />
        </FormField>
        <FormField label="NOMOR WHATSAPP *" error={errors.phone} style={{ flex: 1, minWidth: 220 }}>
          <TextInput
            style={[adminStyles.input, !!errors.phone && adminStyles.inputError]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="081220994455"
            placeholderTextColor="#64748B"
          />
        </FormField>
      </View>

      <View style={styles.formGrid}>
        <FormField label="NOMOR SIM (OPSIONAL)" style={{ flex: 1, minWidth: 220 }}>
          <TextInput
            style={adminStyles.input}
            value={license}
            onChangeText={setLicense}
            placeholder="Contoh: 3172-0491-0021"
            placeholderTextColor="#64748B"
            maxLength={40}
          />
        </FormField>
        <FormField label="CATATAN KUALIFIKASI (OPSIONAL)" style={{ flex: 1, minWidth: 220 }}>
          <TextInput
            style={adminStyles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Mis. Spesialis VIP Corporate, menguasai rute bandara"
            placeholderTextColor="#64748B"
            maxLength={300}
          />
        </FormField>
      </View>

      {apiError ? <ErrorBox message={apiError} /> : null}

      <View style={[adminStyles.row, { justifyContent: 'flex-end', marginTop: 4 }]}>
        <Btn label="Batal" variant="ghost" small onPress={onCancel} />
        <Btn label={driver ? 'Simpan Perubahan' : 'Simpan Driver Baru'} small onPress={submit} loading={busy} />
      </View>
    </Card>
  );
};

// ==========================================
// Sub-Komponen: Kartu Pengemudi (Driver Card)
// ==========================================

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

  // Form Cuti
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
      setError(e instanceof AdminApiError ? e.message : 'Terjadi kesalahan.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    const nextVal = !d.isActive;
    if (
      !(await confirmAction(
        nextVal
          ? `Aktifkan kembali ${d.name}?`
          : `Nonaktifkan ${d.name}? Driver tidak akan dapat dialokasikan pada pesanan baru.`
      ))
    )
      return;
    run(() => updateDriver(d.id, { isActive: nextVal }));
  };

  const addLeave = () => {
    const e: Record<string, string> = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) e.from = 'Tanggal mulai tidak valid.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) e.to = 'Tanggal selesai tidak valid.';
    else if (from && to < from) e.to = 'Tanggal selesai tidak boleh sebelum mulai.';
    if (reason.trim().length < 3) e.reason = 'Isi alasan (min. 3 karakter).';
    setLeaveErrors(e);
    if (Object.keys(e).length) return;

    run(
      () => addDriverTimeOff(d.id, { from, to, reason: reason.trim() }),
      () => {
        setReason('');
        setLeaveOpen(false);
      }
    );
  };

  const removeLeave = async (id: string, label: string) => {
    if (!(await confirmAction(`Hapus jadwal cuti ${label}?`))) return;
    run(() => removeDriverTimeOff(d.id, id));
  };

  const today = todayStr();
  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => {
    const day = addDays(today, i);
    const job = d.upcoming.find((u) => u.startDate <= day && day < u.endDate);
    const off = d.timeOff.find((t) => t.from <= day && day <= t.to);
    const dateObj = new Date(day + 'T00:00:00');
    const dow = DOW_SHORT[dateObj.getDay()];
    return { day, dow, job, off };
  });

  const futureLeave = d.timeOff.filter((t) => t.to >= today);

  // Current active job today
  const activeJobToday = d.upcoming.find((u) => u.startDate <= today && today < u.endDate);
  // Current active leave today
  const activeLeaveToday = d.timeOff.find((t) => t.from <= today && today <= t.to);

  if (editing) {
    return (
      <DriverForm
        driver={d}
        onCancel={() => setEditing(false)}
        onUnauthorized={onUnauthorized}
        onDone={() => {
          setEditing(false);
          onChanged();
        }}
      />
    );
  }

  // Floating Status Pill tone
  const statusBadge =
    d.today === 'BERTUGAS' ? (
      <View style={[styles.statusCapsule, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
        <View style={[styles.statusDot, { backgroundColor: '#0284C7' }]} />
        <Text style={[styles.statusCapsuleText, { color: '#0369A1' }]}>Sedang Bertugas</Text>
      </View>
    ) : d.today === 'CUTI' ? (
      <View style={[styles.statusCapsule, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
        <Text style={[styles.statusCapsuleText, { color: '#B45309' }]}>Cuti Hari Ini</Text>
      </View>
    ) : d.isActive ? (
      <View style={[styles.statusCapsule, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
        <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
        <Text style={[styles.statusCapsuleText, { color: '#047857' }]}>Tersedia Hari Ini</Text>
      </View>
    ) : (
      <View style={[styles.statusCapsule, { backgroundColor: T.surfaceAlt, borderColor: T.border }]}>
        <Text style={[styles.statusCapsuleText, { color: T.muted }]}>Nonaktif</Text>
      </View>
    );

  return (
    <Card style={[styles.card, !d.isActive && { opacity: 0.88 }]}>
      {/* 1. Header Profil & Status Dispatch */}
      <View style={styles.cardHeaderRow}>
        {/* Kolom Kiri: Avatar & Info Pribadi */}
        <View style={styles.driverProfileCol}>
          <Avatar
            name={d.name}
            size={52}
            tone={d.today === 'BERTUGAS' ? 'info' : d.today === 'CUTI' ? 'warn' : d.isActive ? 'success' : 'neutral'}
          />
          <View style={{ flex: 1, minWidth: 200, gap: 3 }}>
            <View style={styles.nameRow}>
              <Text style={styles.driverNameText}>{d.name}</Text>
              {statusBadge}
              <View style={styles.corpBadge}>
                <Text style={styles.corpBadgeText}>INTERNAL ELECTRA</Text>
              </View>
            </View>

            {/* Nomor HP & SIM */}
            <View style={styles.contactRow}>
              <View style={styles.metaItem}>
                <Phone size={13} color="#059669" />
                <Text style={styles.metaItemText}>{d.phone}</Text>
              </View>
              <Text style={{ color: T.borderStrong }}>•</Text>
              <View style={styles.metaItem}>
                <FileText size={13} color={T.muted} />
                <Text style={styles.metaItemText}>{d.licenseNumber ? `SIM-A: ${d.licenseNumber}` : 'SIM-A Aktif'}</Text>
              </View>
              <Text style={{ color: T.borderStrong }}>•</Text>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>★ 4.9</Text>
                <Text style={styles.tripsCountText}>({d.completedCount || 48} trip EV)</Text>
              </View>
            </View>

            {/* Catatan Driver */}
            {d.notes ? (
              <Text style={styles.driverNotesText} numberOfLines={2}>
                <Text style={{ fontWeight: '800', color: T.ink }}>Catatan: </Text>
                {d.notes}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Kolom Kanan: Callout Dispatch Aktif Hari Ini ala Stitch */}
        <View style={styles.dispatchCalloutBox}>
          {d.today === 'BERTUGAS' && activeJobToday ? (
            <View style={styles.dutyCallout}>
              <View style={styles.calloutTitleRow}>
                <View style={styles.pulseBlueDot} />
                <Text style={styles.calloutTitleText}>MISI AKTIF HARI INI</Text>
              </View>
              <Text style={styles.calloutMainText} numberOfLines={1}>
                {activeJobToday.vehicleName}
              </Text>
              <Text style={styles.calloutSubText}>
                #{activeJobToday.inquiryCode} • {activeJobToday.customerName}
              </Text>
            </View>
          ) : d.today === 'CUTI' && activeLeaveToday ? (
            <View style={styles.leaveCallout}>
              <View style={styles.calloutTitleRow}>
                <UserX size={14} color="#D97706" />
                <Text style={[styles.calloutTitleText, { color: '#B45309' }]}>STATUS CUTI TERVERIFIKASI</Text>
              </View>
              <Text style={[styles.calloutMainText, { color: '#78350F' }]}>{activeLeaveToday.reason}</Text>
              <Text style={[styles.calloutSubText, { color: '#92400E' }]}>
                Hingga {fmtDate(activeLeaveToday.to)}
              </Text>
            </View>
          ) : (
            <View style={styles.availableCallout}>
              <View style={styles.calloutTitleRow}>
                <CheckCircle2 size={14} color="#059669" />
                <Text style={[styles.calloutTitleText, { color: '#047857' }]}>STANDBY SIAP PENUGASAN</Text>
              </View>
              <Text style={styles.calloutMainText}>Siap jalan on-demand</Text>
              <Text style={styles.calloutSubText}>Hub Pusat / Depo Operasional</Text>
            </View>
          )}
        </View>
      </View>

      {/* 2. Jadwal Strip 14 Hari ke Depan (Roster Ketersediaan) */}
      <View style={styles.rosterSection}>
        <View style={styles.rosterHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={15} color={T.brand} />
            <Text style={styles.rosterTitle}>ROSTER & KETERSEDIAAN 14 HARI KE DEPAN</Text>
          </View>
          <Text style={styles.rosterMonthHint}>Okt 2026</Text>
        </View>

        {/* 14 Hari Grid */}
        <View style={styles.stripGrid}>
          {strip.map(({ day, dow, job, off }, i) => {
            const isToday = i === 0;
            return (
              <TouchableOpacity
                key={day}
                disabled={!job}
                onPress={() => job && onOpenInquiry(job)}
                style={[
                  styles.stripCell,
                  job && styles.stripCellJob,
                  off && !job && styles.stripCellOff,
                  isToday && styles.stripCellToday,
                ]}
                accessibilityRole={job ? 'button' : 'text'}
                accessibilityLabel={`${fmtDate(day)}: ${
                  job ? `Bertugas ${job.inquiryCode}` : off ? `Cuti ${off.reason}` : 'Standby'
                }`}
              >
                <Text style={[styles.stripDowText, (job || isToday) && { color: '#FFFFFF', opacity: 0.9 }]}>
                  {dow}
                </Text>
                <Text style={[styles.stripNumText, (job || isToday) && { color: '#FFFFFF' }]}>
                  {Number(day.slice(8))}
                </Text>
                <View
                  style={[
                    styles.stripDot,
                    job
                      ? { backgroundColor: '#FFFFFF' }
                      : off
                      ? { backgroundColor: '#F59E0B' }
                      : { backgroundColor: '#CBD5E1' },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legenda Strip */}
        <View style={styles.stripLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSquare, { backgroundColor: T.brand }]} />
            <Text style={styles.legendLabel}>Bertugas / Terjadwal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSquare, { backgroundColor: T.surfaceAlt, borderColor: T.border, borderWidth: 1 }]} />
            <Text style={styles.legendLabel}>Standby / Bebas Tugas</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSquare, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1 }]} />
            <Text style={styles.legendLabel}>Cuti / Izin Disetujui</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSquare, { borderColor: T.brand, borderWidth: 2, backgroundColor: 'transparent' }]} />
            <Text style={styles.legendLabel}>Hari Ini</Text>
          </View>
        </View>
      </View>

      {/* 3. Penugasan Mendatang */}
      {d.upcoming.length > 0 && (
        <View style={styles.upcomingSection}>
          <Text style={styles.sectionSmallLabel}>PENUGASAN MENDATANG ({d.upcoming.length})</Text>
          <View style={{ gap: 6 }}>
            {d.upcoming.slice(0, 3).map((u) => (
              <TouchableOpacity
                key={u.id}
                style={styles.upcomingItem}
                onPress={() => onOpenInquiry(u)}
                accessibilityRole="button"
              >
                <View style={styles.upcomingIconBox}>
                  <Car size={16} color={T.brand} />
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.upcomingCode}>#{u.inquiryCode}</Text>
                    <Text style={styles.upcomingVeh}>{u.vehicleName}</Text>
                  </View>
                  <Text style={styles.upcomingCustomer}>
                    {fmtDate(u.startDate)} – {fmtDate(u.endDate)} • Klien: {u.customerName}
                  </Text>
                </View>
                <View style={styles.upcomingRight}>
                  <Pill label="Terkonfirmasi" tone="success" />
                  <ArrowRight size={15} color={T.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 4. Manajemen Cuti & Izin Libur */}
      <View style={styles.leaveSection}>
        <View style={styles.leaveHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={15} color="#D97706" />
            <Text style={styles.leaveSectionTitle}>Manajemen Cuti & Izin Libur</Text>
          </View>
          {d.isActive && (
            <Btn
              label={leaveOpen ? 'Tutup' : '+ Tambah Cuti'}
              variant="ghost"
              small
              onPress={() => setLeaveOpen((v) => !v)}
            />
          )}
        </View>

        {/* Daftar Cuti Aktif */}
        {futureLeave.map((t) => (
          <View key={t.id} style={styles.leaveItemRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.leaveIconSquare}>
                <UserX size={15} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.leaveDateRange}>
                  {fmtDate(t.from)}
                  {t.to !== t.from ? ` – ${fmtDate(t.to)}` : ''}
                </Text>
                <Text style={styles.leaveReasonText}>Alasan: {t.reason}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteLeaveBtn}
              onPress={() => removeLeave(t.id, fmtDate(t.from))}
              accessibilityLabel="Batalkan cuti"
            >
              <Trash2 size={15} color="#DC2626" />
              <Text style={styles.deleteLeaveText}>Batalkan</Text>
            </TouchableOpacity>
          </View>
        ))}

        {futureLeave.length === 0 && !leaveOpen && (
          <Text style={styles.noLeaveText}>Tidak ada jadwal cuti mendatang untuk driver ini.</Text>
        )}

        {/* Formulir Tambah Cuti Inline */}
        {leaveOpen && (
          <View style={styles.inlineLeaveForm}>
            <View style={styles.leaveInputsRow}>
              <FormField label="DARI TANGGAL" error={leaveErrors.from} style={{ flex: 1, minWidth: 140 }}>
                <DateInput
                  value={from}
                  onChange={setFrom}
                  min={today}
                  error={!!leaveErrors.from}
                  accessibilityLabel="Cuti dari tanggal"
                />
              </FormField>
              <FormField label="SAMPAI TANGGAL" error={leaveErrors.to} style={{ flex: 1, minWidth: 140 }}>
                <DateInput
                  value={to}
                  onChange={setTo}
                  min={from || today}
                  error={!!leaveErrors.to}
                  accessibilityLabel="Cuti sampai tanggal"
                />
              </FormField>
            </View>

            <FormField label="ALASAN CUTI / IZIN" error={leaveErrors.reason}>
              <TextInput
                style={[adminStyles.input, !!leaveErrors.reason && adminStyles.inputError]}
                value={reason}
                onChangeText={setReason}
                placeholder="Contoh: Izin urusan keluarga, sakit terverifikasi"
                placeholderTextColor="#64748B"
                maxLength={120}
              />
            </FormField>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <Btn label="Batal" variant="ghost" small onPress={() => setLeaveOpen(false)} />
              <Btn label="Simpan Cuti" small onPress={addLeave} loading={busy} />
            </View>
          </View>
        )}
      </View>

      {error ? (
        <View style={{ marginTop: 8 }}>
          <ErrorBox message={error} />
        </View>
      ) : null}

      {/* 5. Bilah Tombol Aksi Bawah */}
      <View style={styles.cardBottomRow}>
        <View style={styles.gpsRow}>
          <View style={styles.liveSensorDot} />
          <Text style={styles.gpsText}>GPS Tracking Online • Siap Koordinasi</Text>
        </View>

        <View style={styles.actionsBtnGroup}>
          <Btn
            label="WhatsApp"
            icon={MessageCircle}
            variant="secondary"
            small
            onPress={() => openWhatsAppTo(d.phone, `Halo ${d.name}, terkait jadwal operasional Electra.`)}
          />
          <Btn label="Ubah Profil" icon={Pencil} variant="secondary" small onPress={() => setEditing(true)} />
          <Btn
            label={d.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            variant={d.isActive ? 'danger' : 'secondary'}
            small
            onPress={toggleActive}
            disabled={busy}
          />
        </View>
      </View>
    </Card>
  );
};

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
  // Stat Ribbon (4 Quick Tiles ala Stitch)
  statRibbon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 200,
    padding: 14,
    borderRadius: 14,
    justifyContent: 'space-between',
    gap: 6,
  },
  statCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCardLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.5,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statNum: {
    fontSize: 24,
    fontWeight: '900',
    color: T.ink,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 12,
    color: T.muted,
    fontWeight: '600',
  },
  statPercentText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.muted,
  },
  statSubText: {
    fontSize: 11,
    color: T.muted,
  },

  // Toolbar
  toolbarCard: {
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: T.ink,
    paddingVertical: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Form Driver
  formCard: {
    padding: 18,
    borderRadius: 18,
    borderColor: T.brand,
    borderWidth: 1.5,
    gap: 14,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: T.ink,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Driver Card List
  driverList: {
    gap: 18,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  driverProfileCol: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    gap: 14,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  driverNameText: {
    fontSize: 17,
    fontWeight: '900',
    color: T.ink,
  },
  statusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusCapsuleText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  corpBadge: {
    backgroundColor: T.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
  },
  corpBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: T.muted,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemText: {
    fontSize: 12,
    color: T.inkSoft,
    fontWeight: '600',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D97706',
  },
  tripsCountText: {
    fontSize: 10.5,
    color: '#92400E',
    fontWeight: '600',
  },
  driverNotesText: {
    fontSize: 12,
    color: T.inkSoft,
    lineHeight: 17,
    marginTop: 2,
  },

  // Callout Dispatch Kanan
  dispatchCalloutBox: {
    minWidth: 220,
    maxWidth: 320,
    flexGrow: 1,
  },
  dutyCallout: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  leaveCallout: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  availableCallout: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  calloutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseBlueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0284C7',
  },
  calloutTitleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  calloutMainText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: T.ink,
    marginTop: 2,
  },
  calloutSubText: {
    fontSize: 11,
    color: T.muted,
  },

  // Roster 14 Hari
  rosterSection: {
    gap: 8,
  },
  rosterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rosterTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.5,
  },
  rosterMonthHint: {
    fontSize: 11,
    fontWeight: '800',
    color: T.brand,
  },
  stripGrid: {
    flexDirection: 'row',
    gap: 5,
  },
  stripCell: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 4,
    gap: 2,
  },
  stripCellJob: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  stripCellOff: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  stripCellToday: {
    borderColor: T.brand,
    borderWidth: 2,
  },
  stripDowText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: T.muted,
    textTransform: 'uppercase',
  },
  stripNumText: {
    fontSize: 13,
    fontWeight: '900',
    color: T.ink,
  },
  stripDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  stripLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSquare: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 11,
    color: T.muted,
    fontWeight: '600',
  },

  // Upcoming
  upcomingSection: {
    gap: 6,
    paddingTop: 4,
  },
  sectionSmallLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.5,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surfaceAlt,
  },
  upcomingIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingCode: {
    fontSize: 12,
    fontWeight: '900',
    color: T.brand,
  },
  upcomingVeh: {
    fontSize: 12.5,
    fontWeight: '800',
    color: T.ink,
  },
  upcomingCustomer: {
    fontSize: 11.5,
    color: T.muted,
    marginTop: 1,
  },
  upcomingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Leave Management
  leaveSection: {
    backgroundColor: T.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    gap: 10,
  },
  leaveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaveSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: T.ink,
  },
  leaveItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  leaveIconSquare: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveDateRange: {
    fontSize: 12.5,
    fontWeight: '800',
    color: T.ink,
  },
  leaveReasonText: {
    fontSize: 11.5,
    color: T.muted,
  },
  deleteLeaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  deleteLeaveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  noLeaveText: {
    fontSize: 12,
    color: T.muted,
    fontStyle: 'italic',
  },
  inlineLeaveForm: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  leaveInputsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // Card Bottom Row
  cardBottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveSensorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  gpsText: {
    fontSize: 11.5,
    color: T.muted,
    fontWeight: '600',
  },
  actionsBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
