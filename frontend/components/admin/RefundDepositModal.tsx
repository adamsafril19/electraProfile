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
} from 'react-native';
import {
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle,
  Building,
  CreditCard,
  Banknote,
  Send,
} from 'lucide-react-native';
import { RefundQueueItem, createPayment, PaymentMethod } from '../../services/adminApi';
import { todayStr } from '../../utils/date';
import { T } from './theme';
import { toast } from './feedback';
import { rp } from './ui';

interface Props {
  visible: boolean;
  item: RefundQueueItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RefundDepositModal: React.FC<Props> = ({ visible, item, onClose, onSuccess }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('TRANSFER');
  const [deduction, setDeduction] = useState('0');
  const [deductionReason, setDeductionReason] = useState('');
  const [bankInfo, setBankInfo] = useState('');

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

  if (!visible || !item) return null;

  const depositHeld = item.depositHeld || 0;
  const nDeduction = Math.min(depositHeld, Math.max(0, Number(deduction) || 0));
  const netRefund = Math.max(0, depositHeld - nDeduction);

  const handleSubmit = async () => {
    if (netRefund <= 0 && nDeduction <= 0) {
      toast.error('Nominal pengembalian atau potongan tidak boleh nol.');
      return;
    }

    if (method === 'TRANSFER' && !bankInfo.trim()) {
      toast.error('Mohon isi nomor rekening tujuan transfer atau nama bank pelanggan.');
      return;
    }

    setSubmitting(true);
    try {
      const notes = [
        method === 'TRANSFER' ? `[Transfer Rek: ${bankInfo.trim()}]` : '[Refund Tunai Kasir]',
        nDeduction > 0 ? `Potongan Rp ${nDeduction.toLocaleString('id-ID')} (${deductionReason.trim() || 'Biaya Denda/ETLE'})` : null,
        'Pengembalian deposit jaminan SOP H+1 s/d H+3 selesai verifikasi ETLE & fisik unit.',
      ]
        .filter(Boolean)
        .join(' - ');

      await createPayment({
        inquiryId: item.id,
        type: 'REFUND_DEPOSIT',
        method,
        amount: netRefund,
        paidAt: todayStr(),
        note: notes,
      });

      toast.success(`Deposit ${rp(netRefund)} untuk ${item.customerName} (${item.inquiryCode}) berhasil diproses!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memproses pengembalian deposit.');
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
                <RotateCcw size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.dialogTitle}>Proses Pengembalian Deposit Jaminan</Text>
                <Text style={styles.dialogSubtitle}>
                  SOP Pengembalian Dana Titipan (Refund Escrow) • H+1 s/d H+3 Bebas Tilang ETLE
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.dialogBody} contentContainerStyle={styles.dialogBodyContent}>
            {/* Info Customer & Rental */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryCode}>{item.inquiryCode}</Text>
                  <Text style={styles.summaryName}>{item.customerName}</Text>
                  <Text style={styles.summaryPhone}>{item.customerPhone}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={styles.badgeCompleted}>
                    <Text style={styles.badgeCompletedText}>SEWA SELESAI</Text>
                  </View>
                  <Text style={styles.summaryUnit}>{item.vehicleName}</Text>
                </View>
              </View>
            </View>

            {/* Deposit Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RINCIAN SALDO DEPOSIT JAMINAN</Text>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Deposit Diterima Saat Awal:</Text>
                <Text style={styles.calcVal}>{rp(item.depositPaid)}</Text>
              </View>

              {item.depositRefunded > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Pernah Dikembalikan Sebelumnya:</Text>
                  <Text style={[styles.calcVal, { color: '#059669' }]}>- {rp(item.depositRefunded)}</Text>
                </View>
              )}

              <View style={[styles.calcRow, styles.calcRowTotal]}>
                <Text style={styles.calcLabelBold}>Deposit Tertahan Saat Ini (Escrow):</Text>
                <Text style={styles.calcValBold}>{rp(depositHeld)}</Text>
              </View>
            </View>

            {/* Potongan / Denda (Jika ada) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>POTONGAN BIAYA / DENDA (OPSIONAL)</Text>
              <Text style={styles.descText}>
                Isi jika terdapat tilang elektronik ETLE, keterlambatan pengembalian, atau biaya rekoveri daya baterai di bawah standar minimum 20%.
              </Text>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Nominal Potongan (Rp)</Text>
                  <TextInput
                    style={styles.input}
                    value={deduction}
                    onChangeText={(v) => setDeduction(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={T.muted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Alasan / Keterangan Potongan</Text>
                  <TextInput
                    style={styles.input}
                    value={deductionReason}
                    onChangeText={setDeductionReason}
                    placeholder="Contoh: Tilang ETLE Simpang Kuta / Cas Baterai 12%"
                    placeholderTextColor={T.muted}
                  />
                </View>
              </View>
            </View>

            {/* Metode & Rekening Pengembalian */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>METODE &amp; REKENING PENGEMBALIAN DANA</Text>

              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[styles.methodBtn, method === 'TRANSFER' && styles.methodBtnActive]}
                  onPress={() => setMethod('TRANSFER')}
                >
                  <Building size={16} color={method === 'TRANSFER' ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.methodBtnText, method === 'TRANSFER' && styles.methodBtnTextActive]}>
                    Transfer Bank / E-Wallet
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodBtn, method === 'TUNAI' && styles.methodBtnActive]}
                  onPress={() => setMethod('TUNAI')}
                >
                  <Banknote size={16} color={method === 'TUNAI' ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.methodBtnText, method === 'TUNAI' && styles.methodBtnTextActive]}>
                    Tunai (Cash Pool)
                  </Text>
                </TouchableOpacity>
              </View>

              {method === 'TRANSFER' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.inputLabel}>
                    Rekening Tujuan Transfer Pelanggan <Text style={styles.req}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={bankInfo}
                    onChangeText={setBankInfo}
                    placeholder="Contoh: BCA 8271928192 a/n Budi Santoso"
                    placeholderTextColor={T.muted}
                  />
                </View>
              )}
            </View>

            {/* Total Net Refund Callout */}
            <View style={styles.netRefundCallout}>
              <View style={{ flex: 1 }}>
                <Text style={styles.netRefundLabel}>TOTAL DANA DIKEMBALIKAN KE PENYEWA:</Text>
                <Text style={styles.netRefundSub}>
                  {nDeduction > 0 ? `Setelah dipotong Rp ${nDeduction.toLocaleString('id-ID')}` : 'Pengembalian penuh tanpa potongan'}
                </Text>
              </View>
              <Text style={styles.netRefundAmount}>{rp(netRefund)}</Text>
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
                  <Text style={styles.btnSubmitText}>Konfirmasi Pengembalian Deposit</Text>
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
    maxWidth: 680,
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
    backgroundColor: '#059669',
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
    gap: 18,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryCode: {
    fontSize: 12,
    fontWeight: '800',
    color: T.brand,
    letterSpacing: 0.5,
  },
  summaryName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  summaryPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  badgeCompleted: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeCompletedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  summaryUnit: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
  },
  descText: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calcRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
  },
  calcLabel: {
    fontSize: 12.5,
    color: '#64748B',
  },
  calcVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  calcLabelBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#03579D',
  },
  calcValBold: {
    fontSize: 15,
    fontWeight: '900',
    color: '#03579D',
  },
  rowTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  col: {
    flex: 1,
    minWidth: 180,
  },
  inputLabel: {
    fontSize: 11.5,
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
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  methodBtn: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodBtnActive: {
    backgroundColor: '#03579D',
    borderColor: '#03579D',
  },
  methodBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  methodBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  netRefundCallout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  netRefundLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  netRefundSub: {
    fontSize: 11.5,
    color: '#047857',
    marginTop: 2,
  },
  netRefundAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669',
  },
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
    backgroundColor: '#059669',
  },
  btnSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
