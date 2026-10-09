import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Vehicle } from '../types/fleet';
import { COLORS } from '../constants/colors';

interface VehicleCardProps {
  vehicle: Vehicle;
  onBookNow: (vehicle: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onBookNow }) => {
  const router = useRouter();

  const lepasRate = vehicle.rates.find(r => r.serviceType === 'LEPAS_KUNCI');
  const driverRate = vehicle.rates.find(r => r.serviceType === 'DENGAN_DRIVER');

  const formatCategory = (type: string) => {
    switch (type) {
      case 'CITY_CAR': return 'City Car';
      case 'COMPACT_SUV': return 'Compact SUV';
      case 'MPV': return 'Family MPV (7-Seat)';
      default: return type;
    }
  };

  return (
    <View style={styles.card}>
      {/* Studio Header & Image Container */}
      <View style={styles.mediaContainer}>
        <Image source={{ uri: vehicle.imageUrl }} style={styles.vehicleImage} resizeMode="contain" />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{formatCategory(vehicle.bodyType)}</Text>
        </View>
        {vehicle.tags && vehicle.tags.length > 0 && (
          <View style={styles.featureBadge}>
            <Text style={styles.featureBadgeText}>{vehicle.tags[0]}</Text>
          </View>
        )}
      </View>

      {/* Vehicle Info */}
      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <Text style={styles.brandSubtitle}>{vehicle.brand.toUpperCase()}</Text>
          <Text style={styles.modelTitle}>{vehicle.model}</Text>
        </View>

        {/* Technical Specs Matrix (Clean Corporate Layout) */}
        <View style={styles.specsMatrix}>
          <View style={styles.specColumn}>
            <Text style={styles.specKey}>JARAK TEMPUH</Text>
            <Text style={styles.specVal}>± {vehicle.specs.rangeCltcKm} km</Text>
          </View>
          <View style={styles.specDivider} />
          <View style={styles.specColumn}>
            <Text style={styles.specKey}>TIPE PORT</Text>
            <Text style={styles.specVal}>{vehicle.specs.portType}</Text>
          </View>
          <View style={styles.specDivider} />
          <View style={styles.specColumn}>
            <Text style={styles.specKey}>KAPASITAS</Text>
            <Text style={styles.specVal}>{vehicle.specs.seatingCapacity} Kursi</Text>
          </View>
        </View>

        {/* Guaranteed Equipment Banner */}
        <View style={styles.equipmentBanner}>
          <View style={styles.checkDot} />
          <Text style={styles.equipmentText}>
            Termasuk Portable Charger 2.2 kW & Kabel Grounding
          </Text>
        </View>

        {/* Pricing Architecture (INDORENT Transparent Retail) */}
        <View style={styles.pricingSection}>
          <View>
            <Text style={styles.pricingLabel}>Mulai dari (Lepas Kunci 24 Jam):</Text>
            <Text style={styles.priceFigure}>
              Rp {lepasRate?.dailyRate.toLocaleString('id-ID')}
              <Text style={styles.priceUnit}> / hari</Text>
            </Text>
          </View>
          {driverRate && (
            <View style={styles.driverSubInfo}>
              <Text style={styles.driverSubLabel}>Dengan Sopir:</Text>
              <Text style={styles.driverSubPrice}>Rp {driverRate.dailyRate.toLocaleString('id-ID')}/hari</Text>
            </View>
          )}
        </View>

        {/* Corporate Actions */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => router.push(`/armada/${vehicle.slug}` as any)}
          >
            <Text style={styles.btnOutlineText}>Detail Unit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => onBookNow(vehicle)}
          >
            <Text style={styles.btnPrimaryText}>Reservasi WA →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 370,
    shadowColor: '#03192A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  mediaContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(3, 25, 42, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: COLORS.white,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featureBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.brandBlue,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featureBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  body: {
    padding: 20,
  },
  titleBlock: {
    marginBottom: 16,
  },
  brandSubtitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.brandBlue,
    letterSpacing: 1.2,
  },
  modelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textInk,
    marginTop: 2,
    lineHeight: 24,
  },
  specsMatrix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  specColumn: {
    flex: 1,
    alignItems: 'center',
  },
  specKey: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textInk,
  },
  specDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  equipmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
    marginBottom: 16,
    gap: 8,
  },
  checkDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  equipmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
    flex: 1,
  },
  pricingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginBottom: 16,
  },
  pricingLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 2,
  },
  priceFigure: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.deepInk,
    letterSpacing: -0.3,
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  driverSubInfo: {
    alignItems: 'flex-end',
  },
  driverSubLabel: {
    fontSize: 9.5,
    color: '#64748B',
  },
  driverSubPrice: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.brandBlue,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  btnOutline: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  btnOutlineText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.deepInk,
  },
  btnPrimary: {
    flex: 1.2,
    backgroundColor: COLORS.brandBlue,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
