import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Vehicle } from '../types/fleet';
import { COLORS } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import { VehicleCard } from './VehicleCard';

interface IndorentFleetSectionProps {
  vehicles: Vehicle[];
  onBookVehicle: (vehicle: Vehicle) => void;
  selectedVehicleId?: string;
  onSelectVehicle?: (vehicleId: string) => void;
}

type CategoryType = 'ALL' | 'CITY_CAR' | 'COMPACT_SUV' | 'MPV';

export const IndorentFleetSection: React.FC<IndorentFleetSectionProps> = ({
  vehicles,
  onBookVehicle,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { locale, t } = useLanguage();

  const [activeCategory, setActiveCategory] = useState<CategoryType>('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'stage' | 'grid'>('stage');
  const railScrollRef = useRef<ScrollView>(null);

  // Filter vehicles according to selected category
  const filteredVehicles = useMemo(() => {
    if (activeCategory === 'ALL') return vehicles;
    return vehicles.filter((v) => v.bodyType === activeCategory);
  }, [vehicles, activeCategory]);

  // Ensure current index is within bounds of filtered list
  const safeIndex = Math.min(currentIndex, Math.max(0, filteredVehicles.length - 1));
  const currentVehicle = filteredVehicles[safeIndex] || vehicles[0];

  // Stage display vehicle for smooth showroom crossfade transitions
  const [displayedVehicle, setDisplayedVehicle] = useState<Vehicle>(currentVehicle);

  // Animation values for showroom stage transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  // Sync external selectedVehicleId if passed from HomeScreen / QuickBookingWidget
  useEffect(() => {
    if (!selectedVehicleId) return;
    const targetIdx = filteredVehicles.findIndex((v) => v.id === selectedVehicleId);
    if (targetIdx !== -1) {
      if (targetIdx !== currentIndex) {
        setCurrentIndex(targetIdx);
      }
    } else {
      const allIdx = vehicles.findIndex((v) => v.id === selectedVehicleId);
      if (allIdx !== -1) {
        setActiveCategory('ALL');
        setCurrentIndex(allIdx);
      }
    }
  }, [selectedVehicleId, filteredVehicles, vehicles]);

  // Auto-scroll rail when safeIndex changes
  useEffect(() => {
    if (railScrollRef.current) {
      railScrollRef.current.scrollTo({
        x: Math.max(0, safeIndex * 172 - 60),
        animated: true,
      });
    }
  }, [safeIndex]);

  // Trigger high-end showroom transition when currentVehicle changes
  useEffect(() => {
    if (!currentVehicle) return;
    if (displayedVehicle && currentVehicle.id === displayedVehicle.id) return;

    // Phase 1: Smooth fade & scale down out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.15,
        duration: 110,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 110,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 12,
        duration: 110,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Phase 2: Swap the vehicle data
      setDisplayedVehicle(currentVehicle);
      slideAnim.setValue(-12);
      scaleAnim.setValue(0.96);

      // Phase 3: Smooth glide-in, spring scale, and showroom spotlight pulse
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.6,
            duration: 180,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 1.0,
            duration: 340,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    });
  }, [currentVehicle?.id]);

  if (!vehicles || vehicles.length === 0) {
    return null;
  }

  const activeCar = displayedVehicle || currentVehicle;
  const lepasRate = activeCar?.rates?.find((r) => r.serviceType === 'LEPAS_KUNCI');
  const driverRate = activeCar?.rates?.find((r) => r.serviceType === 'DENGAN_DRIVER');

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'CITY_CAR':
        return 'CITY CAR EV';
      case 'COMPACT_SUV':
        return 'CROSSOVER & SUV EV';
      case 'MPV':
        return 'FAMILY MPV (7-SEATER) EV';
      default:
        return 'ALL-ELECTRIC VEHICLE';
    }
  };

  const handleCategorySelect = (category: CategoryType) => {
    setActiveCategory(category);
    setCurrentIndex(0);
    const newFiltered = category === 'ALL' ? vehicles : vehicles.filter((v) => v.bodyType === category);
    if (newFiltered[0] && onSelectVehicle) {
      onSelectVehicle(newFiltered[0].id);
    }
  };

  const handleSelectIndex = (idx: number) => {
    setCurrentIndex(idx);
    const target = filteredVehicles[idx];
    if (target && onSelectVehicle) {
      onSelectVehicle(target.id);
    }
  };

  const handlePrev = () => {
    if (filteredVehicles.length <= 1) return;
    const nextIdx = safeIndex > 0 ? safeIndex - 1 : filteredVehicles.length - 1;
    handleSelectIndex(nextIdx);
  };

  const handleNext = () => {
    if (filteredVehicles.length <= 1) return;
    const nextIdx = safeIndex < filteredVehicles.length - 1 ? safeIndex + 1 : 0;
    handleSelectIndex(nextIdx);
  };

  return (
    <View style={styles.container}>
      {/* 1. SECTION HEADER */}
      <View style={[styles.headerGrid, isMobile && Platform.OS === 'web' && ({ gridTemplateColumns: '1fr' } as any)]}>
        <View style={styles.headerLeft}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowText}>{t('ARMADA LISTRIK KAMI', 'OUR ELECTRIC FLEET')}</Text>
            <View style={styles.eyebrowLine} />
          </View>
          <Text style={styles.sectionTitle}>
            {t('Pilihan mobil listrik sewa untuk setiap kebutuhan perjalanan.', 'Electric vehicle rentals tailored for every travel journey.')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.sectionSubtitle}>
            {t(
              'Sewa mobil listrik city car lincah, crossover premium, hingga MPV keluarga 7-seater — seluruh unit terjamin baterai prima (SoC 80–100%), diasuransikan, dan didukung layanan darurat & kendaraan pengganti 24 jam.',
              'Rent agile EV city cars, premium crossovers, to 7-seater family MPVs — all guaranteed with 80–100% SoC battery health, comprehensive insurance, and 24/7 roadside assistance & replacement car.'
            )}
          </Text>
          {/* View Mode Toggle: Interactive Stage vs Complete Grid */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeToggleBtn, viewMode === 'stage' && styles.modeToggleBtnActive]}
              onPress={() => setViewMode('stage')}
            >
              <Text
                style={[
                  styles.modeToggleText,
                  viewMode === 'stage' && styles.modeToggleTextActive,
                ]}
              >
                Showcase
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggleBtn, viewMode === 'grid' && styles.modeToggleBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <Text
                style={[
                  styles.modeToggleText,
                  viewMode === 'grid' && styles.modeToggleTextActive,
                ]}
              >
                Grid ({vehicles.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. CATEGORY TABS PILL BAR */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsPillBar}
        >
          <TouchableOpacity
            style={[styles.categoryTab, activeCategory === 'ALL' && styles.categoryTabActive]}
            onPress={() => handleCategorySelect('ALL')}
          >
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === 'ALL' && styles.categoryTabTextActive,
              ]}
            >
              {t('Semua EV', 'All EVs')} ({vehicles.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryTab, activeCategory === 'CITY_CAR' && styles.categoryTabActive]}
            onPress={() => handleCategorySelect('CITY_CAR')}
          >
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === 'CITY_CAR' && styles.categoryTabTextActive,
              ]}
            >
              City Car EV
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryTab,
              activeCategory === 'COMPACT_SUV' && styles.categoryTabActive,
            ]}
            onPress={() => handleCategorySelect('COMPACT_SUV')}
          >
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === 'COMPACT_SUV' && styles.categoryTabTextActive,
              ]}
            >
              Crossover & SUV
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryTab, activeCategory === 'MPV' && styles.categoryTabActive]}
            onPress={() => handleCategorySelect('MPV')}
          >
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === 'MPV' && styles.categoryTabTextActive,
              ]}
            >
              Family MPV (7-Seater)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {viewMode === 'stage' && activeCar ? (
        <View style={styles.stageSectionWrap}>
          {/* 3. INTERACTIVE FLEET STAGE */}
          <View style={[styles.fleetStage, isMobile && styles.fleetStageMobile]}>
            {/* Ambient Lighting & Glow Pulsing Effect */}
            <Animated.View
              style={[
                styles.stageGlow,
                {
                  transform: [
                    { translateX: -150 },
                    { translateY: -60 },
                    { scale: glowAnim },
                  ],
                },
              ]}
              pointerEvents="none"
            />

            {/* Spec Highlights Top Bar on Stage with Animated Fade */}
            <Animated.View style={[styles.stageTopSpecs, { opacity: fadeAnim }]}>
              <View style={styles.stageSpecPill}>
                <Text style={styles.stageSpecPillKey}>{t('ESTIMASI JARAK', 'ESTIMATED RANGE')}</Text>
                <Text style={styles.stageSpecPillVal}>± {activeCar.specs?.rangeCltcKm} km</Text>
              </View>
              <View style={styles.stageSpecPill}>
                <Text style={styles.stageSpecPillKey}>{t('CHARGING PORT', 'CHARGING PORT')}</Text>
                <Text style={styles.stageSpecPillVal}>{activeCar.specs?.portType}</Text>
              </View>
              <View style={styles.stageSpecPill}>
                <Text style={styles.stageSpecPillKey}>{t('KAPASITAS', 'CAPACITY')}</Text>
                <Text style={styles.stageSpecPillVal}>
                  {activeCar.specs?.seatingCapacity} {t('Penumpang', 'Seats')}
                </Text>
              </View>
              <View style={styles.stageSpecPillBadge}>
                <Text style={styles.stageSpecPillBadgeText}>{t('SoC Penyerahan ≥ 80%', 'Handover SoC ≥ 80%')}</Text>
              </View>
            </Animated.View>

            {/* Center Vehicle Presentation with Animated Crossfade, Scale & Glide */}
            <View style={styles.stageCarArena}>
              {/* Elliptical Ground Shadow with synchronized scale */}
              <Animated.View
                style={[
                  styles.stageCarShadow,
                  {
                    transform: [{ scaleX: scaleAnim }],
                  },
                ]}
                pointerEvents="none"
              />

              {/* Main Studio Car Cutout */}
              <Animated.View
                style={[
                  styles.stageCarTouchable,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim },
                      { scale: scaleAnim },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push(`/armada/${activeCar.slug}` as any)}
                  style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Image
                    source={{ uri: activeCar.imageUrl }}
                    style={[
                      styles.stageCarImage,
                      isMobile && styles.stageCarImageMobile,
                    ]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Stage Bottom Bar Overlay (Title, Price & Controls) with Animated Fade */}
            <Animated.View
              style={[
                styles.stageBottomBar,
                isMobile && styles.stageBottomBarMobile,
                { opacity: fadeAnim },
              ]}
            >
              <View style={[styles.stageCarInfo, isMobile && { minWidth: 0, maxWidth: '100%', overflow: 'hidden' }]}>
                <Text style={styles.stageCategoryEyebrow}>
                  {getCategoryLabel(activeCar.bodyType)}
                </Text>
                <Text style={styles.stageCarTitle} numberOfLines={1}>
                  {activeCar.brand} {activeCar.model}
                </Text>
                <Text style={styles.stageCarTagline} numberOfLines={2}>
                  {activeCar.tags?.join(' • ') ||
                    'Termasuk portable charger 2.2 kW & garansi mobil pengganti.'}
                </Text>

                {/* Pricing Figures */}
                <View style={styles.stagePriceBox}>
                  <View style={styles.priceItem}>
                    <Text style={styles.priceLabel}>{t('Lepas Kunci (24 Jam):', 'Self-Drive (24h):')}</Text>
                    <Text style={styles.priceValue}>
                      Rp {lepasRate?.dailyRate ? lepasRate.dailyRate.toLocaleString('id-ID') : '-'}
                      <Text style={styles.priceUnit}> {t('/ hari', '/ day')}</Text>
                    </Text>
                  </View>
                  {driverRate && (
                    <View style={[styles.priceItem, styles.priceItemDriver]}>
                      <Text style={styles.priceLabel}>{t('Dengan Sopir:', 'With Chauffeur:')}</Text>
                      <Text style={styles.priceValueDriver}>
                        Rp {driverRate.dailyRate.toLocaleString('id-ID')} {t('/ hari', '/ day')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Action Controls & Navigation Arrows */}
              <View style={[styles.stageControls, isMobile && styles.stageControlsMobile]}>
                <View style={styles.navArrowsGroup}>
                  <TouchableOpacity
                    style={styles.navArrowBtn}
                    onPress={handlePrev}
                    accessibilityLabel="Unit sebelumnya"
                  >
                    <Text style={styles.navArrowIcon}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.navArrowBtn}
                    onPress={handleNext}
                    accessibilityLabel="Unit berikutnya"
                  >
                    <Text style={styles.navArrowIcon}>›</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.detailCtaBtn, isMobile && styles.ctaFlexMobile]}
                  onPress={() => router.push(`/armada/${activeCar.slug}` as any)}
                >
                  <Text style={styles.detailCtaBtnText}>{t('Spesifikasi Lengkap', 'Full Specifications')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bookingCtaBtn, isMobile && styles.ctaFlexMobile]}
                  onPress={() => onBookVehicle(activeCar)}
                >
                  <Text style={styles.bookingCtaBtnText}>{t('Reservasi WhatsApp →', 'Reserve via WhatsApp →')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>

          {/* 4. FLEET RAIL (THUMBNAIL SELECTOR BELOW STAGE) */}
          <View style={styles.railContainer}>
            <View style={styles.railHeaderRow}>
              <Text style={styles.railLabel}>
                {t('PILIH UNIT DALAM KATEGORI INI', 'SELECT UNIT IN THIS CATEGORY')} ({safeIndex + 1}/{filteredVehicles.length}):
              </Text>
              <Text style={styles.railHint}>{t('Klik unit untuk menampilkan di panggung utama', 'Click vehicle to preview on main stage')}</Text>
            </View>
            <ScrollView
              ref={railScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railScrollContent}
            >
              {filteredVehicles.map((vehicle, idx) => {
                const isSelected = idx === safeIndex;
                const vLepas = vehicle.rates?.find((r) => r.serviceType === 'LEPAS_KUNCI');
                return (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={[
                      styles.railThumb,
                      isSelected && styles.railThumbSelected,
                    ]}
                    onPress={() => handleSelectIndex(idx)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: vehicle.imageUrl }}
                      style={[
                        styles.railThumbImage,
                        isSelected && styles.railThumbImageSelected,
                      ]}
                      resizeMode="contain"
                    />
                    <Text
                      style={[styles.railThumbTitle, isSelected && styles.railThumbTitleSelected]}
                      numberOfLines={1}
                    >
                      {vehicle.brand} {vehicle.model.split(' ')[0]}
                    </Text>
                    <Text style={[styles.railThumbPrice, isSelected && styles.railThumbPriceSelected]}>
                      {vLepas ? `Rp ${(vLepas.dailyRate / 1000).toFixed(0)}rb/hr` : t('Hubungi', 'Inquire')}
                    </Text>
                    {isSelected && (
                      <View style={styles.railActiveBadge}>
                        <View style={styles.railActiveDot} />
                        <Text style={styles.railActiveBadgeText}>{t('Ditampilkan', 'Displayed')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : (
        /* GRID VIEW (SEMUA UNIT DENGAN SPESIFIKASI) */
        <View style={styles.fleetGrid}>
          {filteredVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onBookNow={onBookVehicle}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
  },
  // 1. Header Grid
  headerGrid: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
    ...(Platform.OS === 'web'
      ? ({
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          alignItems: 'flex-end',
          gap: 32,
        } as any)
      : {}),
  },
  headerLeft: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  eyebrowText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#0795FE',
  },
  eyebrowLine: {
    width: 64,
    height: 1,
    backgroundColor: '#0795FE',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  headerRight: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 24,
    marginBottom: 16,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeToggleBtn: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeToggleBtnActive: {
    backgroundColor: 'rgba(7, 149, 254, 0.15)',
    borderColor: '#0795FE',
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
  },

  // 2. Category Tabs
  tabsContainer: {
    marginBottom: 24,
  },
  tabsPillBar: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryTab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryTabActive: {
    backgroundColor: '#03579D',
    borderColor: '#0795FE',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // 3. Stage Container
  stageSectionWrap: {
    width: '100%',
  },
  fleetStageMobile: {
    padding: 14,
    borderRadius: 20,
    minHeight: 0,
  },
  stageCarImageMobile: {
    height: 170,
    width: '100%',
  },
  stageBottomBarMobile: {
    padding: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  stageControlsMobile: {
    width: '100%',
  },
  ctaFlexMobile: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetStage: {
    width: '100%',
    minHeight: 480,
    borderRadius: 28,
    backgroundColor: '#02121E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  stageGlow: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: '60%',
    height: '40%',
    borderRadius: 9999,
    backgroundColor: 'rgba(7, 149, 254, 0.14)',
    opacity: 0.95,
  },

  // Top Specs on Stage
  stageTopSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    zIndex: 10,
  },
  stageSpecPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageSpecPillKey: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  stageSpecPillVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  stageSpecPillBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  stageSpecPillBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },

  // Center Arena
  stageCarArena: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    position: 'relative',
    minHeight: 240,
  },
  stageCarShadow: {
    position: 'absolute',
    bottom: 12,
    width: '70%',
    height: 24,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  stageCarTouchable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCarImage: {
    width: '90%',
    height: 220,
    maxWidth: 620,
  },

  // Bottom Bar Overlay
  stageBottomBar: {
    backgroundColor: 'rgba(3, 25, 42, 0.88)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    zIndex: 10,
  },
  stageCarInfo: {
    flex: 1,
    minWidth: 260,
  },
  stageCategoryEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#0795FE',
    marginBottom: 4,
  },
  stageCarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  stageCarTagline: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  stagePriceBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  priceItem: {
    flexDirection: 'column',
  },
  priceItemDriver: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    paddingLeft: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  priceValueDriver: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },

  // Controls & Actions
  stageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  navArrowsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  navArrowBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    lineHeight: 26,
    fontWeight: '300',
  },
  detailCtaBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  detailCtaBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bookingCtaBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 9999,
    backgroundColor: '#03579D',
    borderWidth: 1,
    borderColor: '#0795FE',
    shadowColor: '#0795FE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  bookingCtaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 4. Fleet Rail
  railContainer: {
    marginTop: 20,
  },
  railHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  railLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#94A3B8',
  },
  railHint: {
    fontSize: 12,
    color: '#0795FE',
    fontWeight: '500',
  },
  railScrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  railThumb: {
    width: 160,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  railThumbSelected: {
    backgroundColor: 'rgba(7, 149, 254, 0.16)',
    borderColor: '#0795FE',
    borderWidth: 1.5,
    shadowColor: '#0795FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  railThumbImage: {
    width: '100%',
    height: 70,
    opacity: 0.6,
  },
  railThumbImageSelected: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  railThumbTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  railThumbTitleSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  railThumbPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  railThumbPriceSelected: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  railActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(7, 149, 254, 0.25)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 9999,
    position: 'absolute',
    top: 6,
    right: 6,
  },
  railActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#38BDF8',
  },
  railActiveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38BDF8',
  },

  // Grid Fallback
  fleetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    width: '100%',
  },
});
