import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BatteryCharging, Gauge, PlugZap, Users } from 'lucide-react-native';
import { Vehicle } from '../types/fleet';
import { COLORS } from '../constants/colors';

interface VehicleCardProps {
  vehicle: Vehicle;
  onBookNow: (vehicle: Vehicle) => void;
}

const formatCategory = (type: string) => {
  switch (type) {
    case 'CITY_CAR':
      return 'City Car';
    case 'COMPACT_SUV':
      return 'Compact SUV';
    case 'MPV':
      return 'Family MPV (7-Seat)';
    default:
      return type;
  }
};

const webTransition = Platform.OS === 'web' ? ({ transitionProperty: 'transform, box-shadow, border-color', transitionDuration: '220ms', cursor: 'pointer' } as any) : null;
const webImageTransition = Platform.OS === 'web' ? ({ transitionProperty: 'transform', transitionDuration: '350ms' } as any) : null;

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onBookNow }) => {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const lepasRate = vehicle.rates.find((r) => r.serviceType === 'LEPAS_KUNCI');
  const driverRate = vehicle.rates.find((r) => r.serviceType === 'DENGAN_DRIVER');
  const goDetail = () => router.push(`/armada/${vehicle.slug}` as any);

  return (
    // Seluruh kartu bisa diketuk ke halaman detail; tombol di dalamnya tetap punya aksi sendiri
    <Pressable
      accessible={false}
      focusable={false}
      onPress={goDetail}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.card, webTransition, hovered && styles.cardHover]}
    >
      {/* Foto unit */}
      <View style={styles.mediaContainer}>
        <Image
          source={{ uri: vehicle.imageUrl }}
          style={[styles.vehicleImage, webImageTransition, hovered && { transform: [{ scale: 1.05 }] }]}
          resizeMode="contain"
          accessibilityLabel={`${vehicle.brand} ${vehicle.model}`}
        />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{formatCategory(vehicle.bodyType)}</Text>
        </View>
        {vehicle.tags && vehicle.tags.length > 0 && (
          <View style={styles.featureBadge}>
            <Text style={styles.featureBadgeText}>{vehicle.tags[0]}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <Text style={styles.brandSubtitle}>{vehicle.brand.toUpperCase()}</Text>
          <Text style={styles.modelTitle} numberOfLines={2}>
            {vehicle.model}
          </Text>
        </View>

        {/* Spesifikasi utama, satu baris dengan ikon */}
        <View style={styles.specsMatrix}>
          <Spec icon={Gauge} value={`${vehicle.specs.rangeCltcKm} km`} label="Jarak" />
          <View style={styles.specDivider} />
          <Spec icon={BatteryCharging} value={`${vehicle.specs.batteryCapacityKwh} kWh`} label="Baterai" />
          <View style={styles.specDivider} />
          <Spec icon={Users} value={`${vehicle.specs.seatingCapacity}`} label="Kursi" />
          <View style={styles.specDivider} />
          <Spec icon={PlugZap} value={String(vehicle.specs.portType).replace('_', '/')} label="Port" />
        </View>

        <View style={styles.equipmentBanner}>
          <View style={styles.checkDot} />
          <Text style={styles.equipmentText}>Termasuk Portable Charger 2.2 kW & kabel grounding</Text>
        </View>

        {/* Harga */}
        <View style={styles.pricingSection}>
          <View>
            <Text style={styles.pricingLabel}>Lepas kunci • 24 jam</Text>
            <Text style={styles.priceFigure}>
              Rp {lepasRate?.dailyRate.toLocaleString('id-ID')}
              <Text style={styles.priceUnit}> / hari</Text>
            </Text>
          </View>
          {driverRate && (
            <View style={styles.driverSubInfo}>
              <Text style={styles.driverSubLabel}>Dengan sopir</Text>
              <Text style={styles.driverSubPrice}>Rp {driverRate.dailyRate.toLocaleString('id-ID')}/hari</Text>
            </View>
          )}
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.btnOutline} onPress={goDetail} accessibilityRole="link">
            <Text style={styles.btnOutlineText}>Detail Unit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => onBookNow(vehicle)} accessibilityRole="button">
            <Text style={styles.btnPrimaryText}>Reservasi WA →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
};

const Spec: React.FC<{ icon: React.ComponentType<any>; value: string; label: string }> = ({ icon: Icon, value, label }) => (
  <View style={styles.specColumn}>
    <Icon size={16} color={COLORS.brandBlue} />
    <Text style={styles.specVal} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.specKey}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 370,
    shadowColor: '#03192A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  cardHover: {
    borderColor: '#93C5FD',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    transform: [{ translateY: -5 }],
  },
  mediaContainer: {
    height: 210,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(3, 25, 42, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  featureBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.brandBlue,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  featureBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    padding: 18,
    gap: 14,
  },
  titleBlock: {
    gap: 2,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandBlue,
    letterSpacing: 1.3,
  },
  modelTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.deepInk,
    letterSpacing: -0.3,
    lineHeight: 25,
  },
  specsMatrix: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    paddingVertical: 10,
  },
  specColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  specDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  specKey: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  specVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.deepInk,
  },
  equipmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  checkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  equipmentText: {
    flex: 1,
    fontSize: 12.5,
    color: '#166534',
    fontWeight: '600',
    lineHeight: 18,
  },
  pricingSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 2,
  },
  pricingLabel: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  priceFigure: {
    fontSize: 23,
    fontWeight: '900',
    color: COLORS.deepInk,
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  driverSubInfo: {
    alignItems: 'flex-end',
  },
  driverSubLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  driverSubPrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.brandBlue,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  btnOutline: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  btnOutlineText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.deepInk,
  },
  btnPrimary: {
    flex: 1.3,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: COLORS.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.white,
  },
});
