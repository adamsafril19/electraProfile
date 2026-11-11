import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import {
  Car,
  BatteryCharging,
  Zap,
  Plus,
  X,
  CheckCircle2,
  ShieldCheck,
  Check,
  Info,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { AdminVehicle, createVehicle } from '../../services/adminApi';
import { T, shadow } from './theme';
import { toast } from './feedback';
import { rp } from './ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (vehicle: AdminVehicle) => void;
}

const BRAND_PRESETS = ['Hyundai', 'Wuling', 'BYD', 'Chery', 'MG', 'Tesla', 'Neta', 'BMW'];

const PRESET_IMAGES: { label: string; url: string; bodyType: 'CITY_CAR' | 'COMPACT_SUV' | 'MPV' }[] = [
  {
    label: 'Hyundai Ioniq 5 (Gravity Gold)',
    url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=800&auto=format&fit=crop',
    bodyType: 'COMPACT_SUV',
  },
  {
    label: 'Wuling Binguo EV (Milk Tea)',
    url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop',
    bodyType: 'CITY_CAR',
  },
  {
    label: 'BYD Seal / Atto 3 (Ocean Blue)',
    url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop',
    bodyType: 'COMPACT_SUV',
  },
  {
    label: 'Chery Omoda E5 (Aero White)',
    url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=800&auto=format&fit=crop',
    bodyType: 'MPV',
  },
];

export const AddVehicleModal: React.FC<Props> = ({ visible, onClose, onCreated }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [brand, setBrand] = useState('Hyundai');
  const [model, setModel] = useState('');
  const [bodyType, setBodyType] = useState<'CITY_CAR' | 'COMPACT_SUV' | 'MPV'>('COMPACT_SUV');
  const [licensePlate, setLicensePlate] = useState('');
  const [status, setStatus] = useState<'AVAILABLE' | 'MAINTENANCE'>('AVAILABLE');

  // Specs states
  const [batteryKwh, setBatteryKwh] = useState('58');
  const [rangeCltc, setRangeCltc] = useState('410');
  const [portType, setPortType] = useState<'CCS2' | 'GB_T' | 'TYPE_2'>('CCS2');
  const [maxAcKw, setMaxAcKw] = useState('7');
  const [maxDcKw, setMaxDcKw] = useState('80');
  const [seatingCapacity, setSeatingCapacity] = useState('5');
  const [includePortable, setIncludePortable] = useState(true);
  const [includeGbtAdapter, setIncludeGbtAdapter] = useState(false);

  // Rates states
  const [rateLepas, setRateLepas] = useState('750000');
  const [depositAmount, setDepositAmount] = useState('500000');
  const [rateDriver, setRateDriver] = useState('1150000');
  const [overtimeRate, setOvertimeRate] = useState('75000');

  // Photo
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);

  // Handle Escape key on web
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

  // Adjust deposit default when body type changes
  useEffect(() => {
    if (bodyType === 'CITY_CAR') {
      setDepositAmount('500000');
    } else {
      setDepositAmount('1000000');
    }
  }, [bodyType]);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (!brand.trim()) {
      toast.error('Silakan isi merek kendaraan.');
      return;
    }
    if (!model.trim() || model.trim().length < 2) {
      toast.error('Nama model minimal 2 karakter (cth: Ioniq 5).');
      return;
    }
    const cleanPlate = licensePlate.trim().toUpperCase();
    if (!cleanPlate || cleanPlate.length < 4) {
      toast.error('Nomor polisi tidak valid (cth: DK 1823 ELC).');
      return;
    }

    const nBattery = Number(batteryKwh);
    const nRange = Number(rangeCltc);
    if (!nBattery || nBattery <= 0) {
      toast.error('Kapasitas baterai harus lebih dari 0 kWh.');
      return;
    }
    if (!nRange || nRange <= 0) {
      toast.error('Jarak tempuh baterai harus lebih dari 0 km.');
      return;
    }

    const nRateLepas = Number(rateLepas);
    const nRateDriver = Number(rateDriver);
    if (!nRateLepas || nRateLepas <= 0) {
      toast.error('Tarif sewa lepas kunci harus lebih dari Rp 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createVehicle({
        brand: brand.trim(),
        model: model.trim(),
        bodyType,
        licensePlate: cleanPlate,
        imageUrl: imageUrl.trim() || PRESET_IMAGES[0].url,
        thumbnailUrl: imageUrl.trim() || PRESET_IMAGES[0].url,
        status: status as any,
        tags: ['EV', brand.trim(), bodyType],
        specs: {
          batteryCapacityKwh: nBattery,
          rangeCltcKm: nRange,
          portType,
          maxAcKw: Number(maxAcKw) || 7,
          maxDcKw: Number(maxDcKw) || 60,
          seatingCapacity: Number(seatingCapacity) || 5,
          portableChargerIncluded: includePortable,
          gbtAdapterIncluded: includeGbtAdapter,
          chargingTimeAcHours: Math.round((nBattery / Math.max(1, Number(maxAcKw) || 7)) * 10) / 10,
          chargingTimeDcMinutes: Math.round((nBattery / Math.max(1, Number(maxDcKw) || 60)) * 60),
        },
        rates: [
          {
            serviceType: 'LEPAS_KUNCI',
            dailyRate: nRateLepas,
            depositAmount: Number(depositAmount) || (bodyType === 'CITY_CAR' ? 500000 : 1000000),
            overtimeHourlyRate: Math.round(nRateLepas * 0.1),
          },
          ...(nRateDriver > 0
            ? [
                {
                  serviceType: 'DENGAN_DRIVER' as const,
                  dailyRate: nRateDriver,
                  depositAmount: 0,
                  overtimeHourlyRate: Number(overtimeRate) || Math.round(nRateDriver * 0.1),
                },
              ]
            : []),
        ],
      });

      const newVeh = (res as any).data || res;
      toast.success(`Armada ${brand} ${model} (${cleanPlate}) berhasil didaftarkan!`);
      onCreated(newVeh);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mendaftarkan armada baru.');
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
                <Car size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.dialogTitle}>Registrasi Unit Armada EV Baru</Text>
                <Text style={styles.dialogSubtitle}>
                  Tambahkan mobil listrik baru ke katalog rental Electra &amp; sistem operasional
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Form Body */}
          <ScrollView style={styles.dialogBody} contentContainerStyle={styles.dialogBodyContent}>
            {/* Section 1: Identitas Unit */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. IDENTITAS KENDARAAN</Text>

              {/* Brand Presets */}
              <Text style={styles.label}>Merek Kendaraan</Text>
              <View style={styles.brandPresetRow}>
                {BRAND_PRESETS.map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.brandChip, brand === b && styles.brandChipActive]}
                    onPress={() => setBrand(b)}
                  >
                    <Text style={[styles.brandChipText, brand === b && styles.brandChipTextActive]}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>
                    Model Kendaraan <Text style={styles.req}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={model}
                    onChangeText={setModel}
                    placeholder="Contoh: Ioniq 5 Signature Long Range"
                    placeholderTextColor={T.muted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>
                    Nomor Polisi (Plat) <Text style={styles.req}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, { textTransform: 'uppercase' }]}
                    value={licensePlate}
                    onChangeText={setLicensePlate}
                    placeholder="Contoh: DK 1823 ELC"
                    placeholderTextColor={T.muted}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Body Type & Status */}
              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Kategori Bodi Kendaraan</Text>
                  <View style={styles.pillSelectorRow}>
                    {(
                      [
                        { id: 'CITY_CAR', label: 'City Car' },
                        { id: 'COMPACT_SUV', label: 'Compact SUV' },
                        { id: 'MPV', label: 'MPV Keluarga' },
                      ] as const
                    ).map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.typePill, bodyType === t.id && styles.typePillActive]}
                        onPress={() => setBodyType(t.id)}
                      >
                        <Text style={[styles.typePillText, bodyType === t.id && styles.typePillTextActive]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.col}>
                  <Text style={styles.label}>Status Kesiapan Awal</Text>
                  <View style={styles.pillSelectorRow}>
                    <TouchableOpacity
                      style={[styles.typePill, status === 'AVAILABLE' && styles.typePillGreenActive]}
                      onPress={() => setStatus('AVAILABLE')}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          status === 'AVAILABLE' && { color: '#15803D', fontWeight: '800' },
                        ]}
                      >
                        Siap Sewa
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typePill, status === 'MAINTENANCE' && styles.typePillAmberActive]}
                      onPress={() => setStatus('MAINTENANCE')}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          status === 'MAINTENANCE' && { color: '#B45309', fontWeight: '800' },
                        ]}
                      >
                        Perawatan (Maintenance)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Section 2: Spesifikasi EV & Baterai */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. SPESIFIKASI BATERAI &amp; CAS LISTRIK</Text>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Kapasitas Baterai (kWh)</Text>
                  <TextInput
                    style={styles.input}
                    value={batteryKwh}
                    onChangeText={setBatteryKwh}
                    keyboardType="numeric"
                    placeholder="58"
                    placeholderTextColor={T.muted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Estimasi Jarak Tempuh CLTC (km)</Text>
                  <TextInput
                    style={styles.input}
                    value={rangeCltc}
                    onChangeText={setRangeCltc}
                    keyboardType="numeric"
                    placeholder="410"
                    placeholderTextColor={T.muted}
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Tipe Port Colokan</Text>
                  <View style={styles.pillSelectorRow}>
                    {(['CCS2', 'GB_T', 'TYPE_2'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.typePill, portType === p && styles.typePillActive]}
                        onPress={() => setPortType(p)}
                      >
                        <Text style={[styles.typePillText, portType === p && styles.typePillTextActive]}>
                          {p === 'CCS2' ? 'CCS2 (Nasional)' : p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Kapasitas Penumpang</Text>
                  <TextInput
                    style={styles.input}
                    value={seatingCapacity}
                    onChangeText={setSeatingCapacity}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor={T.muted}
                  />
                </View>
              </View>

              {/* Toggles */}
              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkItem}
                  onPress={() => setIncludePortable((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, includePortable && styles.checkboxChecked]}>
                    {includePortable && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Termasuk Portable Charger 2.2 kW</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkItem}
                  onPress={() => setIncludeGbtAdapter((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, includeGbtAdapter && styles.checkboxChecked]}>
                    {includeGbtAdapter && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Termasuk Adapter GB/T</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 3: Tarif Sewa & Deposit */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. PENGATURAN TARIF SEWA &amp; DEPOSIT</Text>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Tarif Lepas Kunci (Rp / 24 Jam)</Text>
                  <TextInput
                    style={styles.input}
                    value={rateLepas}
                    onChangeText={(v) => setRateLepas(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder="750000"
                    placeholderTextColor={T.muted}
                  />
                  <Text style={styles.hintText}>{rateLepas ? rp(Number(rateLepas)) : 'Rp 0'}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Deposit Jaminan (Refundable)</Text>
                  <TextInput
                    style={styles.input}
                    value={depositAmount}
                    onChangeText={(v) => setDepositAmount(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder="500000"
                    placeholderTextColor={T.muted}
                  />
                  <Text style={styles.hintText}>
                    {depositAmount ? rp(Number(depositAmount)) : 'Rp 0'}
                  </Text>
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Tarif Dengan Sopir (Rp / 12 Jam)</Text>
                  <TextInput
                    style={styles.input}
                    value={rateDriver}
                    onChangeText={(v) => setRateDriver(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder="1150000"
                    placeholderTextColor={T.muted}
                  />
                  <Text style={styles.hintText}>{rateDriver ? rp(Number(rateDriver)) : 'Rp 0'}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Biaya Lembur Sopir (Rp / Jam)</Text>
                  <TextInput
                    style={styles.input}
                    value={overtimeRate}
                    onChangeText={(v) => setOvertimeRate(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder="75000"
                    placeholderTextColor={T.muted}
                  />
                  <Text style={styles.hintText}>
                    {overtimeRate ? rp(Number(overtimeRate)) : 'Rp 0'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Section 4: Foto Unit */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. FOTO ARMADA</Text>

              <Text style={styles.label}>Pilih Foto Preset Cepat atau Input URL Gambar</Text>
              <View style={styles.presetImageGrid}>
                {PRESET_IMAGES.map((img) => {
                  const isSel = imageUrl === img.url;
                  return (
                    <TouchableOpacity
                      key={img.label}
                      style={[styles.presetImageCard, isSel && styles.presetImageCardActive]}
                      onPress={() => setImageUrl(img.url)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: img.url }} style={styles.presetImageThumb} />
                      <Text style={[styles.presetImageTitle, isSel && styles.presetImageTitleActive]} numberOfLines={1}>
                        {img.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor={T.muted}
              />
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
                  <Text style={styles.btnSubmitText}>Simpan &amp; Daftarkan Armada</Text>
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
    backgroundColor: 'rgba(2, 18, 30, 0.82)',
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxWidth: 780,
    width: '100%',
    maxHeight: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
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
    width: 38,
    height: 38,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBody: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  dialogBodyContent: {
    padding: 22,
    gap: 22,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: T.brand,
    letterSpacing: 0.8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  req: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  hintText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 3,
  },
  rowTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  col: {
    flex: 1,
    minWidth: 200,
  },

  // Brand Presets
  brandPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  brandChipActive: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  brandChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  brandChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Pill Selector
  pillSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  typePill: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  typePillActive: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  typePillGreenActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  typePillAmberActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  typePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Checkboxes
  checkboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  checkboxLabel: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
  },

  // Image Presets
  presetImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetImageCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  presetImageCardActive: {
    borderColor: T.brand,
    backgroundColor: '#F0F9FF',
  },
  presetImageThumb: {
    width: '100%',
    height: 64,
    backgroundColor: '#E2E8F0',
  },
  presetImageTitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
    padding: 6,
  },
  presetImageTitleActive: {
    color: T.brand,
    fontWeight: '800',
  },

  // Footer Actions
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  btnCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
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
    paddingVertical: 9,
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
