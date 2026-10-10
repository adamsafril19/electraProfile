import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserRound } from 'lucide-react-native';
import { AdminApiError, AdminInquiry, Driver, assignDriver, fetchDrivers } from '../../services/adminApi';
import { Btn, Chip, ErrorBox, adminStyles } from './ui';
import { T } from './theme';
import { toast } from './feedback';

interface Props {
  inquiry: AdminInquiry;
  onChanged: () => void;
  onUnauthorized: () => void;
}

const TODAY_LABEL: Record<Driver['today'], string> = {
  TERSEDIA: 'tersedia',
  BERTUGAS: 'bertugas',
  CUTI: 'cuti',
  NONAKTIF: 'nonaktif',
};

export const InquiryDriver: React.FC<Props> = ({ inquiry, onChanged, onUnauthorized }) => {
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchDrivers()
      .then((d) => alive && setDrivers(d.filter((x) => x.isActive)))
      .catch((e) => {
        if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
        if (alive) setError(e instanceof AdminApiError ? e.message : 'Gagal memuat daftar driver.');
      });
    return () => {
      alive = false;
    };
  }, [onUnauthorized]);

  const locked = inquiry.status === 'CANCELLED' || inquiry.status === 'COMPLETED';

  const assign = async (driverId: string | null) => {
    if (busy) return;
    setBusy(driverId ?? 'none');
    setError(null);
    try {
      await assignDriver(inquiry.id, driverId);
      toast.success(driverId ? 'Driver ditugaskan' : 'Penugasan driver dilepas');
      onChanged();
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof AdminApiError ? e.message : 'Gagal menugaskan driver.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <UserRound size={17} color={T.brand} />
        <Text style={styles.title}>Driver</Text>
        <Text style={[adminStyles.muted, { marginLeft: 'auto' as any }]}>
          {inquiry.driverName ? `Ditugaskan: ${inquiry.driverName}` : 'Belum ada driver'}
        </Text>
      </View>

      {!inquiry.driverName && inquiry.status !== 'CANCELLED' && (
        <Text style={styles.warn}>Layanan Dengan Sopir wajib punya driver sebelum unit diserahkan.</Text>
      )}

      {drivers === null && !error ? (
        <Text style={adminStyles.muted}>Memuat driver…</Text>
      ) : drivers && drivers.length === 0 ? (
        <Text style={adminStyles.muted}>Belum ada driver aktif. Tambahkan di menu Driver.</Text>
      ) : (
        <View style={adminStyles.row}>
          {drivers?.map((d) => (
            <Chip
              key={d.id}
              label={`${d.name} • ${TODAY_LABEL[d.today]}`}
              active={inquiry.driverId === d.id}
              onPress={locked || busy ? undefined : () => assign(d.id)}
            />
          ))}
          {inquiry.driverId && !locked && <Btn label="Lepas driver" variant="danger" small onPress={() => assign(null)} loading={busy === 'none'} />}
        </View>
      )}

      {error ? <ErrorBox message={error} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 14, fontWeight: '900', color: T.ink },
  warn: { fontSize: 12.5, color: T.warn, fontWeight: '700' },
});
