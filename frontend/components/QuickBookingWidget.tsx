import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { COLORS } from '../constants/colors';
import { Vehicle } from '../types/fleet';

interface QuickBookingWidgetProps {
  vehicles: Vehicle[];
  onQuickBook: (params: {
    vehicleId: string;
    serviceType: 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
    durationDays: number;
    pickupLocation: string;
  }) => void;
}

export const QuickBookingWidget: React.FC<QuickBookingWidgetProps> = ({ vehicles, onQuickBook }) => {
  const [serviceType, setServiceType] = useState<'LEPAS_KUNCI' | 'DENGAN_DRIVER'>('LEPAS_KUNCI');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [durationDays, setDurationDays] = useState<number>(3);
  const [pickupLocation, setPickupLocation] = useState<string>('Bandara I Gusti Ngurah Rai (Kedatangan)');

  const handleSubmit = () => {
    onQuickBook({
      vehicleId: selectedVehicleId || vehicles[0]?.id,
      serviceType,
      durationDays,
      pickupLocation,
    });
  };

  return (
    <View style={styles.container}>
      {/* Service Type Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, serviceType === 'LEPAS_KUNCI' && styles.tabItemActive]}
          onPress={() => setServiceType('LEPAS_KUNCI')}
        >
          <Text style={[styles.tabLabel, serviceType === 'LEPAS_KUNCI' && styles.tabLabelActive]}>
            Sewa Lepas Kunci (24 Jam)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, serviceType === 'DENGAN_DRIVER' && styles.tabItemActive]}
          onPress={() => setServiceType('DENGAN_DRIVER')}
        >
          <Text style={[styles.tabLabel, serviceType === 'DENGAN_DRIVER' && styles.tabLabelActive]}>
            Sewa Dengan Pengemudi (12 Jam)
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formContent}>
        {/* Unit Selector */}
        <View style={styles.sectionField}>
          <Text style={styles.fieldLabel}>PILIH MODEL KENDARAAN</Text>
          <View style={styles.carPillRow}>
            {vehicles.map((v) => {
              const isSelected = selectedVehicleId === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.carPill, isSelected && styles.carPillActive]}
                  onPress={() => setSelectedVehicleId(v.id)}
                >
                  <Text style={[styles.carPillText, isSelected && styles.carPillTextActive]}>
                    {v.brand} {v.model.split(' ')[0]}
                  </Text>
                  <Text style={[styles.carPillSub, isSelected && styles.carPillSubActive]}>
                    {v.specs.rangeCltcKm} km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Row 2: Durasi & Lokasi */}
        <View style={styles.inputRow}>
          <View style={styles.colHalf}>
            <Text style={styles.fieldLabel}>DURASI PENYEWAAN</Text>
            <View style={styles.durationSelector}>
              {[1, 2, 3, 4, 7].map((days) => {
                const isSelected = durationDays === days;
                return (
                  <TouchableOpacity
                    key={days}
                    style={[styles.dayBox, isSelected && styles.dayBoxActive]}
                    onPress={() => setDurationDays(days)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                      {days} {days === 1 ? 'Hari' : 'Hari'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.colHalf}>
            <Text style={styles.fieldLabel}>LOKASI SERAH TERIMA UNIT</Text>
            <TextInput
              style={styles.textInput}
              value={pickupLocation}
              onChangeText={setPickupLocation}
              placeholder="Contoh: Bandara, Stasiun, atau Nama Hotel"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>CEK KETERSEDIAAN & LANJUTKAN KE WHATSAPP →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
    marginTop: 24,
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
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
  },
  carPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  carPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carPillActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brandBlue,
  },
  carPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  carPillTextActive: {
    color: COLORS.brandBlue,
  },
  carPillSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  carPillSubActive: {
    color: COLORS.brandBlue,
    fontWeight: '700',
  },
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
  durationSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  dayBox: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  dayBoxActive: {
    backgroundColor: COLORS.deepInk,
    borderColor: COLORS.deepInk,
  },
  dayText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  dayTextActive: {
    color: COLORS.white,
  },
  textInput: {
    height: 42,
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
