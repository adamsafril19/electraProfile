import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Head from 'expo-router/head';
import { COLORS } from '../../constants/colors';
import { useLanguage } from '../../context/LanguageContext';
import { Vehicle } from '../../types/fleet';
import { fetchFleetResult } from '../../services/api';
import { OfflineBanner } from '../../components/OfflineBanner';
import { VehicleCard } from '../../components/VehicleCard';
import { WhatsAppModal } from '../../components/WhatsAppModal';
import { FadeIn } from '../../components/FadeIn';

export default function FleetCatalogScreen() {
  const { locale, t } = useLanguage();
  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBodyType, setSelectedBodyType] = useState<string>('ALL');
  const [sort, setSort] = useState<'DEFAULT' | 'PRICE' | 'RANGE' | 'SEATS'>('DEFAULT');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [offline, setOffline] = useState(false);

  const loadFleet = () => {
    setLoading(true);
    fetchFleetResult().then(({ vehicles, offline: isOffline }) => {
      setFleet(vehicles);
      setOffline(isOffline);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadFleet();
  }, []);

  const startPrice = (v: Vehicle) => v.rates.find((r) => r.serviceType === 'LEPAS_KUNCI')?.dailyRate ?? Number.MAX_SAFE_INTEGER;

  const filteredFleet = fleet
    .filter((v) => selectedBodyType === 'ALL' || v.bodyType === selectedBodyType)
    .sort((a, b) => {
      if (sort === 'PRICE') return startPrice(a) - startPrice(b);
      if (sort === 'RANGE') return b.specs.rangeCltcKm - a.specs.rangeCltcKm;
      if (sort === 'SEATS') return b.specs.seatingCapacity - a.specs.seatingCapacity;
      return 0;
    });

  const sortOptions = [
    { label: t('Rekomendasi', 'Recommended'), value: 'DEFAULT' as const },
    { label: t('Termurah', 'Lowest Price'), value: 'PRICE' as const },
    { label: t('Jarak terjauh', 'Longest Range'), value: 'RANGE' as const },
    { label: t('Kursi terbanyak', 'Most Seats'), value: 'SEATS' as const },
  ];

  const categories = [
    { label: t('Semua Kategori', 'All Categories'), value: 'ALL' },
    { label: t('City Car (4 Kursi)', 'City Car (4 Seats)'), value: 'CITY_CAR' },
    { label: t('Compact SUV (5 Kursi)', 'Compact SUV (5 Seats)'), value: 'COMPACT_SUV' },
    { label: t('Family MPV (7 Kursi)', 'Family MPV (7 Seats)'), value: 'MPV' },
  ];

  return (
    <View style={styles.container}>
      <Head>
        <title>Katalog Mobil Listrik untuk Disewa | Electra</title>
        <meta name="description" content="Pilih mobil listrik sewa: Wuling Air EV, Binguo, BYD Atto 3, BYD M6, Hyundai Ioniq 5. Tarif harian transparan, baterai 80-100% saat serah terima." />
      </Head>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowText}>{t('KATALOG MOBIL LISTRIK', 'ELECTRIC FLEET CATALOG')}</Text>
            <View style={styles.eyebrowLine} />
          </View>
          <Text style={styles.title}>{t('Pilihan Armada Ramah Lingkungan', 'Eco-Friendly Electric Fleet')}</Text>
          <Text style={styles.subtitle}>
            {t(
              'Seluruh kendaraan diserahkan dengan level baterai minimal 80%–100%, kabel pengisian portable, dan dukungan penggantian unit darurat.',
              'All vehicles are handed over with at least 80%–100% battery SoC, a portable charging cable, and emergency replacement vehicle support.'
            )}
          </Text>

          {/* Corporate Category Filter Pills */}
          <View style={styles.filterRow}>
            {categories.map((c) => {
              const isActive = selectedBodyType === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setSelectedBodyType(c.value)}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Grid Content */}
      <View style={styles.content}>
        {offline && !loading && <OfflineBanner onRetry={loadFleet} />}

        {!loading && fleet.length > 0 && (
          <View style={styles.toolbar}>
            <Text style={styles.count}>
              {filteredFleet.length} {t('unit', 'units')} {selectedBodyType === 'ALL' ? t('tersedia', 'available') : t('pada kategori ini', 'in this category')}
            </Text>
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>{t('Urutkan:', 'Sort by:')}</Text>
              {sortOptions.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sortChip, sort === o.value && styles.sortChipActive]}
                  onPress={() => setSort(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sort === o.value }}
                >
                  <Text style={[styles.sortChipText, sort === o.value && styles.sortChipTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.grid}>
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </View>
        ) : filteredFleet.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{t('Tidak ada kendaraan dalam kategori ini.', 'No vehicles found in this category.')}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredFleet.map((vehicle, idx) => (
              <FadeIn key={vehicle.id} delay={Math.min(idx, 5) * 70} style={styles.cardSlot}>
                <VehicleCard
                  vehicle={vehicle}
                  onBookNow={(v) => {
                    setSelectedVehicle(v);
                    setModalVisible(true);
                  }}
                />
              </FadeIn>
            ))}
          </View>
        )}
      </View>

      <WhatsAppModal
        visible={modalVisible}
        vehicle={selectedVehicle}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

// Kerangka kartu saat data dimuat, supaya tata letak tidak melompat
const CardSkeleton: React.FC = () => {
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.skeleton, { opacity: pulse }]} accessibilityLabel="Memuat armada">
      <View style={styles.skImage} />
      <View style={{ padding: 18, gap: 12 }}>
        <View style={[styles.skLine, { width: '35%' }]} />
        <View style={[styles.skLine, { width: '75%', height: 20 }]} />
        <View style={[styles.skLine, { height: 56 }]} />
        <View style={[styles.skLine, { width: '50%', height: 24 }]} />
        <View style={[styles.skLine, { height: 48 }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: COLORS.deepInk,
    paddingTop: 48,
    paddingBottom: 36,
    paddingHorizontal: 16,
  },
  headerInner: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  eyebrowText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.5,
  },
  eyebrowLine: {
    width: 36,
    height: 1.5,
    backgroundColor: '#38BDF8',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.7)',
    maxWidth: 680,
    lineHeight: 22,
    marginBottom: 24,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  filterPillActive: {
    backgroundColor: COLORS.brandBlue,
    borderColor: COLORS.brandBlue,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  content: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
  },
  count: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.deepInk,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    maxWidth: '100%',
  },
  sortLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  sortChip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: COLORS.white,
  },
  sortChipActive: {
    backgroundColor: COLORS.deepInk,
    borderColor: COLORS.deepInk,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  sortChipTextActive: {
    color: COLORS.white,
  },
  cardSlot: {
    width: '100%',
    maxWidth: 370,
    alignItems: 'center',
  },
  skeleton: {
    width: '100%',
    maxWidth: 370,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  skImage: {
    height: 210,
    backgroundColor: '#E2E8F0',
  },
  skLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
});
