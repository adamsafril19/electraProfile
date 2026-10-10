import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { Vehicle, BookingFormInput } from '../types/fleet';
import { COLORS } from '../constants/colors';
import { submitBookingInquiry } from '../services/api';
import { openPendingTab, openWhatsAppDirect } from '../services/whatsappService';
import { DateField } from './DateField';
import { DurationStepper } from './DurationStepper';
import { PriceBreakdown, ServiceNote } from './PriceBreakdown';
import { formatDateId, getDateError, todayStr } from '../utils/date';

interface WhatsAppModalProps {
  visible: boolean;
  vehicle: Vehicle | null;
  initialServiceType?: 'LEPAS_KUNCI' | 'DENGAN_DRIVER';
  initialDurationDays?: number;
  initialStartDate?: string;
  initialPickupLocation?: string;
  // false = layanan/durasi/tanggal sudah dipilih di halaman asal, modal hanya menampilkan ringkasan
  showSelectors?: boolean;
  onClose: () => void;
}

type FormErrors = Partial<Record<'name' | 'phone' | 'pickup' | 'date', string>>;

// Terima 08xx, 628xx, atau +628xx (spasi/strip diabaikan), total 10-14 digit
const isValidIdPhone = (raw: string): boolean => /^(\+62|62|0)8\d{8,11}$/.test(raw.replace(/[\s-]/g, ''));

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  visible,
  vehicle,
  initialServiceType = 'LEPAS_KUNCI',
  initialDurationDays = 3,
  initialStartDate,
  initialPickupLocation = 'Bandara I Gusti Ngurah Rai (Kedatangan)',
  showSelectors = true,
  onClose,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceType, setServiceType] = useState<'LEPAS_KUNCI' | 'DENGAN_DRIVER'>(initialServiceType);
  const [durationDays, setDurationDays] = useState(initialDurationDays);
  const [pickupLocation, setPickupLocation] = useState(initialPickupLocation);
  const [returnLocation, setReturnLocation] = useState('Sama dengan lokasi penjemputan');
  const [customerNotes, setCustomerNotes] = useState('');
  const [startDate, setStartDate] = useState(initialStartDate || todayStr());
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  // rejected = server menolak data; network = server tidak terjangkau (pengguna boleh lanjut tanpa kode)
  const [submitNotice, setSubmitNotice] = useState<{ kind: 'rejected' | 'network'; message: string } | null>(null);
  const { width } = useWindowDimensions();
  const isNarrow = width < 480;

  // Modal selalu ter-mount, jadi sinkronkan state dengan pilihan terbaru setiap kali dibuka
  useEffect(() => {
    if (visible) {
      setServiceType(initialServiceType);
      setDurationDays(initialDurationDays);
      setStartDate(initialStartDate || todayStr());
      setPickupLocation(initialPickupLocation);
      setErrors({});
      setSubmitNotice(null);
    }
  }, [visible, initialServiceType, initialDurationDays, initialStartDate, initialPickupLocation]);

  const clearError = (key: keyof FormErrors) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  if (!vehicle) return null;

  const lepasRate = vehicle.rates.find(r => r.serviceType === 'LEPAS_KUNCI');
  const driverRate = vehicle.rates.find(r => r.serviceType === 'DENGAN_DRIVER');
  // Jika layanan terpilih tidak tersedia untuk unit ini, jatuh ke Lepas Kunci
  const effectiveService = serviceType === 'DENGAN_DRIVER' && !driverRate ? 'LEPAS_KUNCI' : serviceType;
  const activeRate = effectiveService === 'LEPAS_KUNCI' ? lepasRate?.dailyRate || 0 : driverRate?.dailyRate || 0;
  const estTotal = activeRate * durationDays;

  const handleSubmit = async () => {
    if (loading) return;

    const next: FormErrors = {};
    if (customerName.trim().length < 3) next.name = 'Nama lengkap minimal 3 karakter.';
    if (!customerPhone.trim()) next.phone = 'Nomor WhatsApp wajib diisi.';
    else if (!isValidIdPhone(customerPhone)) next.phone = 'Nomor tidak valid. Contoh: 081298765432 atau +6281298765432.';
    if (pickupLocation.trim().length < 3) next.pickup = 'Lokasi serah terima minimal 3 karakter.';
    const dateError = getDateError(startDate);
    if (dateError) next.date = dateError;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const formPayload: BookingFormInput = {
      vehicleId: vehicle.id,
      serviceType: effectiveService,
      startDate,
      durationDays,
      pickupLocation,
      returnLocation,
      customerName: customerName.trim(),
      // Backend hanya menerima digit (dan +) tanpa spasi/strip
      customerPhone: customerPhone.replace(/[\s-]/g, ''),
      customerNotes,
    };

    // Dibuka sekarang (saat klik) agar tidak diblokir popup-blocker setelah menunggu API
    const pendingTab = openPendingTab();

    // Percobaan kedua setelah server gagal: pengguna sudah diberi tahu, kirim langsung tanpa kode
    if (submitNotice?.kind === 'network') {
      await openWhatsAppDirect(vehicle, formPayload, undefined, pendingTab);
      onClose();
      return;
    }

    setLoading(true);
    setSubmitNotice(null);
    try {
      const res = await submitBookingInquiry(formPayload);
      if (res.success) {
        await openWhatsAppDirect(vehicle, formPayload, res.redirectUrl, pendingTab);
        onClose();
        return;
      }
      pendingTab?.close();
      setSubmitNotice({ kind: res.kind, message: res.message });
    } catch (e: any) {
      pendingTab?.close();
      setSubmitNotice({ kind: 'network', message: e?.message || 'Terjadi kesalahan tak terduga.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.corporateLabel}>FORMULIR RESERVASI CEPAT</Text>
              <Text style={styles.title}>{vehicle.brand} {vehicle.model}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Tutup formulir">
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Input Fields */}
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formGrid} keyboardShouldPersistTaps="handled">
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {effectiveService === 'LEPAS_KUNCI' ? 'Lepas Kunci' : 'Dengan Sopir'} • {durationDays} hari
                  {!showSelectors ? ` • mulai ${formatDateId(startDate)}` : ''}
                </Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>Baterai Siap 80-100%</Text>
                </View>
              </View>

              {showSelectors && (
                <>
                  <View style={styles.optionRow}>
                    <TouchableOpacity
                      style={[styles.optionBtn, effectiveService === 'LEPAS_KUNCI' && styles.optionBtnActive]}
                      onPress={() => setServiceType('LEPAS_KUNCI')}
                    >
                      <Text style={[styles.optionText, effectiveService === 'LEPAS_KUNCI' && styles.optionTextActive]}>Lepas Kunci</Text>
                    </TouchableOpacity>
                    {driverRate && (
                      <TouchableOpacity
                        style={[styles.optionBtn, effectiveService === 'DENGAN_DRIVER' && styles.optionBtnActive]}
                        onPress={() => setServiceType('DENGAN_DRIVER')}
                      >
                        <Text style={[styles.optionText, effectiveService === 'DENGAN_DRIVER' && styles.optionTextActive]}>Dengan Sopir</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <DurationStepper value={durationDays} onChange={setDurationDays} />
                </>
              )}

              <ServiceNote serviceType={effectiveService} />
              <PriceBreakdown
                serviceType={effectiveService}
                dailyRate={activeRate}
                days={durationDays}
                depositAmount={lepasRate?.depositAmount || 0}
              />
              {!showSelectors && (
                <Text style={styles.depositNote}>Layanan, durasi, dan tanggal dapat diubah di halaman sebelumnya.</Text>
              )}
            </View>

            {showSelectors && (
              <DateField
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  clearError('date');
                }}
                error={errors.date}
              />
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>NAMA LENGKAP *</Text>
              <TextInput
                style={[styles.input, !!errors.name && styles.inputError]}
                value={customerName}
                onChangeText={(v) => {
                  setCustomerName(v);
                  clearError('name');
                }}
                placeholder="Contoh: Dimas Wicaksono"
                placeholderTextColor="#64748B"
              />
              {!!errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>NOMOR WHATSAPP AKTIF *</Text>
              <TextInput
                style={[styles.input, !!errors.phone && styles.inputError]}
                value={customerPhone}
                onChangeText={(v) => {
                  setCustomerPhone(v);
                  clearError('phone');
                }}
                placeholder="Contoh: 081298765432"
                keyboardType="phone-pad"
                placeholderTextColor="#64748B"
              />
              {!!errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>LOKASI SERAH TERIMA UNIT *</Text>
              <TextInput
                style={[styles.input, !!errors.pickup && styles.inputError]}
                value={pickupLocation}
                onChangeText={(v) => {
                  setPickupLocation(v);
                  clearError('pickup');
                }}
                placeholder="Contoh: Bandara I Gusti Ngurah Rai / Hotel"
                placeholderTextColor="#64748B"
              />
              {!!errors.pickup && <Text style={styles.errorText}>{errors.pickup}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CATATAN KHUSUS (OPSIONAL)</Text>
              <TextInput
                style={styles.input}
                value={customerNotes}
                onChangeText={setCustomerNotes}
                placeholder="Contoh: Butuh kabel roll perpanjangan / rekomendasi rute"
                placeholderTextColor="#64748B"
              />
            </View>
          </ScrollView>

          {submitNotice && (
            <View
              style={[styles.notice, submitNotice.kind === 'rejected' ? styles.noticeError : styles.noticeWarn]}
              accessibilityRole="alert"
            >
              <Text style={[styles.noticeText, submitNotice.kind === 'rejected' ? styles.noticeTextError : styles.noticeTextWarn]}>
                {submitNotice.kind === 'rejected'
                  ? `Reservasi ditolak: ${submitNotice.message} Periksa data lalu coba lagi.`
                  : `${submitNotice.message} Reservasi belum tercatat di sistem. Anda tetap bisa mengirim detail langsung ke WhatsApp admin, tetapi tanpa kode inquiry resmi.`}
              </Text>
            </View>
          )}

          {/* Action Footer */}
          <View style={[styles.footer, isNarrow && styles.footerStacked]}>
            <TouchableOpacity style={[styles.btnCancel, isNarrow && styles.btnFull]} onPress={onClose} accessibilityRole="button">
              <Text style={styles.btnCancelText}>Kembali</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSubmit, isNarrow && styles.btnFull, isNarrow && styles.btnFirst]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.btnSubmitText}>
                  {submitNotice?.kind === 'network'
                    ? 'Kirim ke WhatsApp tanpa kode →'
                    : submitNotice?.kind === 'rejected'
                    ? 'Coba Kirim Lagi →'
                    : 'Kirim Format ke WhatsApp Admin →'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '94%',
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
    fontSize: 12,
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
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  optionBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: COLORS.deepInk,
    borderColor: COLORS.deepInk,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  optionTextActive: {
    color: COLORS.white,
  },
  depositNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 16,
  },
  formScroll: {
    flexGrow: 0,
    flexShrink: 1,
    marginBottom: 16,
  },
  formGrid: {
    gap: 12,
    paddingBottom: 4,
  },
  inputError: {
    borderColor: COLORS.corporateRed,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.corporateRed,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
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
  // Layar sempit: tombol utama di atas, lebar penuh
  footerStacked: {
    flexDirection: 'column-reverse',
  },
  btnFull: {
    flex: 0,
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnFirst: {
    paddingHorizontal: 12,
  },
  notice: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  noticeError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  noticeWarn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  noticeText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  noticeTextError: {
    color: '#991B1B',
  },
  noticeTextWarn: {
    color: '#78350F',
  },
  btnCancel: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
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
    minHeight: 48,
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
