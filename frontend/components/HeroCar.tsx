import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, StyleSheet, Easing, Platform } from 'react-native';
import { BatteryCharging, Gauge, Users } from 'lucide-react-native';
import { Vehicle } from '../types/fleet';

interface HeroCarProps {
  vehicle?: Vehicle;
}

// Foto unit di hero: berganti halus saat pengunjung memilih model lain di form pemesanan.
export const HeroCar: React.FC<HeroCarProps> = ({ vehicle }) => {
  const [shown, setShown] = useState<Vehicle | undefined>(vehicle);
  const [failed, setFailed] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!vehicle) return;
    if (!shown) {
      setShown(vehicle);
      return;
    }
    if (vehicle.id === shown.id) return;
    Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: false }).start(() => {
      setFailed(false);
      setShown(vehicle);
      lift.setValue(14);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 360, useNativeDriver: false }),
        Animated.timing(lift, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.id]);

  if (!shown) {
    return <View style={[styles.stage, styles.skeleton]} accessibilityLabel="Memuat foto unit" />;
  }

  const lepas = shown.rates.find((r) => r.serviceType === 'LEPAS_KUNCI');

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <View style={styles.glow} pointerEvents="none" />
        <View style={styles.floor} pointerEvents="none" />
        <Animated.View style={[styles.imageBox, { opacity, transform: [{ translateY: lift }] }]}>
          {!failed ? (
            <Image
              source={{ uri: shown.imageUrl }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setFailed(true)}
              accessibilityLabel={`${shown.brand} ${shown.model}`}
            />
          ) : (
            <Text style={styles.fallback}>{shown.brand}</Text>
          )}
        </Animated.View>
      </View>

      <Animated.View style={[styles.caption, { opacity }]}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.brand}>{shown.brand.toUpperCase()}</Text>
          <Text style={styles.model} numberOfLines={1}>
            {shown.model}
          </Text>
        </View>
        <View style={styles.chips}>
          <Chip icon={Gauge} text={`${shown.specs.rangeCltcKm} km`} />
          <Chip icon={BatteryCharging} text={`${shown.specs.batteryCapacityKwh} kWh`} />
          <Chip icon={Users} text={`${shown.specs.seatingCapacity} kursi`} />
        </View>
        {lepas && (
          <Text style={styles.price}>
            Rp {lepas.dailyRate.toLocaleString('id-ID')}
            <Text style={styles.priceUnit}> /hari</Text>
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

const Chip: React.FC<{ icon: React.ComponentType<any>; text: string }> = ({ icon: Icon, text }) => (
  <View style={styles.chip}>
    <Icon size={14} color="#7DD3FC" />
    <Text style={styles.chipText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 20 },
  stage: { height: 270, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  skeleton: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16 },
  // Cahaya & bayangan memakai gradien radial di web (tepi lembut); di native cukup warna datar
  glow: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(14, 165, 233, 0.07)',
    ...(Platform.OS === 'web'
      ? ({ backgroundColor: 'transparent', backgroundImage: 'radial-gradient(closest-side, rgba(56,189,248,0.30), rgba(56,189,248,0.10) 55%, rgba(56,189,248,0) 100%)' } as any)
      : null),
  },
  floor: {
    position: 'absolute',
    bottom: 22,
    width: '64%',
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    ...(Platform.OS === 'web'
      ? ({ backgroundColor: 'transparent', backgroundImage: 'radial-gradient(closest-side, rgba(0,0,0,0.55), rgba(0,0,0,0))' } as any)
      : null),
  },
  imageBox: { width: '100%', height: 250, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  fallback: { fontSize: 28, fontWeight: '900', color: 'rgba(255,255,255,0.4)' },
  caption: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  brand: { fontSize: 12, fontWeight: '800', color: '#38BDF8', letterSpacing: 1.2 },
  model: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', maxWidth: 260 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  chipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
  price: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  priceUnit: { fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
});
