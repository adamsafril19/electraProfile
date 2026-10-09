import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { Vehicle } from '../../types/fleet';
import { fetchVehicleBySlug } from '../../services/api';
import { WhatsAppModal } from '../../components/WhatsAppModal';

export default function VehicleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<'LEPAS_KUNCI' | 'DENGAN_DRIVER'>('LEPAS_KUNCI');

  useEffect(() => {
    if (slug) {
      fetchVehicleBySlug(slug).then((data) => {
        setVehicle(data || null);
        setLoading(false);
      });
    }
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

  const lepasRate = vehicle.rates.find(r => r.serviceType === 'LEPAS_KUNCI');
  const driverRate = vehicle.rates.find(r => r.serviceType === 'DENGAN_DRIVER');
  const currentPrice = selectedService === 'LEPAS_KUNCI' ? lepasRate?.dailyRate : driverRate?.dailyRate;

  return (
    <View style={{ flex: 1 }}>
    <View style={[styles.container, isMobile && { paddingBottom: 96 }]}>
      <View style={styles.inner}>
        {/* Breadcrumb Navigation */}
        <TouchableOpacity onPress={() => router.push('/armada')} style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>← Kembali ke Katalog Armada</Text>
        </TouchableOpacity>

        {/* Top Showcase: Media & Pricing Card */}
        <View style={styles.topGrid}>
          {/* Studio Media Column */}
          <View style={[styles.mediaCol, isMobile && { minWidth: 0, height: 240, flexBasis: '100%' }]}>
            <Image
              source={{ uri: vehicle.imageUrl }}
              style={[
                styles.vehicleImg,
                vehicle.slug === 'byd-atto-3-superior' && { transform: [{ scale: 1.35 }] }
              ]}
              resizeMode="contain"
            />
            <View style={styles.badgeTop}>
              <Text style={styles.badgeTopText}>{vehicle.bodyType.replace('_', ' ')}</Text>
            </View>
          </View>

          {/* Pricing & Booking Card */}
          <View style={[styles.bookingCard, isMobile && { minWidth: 0, flexBasis: '100%' }]}>
            <Text style={styles.brandSubtitle}>{vehicle.brand.toUpperCase()}</Text>
            <Text style={styles.modelTitle}>{vehicle.model}</Text>

            {/* Service Toggle */}
            <View style={styles.serviceTabRow}>
              <TouchableOpacity
                style={[styles.serviceTab, selectedService === 'LEPAS_KUNCI' && styles.serviceTabActive]}
                onPress={() => setSelectedService('LEPAS_KUNCI')}
              >
                <Text style={[styles.serviceTabText, selectedService === 'LEPAS_KUNCI' && styles.serviceTabTextActive]}>
                  Lepas Kunci (24 Jam)
                </Text>
              </TouchableOpacity>
              {driverRate && (
                <TouchableOpacity
                  style={[styles.serviceTab, selectedService === 'DENGAN_DRIVER' && styles.serviceTabActive]}
                  onPress={() => setSelectedService('DENGAN_DRIVER')}
                >
                  <Text style={[styles.serviceTabText, selectedService === 'DENGAN_DRIVER' && styles.serviceTabTextActive]}>
                    Dengan Sopir (12 Jam)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Price Presentation */}
            <View style={[styles.priceRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
              <View>
                <Text style={styles.priceLabel}>Tarif Sewa Harian</Text>
                <Text style={styles.priceFigure}>
                  Rp {currentPrice?.toLocaleString('id-ID')}
                  <Text style={styles.priceUnit}> / hari</Text>
                </Text>
              </View>
              {!isMobile && (
                <TouchableOpacity
                  style={styles.ctaBooking}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.ctaBookingText}>Reservasi WhatsApp →</Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedService === 'LEPAS_KUNCI' && lepasRate && (
              <View style={styles.depositNotice}>
                <Text style={styles.depositNoticeText}>
                  * Deposit jaminan: Rp {lepasRate.depositAmount.toLocaleString('id-ID')} (dikembalikan penuh via transfer H+1 s/d H+3 hari kerja setelah unit kembali bebas ETLE).
                </Text>
              </View>
            )}

            {/* Key Specs Pills */}
            <View style={styles.matrixRow}>
              <View style={styles.matrixItem}>
                <Text style={styles.matrixKey}>JARAK TEMPUH</Text>
                <Text style={styles.matrixVal}>± {vehicle.specs.rangeCltcKm} km</Text>
              </View>
              <View style={styles.matrixItem}>
                <Text style={styles.matrixKey}>BATERAI</Text>
                <Text style={styles.matrixVal}>{vehicle.specs.batteryCapacityKwh} kWh</Text>
              </View>
              <View style={styles.matrixItem}>
                <Text style={styles.matrixKey}>PORT COLOKAN</Text>
                <Text style={styles.matrixVal}>{vehicle.specs.portType}</Text>
              </View>
              <View style={styles.matrixItem}>
                <Text style={styles.matrixKey}>KAPASITAS</Text>
                <Text style={styles.matrixVal}>{vehicle.specs.seatingCapacity} Penumpang</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Technical Specification Table */}
        <View style={styles.specSection}>
          <Text style={styles.sectionHeading}>Spesifikasi Teknis Lengkap</Text>
          <View style={styles.specTable}>
            <View style={styles.tableRow}>
              <Text style={styles.tableKey}>Kapasitas Paket Baterai</Text>
              <Text style={styles.tableVal}>{vehicle.specs.batteryCapacityKwh} kWh (Lithium Iron Phosphate / Blade Battery)</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlt]}>
              <Text style={styles.tableKey}>Estimasi Jarak Tempuh Penuh</Text>
              <Text style={styles.tableVal}>± {vehicle.specs.rangeCltcKm} km (Baterai 100%)</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableKey}>Tipe Soket Charging</Text>
              <Text style={styles.tableVal}>
                {vehicle.specs.portType}
                {vehicle.specs.gbtAdapterIncluded ? ' (Termasuk Adaptor Fast Charge GB/T ke CCS2)' : ''}
              </Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlt]}>
              <Text style={styles.tableKey}>Waktu Pengisian AC Rumah</Text>
              <Text style={styles.tableVal}>~{vehicle.specs.chargingTimeAcHours} Jam (Daya min. 2.200 VA)</Text>
            </View>
            {vehicle.specs.maxDcKw && (
              <View style={styles.tableRow}>
                <Text style={styles.tableKey}>Dukungan DC Fast Charging</Text>
                <Text style={styles.tableVal}>
                  Didukung hingga {vehicle.specs.maxDcKw} kW (~{vehicle.specs.chargingTimeDcMinutes || 35} menit ke 80%)
                </Text>
              </View>
            )}
            <View style={[styles.tableRow, styles.tableRowAlt]}>
              <Text style={styles.tableKey}>Kelengkapan Unit Bawaan</Text>
              <Text style={styles.tableVal}>Portable Home Charger 2.2 kW + Kabel Grounding 15 Meter</Text>
            </View>
          </View>
        </View>

        {/* Inclusions vs Exclusions Breakdown */}
        <View style={styles.incSection}>
          <View style={styles.incCard}>
            <Text style={styles.incHeaderSuccess}>Fasilitas Termasuk dalam Tarif</Text>
            <Text style={styles.incItem}>• Pemakaian unit 24 jam penuh per hari sewa (Lepas Kunci)</Text>
            <Text style={styles.incItem}>• Level baterai diserahkan minimal 80% hingga 100%</Text>
            <Text style={styles.incItem}>• Portable Home Charger 2.2 kW dan kabel arde grounding</Text>
            <Text style={styles.incItem}>• Garansi pengiriman kendaraan pengganti jika terjadi kendala teknis</Text>
            <Text style={styles.incItem}>• Layanan derek darurat 24 Jam Roadside Assistance</Text>
          </View>

          <View style={styles.incCard}>
            <Text style={styles.incHeaderMuted}>Tidak Termasuk</Text>
            <Text style={styles.incItem}>• Biaya pengisian daya di stasiun SPKLU umum berbayar</Text>
            <Text style={styles.incItem}>• Biaya e-toll, bahan parkir, dan retribusi jalan</Text>
            <Text style={styles.incItem}>• Pengantaran unit di luar radius gratis pool (lebih dari 15 km)</Text>
          </View>
        </View>
      </View>

      <WhatsAppModal
        visible={modalVisible}
        vehicle={vehicle}
        initialServiceType={selectedService}
        onClose={() => setModalVisible(false)}
      />
    </View>

    {/* Sticky Floating CTA (Mobile) */}
    {isMobile && (
      <View style={styles.stickyBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stickyName} numberOfLines={1}>{vehicle.brand} {vehicle.model}</Text>
          <Text style={styles.stickyPrice}>Rp {currentPrice?.toLocaleString('id-ID')} / hari</Text>
        </View>
        <TouchableOpacity style={styles.stickyBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.stickyBtnText}>Booking via WhatsApp</Text>
        </TouchableOpacity>
      </View>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
  },
  inner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  centerBox: {
    paddingVertical: 100,
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: COLORS.brandBlue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  backBtnText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  breadcrumb: {
    marginBottom: 20,
  },
  breadcrumbText: {
    fontSize: 12.5,
    color: COLORS.brandBlue,
    fontWeight: '700',
  },
  topGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    marginBottom: 40,
  },
  mediaCol: {
    flex: 1.2,
    minWidth: 320,
    height: 360,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  vehicleImg: {
    width: '100%',
    height: '100%',
  },
  badgeTop: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(3, 25, 42, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
  },
  badgeTopText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  bookingCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brandBlue,
    letterSpacing: 1.2,
  },
  modelTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.deepInk,
    marginVertical: 4,
  },
  serviceTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 3,
    marginVertical: 14,
  },
  serviceTab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  serviceTabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  serviceTabTextActive: {
    color: COLORS.deepInk,
    fontWeight: '800',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  priceFigure: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.deepInk,
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  ctaBooking: {
    backgroundColor: COLORS.brandBlue,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
  },
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
  stickyName: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  stickyPrice: {
    color: '#7DD3FC',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  stickyBtn: {
    backgroundColor: COLORS.whatsapp,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  stickyBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  ctaBookingText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
  },
  depositNotice: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 4,
    marginVertical: 10,
  },
  depositNoticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  matrixRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  matrixItem: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    alignItems: 'center',
  },
  matrixKey: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  matrixVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.deepInk,
  },
  specSection: {
    marginBottom: 40,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.deepInk,
    marginBottom: 16,
  },
  specTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'space-between',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableKey: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  tableVal: {
    fontSize: 13,
    color: '#475569',
    flex: 1.5,
    textAlign: 'right',
  },
  incSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  incCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  incHeaderSuccess: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 12,
  },
  incHeaderMuted: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 12,
  },
  incItem: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 6,
  },
});
