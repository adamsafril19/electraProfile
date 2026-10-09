import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { Vehicle } from '../types/fleet';
import { fetchFleetList } from '../services/api';
import { VehicleCard } from '../components/VehicleCard';
import { IndorentFleetSection } from '../components/IndorentFleetSection';
import { QuickBookingWidget } from '../components/QuickBookingWidget';
import { TrustBadges } from '../components/TrustBadges';
import { WhatsAppModal } from '../components/WhatsAppModal';

export default function HomeScreen() {
  const router = useRouter();
  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bookingContext, setBookingContext] = useState<{
    serviceType: 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
    durationDays: number;
    pickupLocation: string;
  }>({
    serviceType: 'LEPAS_KUNCI',
    durationDays: 3,
    pickupLocation: 'Bandara I Gusti Ngurah Rai (Kedatangan)',
  });

  useEffect(() => {
    fetchFleetList().then((data) => {
      setFleet(data);
      setLoading(false);
    });
  }, []);

  const handleBookVehicle = (v: Vehicle) => {
    setSelectedVehicle(v);
    setModalVisible(true);
  };

  const handleQuickBook = (params: {
    vehicleId: string;
    serviceType: 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
    durationDays: number;
    pickupLocation: string;
  }) => {
    const target = fleet.find((f) => f.id === params.vehicleId) || fleet[0];
    setBookingContext({
      serviceType: params.serviceType,
      durationDays: params.durationDays,
      pickupLocation: params.pickupLocation,
    });
    setSelectedVehicle(target);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* HERO SECTION (Modeled after INDORENT Deep-Ink Editorial Hero) */}
      <View style={styles.hero}>
        <View style={styles.heroInner}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowText}>RENTAL MOBIL LISTRIK MANDIRI</Text>
            <View style={styles.eyebrowLine} />
          </View>

          <Text style={styles.heroTitle}>
            Sewa Mobil Listrik{'\n'}
            <Text style={styles.heroTitleAccent}>untuk Wisatawan & Retail</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Solusi mobilitas ramah lingkungan lepas kunci dan dengan pengemudi. Transparansi tarif harian mulai Rp350.000/hari, jaminan kesiapan baterai prima 80–100%, serta perlindungan darurat 24 jam.
          </Text>

          <View style={styles.heroActionRow}>
            <TouchableOpacity style={styles.heroBtnPrimary} onPress={() => router.push('/armada')}>
              <Text style={styles.heroBtnPrimaryText}>Lihat Katalog Armada EV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroBtnOutline} onPress={() => router.push('/syarat-ketentuan')}>
              <Text style={styles.heroBtnOutlineText}>Syarat & Kebijakan Sewa</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Booking Reservation Widget */}
          <QuickBookingWidget vehicles={fleet} onQuickBook={handleQuickBook} />

          {/* Corporate Stats Banner (Mirroring INDORENT Hero Stats) */}
          <View style={styles.statsBar}>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Kesiapan Baterai Handover</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>± 410 km</Text>
              <Text style={styles.statLabel}>Radius Tempuh Armada</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>60–90 Mnt</Text>
              <Text style={styles.statLabel}>Garansi Mobil Pengganti</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>24 Jam</Text>
              <Text style={styles.statLabel}>Roadside Assistance Siaga</Text>
            </View>
          </View>
        </View>
      </View>

      {/* SECTION ARMADA (BENCHMARK INDORENT.CO.ID) */}
      <View style={styles.sectionWrap}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.brandBlue} style={{ marginVertical: 48 }} />
        ) : (
          <IndorentFleetSection
            vehicles={fleet}
            onBookVehicle={handleBookVehicle}
          />
        )}
      </View>

      {/* SECTION STANDAR KEPERCAYAAN (INDORENT BENCHMARK) */}
      <View style={styles.sectionWrap}>
        <TrustBadges />
      </View>

      {/* SECTION ALUR RESERVASI (3 LANGKAH MUDAH) */}
      <View style={styles.sectionWrap}>
        <View style={styles.stepsBox}>
          <View style={styles.stepsHeader}>
            <Text style={styles.stepsEyebrow}>PROSES MUDAH & CEPAT</Text>
            <Text style={styles.stepsTitle}>Tiga Langkah Memulai Perjalanan Anda</Text>
          </View>
          <View style={styles.stepsGrid}>
            <View style={styles.stepCard}>
              <View style={styles.stepIndexCircle}><Text style={styles.stepIndexText}>1</Text></View>
              <Text style={styles.stepCardTitle}>Pilih Kendaraan & Durasi</Text>
              <Text style={styles.stepCardDesc}>
                Tinjau spesifikasi jarak tempuh baterai (km), kelengkapan charger, dan estimasi tarif transparan di katalog.
              </Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepIndexCircle}><Text style={styles.stepIndexText}>2</Text></View>
              <Text style={styles.stepCardTitle}>Konfirmasi Format WhatsApp</Text>
              <Text style={styles.stepCardDesc}>
                Sistem menghasilkan draf pesanan terstruktur. Kirimkan foto KTP & SIM A secara terenkripsi langsung ke admin.
              </Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepIndexCircle}><Text style={styles.stepIndexText}>3</Text></View>
              <Text style={styles.stepCardTitle}>Serah Terima Baterai 80-100%</Text>
              <Text style={styles.stepCardDesc}>
                Unit diantar tepat waktu di bandara atau hotel dengan kondisi baterai prima dan portable charger siap pakai.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Modal WhatsApp Generator */}
      <WhatsAppModal
        visible={modalVisible}
        vehicle={selectedVehicle}
        initialServiceType={bookingContext.serviceType}
        initialDurationDays={bookingContext.durationDays}
        initialPickupLocation={bookingContext.pickupLocation}
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
  hero: {
    backgroundColor: COLORS.deepInk,
    paddingTop: 56,
    paddingBottom: 48,
    paddingHorizontal: 16,
  },
  heroInner: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.5,
  },
  eyebrowLine: {
    width: 36,
    height: 1.5,
    backgroundColor: '#38BDF8',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.white,
    lineHeight: 44,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  heroTitleAccent: {
    color: '#60A5FA',
  },
  heroSubtitle: {
    fontSize: 14.5,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 24,
    maxWidth: 720,
    marginBottom: 28,
  },
  heroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  heroBtnPrimary: {
    backgroundColor: COLORS.brandBlue,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 6,
  },
  heroBtnPrimaryText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroBtnOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  heroBtnOutlineText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#07243B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 28,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    minWidth: 140,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionWrap: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 16,
  },
  sectionHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.deepInk,
    marginTop: 2,
    marginBottom: 6,
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#64748B',
    maxWidth: 600,
    lineHeight: 20,
  },
  viewCatalogLink: {
    paddingVertical: 6,
  },
  viewCatalogLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandBlue,
    letterSpacing: 0.3,
  },
  fleetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  stepsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 36,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  stepsHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepsEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.brandBlue,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  stepsTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.deepInk,
    textAlign: 'center',
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  stepCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepIndexCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stepIndexText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
  stepCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textInk,
    marginBottom: 8,
  },
  stepCardDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 20,
  },
});
