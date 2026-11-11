import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import {
  Car,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Plus,
  User,
  Wallet,
  X,
  Zap,
} from 'lucide-react-native';
import {
  AdminVehicle,
  AdminInquiry,
  createManualInquiry,
  fetchAdminFleet,
  updateInquiryStatus,
  createPayment,
  PaymentMethod,
  PaymentType,
} from '../../services/adminApi';
import { toDateStr, todayStr } from '../../utils/date';
import { T, shadow } from './theme';
import { toast } from './feedback';
import { rp } from './ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (inquiry: AdminInquiry) => void;
}

const LOCATION_PRESETS = [
  'Bandara I Gusti Ngurah Rai (Kedatangan)',
  'Pool Pusat Electra (Jl. Bypass Ngurah Rai No. 88)',
  'Kuta / Seminyak (Area Hotel)',
  'Nusa Dua / Jimbaran (Area Resort)',
  'Canggu / Berawa (Area Villa)',
  'Ubud (Area Hotel/Resort)',
];

export const ManualBookingModal: React.FC<Props> = ({ visible, onClose, onCreated }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [fleet, setFleet] = useState<AdminVehicle[]>([]);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Handle Escape key on web to close
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose]);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [serviceType, setServiceType] = useState<'LEPAS_KUNCI' | 'DENGAN_DRIVER'>('LEPAS_KUNCI');
  const [startDate, setStartDate] = useState(todayStr());
  const [durationDays, setDurationDays] = useState(3);
  const [pickupLocation, setPickupLocation] = useState(LOCATION_PRESETS[0]);
  const [returnLocation, setReturnLocation] = useState(LOCATION_PRESETS[0]);
  const [customerNotes, setCustomerNotes] = useState('');

  // Initial State Options
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('500000');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [paymentType, setPaymentType] = useState<PaymentType>('DP');

  useEffect(() => {
    if (visible) {
      setLoadingFleet(true);
      fetchAdminFleet()
        .then((data) => {
          setFleet(data);
          if (data.length > 0 && !selectedVehicleId) {
            setSelectedVehicleId(data[0].id);
          }
          setLoadingFleet(false);
        })
        .catch(() => setLoadingFleet(false));
    }
  }, [visible]);

  if (!visible) return null;

  const selectedVehicle = fleet.find((v) => v.id === selectedVehicleId) || fleet[0];
  const rateObj = selectedVehicle?.rates?.find((r) => r.serviceType === serviceType);
  const dailyRate = rateObj?.dailyRate || 0;
  const totalRentalRate = dailyRate * durationDays;
  const depositAmount = selectedVehicle?.bodyType === 'CITY_CAR' ? 500000 : 1000000;

  const handleSubmit = async () => {
    if (!customerName.trim() || customerName.trim().length < 3) {
      toast.error('Nama pelanggan minimal 3 karakter.');
      return;
    }
    const cleanPhone = customerPhone.replace(/\s+/g, '').replace(/-/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      toast.error('Nomor WhatsApp tidak valid (minimal 9 digit, cth: 08123456789).');
      return;
    }
    if (!selectedVehicle) {
      toast.error('Silakan pilih salah satu unit mobil.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createManualInquiry({
        vehicleId: selectedVehicle.id,
        serviceType,
        startDate,
        durationDays: Number(durationDays),
        pickupLocation: pickupLocation.trim() || LOCATION_PRESETS[0],
        returnLocation: returnLocation.trim() || pickupLocation.trim() || LOCATION_PRESETS[0],
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerNotes: customerNotes.trim() ? `[Manual Booking] ${customerNotes.trim()}` : '[Manual Booking Admin]',
      });

      const newInq = res.data;

      // Auto confirm if selected
      if (autoConfirm && newInq?.id) {
        try {
          await updateInquiryStatus(newInq.id, 'CONFIRMED');
          newInq.status = 'CONFIRMED';
        } catch (e) {
          console.warn('Auto confirm warning:', e);
        }
      }

      // Record payment if selected
      if (recordPayment && newInq?.id && Number(paymentAmount) > 0) {
        try {
          await createPayment({
            inquiryId: newInq.id,
            type: paymentType,
            method: paymentMethod,
            amount: Number(paymentAmount),
            paidAt: toDateStr(new Date()), note: 'Pembayaran awal dicatat langsung saat input manual',
          });
        } catch (e) {
          console.warn('Record payment warning:', e);
        }
      }

      toast.success(`Pesanan manual ${newInq.inquiryCode || ''} berhasil dibuat!`);
      onCreated(newInq);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal membuat pesanan manual.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.dialog, isMobile && styles.dialogMobile]}>
        {/* Header */}
        <View style={styles.dialogHeader}>
          <View style={styles.dialogHeaderLeft}>
            <View style={styles.dialogHeaderIcon}>
              <Plus size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.dialogTitle}>Tambah Pesanan Baru (Walk-In / Manual)</Text>
              <Text style={styles.dialogSubtitle}>
                Input reservasi tamu offline, hotel concierge, atau pesanan via telepon
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color={T.muted} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Body */}
        <ScrollView style={styles.dialogBody} contentContainerStyle={styles.dialogBodyContent}>
          {/* Section 1: Data Pelanggan */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. DATA PENYEWA</Text>
            <View style={styles.rowTwo}>
              <View style={styles.col}>
                <Text style={styles.label}>
                  Nama Lengkap Penyewa <Text style={styles.req}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Contoh: Budi Santoso"
                  placeholderTextColor={T.muted}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>
                  Nomor WhatsApp <Text style={styles.req}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  placeholder="Contoh: 081234567890"
                  keyboardType="phone-pad"
                  placeholderTextColor={T.muted}
                />
              </View>
            </View>
          </View>

          {/* Section 2: Unit Mobil & Layanan */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. UNIT ARMADA &amp; LAYANAN</Text>

            {/* Service Type Tabs */}
            <View style={styles.serviceTabRow}>
              <TouchableOpacity
                style={[styles.serviceTab, serviceType === 'LEPAS_KUNCI' && styles.serviceTabActive]}
                onPress={() => setServiceType('LEPAS_KUNCI')}
              >
                <Text style={[styles.serviceTabText, serviceType === 'LEPAS_KUNCI' && styles.serviceTabTextActive]}>
                  Sewa Lepas Kunci (24 Jam)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.serviceTab, serviceType === 'DENGAN_DRIVER' && styles.serviceTabActive]}
                onPress={() => setServiceType('DENGAN_DRIVER')}
              >
                <Text style={[styles.serviceTabText, serviceType === 'DENGAN_DRIVER' && styles.serviceTabTextActive]}>
                  Sewa Dengan Sopir (12 Jam)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Fleet Picker Pills */}
            <Text style={styles.label}>Pilih Unit Kendaraan Listrik</Text>
            {loadingFleet ? (
              <ActivityIndicator size="small" color={T.brand} />
            ) : (
              <View style={styles.fleetPillGrid}>
                {fleet.map((v) => {
                  const isSel = v.id === selectedVehicleId;
                  const rate = v.rates?.find((r) => r.serviceType === serviceType);
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.fleetPill, isSel && styles.fleetPillActive]}
                      onPress={() => setSelectedVehicleId(v.id)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.fleetPillName, isSel && styles.fleetPillNameActive]}>
                          {v.brand} {v.model}
                        </Text>
                        <Text style={styles.fleetPillSub}>
                          {v.licensePlate} • ±{v.specs?.rangeCltcKm} km
                        </Text>
                      </View>
                      <Text style={[styles.fleetPillRate, isSel && styles.fleetPillRateActive]}>
                        Rp {rate?.dailyRate ? (rate.dailyRate / 1000).toFixed(0) : '-'}rb/hr
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Section 3: Waktu & Lokasi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. JADWAL &amp; LOKASI SERAH TERIMA</Text>
            <View style={styles.rowTwo}>
              <View style={styles.col}>
                <Text style={styles.label}>Tanggal Mulai Sewa (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={T.muted}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Durasi Sewa (Hari)</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setDurationDays((d) => Math.max(1, d - 1))}
                  >
                    <Text style={styles.stepperBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperVal}>{durationDays} Hari</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setDurationDays((d) => Math.min(30, d + 1))}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Location Inputs */}
            <View style={styles.col}>
              <Text style={styles.label}>Lokasi Serah Terima Unit (Pickup)</Text>
              <TextInput
                style={styles.input}
                value={pickupLocation}
                onChangeText={setPickupLocation}
                placeholder="Contoh: Bandara Ngurah Rai, Nama Hotel, dsb"
                placeholderTextColor={T.muted}
              />
            </View>

            {/* Presets */}
            <View style={styles.presetPillsRow}>
              {LOCATION_PRESETS.slice(0, 3).map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={styles.presetPill}
                  onPress={() => {
                    setPickupLocation(loc);
                    setReturnLocation(loc);
                  }}
                >
                  <Text style={styles.presetPillText}>+ {loc.split('(')[0].trim()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Catatan Khusus (Opsional)</Text>
              <TextInput
                style={styles.input}
                value={customerNotes}
                onChangeText={setCustomerNotes}
                placeholder="Misal: Tambah child seat, flight no. GA402, minta charger adapter"
                placeholderTextColor={T.muted}
              />
            </View>
          </View>

          {/* Section 4: Ringkasan Biaya & Opsi Konfirmasi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. KALKULASI TARIF &amp; PEMBAYARAN AWAL</Text>
            <View style={styles.costBox}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>
                  Sewa {durationDays} Hari @ Rp {dailyRate.toLocaleString('id-ID')}:
                </Text>
                <Text style={styles.costVal}>Rp {totalRentalRate.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Deposit Jaminan (Refundable):</Text>
                <Text style={styles.costVal}>Rp {depositAmount.toLocaleString('id-ID')}</Text>
              </View>
              <View style={[styles.costRow, styles.costTotalRow]}>
                <Text style={styles.costTotalLabel}>Total Nilai Transaksi:</Text>
                <Text style={styles.costTotalVal}>
                  Rp {(totalRentalRate + depositAmount).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>

            {/* Checkbox Options */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAutoConfirm((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, autoConfirm && styles.checkboxChecked]}>
                {autoConfirm && <Check size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                Langsung Konfirmasi Pesanan &amp; Kunci Jadwal Armada (Status: CONFIRMED)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRecordPayment((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, recordPayment && styles.checkboxChecked]}>
                {recordPayment && <Check size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                Catat Pembayaran Awal / Uang Muka (DP) Sekarang
              </Text>
            </TouchableOpacity>

            {recordPayment && (
              <View style={styles.paymentInputBlock}>
                <View style={styles.rowTwo}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Nominal Pembayaran (Rp)</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      keyboardType="numeric"
                      placeholder="500000"
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Metode Pembayaran</Text>
                    <View style={styles.methodPillRow}>
                      {[
                        { id: 'TRANSFER' as PaymentMethod, label: 'Transfer Bank' },
                        { id: 'TUNAI' as PaymentMethod, label: 'Tunai (Cash)' },
                        { id: 'QRIS' as PaymentMethod, label: 'QRIS' },
                      ].map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={[
                            styles.methodPill,
                            paymentMethod === m.id && styles.methodPillActive,
                          ]}
                          onPress={() => setPaymentMethod(m.id)}
                        >
                          <Text
                            style={[
                              styles.methodPillText,
                              paymentMethod === m.id && styles.methodPillTextActive,
                            ]}
                          >
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.dialogFooter}>
          <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={submitting}>
            <Text style={styles.btnCancelText}>Batal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle2 size={17} color="#FFFFFF" />
                <Text style={styles.btnSubmitText}>Simpan &amp; Buat Pesanan</Text>
              </>
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
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(2, 18, 30, 0.78)',
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxWidth: 720,
    width: '100%',
    maxHeight: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 8,
  },
  dialogMobile: {
    maxHeight: '96%',
    borderRadius: 14,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 22,
    backgroundColor: '#0F2C4A',
    borderBottomWidth: 1,
    borderBottomColor: '#1A3E66',
  },
  dialogHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dialogHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dialogSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBody: {
    flex: 1,
  },
  dialogBodyContent: {
    padding: 22,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F2C4A',
    letterSpacing: 1,
  },
  rowTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  col: {
    flex: 1,
    minWidth: 240,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  req: {
    color: '#DC2626',
  },
  input: {
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  serviceTabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  serviceTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  serviceTabActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  serviceTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  serviceTabTextActive: {
    color: '#0369A1',
    fontWeight: '800',
  },
  fleetPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fleetPill: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 8,
  },
  fleetPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
    borderWidth: 1.5,
  },
  fleetPillName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  fleetPillNameActive: {
    color: '#0369A1',
    fontWeight: '800',
  },
  fleetPillSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  fleetPillRate: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  fleetPillRateActive: {
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  stepperVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 60,
    textAlign: 'center',
  },
  presetPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  costBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 14,
    gap: 6,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 12,
    color: '#475569',
  },
  costVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  costTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#BAE6FD',
    paddingTop: 8,
    marginTop: 4,
  },
  costTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
  },
  costTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0369A1',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  checkboxLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  paymentInputBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  methodPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  methodPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  methodPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  methodPillText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  methodPillTextActive: {
    color: '#0369A1',
    fontWeight: '800',
  },
  dialogFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  btnSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: T.brand,
  },
  btnSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
