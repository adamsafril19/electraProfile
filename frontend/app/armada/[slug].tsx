import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { BatteryCharging, Check, ChevronLeft, Gauge, MessageCircle, PlugZap, ShieldCheck, Users, Zap } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { Vehicle } from '../../types/fleet';
import { fetchVehicleResult } from '../../services/api';
import { OfflineBanner } from '../../components/OfflineBanner';
import { WhatsAppModal } from '../../components/WhatsAppModal';
import { DateField } from '../../components/DateField';
import { DurationStepper } from '../../components/DurationStepper';
import { PriceBreakdown, ServiceNote } from '../../components/PriceBreakdown';
import { FadeIn } from '../../components/FadeIn';
import { getDateError, todayStr } from '../../utils/date';

export default function VehicleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isWide = width >= 900;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<'LEPAS_KUNCI' | 'DENGAN_DRIVER'>('LEPAS_KUNCI');
  const [durationDays, setDurationDays] = useState(3);
  const [startDate, setStartDate] = useState(todayStr());
  const [dateError, setDateError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  // Tanggal harus valid sebelum modal dibuka, karena modal hanya menampilkan ringkasan
  const openBooking = () => {
    const err = getDateError(startDate);
    setDateError(err);
    if (!err) setModalVisible(true);
  };

  const loadVehicle = () => {
    if (!slug) return;
    setLoading(true);
    fetchVehicleResult(slug).then(({ vehicle: data, offline: isOffline }) => {
      setVehicle(data || null);
      setOffline(isOffline);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadVehicle();
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={COLORS.brandBlue} />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.notFoundText}>Unit kendaraan tidak ditemukan</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/armada')}>
          <Text style={styles.backBtnText}>← Kembali ke Katalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lepasRate = vehicle.rates.find((r) => r.serviceType === 'LEPAS_KUNCI');
  const driverRate = vehicle.rates.find((r) => r.serviceType === 'DENGAN_DRIVER');
  const currentPrice = (selectedService === 'LEPAS_KUNCI' ? lepasRate?.dailyRate : driverRate?.dailyRate) || 0;
  const totalPrice = currentPrice * durationDays;

  const highlights = [
    { icon: Gauge, label: 'Jarak tempuh', value: `± ${vehicle.specs.rangeCltcKm} km` },
    { icon: BatteryCharging, label: 'Baterai', value: `${vehicle.specs.batteryCapacityKwh} kWh` },
    { icon: PlugZap, label: 'Port colokan', value: String(vehicle.specs.portType).replace('_', '/') },
    { icon: Users, label: 'Kapasitas', value: `${vehicle.specs.seatingCapacity} penumpang` },
  ];

  const inclusions = (
    <View style={styles.incSection}>
            <View style={[styles.incCard, styles.incOk]}>
              <View style={styles.incHeadRow}>
                <ShieldCheck size={18} color="#15803D" />
                <Text style={styles.incHeaderSuccess}>Fasilitas termasuk dalam tarif</Text>
              </View>
              {[
                'Pemakaian unit 24 jam penuh per hari sewa (Lepas Kunci)',
                'Level baterai diserahkan minimal 80% hingga 100%',
                'Portable Home Charger 2.2 kW dan kabel arde grounding',
                'Garansi pengiriman kendaraan pengganti jika terjadi kendala teknis',
                'Layanan derek darurat 24 jam Roadside Assistance',
              ].map((t) => (
                <View key={t} style={styles.incRow}>
                  <Check size={15} color="#15803D" style={{ marginTop: 3 }} />
                  <Text style={styles.incItem}>{t}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.incCard, styles.incNo]}>
              <View style={styles.incHeadRow}>
                <Text style={styles.incHeaderMuted}>Tidak termasuk</Text>
              </View>
              {[
                'Biaya pengisian daya di stasiun SPKLU umum berbayar',
                'Biaya e-toll, bahan parkir, dan retribusi jalan',
                'Pengantaran unit di luar radius gratis pool (lebih dari 15 km)',
              ].map((t) => (
                <View key={t} style={styles.incRow}>
                  <Text style={styles.incBullet}>•</Text>
                  <Text style={styles.incItem}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
  );

  const trust = ['Baterai 80–100% saat serah terima', 'Unit pengganti 60–90 menit', 'Roadside assistance 24 jam'];

  return (
    <View style={{ flex: 1 }}>
      <Head>
        <title>{`${vehicle.brand} ${vehicle.model} • Sewa Mobil Listrik | Electra`}</title>
        <meta
          name="description"
          content={`Sewa ${vehicle.brand} ${vehicle.model}: jarak tempuh ± ${vehicle.specs.rangeCltcKm} km, mulai Rp ${(lepasRate?.dailyRate || 0).toLocaleString('id-ID')}/hari. Lepas kunci atau dengan sopir.`}
        />
      </Head>

      <View style={[styles.container, isMobile && { paddingBottom: 96 }]}>
        <View style={styles.inner}>
          {offline && <OfflineBanner onRetry={loadVehicle} />}

          {/* Breadcrumb */}
          <TouchableOpacity onPress={() => router.push('/armada')} style={styles.breadcrumb} accessibilityRole="link">
            <ChevronLeft size={16} color={COLORS.brandBlue} />
            <Text style={styles.breadcrumbText}>Katalog Armada</Text>
            <Text style={styles.breadcrumbSep}>/</Text>
            <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
              {vehicle.brand} {vehicle.model}
            </Text>
          </TouchableOpacity>

          <View style={[styles.topGrid, !isWide && { flexDirection: 'column' }]}>
            {/* Kolom kiri: foto & sorotan spesifikasi */}
            <View style={[styles.leftCol, isWide && { flex: 1.15 }]}>
              <FadeIn>
                <View style={[styles.mediaCard, isMobile && { height: 260, padding: 14 }]}>
                  <Image source={{ uri: vehicle.imageUrl }} style={styles.vehicleImg} resizeMode="contain" accessibilityLabel={`${vehicle.brand} ${vehicle.model}`} />
                  <View style={styles.badgeTop}>
                    <Text style={styles.badgeTopText}>{vehicle.bodyType.replace('_', ' ')}</Text>
                  </View>
                </View>
              </FadeIn>

              <FadeIn delay={80}>
                <View style={styles.highlightGrid}>
                  {highlights.map((h) => {
                    const Icon = h.icon;
                    return (
                      <View key={h.label} style={styles.highlight}>
                        <View style={styles.highlightIcon}>
                          <Icon size={20} color={COLORS.brandBlue} />
                        </View>
                        <Text style={styles.highlightLabel}>{h.label}</Text>
                        <Text style={styles.highlightValue}>{h.value}</Text>
                      </View>
                    );
                  })}
                </View>
              </FadeIn>

              <FadeIn delay={140}>
                <View style={styles.chargeCard}>
                  <View style={styles.chargeIcon}>
                    <Zap size={18} color="#B45309" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chargeTitle}>Pengisian daya</Text>
                    <Text style={styles.chargeText}>
                      AC rumah ~{vehicle.specs.chargingTimeAcHours} jam (daya min. 2.200 VA)
                      {vehicle.specs.maxDcKw ? ` • DC cepat hingga ${vehicle.specs.maxDcKw} kW (~${vehicle.specs.chargingTimeDcMinutes || 35} menit ke 80%)` : ''}
                      {vehicle.specs.gbtAdapterIncluded ? ' • termasuk adaptor GB/T ke CCS2' : ''}
                    </Text>
                  </View>
                </View>
              </FadeIn>

              {isWide && inclusions}
            </View>

            {/* Kolom kanan: kartu pemesanan (menempel saat menggulir di layar lebar) */}
            <View style={[styles.rightCol, isWide && styles.rightColSticky]}>
              <FadeIn delay={100} distance={20}>
                <View style={styles.bookingCard}>
                  <Text style={styles.brandSubtitle}>{vehicle.brand.toUpperCase()}</Text>
                  <Text style={styles.modelTitle}>{vehicle.model}</Text>

                  {/* Pilihan layanan */}
                  <View style={styles.serviceTabRow}>
                    <TouchableOpacity
                      style={[styles.serviceTab, selectedService === 'LEPAS_KUNCI' && styles.serviceTabActive]}
                      onPress={() => setSelectedService('LEPAS_KUNCI')}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedService === 'LEPAS_KUNCI' }}
                    >
                      <Text style={[styles.serviceTabText, selectedService === 'LEPAS_KUNCI' && styles.serviceTabTextActive]}>Lepas Kunci (24 Jam)</Text>
                    </TouchableOpacity>
                    {driverRate && (
                      <TouchableOpacity
                        style={[styles.serviceTab, selectedService === 'DENGAN_DRIVER' && styles.serviceTabActive]}
                        onPress={() => setSelectedService('DENGAN_DRIVER')}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedService === 'DENGAN_DRIVER' }}
                      >
                        <Text style={[styles.serviceTabText, selectedService === 'DENGAN_DRIVER' && styles.serviceTabTextActive]}>Dengan Sopir (12 Jam)</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.priceLabel}>Tarif sewa harian</Text>
                      <Text style={styles.priceFigure}>
                        Rp {currentPrice.toLocaleString('id-ID')}
                        <Text style={styles.priceUnit}> / hari</Text>
                      </Text>
                    </View>
                  </View>
                  <ServiceNote serviceType={selectedService} />

                  <View style={[styles.formBlock, isWide && styles.formBlockRow]}>
                    <View style={isWide ? { flex: 1, minWidth: 0 } : undefined}>
                      <DurationStepper value={durationDays} onChange={setDurationDays} hideHelper={isWide} />
                    </View>
                    <View style={isWide ? { flex: 1.15, minWidth: 0 } : undefined}>
                      <DateField
                        value={startDate}
                        onChange={(v) => {
                          setStartDate(v);
                          setDateError(null);
                        }}
                        error={dateError}
                      />
                    </View>
                  </View>

                  <View style={styles.breakdownBox}>
                    <PriceBreakdown serviceType={selectedService} dailyRate={currentPrice} days={durationDays} depositAmount={lepasRate?.depositAmount || 0} />
                  </View>

                  {/* CTA di akhir alur: setelah memilih layanan, durasi, dan tanggal */}
                  <TouchableOpacity style={styles.ctaBooking} onPress={openBooking} accessibilityRole="button" accessibilityLabel="Reservasi lewat WhatsApp">
                    <MessageCircle size={20} color="#FFFFFF" />
                    <Text style={styles.ctaBookingText}>Reservasi via WhatsApp</Text>
                  </TouchableOpacity>
                  <Text style={styles.ctaNote}>Gratis tanpa biaya booking. Admin konfirmasi ketersediaan lewat WhatsApp.</Text>

                  <View style={styles.trustList}>
                    {trust.map((t) => (
                      <View key={t} style={styles.trustItem}>
                        <Check size={15} color={COLORS.whatsapp} />
                        <Text style={styles.trustText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </FadeIn>
            </View>
          </View>

          {/* Spesifikasi teknis */}
          <View style={styles.specSection}>
            <Text style={styles.sectionHeading}>Spesifikasi Teknis Lengkap</Text>
            <View style={styles.specTable}>
              <SpecRow label="Kapasitas Paket Baterai" value={`${vehicle.specs.batteryCapacityKwh} kWh (Lithium Iron Phosphate / Blade Battery)`} />
              <SpecRow alt label="Estimasi Jarak Tempuh Penuh" value={`± ${vehicle.specs.rangeCltcKm} km (Baterai 100%)`} />
              <SpecRow label="Tipe Soket Charging" value={`${vehicle.specs.portType}${vehicle.specs.gbtAdapterIncluded ? ' (Termasuk Adaptor Fast Charge GB/T ke CCS2)' : ''}`} />
              <SpecRow alt label="Waktu Pengisian AC Rumah" value={`~${vehicle.specs.chargingTimeAcHours} Jam (Daya min. 2.200 VA)`} />
              {vehicle.specs.maxDcKw ? (
                <SpecRow label="Dukungan DC Fast Charging" value={`Didukung hingga ${vehicle.specs.maxDcKw} kW (~${vehicle.specs.chargingTimeDcMinutes || 35} menit ke 80%)`} />
              ) : null}
              <SpecRow alt label="Kelengkapan Unit Bawaan" value="Portable Home Charger 2.2 kW + Kabel Grounding 15 Meter" />
            </View>
          </View>

          {/* Spesifikasi teknis lengkap sudah di atas; termasuk/tidak termasuk di layar sempit ditaruh di sini */}
          {!isWide && inclusions}
        </View>

        <WhatsAppModal
          visible={modalVisible}
          vehicle={vehicle}
          initialServiceType={selectedService}
          initialDurationDays={durationDays}
          initialStartDate={startDate}
          showSelectors={false}
          onClose={() => setModalVisible(false)}
        />
      </View>

      {/* Bar CTA tetap (mobile) */}
      {isMobile && (
        <View style={styles.stickyBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stickyName} numberOfLines={1}>
              {vehicle.brand} {vehicle.model}
            </Text>
            <Text style={styles.stickyPrice}>
              Rp {totalPrice.toLocaleString('id-ID')} / {durationDays} hari
            </Text>
          </View>
          <TouchableOpacity style={styles.stickyBtn} onPress={openBooking} accessibilityRole="button">
            <Text style={styles.stickyBtnText}>Booking via WhatsApp</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const SpecRow: React.FC<{ label: string; value: string; alt?: boolean }> = ({ label, value, alt }) => (
  <View style={[styles.tableRow, alt && styles.tableRowAlt]}>
    <Text style={styles.tableKey}>{label}</Text>
    <Text style={styles.tableVal}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 28 },
  inner: { maxWidth: 1200, width: '100%', alignSelf: 'center', paddingHorizontal: 16 },
  centerBox: { paddingVertical: 100, alignItems: 'center' },
  notFoundText: { fontSize: 15, color: '#475569', marginBottom: 16 },
  backBtn: { backgroundColor: COLORS.brandBlue, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  backBtnText: { color: COLORS.white, fontWeight: '700' },

  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18, minHeight: 44, alignSelf: 'flex-start' },
  breadcrumbText: { fontSize: 13.5, color: COLORS.brandBlue, fontWeight: '700' },
  breadcrumbSep: { fontSize: 13.5, color: '#94A3B8' },
  breadcrumbCurrent: { fontSize: 13.5, color: '#475569', fontWeight: '600', flexShrink: 1 },

  topGrid: { flexDirection: 'row', gap: 32, marginBottom: 48, alignItems: 'flex-start' },
  leftCol: { gap: 16, minWidth: 0, width: '100%' },
  rightCol: { width: '100%', minWidth: 0 },
  rightColSticky: {
    flex: 1,
    maxWidth: 500,
    ...(Platform.OS === 'web' ? ({ position: 'sticky', top: 96, alignSelf: 'flex-start' } as any) : null),
  },

  mediaCard: {
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    position: 'relative',
  },
  vehicleImg: { width: '100%', height: '100%' },
  badgeTop: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(3, 25, 42, 0.92)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  badgeTopText: { color: COLORS.white, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },

  highlightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  highlight: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 2,
  },
  highlightIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#EBF4FC', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  highlightLabel: { fontSize: 12.5, fontWeight: '600', color: '#64748B' },
  highlightValue: { fontSize: 16, fontWeight: '900', color: COLORS.deepInk },

  chargeCard: { flexDirection: 'row', gap: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 14, padding: 14 },
  chargeIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  chargeTitle: { fontSize: 14, fontWeight: '800', color: '#78350F' },
  chargeText: { fontSize: 13, color: '#92400E', lineHeight: 19, marginTop: 2 },

  bookingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0B1B2E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 4,
  },
  brandSubtitle: { fontSize: 12, fontWeight: '800', color: COLORS.brandBlue, letterSpacing: 1.3 },
  modelTitle: { fontSize: 26, fontWeight: '900', color: COLORS.deepInk, letterSpacing: -0.4, marginTop: -6 },
  serviceTabRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 4 },
  serviceTab: { flex: 1, minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 8, paddingHorizontal: 6 },
  serviceTabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  serviceTabText: { fontSize: 12.5, fontWeight: '600', color: '#64748B', textAlign: 'center' },
  serviceTabTextActive: { color: COLORS.deepInk, fontWeight: '800' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  priceLabel: { fontSize: 12.5, color: '#64748B', marginBottom: 2 },
  priceFigure: { fontSize: 30, fontWeight: '900', color: COLORS.deepInk, letterSpacing: -0.6 },
  priceUnit: { fontSize: 13.5, fontWeight: '600', color: '#64748B' },
  formBlock: { gap: 14, paddingTop: 6 },
  formBlockRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  breakdownBox: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#EDF2F7', padding: 14 },

  ctaBooking: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: COLORS.whatsapp,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
  },
  ctaBookingText: { color: COLORS.white, fontWeight: '800', fontSize: 15.5 },
  ctaNote: { fontSize: 12.5, color: '#64748B', textAlign: 'center', lineHeight: 18, marginTop: -2 },
  trustList: { gap: 7, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDF2F7' },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { fontSize: 13, color: '#334155', fontWeight: '600' },

  stickyBar: {
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.deepInk,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 50,
  },
  stickyName: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  stickyPrice: { color: '#7DD3FC', fontSize: 13, fontWeight: '700', marginTop: 2 },
  stickyBtn: { backgroundColor: COLORS.whatsapp, minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 10 },
  stickyBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },

  specSection: { marginBottom: 40 },
  sectionHeading: { fontSize: 22, fontWeight: '900', color: COLORS.deepInk, marginBottom: 16, letterSpacing: -0.3 },
  specTable: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 18, backgroundColor: COLORS.white, justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  tableRowAlt: { backgroundColor: '#F8FAFC' },
  tableKey: { fontSize: 14, fontWeight: '700', color: '#334155', flexBasis: 200, flexGrow: 1 },
  tableVal: { fontSize: 14, color: '#475569', flexBasis: 240, flexGrow: 2, textAlign: 'right' },

  incSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  incCard: { flex: 1, minWidth: 260, borderRadius: 14, padding: 20, borderWidth: 1 },
  incOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  incNo: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  incHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  incHeaderSuccess: { fontSize: 15, fontWeight: '800', color: '#15803D' },
  incHeaderMuted: { fontSize: 15, fontWeight: '800', color: '#991B1B' },
  incRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  incItem: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 21 },
  incBullet: { width: 15, textAlign: 'center', fontSize: 15, color: '#991B1B', lineHeight: 21 },
});
