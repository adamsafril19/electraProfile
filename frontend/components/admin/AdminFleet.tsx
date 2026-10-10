import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BatteryCharging, Eye, EyeOff, Gauge, PlugZap, RefreshCw, Users, Wrench } from 'lucide-react-native';
import {
  AdminApiError,
  AdminVehicle,
  CalendarData,
  fetchAdminFleet,
  fetchCalendar,
  updateVehicle,
} from '../../services/adminApi';
import { toDateStr, todayStr } from '../../utils/date';
import { Btn, Card, Chip, EmptyState, ErrorBox, FormField, IconType, Loading, PageHeader, Pill, WarnBox, adminStyles, confirmAction, fmtDate, rp } from './ui';
import { T } from './theme';
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

export const AdminFleet: React.FC<{ onUnauthorized: () => void }> = ({ onUnauthorized }) => {
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayStr();
      // Jadwal dipakai untuk status pemakaian; kegagalannya tidak boleh menyembunyikan daftar armada
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

  const activeCount = vehicles.filter((v) => v.isActive).length;

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Armada"
        subtitle={vehicles.length ? `${vehicles.length} unit • ${activeCount} tampil di situs` : 'Kelola unit, status, dan tarif sewa.'}
        right={<Btn label="Muat ulang" icon={RefreshCw} variant="secondary" small onPress={load} />}
      />

      <WarnBox message="Perubahan tarif langsung berlaku untuk reservasi baru dan tampil di situs. Reservasi yang sudah masuk tidak berubah isinya, tetapi estimasi nilainya mengikuti tarif terbaru." />

      {loading && vehicles.length === 0 ? (
        <Loading />
      ) : error && vehicles.length === 0 ? (
        <ErrorBox message={error} onRetry={load} />
      ) : vehicles.length === 0 ? (
        <Card>
          <EmptyState title="Belum ada armada" />
        </Card>
      ) : (
        <View style={styles.grid}>
          {vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} calendar={calendar} onSaved={replaceVehicle} onUnauthorized={onUnauthorized} />
          ))}
        </View>
      )}
    </View>
  );
};

const digitsOnly = (s: string) => s.replace(/\D/g, '');

const VehicleCard: React.FC<{
  vehicle: AdminVehicle;
  calendar: CalendarData | null;
  onSaved: (v: AdminVehicle) => void;
  onUnauthorized: () => void;
}> = ({ vehicle, calendar, onSaved, onUnauthorized }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  // Nilai tarif disimpan sebagai teks agar kolom bisa dikosongkan saat mengetik
  const [rateInputs, setRateInputs] = useState(() =>
    Object.fromEntries(vehicle.rates.map((r) => [r.serviceType, { daily: String(r.dailyRate), deposit: String(r.depositAmount) }]))
  );
  const [rateErrors, setRateErrors] = useState<Record<string, string>>({});
  const [imgFailed, setImgFailed] = useState(false);

  const today = todayStr();
  const mine = (calendar?.events || [])
    .filter((e) => e.vehicleId === vehicle.id && (e.status === 'ACTIVE' || e.status === 'CONFIRMED' || e.status === 'PENDING_WHATSAPP'))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const inUse = mine.find((e) => e.status === 'ACTIVE' || (e.startDate <= today && today < e.endDate && e.status === 'CONFIRMED'));
  const next = mine.find((e) => e.startDate > today && e !== inUse);

  // Okupansi: persentase hari terpakai dalam 30 hari ke depan (reservasi yang belum dibatalkan)
  const occupiedDays = (() => {
    const horizon = 30;
    const used = new Set<string>();
    for (const e of mine) {
      for (let k = 0; k < horizon; k++) {
        const day = addDays(today, k);
        if (e.startDate <= day && day < e.endDate) used.add(day);
      }
    }
    return used.size;
  })();
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
      toast.success('Perubahan armada disimpan');
      onOk?.();
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof AdminApiError ? e.message : 'Gagal menyimpan perubahan.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    const next = !vehicle.isActive;
    const msg = next
      ? `Tampilkan ${vehicle.brand} ${vehicle.model} kembali di situs?`
      : `Sembunyikan ${vehicle.brand} ${vehicle.model} dari situs? Pelanggan tidak bisa memesannya lagi.`;
    if (!(await confirmAction(msg))) return;
    call(() => updateVehicle(vehicle.id, { isActive: next }));
  };

  const changeStatus = async (status: VehicleStatus) => {
    if (status === 'MAINTENANCE' && inUse && !(await confirmAction(`${vehicle.brand} ${vehicle.model} sedang disewa (${inUse.inquiryCode}). Tetap ubah ke Perawatan?`))) return;
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
  const statusPill = !vehicle.isActive ? (
    <Pill label="Disembunyikan" tone="neutral" />
  ) : vehicle.status === 'MAINTENANCE' ? (
    <Pill label="Perawatan" tone="warn" />
  ) : inUse ? (
    <Pill label="Sedang disewa" tone="info" />
  ) : (
    <Pill label="Tersedia" tone="success" />
  );

  return (
    <Card style={[styles.card, !vehicle.isActive && { opacity: 0.88 }]}>
      <View style={styles.imageWrap}>
        {vehicle.imageUrl && !imgFailed ? (
          <Image source={{ uri: vehicle.imageUrl }} style={styles.image} resizeMode="contain" onError={() => setImgFailed(true)} accessibilityLabel={`${vehicle.brand} ${vehicle.model}`} />
        ) : (
          <Text style={styles.imageFallback}>{vehicle.brand}</Text>
        )}
        <View style={styles.statusFloat}>{statusPill}</View>
      </View>

      <View style={styles.body}>
        <Text style={styles.brand}>{vehicle.brand.toUpperCase()}</Text>
        <Text style={styles.model}>{vehicle.model}</Text>
        <Text style={adminStyles.muted}>{vehicle.licensePlate}</Text>

        <View style={styles.specRow}>
          <Spec icon={Gauge} text={`${vehicle.specs.rangeCltcKm} km`} />
          <Spec icon={BatteryCharging} text={`${vehicle.specs.batteryCapacityKwh} kWh`} />
          <Spec icon={Users} text={`${vehicle.specs.seatingCapacity} kursi`} />
          <Spec icon={PlugZap} text={String(vehicle.specs.portType).replace('_', '/')} />
        </View>

        {lepas && (
          <Text style={styles.price}>
            {rp(lepas.dailyRate)}
            <Text style={styles.priceUnit}> / hari • lepas kunci</Text>
          </Text>
        )}

        <View style={styles.usage}>
          {inUse ? (
            <Text style={styles.usageText}>
              Dipakai {inUse.customerName} hingga {fmtDate(inUse.endDate)}
            </Text>
          ) : next ? (
            <Text style={styles.usageText}>
              Berikutnya: {fmtDate(next.startDate)} – {fmtDate(next.endDate)} ({next.customerName})
            </Text>
          ) : (
            <Text style={styles.usageText}>{calendar ? 'Tidak ada jadwal 60 hari ke depan' : 'Jadwal tidak tersedia'}</Text>
          )}
        </View>

        {calendar && (
          <View style={styles.occWrap} accessibilityLabel={`Okupansi 30 hari ke depan ${occupancyPct} persen`}>
            <View style={styles.occHead}>
              <Text style={styles.occLabel}>Okupansi 30 hari ke depan</Text>
              <Text style={styles.occValue}>
                {occupancyPct}% <Text style={styles.occSub}>({occupiedDays}/30 hari)</Text>
              </Text>
            </View>
            <View style={styles.occTrack}>
              <View style={[styles.occFill, { width: `${occupancyPct}%`, backgroundColor: occupancyPct >= 70 ? T.success : occupancyPct >= 30 ? T.accent : '#94A3B8' }]} />
            </View>
          </View>
        )}

        <Text style={[adminStyles.label, { marginTop: 14 }]}>STATUS UNIT</Text>
        <View style={adminStyles.row}>
          {STATUS_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} active={vehicle.status === o.value} onPress={vehicle.status === o.value || busy ? undefined : () => changeStatus(o.value)} />
          ))}
        </View>

        <View style={[adminStyles.row, { marginTop: 14 }]}>
          <Btn label={vehicle.isActive ? 'Sembunyikan dari situs' : 'Tampilkan di situs'} icon={vehicle.isActive ? EyeOff : Eye} variant="secondary" small onPress={toggleActive} disabled={busy} />
          <Btn label={editing ? 'Tutup tarif' : 'Atur tarif'} icon={Wrench} variant={editing ? 'ghost' : 'secondary'} small onPress={() => setEditing((v) => !v)} />
        </View>

        {editing && (
          <View style={styles.editor}>
            {vehicle.rates.map((r) => {
              const inp = rateInputs[r.serviceType];
              const label = r.serviceType === 'LEPAS_KUNCI' ? 'Lepas Kunci (24 jam)' : 'Dengan Sopir (12 jam)';
              return (
                <View key={r.serviceType} style={{ gap: 8 }}>
                  <Text style={styles.rateTitle}>{label}</Text>
                  <View style={adminStyles.row}>
                    <FormField label="TARIF / HARI (RP)" error={rateErrors[`${r.serviceType}-daily`]} hint={inp.daily ? rp(Number(inp.daily)) : undefined} style={{ flex: 1, minWidth: 150 }}>
                      <TextInput
                        style={[adminStyles.input, !!rateErrors[`${r.serviceType}-daily`] && adminStyles.inputError]}
                        value={inp.daily}
                        onChangeText={(t) => setRateInputs((p) => ({ ...p, [r.serviceType]: { ...p[r.serviceType], daily: digitsOnly(t) } }))}
                        keyboardType="number-pad"
                        accessibilityLabel={`Tarif harian ${label}`}
                      />
                    </FormField>
                    <FormField label="DEPOSIT (RP)" error={rateErrors[`${r.serviceType}-deposit`]} hint={inp.deposit ? rp(Number(inp.deposit)) : undefined} style={{ flex: 1, minWidth: 150 }}>
                      <TextInput
                        style={[adminStyles.input, !!rateErrors[`${r.serviceType}-deposit`] && adminStyles.inputError]}
                        value={inp.deposit}
                        onChangeText={(t) => setRateInputs((p) => ({ ...p, [r.serviceType]: { ...p[r.serviceType], deposit: digitsOnly(t) } }))}
                        keyboardType="number-pad"
                        accessibilityLabel={`Deposit ${label}`}
                      />
                    </FormField>
                  </View>
                </View>
              );
            })}
            <View style={[adminStyles.row, { alignItems: 'center' }]}>
              <Btn label="Simpan tarif" onPress={saveRates} loading={busy} disabled={!dirty} />
              {saved && !dirty ? <Text style={{ color: T.success, fontWeight: '800', fontSize: 13 }}>Tersimpan</Text> : null}
            </View>
          </View>
        )}

        {error ? (
          <View style={{ marginTop: 10 }}>
            <ErrorBox message={error} />
          </View>
        ) : null}
      </View>
    </Card>
  );
};

const Spec: React.FC<{ icon: IconType; text: string }> = ({ icon: Icon, text }) => (
  <View style={styles.spec}>
    <Icon size={14} color={T.muted} />
    <Text style={styles.specText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' },
  card: { flexGrow: 1, flexShrink: 1, flexBasis: 340, maxWidth: 560, minWidth: 0, padding: 0, overflow: 'hidden' },
  imageWrap: { height: 190, backgroundColor: '#EEF3F9', alignItems: 'center', justifyContent: 'center', padding: 14 },
  image: { width: '100%', height: '100%' },
  imageFallback: { fontSize: 22, fontWeight: '900', color: T.muted },
  statusFloat: { position: 'absolute', top: 12, left: 12 },
  body: { padding: 18, gap: 2 },
  brand: { fontSize: 12, fontWeight: '800', color: T.brand, letterSpacing: 1.2 },
  model: { fontSize: 20, fontWeight: '900', color: T.ink, letterSpacing: -0.3 },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  specText: { fontSize: 12.5, fontWeight: '700', color: T.inkSoft },
  price: { fontSize: 20, fontWeight: '900', color: T.ink, marginTop: 12 },
  priceUnit: { fontSize: 13, fontWeight: '600', color: T.muted },
  usage: { marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: T.brandSoft },
  usageText: { fontSize: 13, color: T.brand, fontWeight: '700' },
  occWrap: { marginTop: 12, gap: 6 },
  occHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  occLabel: { fontSize: 12.5, fontWeight: '700', color: T.muted },
  occValue: { fontSize: 14, fontWeight: '900', color: T.ink },
  occSub: { fontSize: 12, fontWeight: '600', color: T.muted },
  occTrack: { height: 8, borderRadius: 4, backgroundColor: T.surfaceAlt, overflow: 'hidden', borderWidth: 1, borderColor: T.border },
  occFill: { height: '100%', borderRadius: 4 },
  editor: { marginTop: 14, gap: 14, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt },
  rateTitle: { fontSize: 14, fontWeight: '900', color: T.ink },
});
