import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Vehicle, BookingFormInput } from '../types/fleet';
import { COLORS } from '../constants/colors';
import { submitBookingInquiry } from '../services/api';
import { openWhatsAppDirect } from '../services/whatsappService';

interface WhatsAppModalProps {
  visible: boolean;
  vehicle: Vehicle | null;
  initialServiceType?: 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
  initialDurationDays?: number;
  initialPickupLocation?: string;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  visible,
  vehicle,
  initialServiceType = 'LEPAS_KUNCI',
  initialDurationDays = 3,
  initialPickupLocation = 'Bandara I Gusti Ngurah Rai (Kedatangan)',
  onClose,
}) => {
  if (!vehicle) return null;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceType, setServiceType] = useState<'LEPAS_KUNCI' | 'DENGAN_DRIVER'>(initialServiceType);
  const [durationDays, setDurationDays] = useState(initialDurationDays);
  const [pickupLocation, setPickupLocation] = useState(initialPickupLocation);
  const [returnLocation, setReturnLocation] = useState('Sama dengan lokasi penjemputan');
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const lepasRate = vehicle.rates.find(r => r.serviceType === 'LEPAS_KUNCI');
  const driverRate = vehicle.rates.find(r => r.serviceType === 'DENGAN_DRIVER');
  const activeRate = serviceType === 'LEPAS_KUNCI' ? lepasRate?.dailyRate || 0 : driverRate?.dailyRate || 0;
  const estTotal = activeRate * durationDays;

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      alert('Mohon masukkan nama lengkap Anda.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 9) {
      alert('Mohon masukkan nomor WhatsApp yang valid (cth: 08123456789).');
      return;
    }

    setLoading(true);

    const formPayload: BookingFormInput = {
      vehicleId: vehicle.id,
      serviceType,
      startDate: new Date().toISOString().split('T')[0],
      durationDays,
      pickupLocation,
      returnLocation,
      customerName,
      customerPhone,
      customerNotes,
    };

    try {
      const res = await submitBookingInquiry(formPayload);
      await openWhatsAppDirect(vehicle, formPayload, res.redirectUrl);
      onClose();
    } catch {
      await openWhatsAppDirect(vehicle, formPayload);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.corporateLabel}>FORMULIR RESERVASI CEPAT</Text>
              <Text style={styles.title}>{vehicle.brand} {vehicle.model}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Pricing & Guarantee Summary */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>
                  Estimasi Biaya ({durationDays} Hari • {serviceType === 'LEPAS_KUNCI' ? 'Lepas Kunci' : 'Dengan Pengemudi'}):
                </Text>
                <Text style={styles.summaryPrice}>Rp {estTotal.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Baterai Siap 80-100%</Text>
              </View>
            </View>
            {serviceType === 'LEPAS_KUNCI' && lepasRate && (
              <Text style={styles.depositNote}>
                Deposit jaminan Rp {lepasRate.depositAmount.toLocaleString('id-ID')} (dikembalikan penuh setelah unit kembali).
              </Text>
            )}
          </View>

          {/* Input Fields */}
          <View style={styles.formGrid}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>NAMA LENGKAP *</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Contoh: Dimas Wicaksono"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>NOMOR WHATSAPP AKTIF *</Text>
              <TextInput
                style={styles.input}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="Contoh: 081298765432"
                keyboardType="phone-pad"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>LOKASI SERAH TERIMA UNIT</Text>
              <TextInput
                style={styles.input}
                value={pickupLocation}
                onChangeText={setPickupLocation}
                placeholder="Contoh: Bandara I Gusti Ngurah Rai / Hotel"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CATATAN KHUSUS (OPSIONAL)</Text>
              <TextInput
                style={styles.input}
                value={customerNotes}
                onChangeText={setCustomerNotes}
                placeholder="Contoh: Butuh kabel roll perpanjangan / rekomendasi rute"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelText}>Kembali</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSubmit}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.btnSubmitText}>Kirim Format ke WhatsApp Admin →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 25, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    width: '100%',
    maxWidth: 520,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  corporateLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brandBlue,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.deepInk,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.deepInk,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  depositNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 16,
  },
  formGrid: {
    gap: 12,
    marginBottom: 20,
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
    color: COLORS.textInk,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  btnSubmit: {
    flex: 2,
    backgroundColor: COLORS.brandBlue,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmitText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.4,
  },
});
