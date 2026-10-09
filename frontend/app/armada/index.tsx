import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';
import { Vehicle } from '../../types/fleet';
import { fetchFleetResult } from '../../services/api';
import { OfflineBanner } from '../../components/OfflineBanner';
import { VehicleCard } from '../../components/VehicleCard';
import { WhatsAppModal } from '../../components/WhatsAppModal';

export default function FleetCatalogScreen() {
  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBodyType, setSelectedBodyType] = useState<string>('ALL');
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

  const filteredFleet = fleet.filter((v) => {
    if (selectedBodyType === 'ALL') return true;
    return v.bodyType === selectedBodyType;
  });

  const categories = [
    { label: 'Semua Kategori', value: 'ALL' },
    { label: 'City Car (4 Kursi)', value: 'CITY_CAR' },
    { label: 'Compact SUV (5 Kursi)', value: 'COMPACT_SUV' },
    { label: 'Family MPV (7 Kursi)', value: 'MPV' },
  ];

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowText}>KATALOG MOBIL LISTRIK</Text>
            <View style={styles.eyebrowLine} />
          </View>
          <Text style={styles.title}>Pilihan Armada Ramah Lingkungan</Text>
          <Text style={styles.subtitle}>
            Seluruh kendaraan diserahkan dengan level baterai minimal 80%–100%, kabel pengisian portable, dan dukungan penggantian unit darurat.
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
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.brandBlue} style={{ marginVertical: 48 }} />
        ) : filteredFleet.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Tidak ada kendaraan dalam kategori ini.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredFleet.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onBookNow={(v) => {
                  setSelectedVehicle(v);
                  setModalVisible(true);
                }}
              />
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
