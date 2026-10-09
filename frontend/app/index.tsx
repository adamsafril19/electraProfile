import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Platform, useWindowDimensions } from 'react-native';
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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
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

  const handleConsultWA = () => {
    const url = 'https://wa.me/6281234567890?text=Halo%20Admin%20Electra%2C%20saya%20ingin%20konsultasi%20reservasi%20mobil%20listrik';
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

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
      {/* HERO SECTION */}
      <View style={[styles.hero, isMobile && styles.heroMobile]}>
        <View style={styles.heroGlow} pointerEvents="none" />
        <View style={styles.heroInner}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowText}>RENTAL MOBIL LISTRIK MANDIRI</Text>
            <View style={styles.eyebrowLine} />
          </View>

          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
            Rental Mobil Listrik{'\n'}
            <Text style={styles.heroTitleAccent}>Lepas Kunci & Driver</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Tarif transparan, baterai siap pakai, dan perlindungan darurat 24 jam. Pilih unit, kirim reservasi ke WhatsApp dalam satu klik.
          </Text>

          {/* Price + range validation (5-10 second rule) */}
          <View style={styles.priceHighlight}>
            <Text style={styles.priceHighlightFrom}>Mulai</Text>
            <Text style={styles.priceHighlightValue}>Rp350.000</Text>
            <Text style={styles.priceHighlightUnit}>/hari</Text>
            <View style={styles.priceHighlightDivider} />
            <Text style={styles.priceHighlightRange}>Baterai penuh ± 300–410 km • Termasuk Portable Charger</Text>
          </View>

          <View style={styles.uspRow}>
            {['Baterai Siap Pakai 100%', 'Bebas Ganjil-Genap', 'Unit Pengganti 24 Jam'].map((label) => (
              <View key={label} style={styles.uspBadge}>
                <View style={styles.uspDot} />
                <Text style={styles.uspText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.heroActionRow}>
            <TouchableOpacity style={styles.heroBtnPrimary} onPress={() => router.push('/armada')}>
              <Text style={styles.heroBtnPrimaryText}>Lihat Armada</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroBtnWa} onPress={handleConsultWA}>
              <Text style={styles.heroBtnWaText}>Konsultasi Cepat (WA)</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Booking Reservation Widget */}
          <QuickBookingWidget vehicles={fleet} onQuickBook={handleQuickBook} />

          {/* Stats Banner */}
          <View style={styles.statsBar}>
            {[
              { n: '100%', l: 'Kesiapan Baterai Handover' },
              { n: '± 410 km', l: 'Radius Tempuh Armada' },
              { n: '60–90 Mnt', l: 'Garansi Mobil Pengganti' },
              { n: '24 Jam', l: 'Roadside Assistance' },
            ].map((s) => (
              <View key={s.l} style={[styles.statCell, isMobile && styles.statCellMobile]}>
                <Text style={styles.statNumber}>{s.n}</Text>
                <Text style={styles.statLabel}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* SECTION ARMADA */}
      <View style={styles.fleetBand}>
        <View style={styles.sectionWrap}>
          {loading ? (
            <ActivityIndicator size="large" color="#38BDF8" style={{ marginVertical: 48 }} />
          ) : (
            <IndorentFleetSection
              vehicles={fleet}
              onBookVehicle={handleBookVehicle}
            />
          )}
        </View>
      </View>

      {/* SECTION STANDAR KEPERCAYAAN */}
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
    paddingTop: 72,
    paddingBottom: 56,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  heroMobile: {
    paddingTop: 36,
    paddingBottom: 32,
  },
  heroGlow: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(11, 114, 201, 0.22)',
  },
  fleetBand: {
    backgroundColor: COLORS.deepInk,
    width: '100%',
  },
  priceHighlight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 16,
  },
  priceHighlightFrom: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  priceHighlightValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  priceHighlightUnit: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  priceHighlightDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 8,
  },
  priceHighlightRange: {
    fontSize: 13,
    color: '#7DD3FC',
    fontWeight: '600',
  },
  uspRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  uspBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  uspDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  uspText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroBtnWa: {
    backgroundColor: COLORS.whatsapp,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  heroBtnWaText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  heroTitleMobile: {
    fontSize: 30,
    lineHeight: 38,
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
    fontSize: 46,
    fontWeight: '900',
    color: COLORS.white,
    lineHeight: 56,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  heroTitleAccent: {
    color: '#60A5FA',
  },
  heroSubtitle: {
    fontSize: 15.5,
    color: 'rgba(255, 255, 255, 0.78)',
    lineHeight: 26,
    maxWidth: 640,
    marginBottom: 20,
  },
  heroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  heroBtnPrimary: {
    backgroundColor: COLORS.brandBlue,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  heroBtnPrimaryText: {
    color: COLORS.white,
    fontSize: 14,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 28,
    paddingVertical: 8,
  },
  statCell: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statCellMobile: {
    flexBasis: '50%',
    minWidth: 0,
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

  sectionWrap: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 48,
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
    borderRadius: 16,
    padding: 28,
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
    minWidth: 240,
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 12,
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
