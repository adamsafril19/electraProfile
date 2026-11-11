import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { Vehicle } from '../types/fleet';
import { fetchFleetResult } from '../services/api';
import { OfflineBanner } from '../components/OfflineBanner';
import { IndorentFleetSection } from '../components/IndorentFleetSection';
import { QuickBookingWidget } from '../components/QuickBookingWidget';
import { HeroCar } from '../components/HeroCar';
import { FadeIn } from '../components/FadeIn';
import { TrustBadges } from '../components/TrustBadges';
import { WhatsAppModal } from '../components/WhatsAppModal';
import {
  ChargingEcosystemSection,
  TestimonialsSection,
  FaqSection,
  FinalCtaBanner,
} from '../components/HomeSections';
import { todayStr } from '../utils/date';

export default function HomeScreen() {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isDesktop = width >= 1100;

  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [heroVehicleId, setHeroVehicleId] = useState<string | undefined>(undefined);

  const DEFAULT_BOOKING_CONTEXT = {
    serviceType: 'LEPAS_KUNCI' as 'LEPAS_KUNCI' | 'DENGAN_DRIVER',
    durationDays: 3,
    startDate: todayStr(),
    pickupLocation: 'Bandara I Gusti Ngurah Rai (Kedatangan)',
    selectionLocked: false,
  };
  const [bookingContext, setBookingContext] = useState(DEFAULT_BOOKING_CONTEXT);
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

  const handleConsultWA = () => {
    const url =
      'https://wa.me/6281234567890?text=Halo%20Admin%20Electra%2C%20saya%20ingin%20konsultasi%20reservasi%20mobil%20listrik';
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const handleBookVehicle = (v: Vehicle) => {
    setBookingContext({ ...DEFAULT_BOOKING_CONTEXT, startDate: todayStr() });
    setSelectedVehicle(v);
    setModalVisible(true);
  };

  const handleQuickBook = (params: {
    vehicleId: string;
    serviceType: 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
    durationDays: number;
    startDate: string;
    pickupLocation: string;
  }) => {
    const target = fleet.find((f) => f.id === params.vehicleId) || fleet[0];
    setBookingContext({
      serviceType: params.serviceType,
      durationDays: params.durationDays,
      startDate: params.startDate,
      pickupLocation: params.pickupLocation,
      selectionLocked: true,
    });
    setSelectedVehicle(target);
    setModalVisible(true);
  };

  const heroVehicle = fleet.find((f) => f.id === heroVehicleId) || fleet[0];

  return (
    <View style={styles.container}>
      {/* ========================================================
          HERO SECTION (INDORENT EDITORIAL STYLE + GLASSMORPHISM)
          ======================================================== */}
      <View style={[styles.hero, isMobile && styles.heroMobile]}>
        {/* Background Image with Dark Blue Scrim */}
        <Image
          source={require('../assets/indorent-hero.webp')}
          style={styles.heroBgImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay} pointerEvents="none" />
        <View style={styles.heroGlowCyan} pointerEvents="none" />
        <View style={styles.heroGlowBlue} pointerEvents="none" />

        <View style={styles.heroInner}>
          <FadeIn>
            {/* Eyebrow Pill */}
            <View style={styles.eyebrowContainer}>
              <View style={styles.eyebrowPill}>
                <Sparkles size={13} color="#38BDF8" />
                <Text style={styles.eyebrowPillText}>
                  {t('RENTAL MOBIL LISTRIK • FLEET & RETAIL EXPERT', 'ELECTRIC VEHICLE RENTAL • FLEET & RETAIL EXPERT')}
                </Text>
              </View>
            </View>

            {/* Editorial Serif Heading matching INDORENT reference */}
            <Text
              style={[
                styles.heroTitle,
                isMobile && styles.heroTitleMobile,
                isDesktop && styles.heroTitleDesktop,
              ]}
            >
              {t('Sewa Mobil', 'Car Rental')} <Text style={styles.heroTitleAccent}>{t('untuk Perjalanan Anda', 'for Your Journey')}</Text>
            </Text>

            {/* Subtitle */}
            <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
              {t(
                'Solusi sewa mobil listrik jangka panjang maupun jangka pendek dengan pengalaman dan layanan terbaik, baterai prima 100%, serta perlindungan darurat 24 jam.',
                'Long-term and short-term electric car rental solutions with premium experience, 100% primed battery, and 24-hour roadside assistance.'
              )}
            </Text>

            {/* Price Highlight (Mulai Rp350.000/hari) */}
            <View style={styles.priceHighlight}>
              <Text style={styles.priceHighlightFrom}>{t('Mulai', 'From')}</Text>
              <Text style={styles.priceHighlightValue}>Rp350.000</Text>
              <Text style={styles.priceHighlightUnit}>{t('/hari', '/day')}</Text>
              <View style={styles.priceHighlightDivider} />
              <Text style={styles.priceHighlightRange}>
                {t('Baterai Penuh ± 300–530 km • Termasuk Portable Charger & Bebas Ganjil-Genap', 'Full Battery ± 300–530 km • Portable Charger Included & Odd-Even Rule Exempt')}
              </Text>
            </View>

            {/* Hero Action Buttons (Pill solid blue + Frosted glass) */}
            <View style={styles.heroActionRow}>
              <TouchableOpacity
                style={styles.heroBtnPrimary}
                onPress={handleConsultWA}
                activeOpacity={0.85}
                accessibilityRole="link"
              >
                <Text style={styles.heroBtnPrimaryText}>{t('Konsultasi Kebutuhan Armada', 'Consult Fleet Solutions')}</Text>
                <ArrowRight size={17} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroBtnGlass}
                onPress={() => router.push('/armada')}
                activeOpacity={0.85}
                accessibilityRole="link"
              >
                <Text style={styles.heroBtnGlassText}>{t('Lihat Produk Armada', 'Explore EV Fleet')}</Text>
              </TouchableOpacity>
            </View>
          </FadeIn>

          {/* Frosted Glass Bento Stats Card (6 Metrics Grid) */}
          <FadeIn delay={150}>
            <View style={styles.glassStatsCard}>
              <View style={styles.statsGrid}>
                {[
                  { n: '100%', plus: '⁺', l: t('KESIAPAN BATERAI', 'BATTERY READINESS') },
                  { n: '± 410', plus: ' km', l: t('RADIUS TEMPUH EV', 'EV DRIVING RANGE') },
                  { n: '1.500', plus: '⁺', l: t('PELANGGAN PUAS', 'HAPPY CLIENTS') },
                  { n: '60–90', plus: t(' Mnt', ' Min'), l: t('MOBIL PENGGANTI', 'REPLACEMENT CAR') },
                  { n: '50', plus: '⁺', l: t('SPKLU REKANAN', 'PARTNER CHARGERS') },
                  { n: '24', plus: t(' Jam', ' Hrs'), l: t('LAYANAN DARURAT', 'EMERGENCY RESCUE') },
                ].map((s, idx) => (
                  <View
                    key={s.l}
                    style={[
                      styles.statCol,
                      isMobile && styles.statColMobile,
                      idx < 3 && isMobile && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
                    ]}
                  >
                    <Text style={styles.statVal}>
                      {s.n}
                      <Text style={styles.statUnit}>{s.plus}</Text>
                    </Text>
                    <Text style={styles.statLbl}>{s.l}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeIn>

          {/* Quick Booking Widget Strip */}
          <View style={styles.quickBookingWrapper}>
            <FadeIn delay={220}>
              <QuickBookingWidget
                vehicles={fleet}
                selectedVehicleId={heroVehicleId}
                onQuickBook={handleQuickBook}
                embedded={false}
                onVehicleChange={setHeroVehicleId}
              />
            </FadeIn>
          </View>
        </View>
      </View>

      {/* ========================================================
          SECTION 2: ARMADA LISTRIK (INTERACTIVE STAGE & GRID)
          ======================================================== */}
      <View
        nativeID="armada-showcase"
        {...(Platform.OS === 'web' ? ({ id: 'armada-showcase' } as any) : {})}
        style={styles.fleetBand}
      >
        <View style={styles.sectionWrap}>
          {offline && !loading && <OfflineBanner onRetry={loadFleet} />}
          {loading ? (
            <ActivityIndicator size="large" color="#38BDF8" style={{ marginVertical: 48 }} />
          ) : (
            <IndorentFleetSection
              vehicles={fleet}
              selectedVehicleId={heroVehicleId}
              onSelectVehicle={setHeroVehicleId}
              onBookVehicle={handleBookVehicle}
            />
          )}
        </View>
      </View>

      {/* ========================================================
          SECTION 3: EKOSISTEM CHARGING (ZERO RANGE ANXIETY)
          ======================================================== */}
      <View style={styles.sectionWrap}>
        <ChargingEcosystemSection />
      </View>

      {/* ========================================================
          SECTION 4: STANDAR KEPERCAYAAN (TRUST PILLARS DENGAN IKON)
          ======================================================== */}
      <View style={styles.sectionWrap}>
        <TrustBadges />
      </View>

      {/* ========================================================
          SECTION 5: ALUR RESERVASI (3 LANGKAH MUDAH)
          ======================================================== */}
      <View style={styles.sectionWrap}>
        <View style={styles.stepsBox}>
          <View style={styles.stepsHeader}>
            <Text style={styles.stepsEyebrow}>PROSES MUDAH & CEPAT</Text>
            <Text style={styles.stepsTitle}>Tiga Langkah Memulai Perjalanan Anda</Text>
            <Text style={styles.stepsSubtitle}>
              Tanpa prosedur rumit, serah terima unit transparan langsung di Bandara atau Hotel.
            </Text>
          </View>
          <View style={styles.stepsGrid}>
            <View style={styles.stepCard}>
              <View style={styles.stepIndexCircle}>
                <Text style={styles.stepIndexText}>1</Text>
              </View>
              <Text style={styles.stepCardTitle}>Pilih Kendaraan & Durasi</Text>
              <Text style={styles.stepCardDesc}>
                Tinjau spesifikasi jarak tempuh baterai (km), kelengkapan charger, dan estimasi tarif transparan di katalog armada.
              </Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepIndexCircle}>
                <Text style={styles.stepIndexText}>2</Text>
              </View>
              <Text style={styles.stepCardTitle}>Konfirmasi Format WhatsApp</Text>
              <Text style={styles.stepCardDesc}>
                Sistem menghasilkan draf pesanan terstruktur. Kirimkan foto KTP & SIM A secara aman terenkripsi langsung ke admin.
              </Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepIndexCircle}>
                <Text style={styles.stepIndexText}>3</Text>
              </View>
              <Text style={styles.stepCardTitle}>Serah Terima Baterai 80–100%</Text>
              <Text style={styles.stepCardDesc}>
                Unit diantar tepat waktu di bandara atau hotel dengan kondisi baterai prima, bersih, dan charger portabel siap pakai.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ========================================================
          SECTION 6: TESTIMONI & BUKTI SOSIAL (RATING 4.9/5)
          ======================================================== */}
      <View style={styles.sectionWrap}>
        <TestimonialsSection />
      </View>

      {/* ========================================================
          SECTION 7: PERTANYAAN UMUM (FAQ ACCORDION)
          ======================================================== */}
      <View style={styles.sectionWrap}>
        <FaqSection />
      </View>

      {/* ========================================================
          SECTION 8: FINAL CTA BANNER (PRE-FOOTER HIGH CONVERSION)
          ======================================================== */}
      <View style={styles.sectionWrap}>
        <FinalCtaBanner />
      </View>

      {/* Modal WhatsApp Generator */}
      <WhatsAppModal
        visible={modalVisible}
        vehicle={selectedVehicle}
        initialServiceType={bookingContext.serviceType}
        initialDurationDays={bookingContext.durationDays}
        initialStartDate={bookingContext.startDate}
        initialPickupLocation={bookingContext.pickupLocation}
        showSelectors={!bookingContext.selectionLocked}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

// ========================================================
// STYLES
// ========================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // HERO SECTION
  hero: {
    backgroundColor: '#03192A',
    paddingTop: 68,
    paddingBottom: 60,
    paddingHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 680,
    justifyContent: 'center',
  },
  heroMobile: {
    paddingTop: 44,
    paddingBottom: 40,
    paddingHorizontal: 16,
    minHeight: 'auto',
  },
  heroBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.38,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 25, 42, 0.72)',
  },
  heroGlowCyan: {
    position: 'absolute',
    top: -140,
    right: -100,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(11, 114, 201, 0.28)',
  },
  heroGlowBlue: {
    position: 'absolute',
    bottom: -160,
    left: -120,
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  heroInner: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },

  // Eyebrow Pill
  eyebrowContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  eyebrowPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.2,
  },

  // Heading matching INDORENT reference
  heroTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 62,
    letterSpacing: -0.5,
    marginBottom: 18,
    maxWidth: 880,
    ...(Platform.OS === 'web'
      ? ({ fontFamily: "'Fraunces', 'Playfair Display', Georgia, serif" } as any)
      : {}),
  },
  heroTitleMobile: {
    fontSize: 34,
    lineHeight: 42,
  },
  heroTitleDesktop: {
    fontSize: 64,
    lineHeight: 74,
  },
  heroTitleAccent: {
    color: '#7DD3FC',
    fontWeight: '400',
    fontStyle: 'italic',
  },
  heroSubtitle: {
    fontSize: 16.5,
    color: 'rgba(255, 255, 255, 0.84)',
    lineHeight: 28,
    maxWidth: 720,
    marginBottom: 20,
  },
  heroSubtitleMobile: {
    fontSize: 14.5,
    lineHeight: 24,
  },

  // Price Highlight Strip
  priceHighlight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 24,
  },
  priceHighlightFrom: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  priceHighlightValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  priceHighlightUnit: {
    fontSize: 14.5,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  priceHighlightDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 10,
  },
  priceHighlightRange: {
    fontSize: 13.5,
    color: '#7DD3FC',
    fontWeight: '600',
  },

  // Action Buttons
  heroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    marginBottom: 36,
  },
  heroBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0B72C9',
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 28,
    borderRadius: 50,
    shadowColor: '#0B72C9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 5,
  },
  heroBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroBtnGlass: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 26,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as any)
      : {}),
  },
  heroBtnGlassText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },

  // Glassmorphic Stats Bento Card
  glassStatsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 36,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any)
      : {}),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statColMobile: {
    flexBasis: '33.33%',
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  statVal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#38BDF8',
  },
  statLbl: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Quick Booking Wrapper
  quickBookingWrapper: {
    marginTop: 8,
  },

  // Common Sections
  fleetBand: {
    backgroundColor: '#03192A',
    width: '100%',
  },
  sectionWrap: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 48,
  },

  // Steps Box
  stepsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 36,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  stepsHeader: {
    alignItems: 'center',
    marginBottom: 36,
    maxWidth: 720,
    alignSelf: 'center',
  },
  stepsEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B72C9',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  stepsTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0B1C30',
    textAlign: 'center',
    marginBottom: 8,
    ...(Platform.OS === 'web'
      ? ({ fontFamily: "'Fraunces', 'Playfair Display', Georgia, serif" } as any)
      : {}),
  },
  stepsSubtitle: {
    fontSize: 14.5,
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
    padding: 26,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#03192A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  stepIndexCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0B72C9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepIndexText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  stepCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B1C30',
    marginBottom: 8,
    lineHeight: 23,
  },
  stepCardDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 21,
  },
});
