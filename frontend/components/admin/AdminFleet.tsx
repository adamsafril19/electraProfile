import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import {
  BatteryCharging,
  Car,
  Eye,
  EyeOff,
  Gauge,
  Key,
  PlugZap,
  RefreshCw,
  Search,
  Users,
  Wrench,
  X,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  Sliders,
} from 'lucide-react-native';
import {
  AdminApiError,
  AdminVehicle,
  CalendarData,
  fetchAdminFleet,
  fetchCalendar,
  updateVehicle,
} from '../../services/adminApi';
import { toDateStr, todayStr } from '../../utils/date';
import {
  Btn,
  Card,
  Chip,
  EmptyState,
  ErrorBox,
  FormField,
  IconType,
  Loading,
  PageHeader,
  Pill,
  WarnBox,
  adminStyles,
  confirmAction,
  fmtDate,
  rp,
} from './ui';
import { T, shadow } from './theme';
import { toast } from './feedback';

type VehicleStatus = 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE';
const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Tersedia' },
  { value: 'BOOKED', label: 'Dipesan' },
  { value: 'MAINTENANCE', label: 'Perawatan' },
];

const addDays = (s: string, n: number): string => {
  const [y, m, d] = s.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + n));
};

const digitsOnly = (s: string) => s.replace(/\D/g, '');

export const AdminFleet: React.FC<{ onUnauthorized: () => void }> = ({ onUnauthorized }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'HIDDEN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayStr();
      const [fleet, cal] = await Promise.all([
        fetchAdminFleet(),
        fetchCalendar(today, addDays(today, 60)).catch((e) => {
          if (e instanceof AdminApiError && e.status === 401) throw e;
          return null;
        }),
      ]);
      setVehicles(fleet);
      setCalendar(cal);
      setError(null);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof AdminApiError ? e.message : 'Gagal memuat armada.');
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const replaceVehicle = (v: AdminVehicle) => setVehicles((list) => list.map((x) => (x.id === v.id ? v : x)));

  // Telemetry Calculations
  const totalCount = vehicles.length;
  const activeCount = vehicles.filter((v) => v.isActive).length;
  const hiddenCount = vehicles.filter((v) => !v.isActive).length;
  const availableCount = vehicles.filter((v) => v.isActive && v.status === 'AVAILABLE').length;
  const inUseCount = vehicles.filter((v) => v.isActive && v.status === 'BOOKED').length;
  const maintCount = vehicles.filter((v) => v.status === 'MAINTENANCE').length;

  // Average 30-day occupancy
  const avgOccupancy = useMemo(() => {
    if (!vehicles.length || !calendar) return 0;
    const today = todayStr();
    let totalPct = 0;
    vehicles.forEach((veh) => {
      const mine = (calendar.events || []).filter(
        (e) => e.vehicleId === veh.id && (e.status === 'ACTIVE' || e.status === 'CONFIRMED' || e.status === 'PENDING_WHATSAPP')
      );
      const used = new Set<string>();
      mine.forEach((e) => {
        for (let k = 0; k < 30; k++) {
          const day = addDays(today, k);
          if (e.startDate <= day && day < e.endDate) used.add(day);
        }
      });
      totalPct += Math.round((used.size / 30) * 100);
    });
    return Math.round(totalPct / vehicles.length);
  }, [vehicles, calendar]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vehicles.filter((v) => {
      // Search
      if (q) {
        const text = `${v.brand} ${v.model} ${v.licensePlate}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      // Status filter
      if (statusFilter === 'AVAILABLE') return v.isActive && v.status === 'AVAILABLE';
      if (statusFilter === 'IN_USE') return v.isActive && v.status === 'BOOKED';
      if (statusFilter === 'MAINTENANCE') return v.status === 'MAINTENANCE';
      if (statusFilter === 'HIDDEN') return !v.isActive;
      return true;
    });
  }, [vehicles, statusFilter, searchQuery]);

  return (
    <View style={{ gap: 18 }}>
      {/* 1. Hero Command Header */}
      <PageHeader
        tag="MANAJEMEN ARMADA (EV) • Real-Time Fleet Registry"
        title="Armada Mobil Listrik (EV)"
        subtitle={
          vehicles.length
            ? `Kelola inventaris armada listrik, telemetri baterai, status okupansi 30 hari, serta pengaturan tarif sewa publik. Total ${totalCount} unit terdaftar • ${activeCount} unit aktif siap disewa.`
            : 'Kelola unit kendaraan, status, spesifikasi baterai, dan tarif sewa.'
        }
        right={
          <>
            <Btn label="Muat ulang" icon={RefreshCw} variant="secondary" small onPress={load} />
            <Btn
              label="+ Tambah Armada Baru"
              icon={Car}
              variant="primary"
              small
              onPress={() => toast.info('Fitur pendaftaran mobil baru akan segera hadir.')}
            />
          </>
        }
      />

      {/* Warning Box Kebijakan Tarif Real-Time ala Stitch */}
      <View style={styles.policyBanner}>
        <View style={styles.policyIconBox}>
          <Info size={20} color="#D97706" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.policyTitle}>PERHATIAN KEBIJAKAN TARIF REAL-TIME:</Text>
          <Text style={styles.policyDesc}>
            Setiap pembaruan tarif sewa (Lepas Kunci maupun Dengan Sopir) dan jaminan deposit akan langsung berlaku seketika
            pada portal booking publik Electra untuk reservasi baru.
          </Text>
        </View>
      </View>

      {/* 2. Fleet Telemetry Ribbon / Quick Stat Counter (5 Tiles ala Stitch) */}
      <View style={styles.telemetryGrid}>
        {/* Tile 1: Total Unit */}
        <Card style={styles.telemetryCard}>
          <View style={styles.telemetryHead}>
            <Text style={styles.telemetryLabel}>TOTAL UNIT</Text>
            <Car size={18} color={T.brand} />
          </View>
          <View style={styles.telemetryValueRow}>
            <Text style={styles.telemetryValue}>{totalCount}</Text>
            <Text style={styles.telemetryUnit}>Kendaraan EV</Text>
          </View>
        </Card>

        {/* Tile 2: Siap Sewa */}
        <Card style={styles.telemetryCard}>
          <View style={styles.telemetryHead}>
            <Text style={styles.telemetryLabel}>SIAP SEWA</Text>
            <View style={styles.pulseGreenDot} />
          </View>
          <View style={styles.telemetryValueRow}>
            <Text style={[styles.telemetryValue, { color: '#059669' }]}>{availableCount}</Text>
            <View style={[styles.statPill, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.statPillText, { color: '#059669' }]}>
                {totalCount ? Math.round((availableCount / totalCount) * 100) : 0}%
              </Text>
            </View>
          </View>
        </Card>

        {/* Tile 3: Sedang Jalan */}
        <Card style={styles.telemetryCard}>
          <View style={styles.telemetryHead}>
            <Text style={styles.telemetryLabel}>SEDANG DISEWA</Text>
            <Key size={17} color="#0284C7" />
          </View>
          <View style={styles.telemetryValueRow}>
            <Text style={[styles.telemetryValue, { color: '#0284C7' }]}>{inUseCount}</Text>
            <View style={[styles.statPill, { backgroundColor: '#F0F9FF' }]}>
              <Text style={[styles.statPillText, { color: '#0284C7' }]}>
                {totalCount ? Math.round((inUseCount / totalCount) * 100) : 0}%
              </Text>
            </View>
          </View>
        </Card>

        {/* Tile 4: Servis / Perawatan */}
        <Card style={styles.telemetryCard}>
          <View style={styles.telemetryHead}>
            <Text style={styles.telemetryLabel}>PERAWATAN</Text>
            <Wrench size={17} color="#D97706" />
          </View>
          <View style={styles.telemetryValueRow}>
            <Text style={[styles.telemetryValue, { color: '#D97706' }]}>{maintCount}</Text>
            <View style={[styles.statPill, { backgroundColor: '#FFFBEB' }]}>
              <Text style={[styles.statPillText, { color: '#B45309' }]}>
                {totalCount ? Math.round((maintCount / totalCount) * 100) : 0}%
              </Text>
            </View>
          </View>
        </Card>

        {/* Tile 5: Rata-Rata Okupansi */}
        <Card style={styles.telemetryCard}>
          <View style={styles.telemetryHead}>
            <Text style={styles.telemetryLabel}>RATA-RATA OKUPANSI</Text>
            <Gauge size={17} color="#0D9488" />
          </View>
          <View style={styles.telemetryValueRow}>
            <Text style={[styles.telemetryValue, { color: '#0D9488' }]}>{avgOccupancy}%</Text>
            <Text style={styles.telemetryUnit}>30 Hari ke Depan</Text>
          </View>
        </Card>
      </View>

      {/* 3. Toolbar Pencarian & Filter Status */}
      <Card style={styles.toolbarCard}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={17} color={T.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari berdasarkan merk, model, atau nomor plat..."
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

        <View style={styles.chipFilterRow}>
          <Chip label={`Semua (${totalCount})`} active={statusFilter === 'ALL'} onPress={() => setStatusFilter('ALL')} />
          <Chip
            label={`Tersedia (${availableCount})`}
            active={statusFilter === 'AVAILABLE'}
            onPress={() => setStatusFilter('AVAILABLE')}
            tone="success"
          />
          <Chip
            label={`Sedang Disewa (${inUseCount})`}
            active={statusFilter === 'IN_USE'}
            onPress={() => setStatusFilter('IN_USE')}
            tone="info"
          />
          <Chip
            label={`Perawatan (${maintCount})`}
            active={statusFilter === 'MAINTENANCE'}
            onPress={() => setStatusFilter('MAINTENANCE')}
            tone="warn"
          />
          <Chip
            label={`Disembunyikan (${hiddenCount})`}
            active={statusFilter === 'HIDDEN'}
            onPress={() => setStatusFilter('HIDDEN')}
            tone="neutral"
          />
        </View>
      </Card>

      {/* 4. Daftar Kartu Armada Responsif (Sleek Horizontal ala Stitch di Layar Lebar) */}
      {loading && vehicles.length === 0 ? (
        <Loading />
      ) : error && vehicles.length === 0 ? (
        <ErrorBox message={error} onRetry={load} />
      ) : filteredVehicles.length === 0 ? (
        <Card>
          <EmptyState
            title="Tidak ada armada yang cocok"
            text={searchQuery ? 'Coba ubah kata kunci pencarian atau reset filter status.' : 'Belum ada armada terdaftar.'}
          />
        </Card>
      ) : (
        <View style={styles.vehicleList}>
          {filteredVehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              calendar={calendar}
              isDesktop={isDesktop}
              onSaved={replaceVehicle}
              onUnauthorized={onUnauthorized}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ==========================================
// Sub-Komponen: Kartu Armada (Vehicle Card)
// ==========================================

const VehicleCard: React.FC<{
  vehicle: AdminVehicle;
  calendar: CalendarData | null;
  isDesktop: boolean;
  onSaved: (v: AdminVehicle) => void;
  onUnauthorized: () => void;
}> = ({ vehicle, calendar, isDesktop, onSaved, onUnauthorized }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const [rateInputs, setRateInputs] = useState(() =>
    Object.fromEntries(vehicle.rates.map((r) => [r.serviceType, { daily: String(r.dailyRate), deposit: String(r.depositAmount) }]))
  );
  const [rateErrors, setRateErrors] = useState<Record<string, string>>({});

  const today = todayStr();
  const mine = (calendar?.events || [])
    .filter((e) => e.vehicleId === vehicle.id && (e.status === 'ACTIVE' || e.status === 'CONFIRMED' || e.status === 'PENDING_WHATSAPP'))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const inUse = mine.find((e) => e.status === 'ACTIVE' || (e.startDate <= today && today < e.endDate && e.status === 'CONFIRMED'));
  const next = mine.find((e) => e.startDate > today && e !== inUse);

  // Okupansi 30 Hari
  const occupiedDays = useMemo(() => {
    const horizon = 30;
    const used = new Set<string>();
    for (const e of mine) {
      for (let k = 0; k < horizon; k++) {
        const day = addDays(today, k);
        if (e.startDate <= day && day < e.endDate) used.add(day);
      }
    }
    return used.size;
  }, [mine, today]);

  const occupancyPct = Math.round((occupiedDays / 30) * 100);

  const dirty = vehicle.rates.some((r) => {
    const inp = rateInputs[r.serviceType];
    return inp.daily !== String(r.dailyRate) || inp.deposit !== String(r.depositAmount);
  });

  const call = async (fn: () => Promise<AdminVehicle>, onOk?: () => void) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      onSaved(await fn());
      toast.success('Perubahan armada berhasil disimpan');
      onOk?.();
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof AdminApiError ? e.message : 'Gagal menyimpan perubahan.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    const nextVal = !vehicle.isActive;
    const msg = nextVal
      ? `Tampilkan ${vehicle.brand} ${vehicle.model} kembali di situs publik?`
      : `Sembunyikan ${vehicle.brand} ${vehicle.model} dari situs publik? Pelanggan tidak bisa memesannya lagi.`;
    if (!(await confirmAction(msg))) return;
    call(() => updateVehicle(vehicle.id, { isActive: nextVal }));
  };

  const changeStatus = async (status: VehicleStatus) => {
    if (
      status === 'MAINTENANCE' &&
      inUse &&
      !(await confirmAction(`${vehicle.brand} ${vehicle.model} sedang disewa (${inUse.inquiryCode}). Tetap ubah ke Perawatan?`))
    ) {
      return;
    }
    call(() => updateVehicle(vehicle.id, { status }));
  };

  const saveRates = () => {
    const errs: Record<string, string> = {};
    const payload = vehicle.rates.map((r) => {
      const inp = rateInputs[r.serviceType];
      const daily = Number(inp.daily);
      const deposit = Number(inp.deposit === '' ? NaN : inp.deposit);
      if (!inp.daily || !Number.isInteger(daily) || daily <= 0) errs[`${r.serviceType}-daily`] = 'Isi tarif lebih dari 0.';
      else if (daily > 100_000_000) errs[`${r.serviceType}-daily`] = 'Tarif terlalu besar.';
      if (!Number.isInteger(deposit) || deposit < 0) errs[`${r.serviceType}-deposit`] = 'Isi deposit (0 jika tidak ada).';
      return { serviceType: r.serviceType, dailyRate: daily, depositAmount: deposit };
    });
    setRateErrors(errs);
    if (Object.keys(errs).length) return;
    call(() => updateVehicle(vehicle.id, { rates: payload }), () => setSaved(true));
  };

  const lepas = vehicle.rates.find((r) => r.serviceType === 'LEPAS_KUNCI');
  const sopir = vehicle.rates.find((r) => r.serviceType === 'DENGAN_DRIVER');

  // Floating Status Pill
  const statusPill = !vehicle.isActive ? (
    <View style={[styles.floatingPill, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
      <Text style={[styles.floatingPillText, { color: '#64748B' }]}>⚪ Disembunyikan</Text>
    </View>
  ) : vehicle.status === 'MAINTENANCE' ? (
    <View style={[styles.floatingPill, { backgroundColor: '#FEF3C7' }]}>
      <View style={[styles.floatingDot, { backgroundColor: '#F59E0B' }]} />
      <Text style={[styles.floatingPillText, { color: '#B45309' }]}>Perawatan / Inspeksi</Text>
    </View>
  ) : inUse ? (
    <View style={[styles.floatingPill, { backgroundColor: '#E0F2FE' }]}>
      <View style={[styles.floatingDot, { backgroundColor: '#0284C7' }]} />
      <Text style={[styles.floatingPillText, { color: '#0369A1' }]}>Sedang Disewa</Text>
    </View>
  ) : (
    <View style={[styles.floatingPill, { backgroundColor: '#DCFCE7' }]}>
      <View style={[styles.floatingDot, { backgroundColor: '#10B981' }]} />
      <Text style={[styles.floatingPillText, { color: '#15803D' }]}>Tersedia</Text>
    </View>
  );

  return (
    <Card style={[styles.vehicleCard, !vehicle.isActive && { opacity: 0.88 }]}>
      <View style={[styles.cardHeadRow, isDesktop ? { flexDirection: 'row' } : { flexDirection: 'column' }]}>
        {/* Gambar & Plate Float */}
        <View style={isDesktop ? styles.imageWrapDesktop : styles.imageWrapMobile}>
          {vehicle.imageUrl && !imgFailed ? (
            <Image
              source={{ uri: vehicle.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImgFailed(true)}
              accessibilityLabel={`${vehicle.brand} ${vehicle.model}`}
            />
          ) : (
            <View style={styles.imageFallbackWrap}>
              <Car size={36} color={T.muted} />
              <Text style={styles.imageFallbackText}>{vehicle.brand}</Text>
            </View>
          )}
          {/* Status Mengambang Kiri Atas */}
          <View style={styles.statusFloatWrap}>{statusPill}</View>
          {/* Plat Nomor Kiri Bawah */}
          <View style={styles.plateFloatWrap}>
            <Text style={styles.plateFloatText}>{vehicle.licensePlate}</Text>
          </View>
        </View>

        {/* Kolom Informasi & Spesifikasi */}
        <View style={styles.cardInfoCol}>
          {/* Baris Atas: Brand, Model, & Tarif Harian */}
          <View style={styles.titlePriceRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.brandRow}>
                <View style={styles.brandBadge}>
                  <Text style={styles.brandBadgeText}>{vehicle.brand.toUpperCase()}</Text>
                </View>
                <Text style={styles.vehicleIdText}>• EV-ID #{vehicle.slug.toUpperCase()}</Text>
              </View>
              <Text style={styles.modelTitle}>{vehicle.model}</Text>
            </View>

            {lepas && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>TARIF LEPAS KUNCI</Text>
                <Text style={styles.priceValue}>
                  {rp(lepas.dailyRate)}
                  <Text style={styles.pricePerDay}> / hari</Text>
                </Text>
              </View>
            )}
          </View>

          {/* Grid Spesifikasi EV (4 Kolom ala Stitch) */}
          <View style={styles.specGrid}>
            <View style={styles.specBox}>
              <View style={styles.specLabelRow}>
                <Gauge size={13} color={T.muted} />
                <Text style={styles.specBoxLabel}>Jarak Tempuh</Text>
              </View>
              <Text style={styles.specBoxValue}>
                {vehicle.specs.rangeCltcKm || vehicle.specs.rangeWltpKm || 300} km{' '}
                <Text style={styles.specBoxSub}>(CLTC)</Text>
              </Text>
            </View>

            <View style={styles.specBox}>
              <View style={styles.specLabelRow}>
                <BatteryCharging size={13} color={T.muted} />
                <Text style={styles.specBoxLabel}>Kapasitas Baterai</Text>
              </View>
              <Text style={styles.specBoxValue}>
                {vehicle.specs.batteryCapacityKwh} kWh <Text style={styles.specBoxSub}>Blade</Text>
              </Text>
            </View>

            <View style={styles.specBox}>
              <View style={styles.specLabelRow}>
                <Users size={13} color={T.muted} />
                <Text style={styles.specBoxLabel}>Kapasitas</Text>
              </View>
              <Text style={styles.specBoxValue}>{vehicle.specs.seatingCapacity} Kursi</Text>
            </View>

            <View style={styles.specBox}>
              <View style={styles.specLabelRow}>
                <PlugZap size={13} color={T.muted} />
                <Text style={styles.specBoxLabel}>Port Charging</Text>
              </View>
              <Text style={styles.specBoxValue} numberOfLines={1}>
                {String(vehicle.specs.portType).replace('_', '/')}
              </Text>
            </View>
          </View>

          {/* Jadwal Terdekat & Bar Okupansi 30 Hari */}
          <View style={styles.scheduleOccupancyRow}>
            <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={15} color={inUse ? '#0284C7' : '#059669'} />
                <Text style={styles.scheduleStatusText}>
                  {inUse
                    ? `Sedang disewa ${inUse.customerName} (#${inUse.inquiryCode})`
                    : next
                    ? `Bebas tugas hingga ${fmtDate(next.startDate)}`
                    : 'Bebas tugas (tidak ada jadwal 60 hari)'}
                </Text>
              </View>
              <Text style={styles.scheduleSubText}>
                {inUse
                  ? `Estimasi kembali: ${fmtDate(inUse.endDate)}`
                  : next
                  ? `Booking berikutnya: #${next.inquiryCode} (${next.customerName})`
                  : 'Armada siap menerima pesanan sewa baru.'}
              </Text>
            </View>

            {calendar && (
              <View style={styles.occupancyContainer}>
                <View style={styles.occupancyTextRow}>
                  <Text style={styles.occupancyLabel}>Okupansi 30 Hari</Text>
                  <Text style={styles.occupancyValueText}>
                    {occupancyPct}% <Text style={styles.occupancyDaysText}>({occupiedDays}/30 hari)</Text>
                  </Text>
                </View>
                <View style={styles.occupancyTrack}>
                  <View
                    style={[
                      styles.occupancyFill,
                      {
                        width: `${occupancyPct}%`,
                        backgroundColor: occupancyPct >= 70 ? '#10B981' : occupancyPct >= 30 ? T.brand : '#94A3B8',
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Baris Kontrol Bawah: Status Chips & Tombol Visibilitas/Tarif */}
          <View style={styles.cardActionsRow}>
            {/* Status Chips */}
            <View style={styles.statusChipsGroup}>
              {STATUS_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={[
                    styles.statusChipBtn,
                    vehicle.status === o.value && styles.statusChipBtnActive,
                    vehicle.status === o.value && o.value === 'AVAILABLE' && { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
                    vehicle.status === o.value && o.value === 'BOOKED' && { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
                    vehicle.status === o.value && o.value === 'MAINTENANCE' && { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
                  ]}
                  onPress={vehicle.status === o.value || busy ? undefined : () => changeStatus(o.value)}
                  disabled={busy}
                >
                  {vehicle.status === o.value && (
                    <View
                      style={[
                        styles.chipDot,
                        { backgroundColor: o.value === 'AVAILABLE' ? '#10B981' : o.value === 'BOOKED' ? '#0284C7' : '#F59E0B' },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.statusChipText,
                      vehicle.status === o.value && {
                        color: o.value === 'AVAILABLE' ? '#047857' : o.value === 'BOOKED' ? '#0369A1' : '#B45309',
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Aksi Sembunyikan & Atur Tarif */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Btn
                label={vehicle.isActive ? 'Tampil di Situs' : 'Disembunyikan'}
                icon={vehicle.isActive ? Eye : EyeOff}
                variant={vehicle.isActive ? 'secondary' : 'danger'}
                small
                onPress={toggleActive}
                disabled={busy}
              />
              <Btn
                label={editing ? 'Tutup Tarif' : 'Atur Tarif & Jaminan'}
                icon={Sliders}
                variant={editing ? 'ghost' : 'primary'}
                small
                onPress={() => setEditing((v) => !v)}
              />
            </View>
          </View>
        </View>
      </View>

      {/* 5. FORMULIR EDITOR TARIF SEWA & JAMINAN (EXPANDED ACCORDION ala Stitch) */}
      {editing && (
        <View style={styles.editorAccordion}>
          <View style={styles.editorHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Wrench size={18} color={T.brand} />
              <Text style={styles.editorTitle}>Editor Kebijakan Tarif & Jaminan Deposit ({vehicle.licensePlate})</Text>
            </View>
            <View style={styles.savedSyncBadge}>
              <CheckCircle2 size={13} color="#059669" />
              <Text style={styles.savedSyncText}>Tersimpan di PostgreSQL (Live Sync)</Text>
            </View>
          </View>

          <View style={styles.editorColumnsRow}>
            {/* Kolom 1: Sewa Lepas Kunci */}
            <View style={styles.editorCardCol}>
              <View style={styles.editorColHeader}>
                <Text style={styles.editorColTitle}>TARIF SEWA LEPAS KUNCI (24 JAM)</Text>
                <Key size={16} color={T.brand} />
              </View>

              <FormField
                label="TARIF POKOK PER HARI (RP)"
                error={rateErrors['LEPAS_KUNCI-daily']}
                hint={rateInputs['LEPAS_KUNCI']?.daily ? rp(Number(rateInputs['LEPAS_KUNCI'].daily)) : undefined}
              >
                <TextInput
                  style={[adminStyles.input, !!rateErrors['LEPAS_KUNCI-daily'] && adminStyles.inputError]}
                  value={rateInputs['LEPAS_KUNCI']?.daily}
                  onChangeText={(t) =>
                    setRateInputs((p) => ({
                      ...p,
                      LEPAS_KUNCI: { ...p.LEPAS_KUNCI, daily: digitsOnly(t) },
                    }))
                  }
                  keyboardType="number-pad"
                  placeholder="800000"
                />
              </FormField>

              <FormField
                label="DEPOSIT / UANG JAMINAN (RP)"
                error={rateErrors['LEPAS_KUNCI-deposit']}
                hint={rateInputs['LEPAS_KUNCI']?.deposit ? rp(Number(rateInputs['LEPAS_KUNCI'].deposit)) : undefined}
              >
                <TextInput
                  style={[adminStyles.input, !!rateErrors['LEPAS_KUNCI-deposit'] && adminStyles.inputError]}
                  value={rateInputs['LEPAS_KUNCI']?.deposit}
                  onChangeText={(t) =>
                    setRateInputs((p) => ({
                      ...p,
                      LEPAS_KUNCI: { ...p.LEPAS_KUNCI, deposit: digitsOnly(t) },
                    }))
                  }
                  keyboardType="number-pad"
                  placeholder="500000"
                />
              </FormField>
              <Text style={styles.rateHintText}>Jaminan refundable setelah unit dikembalikan utuh dan selesai dicek tim depot.</Text>
            </View>

            {/* Kolom 2: Sewa Dengan Sopir */}
            <View style={styles.editorCardCol}>
              <View style={styles.editorColHeader}>
                <Text style={[styles.editorColTitle, { color: '#007589' }]}>TARIF SEWA DENGAN SOPIR (12 JAM)</Text>
                <Users size={16} color="#007589" />
              </View>

              <FormField
                label="TARIF ALL-IN DRIVER PER HARI (RP)"
                error={rateErrors['DENGAN_DRIVER-daily']}
                hint={rateInputs['DENGAN_DRIVER']?.daily ? rp(Number(rateInputs['DENGAN_DRIVER'].daily)) : undefined}
              >
                <TextInput
                  style={[adminStyles.input, !!rateErrors['DENGAN_DRIVER-daily'] && adminStyles.inputError]}
                  value={rateInputs['DENGAN_DRIVER']?.daily}
                  onChangeText={(t) =>
                    setRateInputs((p) => ({
                      ...p,
                      DENGAN_DRIVER: { ...p.DENGAN_DRIVER, daily: digitsOnly(t) },
                    }))
                  }
                  keyboardType="number-pad"
                  placeholder="1150000"
                />
              </FormField>

              <FormField
                label="DEPOSIT / JAMINAN MINIMAL (RP)"
                error={rateErrors['DENGAN_DRIVER-deposit']}
                hint={rateInputs['DENGAN_DRIVER']?.deposit ? rp(Number(rateInputs['DENGAN_DRIVER'].deposit)) : undefined}
              >
                <TextInput
                  style={[adminStyles.input, !!rateErrors['DENGAN_DRIVER-deposit'] && adminStyles.inputError]}
                  value={rateInputs['DENGAN_DRIVER']?.deposit}
                  onChangeText={(t) =>
                    setRateInputs((p) => ({
                      ...p,
                      DENGAN_DRIVER: { ...p.DENGAN_DRIVER, deposit: digitsOnly(t) },
                    }))
                  }
                  keyboardType="number-pad"
                  placeholder="300000"
                />
              </FormField>
              <Text style={styles.rateHintText}>Deposit pengikat booking untuk alokasi supir terverifikasi.</Text>
            </View>
          </View>

          {/* Tombol Aksi Editor */}
          <View style={styles.editorActionRow}>
            <Btn label="Batal" variant="ghost" small onPress={() => setEditing(false)} />
            <Btn label="Simpan Tarif Baru" variant="primary" small onPress={saveRates} loading={busy} disabled={!dirty} />
          </View>
        </View>
      )}

      {error ? (
        <View style={{ padding: 12 }}>
          <ErrorBox message={error} />
        </View>
      ) : null}
    </Card>
  );
};

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
  // Policy Banner
  policyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
  },
  policyIconBox: {
    marginTop: 2,
  },
  policyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  policyDesc: {
    fontSize: 12.5,
    color: '#78350F',
    lineHeight: 18,
  },

  // Telemetry Grid
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  telemetryCard: {
    flexGrow: 1,
    flexBasis: 170,
    padding: 14,
    borderRadius: 14,
    justifyContent: 'space-between',
  },
  telemetryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  telemetryLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.5,
  },
  telemetryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 8,
  },
  telemetryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: T.ink,
    letterSpacing: -0.5,
  },
  telemetryUnit: {
    fontSize: 12,
    color: T.muted,
    fontWeight: '600',
  },
  pulseGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Toolbar & Search
  toolbarCard: {
    padding: 14,
    gap: 12,
    borderRadius: 14,
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
  chipFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Daftar Armada
  vehicleList: {
    gap: 18,
  },
  vehicleCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 18,
  },
  cardHeadRow: {
    width: '100%',
  },
  imageWrapDesktop: {
    width: 300,
    height: '100%',
    minHeight: 220,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  imageWrapMobile: {
    width: '100%',
    height: 190,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallbackWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imageFallbackText: {
    fontSize: 16,
    fontWeight: '900',
    color: T.muted,
  },
  statusFloatWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    ...shadow,
  },
  floatingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  floatingPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  plateFloatWrap: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(6, 34, 58, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  plateFloatText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Kolom Informasi Kartu
  cardInfoCol: {
    flex: 1,
    padding: 18,
    gap: 12,
    justifyContent: 'space-between',
  },
  titlePriceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandBadge: {
    backgroundColor: T.brandSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  brandBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: T.brand,
    letterSpacing: 0.8,
  },
  vehicleIdText: {
    fontSize: 11,
    color: T.muted,
    fontWeight: '600',
  },
  modelTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: T.ink,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: T.brand,
  },
  pricePerDay: {
    fontSize: 12,
    color: T.muted,
    fontWeight: '600',
  },

  // Grid Spesifikasi (4 Kolom)
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specBox: {
    flexGrow: 1,
    flexBasis: 120,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
  },
  specLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specBoxLabel: {
    fontSize: 10.5,
    color: T.muted,
    fontWeight: '600',
  },
  specBoxValue: {
    fontSize: 13,
    fontWeight: '800',
    color: T.ink,
  },
  specBoxSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: T.muted,
  },

  // Jadwal & Okupansi
  scheduleOccupancyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: T.surfaceAlt,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  scheduleStatusText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: T.ink,
  },
  scheduleSubText: {
    fontSize: 11.5,
    color: T.muted,
  },
  occupancyContainer: {
    width: 220,
    gap: 4,
  },
  occupancyTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  occupancyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.muted,
  },
  occupancyValueText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: T.ink,
  },
  occupancyDaysText: {
    fontSize: 10.5,
    color: T.muted,
  },
  occupancyTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  occupancyFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Kontrol Aksi Bawah
  cardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 4,
  },
  statusChipsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surfaceAlt,
  },
  statusChipBtnActive: {
    ...shadow,
  },
  statusChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: T.inkSoft,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Editor Accordion
  editorAccordion: {
    backgroundColor: T.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: T.border,
    padding: 16,
    gap: 14,
  },
  editorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: T.ink,
  },
  savedSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  savedSyncText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  editorColumnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  editorCardCol: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  editorColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  editorColTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: T.brand,
    letterSpacing: 0.5,
  },
  rateHintText: {
    fontSize: 11,
    color: T.muted,
    fontStyle: 'italic',
  },
  editorActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
