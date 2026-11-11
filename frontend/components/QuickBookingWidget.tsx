import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Gauge, BatteryCharging, Users, Zap, ChevronDown } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import { Vehicle } from '../types/fleet';
import { DateField } from './DateField';
import { DurationStepper } from './DurationStepper';
import { ServiceNote } from './PriceBreakdown';
import { getDateError, todayStr } from '../utils/date';

interface QuickBookingWidgetProps {
  vehicles: Vehicle[];
  // true = dipasang di kolom hero (lebar mengikuti kolom, tanpa margin atas)
  embedded?: boolean;
  selectedVehicleId?: string;
  // Dipanggil saat pengunjung memilih model lain (dipakai hero untuk mengganti foto unit)
  onVehicleChange?: (vehicleId: string) => void;
  onQuickBook: (params: {
    vehicleId: string;
    serviceType: 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
    durationDays: number;
    startDate: string;
    pickupLocation: string;
  }) => void;
}

export const QuickBookingWidget: React.FC<QuickBookingWidgetProps> = ({
  vehicles,
  onQuickBook,
  embedded,
  selectedVehicleId: propSelectedVehicleId,
  onVehicleChange,
}) => {
  const { width } = useWindowDimensions();
  const { locale, t } = useLanguage();
  const isNarrow = width < 480;
  const isMobile = width < 768;

  const [serviceType, setServiceType] = useState<'LEPAS_KUNCI' | 'DENGAN_DRIVER'>('LEPAS_KUNCI');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    propSelectedVehicleId || vehicles[0]?.id || ''
  );
  const [durationDays, setDurationDays] = useState<number>(3);
  const [pickupLocation, setPickupLocation] = useState<string>('Bandara I Gusti Ngurah Rai (Kedatangan)');
  const [startDate, setStartDate] = useState<string>(todayStr());
  const [dateError, setDateError] = useState<string | null>(null);

  // Sync with propSelectedVehicleId if provided
  useEffect(() => {
    if (propSelectedVehicleId && propSelectedVehicleId !== selectedVehicleId) {
      setSelectedVehicleId(propSelectedVehicleId);
    }
  }, [propSelectedVehicleId]);

  // Tetap sinkron saat data armada baru selesai dimuat
  useEffect(() => {
    if (!selectedVehicleId && vehicles[0]) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  const [displayedVehicle, setDisplayedVehicle] = useState<Vehicle | undefined>(activeVehicle);

  // Animation values for preview card transition
  const previewFadeAnim = useRef(new Animated.Value(1)).current;
  const previewLiftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!activeVehicle) return;
    if (displayedVehicle && activeVehicle.id === displayedVehicle.id) return;

    // Smooth fade & gentle lift
    Animated.parallel([
      Animated.timing(previewFadeAnim, { toValue: 0.2, duration: 90, useNativeDriver: false }),
      Animated.timing(previewLiftAnim, { toValue: 6, duration: 90, useNativeDriver: false }),
    ]).start(() => {
      setDisplayedVehicle(activeVehicle);
      previewLiftAnim.setValue(-6);
      Animated.parallel([
        Animated.timing(previewFadeAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.timing(previewLiftAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    });
  }, [activeVehicle?.id]);

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId(id);
    onVehicleChange?.(id);
  };

  const handleScrollToFleet = () => {
    if (Platform.OS === 'web') {
      const el = document.getElementById('armada-showcase');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSubmit = () => {
    const err = getDateError(startDate);
    setDateError(err);
    if (err) return;
    onQuickBook({
      vehicleId: selectedVehicleId || vehicles[0]?.id,
      serviceType,
      durationDays,
      startDate,
      pickupLocation,
    });
  };

  const currentPreviewCar = displayedVehicle || activeVehicle;
  const currentRate = currentPreviewCar?.rates?.find((r) => r.serviceType === serviceType);
  const dailyRate = currentRate?.dailyRate || 0;
  const totalRate = dailyRate * durationDays;

  return (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      {/* Service Type Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, serviceType === 'LEPAS_KUNCI' && styles.tabItemActive]}
          onPress={() => setServiceType('LEPAS_KUNCI')}
        >
          <Text style={[styles.tabLabel, serviceType === 'LEPAS_KUNCI' && styles.tabLabelActive]}>
            {isNarrow ? t('Lepas Kunci', 'Self-Drive') : t('Sewa Lepas Kunci (24 Jam)', 'Self-Drive Rental (24 Hours)')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, serviceType === 'DENGAN_DRIVER' && styles.tabItemActive]}
          onPress={() => setServiceType('DENGAN_DRIVER')}
        >
          <Text style={[styles.tabLabel, serviceType === 'DENGAN_DRIVER' && styles.tabLabelActive]}>
            {isNarrow ? t('Dengan Sopir', 'With Driver') : t('Sewa Dengan Pengemudi (12 Jam)', 'With Chauffeur (12 Hours)')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.formContent, isNarrow && { padding: 16, gap: 14 }]}>
        <ServiceNote serviceType={serviceType} />

        {/* Unit Selector */}
        <View style={styles.sectionField}>
          <View style={styles.sectionFieldHeader}>
            <Text style={styles.fieldLabel}>{t('PILIH MODEL KENDARAAN', 'SELECT VEHICLE MODEL')}</Text>
            {activeVehicle && (
              <Text style={styles.fieldSubLabel}>
                {t('Terpilih:', 'Selected:')} <Text style={styles.fieldSubLabelBold}>{activeVehicle.brand} {activeVehicle.model.split(' ')[0]}</Text>
              </Text>
            )}
          </View>

          <View style={styles.carPillRow}>
            {vehicles.map((v) => {
              const isSelected = selectedVehicleId === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.carPill, isSelected && styles.carPillActive]}
                  onPress={() => handleSelectVehicle(v.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.carPillText, isSelected && styles.carPillTextActive]}>
                    {v.brand} {v.model.split(' ')[0]}
                  </Text>
                  <Text style={[styles.carPillSub, isSelected && styles.carPillSubActive]}>
                    ±{v.specs.rangeCltcKm} km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Live Selected Vehicle Preview Card */}
        {currentPreviewCar && (
          <Animated.View
            style={[
              styles.previewCard,
              isMobile && styles.previewCardMobile,
              {
                opacity: previewFadeAnim,
                transform: [{ translateY: previewLiftAnim }],
              },
            ]}
          >
            {/* Left: Thumbnail Car Image */}
            <View style={styles.previewImageWrap}>
              <Image
                source={{ uri: currentPreviewCar.imageUrl }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>

            {/* Middle: Details & Specs Chips */}
            <View style={styles.previewDetails}>
              <View style={styles.previewTitleRow}>
                <Text style={styles.previewName}>
                  {currentPreviewCar.brand} {currentPreviewCar.model}
                </Text>
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>
                    {currentPreviewCar.bodyType === 'CITY_CAR'
                      ? t('City Car', 'City Car EV')
                      : currentPreviewCar.bodyType === 'COMPACT_SUV'
                      ? t('SUV EV', 'Crossover & SUV')
                      : t('MPV 7-Seat', 'Family MPV 7-Seat')}
                  </Text>
                </View>
              </View>

              <View style={styles.previewChipsRow}>
                <View style={styles.previewChip}>
                  <Gauge size={12} color="#0284C7" />
                  <Text style={styles.previewChipText}>± {currentPreviewCar.specs.rangeCltcKm} km</Text>
                </View>
                <View style={styles.previewChip}>
                  <BatteryCharging size={12} color="#0284C7" />
                  <Text style={styles.previewChipText}>{currentPreviewCar.specs.batteryCapacityKwh} kWh</Text>
                </View>
                <View style={styles.previewChip}>
                  <Users size={12} color="#0284C7" />
                  <Text style={styles.previewChipText}>{currentPreviewCar.specs.seatingCapacity} {t('Kursi', 'Seats')}</Text>
                </View>
                <View style={styles.previewChip}>
                  <Zap size={12} color="#0284C7" />
                  <Text style={styles.previewChipText}>{currentPreviewCar.specs.portType}</Text>
                </View>
              </View>
            </View>

            {/* Right: Real-time Price Estimation & Showcase Anchor */}
            <View style={[styles.previewPriceBox, isMobile && styles.previewPriceBoxMobile]}>
              <Text style={styles.previewPriceLabel}>
                {t('Tarif', 'Rate')} {serviceType === 'LEPAS_KUNCI' ? t('Lepas Kunci', 'Self-Drive') : t('Dengan Sopir', 'With Chauffeur')}:
              </Text>
              <Text style={styles.previewDailyPrice}>
                Rp {dailyRate ? dailyRate.toLocaleString('id-ID') : '-'}
                <Text style={styles.previewDailyPriceUnit}> {t('/hari', '/day')}</Text>
              </Text>
              {dailyRate > 0 && durationDays > 1 && (
                <Text style={styles.previewTotalPrice}>
                  {t('Estimasi', 'Est.')} {durationDays} {t('hari', 'days')}: Rp {totalRate.toLocaleString('id-ID')}
                </Text>
              )}
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={styles.previewShowcaseLink}
                  onPress={handleScrollToFleet}
                >
                  <Text style={styles.previewShowcaseLinkText}>{t('Lihat di Panggung Armada', 'View on Fleet Stage')}</Text>
                  <ChevronDown size={13} color="#0284C7" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Row 2: Durasi & Lokasi */}
        <View style={styles.inputRow}>
          <View style={styles.colHalf}>
            <DurationStepper value={durationDays} onChange={setDurationDays} />
          </View>

          <View style={styles.colHalf}>
            <Text style={styles.fieldLabel}>{t('LOKASI SERAH TERIMA UNIT', 'PICKUP & HANDOVER LOCATION')}</Text>
            <TextInput
              style={styles.textInput}
              value={pickupLocation}
              onChangeText={setPickupLocation}
              placeholder={t("Contoh: Bandara, Stasiun, atau Nama Hotel", "E.g., Airport, Station, or Hotel Name")}
              placeholderTextColor="#64748B"
            />
          </View>
        </View>

        <DateField
          value={startDate}
          onChange={(v) => {
            setStartDate(v);
            setDateError(null);
          }}
          error={dateError}
        />

        {/* Action Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>
            {isNarrow
              ? t('LANJUTKAN KE WHATSAPP →', 'CONTINUE TO WHATSAPP →')
              : t('CEK KETERSEDIAAN & LANJUTKAN KE WHATSAPP →', 'CHECK AVAILABILITY & CONTINUE TO WHATSAPP →')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
    marginTop: 24,
  },
  containerEmbedded: {
    maxWidth: undefined,
    marginTop: 0,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F2C4A',
    borderBottomWidth: 1,
    borderBottomColor: '#1A3E66',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: COLORS.white,
    borderBottomColor: COLORS.brandBlue,
  },
  tabLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: COLORS.deepInk,
  },
  formContent: {
    padding: 24,
    gap: 18,
  },
  sectionField: {
    gap: 8,
  },
  sectionFieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
  },
  fieldSubLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  fieldSubLabelBold: {
    color: COLORS.brandBlue,
    fontWeight: '700',
  },
  carPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  carPill: {
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  carPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  carPillTextActive: {
    color: '#0369A1',
  },
  carPillSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  carPillSubActive: {
    color: '#0284C7',
    fontWeight: '700',
  },

  // Live Vehicle Preview Card
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 12,
    gap: 16,
  },
  previewCardMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  previewImageWrap: {
    width: 100,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewDetails: {
    flex: 1,
    gap: 6,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  previewChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  previewPriceBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 16,
  },
  previewPriceBoxMobile: {
    alignItems: 'flex-start',
    borderLeftWidth: 0,
    paddingLeft: 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  previewPriceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  previewDailyPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0369A1',
  },
  previewDailyPriceUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  previewTotalPrice: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
    marginTop: 2,
  },
  previewShowcaseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  previewShowcaseLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },

  // Input Row
  inputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  colHalf: {
    flex: 1,
    minWidth: 260,
    gap: 8,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 12.5,
    color: COLORS.textInk,
    backgroundColor: '#F8FAFC',
  },
  submitBtn: {
    backgroundColor: COLORS.brandBlue,
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
