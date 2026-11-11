import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Modal,
} from 'react-native';
import {
  Printer,
  X,
  Copy,
  Zap,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  Car,
  User,
  Phone,
  ShieldCheck,
} from 'lucide-react-native';
import { AdminInquiry } from '../../services/adminApi';
import { fmtDate, fmtDateTime, rp } from './ui';
import { T } from './theme';
import { toast } from './feedback';

interface Props {
  visible: boolean;
  inquiry: AdminInquiry | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<Props> = ({ visible, inquiry, onClose }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Handle Escape key on web to close preview
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

  if (!visible || !inquiry) return null;

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const dailyRate = Math.round(inquiry.estimatedTotal / Math.max(1, inquiry.durationDays));
  const deposit = 500000;
  const grandTotal = inquiry.estimatedTotal + deposit;
  const totalPaid = inquiry.paidAmount || (inquiry.paymentStatus === 'PAID' ? grandTotal : 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  const isPaidFull = totalPaid >= grandTotal;
  const isDpPaid = totalPaid > 0 && !isPaidFull;

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    } else {
      toast.info('Fitur cetak otomatis tersedia di browser web.');
    }
  };

  const handleCopySummary = () => {
    const lines = [
      '📄 *INVOICE & KUITANSI RESMI SEWA - ELECTRA EV*',
      '------------------------------------------------',
      `• No. Dokumen: INV-ELC-${inquiry.inquiryCode}`,
      `• Tanggal: ${dateFormatted}`,
      `• Nama Penyewa: ${inquiry.customerName}`,
      `• No. WhatsApp: ${inquiry.customerPhone}`,
      `• Unit Armada: ${inquiry.vehicleName}`,
      `• Layanan: ${inquiry.serviceType === 'LEPAS_KUNCI' ? 'Lepas Kunci (24 Jam)' : 'Dengan Sopir (12 Jam)'}`,
      `• Periode: ${fmtDate(inquiry.startDate)} s/d ${fmtDate(inquiry.endDate)} (${inquiry.durationDays} Hari)`,
      `• Lokasi Pickup: ${inquiry.pickupLocation}`,
      '------------------------------------------------',
      `• Sewa Mobil (${inquiry.durationDays} hari): ${rp(inquiry.estimatedTotal)}`,
      `• Deposit Jaminan (Refundable): ${rp(deposit)}`,
      `• Total Transaksi: ${rp(grandTotal)}`,
      `• Total Terbayar: ${rp(totalPaid)}`,
      `• Sisa Pelunasan: ${rp(balanceDue)}`,
      `• Status: ${isPaidFull ? 'LUNAS (PAID)' : isDpPaid ? 'DP TERVERIFIKASI' : 'BELUM BAYAR'}`,
      '------------------------------------------------',
      'Terima kasih telah mempercayakan perjalanan ramah lingkungan Anda bersama Electra.',
    ];

    const text = lines.join('\n');
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success('Rincian invoice berhasil disalin ke clipboard!');
    } else {
      toast.success('Rincian invoice berhasil dibuat!');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.fullscreenContainer}>
        {/* Print Style Injection for Web */}
        {Platform.OS === 'web' && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
              @media print {
                body * { visibility: hidden !important; }
                #printable-invoice-container, #printable-invoice-container * { visibility: visible !important; }
                #printable-invoice-container {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  padding: 20px !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  background-color: #FFFFFF !important;
                }
                .no-print, [nativeid="no-print"], [id="no-print"] { display: none !important; }
              }
            `,
            }}
          />
        )}

        {/* Top Navigation Bar (Full screen dedicated header) */}
        <View style={styles.topBar} nativeID="no-print">
          <View style={styles.topBarLeft}>
            <TouchableOpacity
              style={styles.btnBack}
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke pesanan"
            >
              <ArrowLeft size={16} color="#FFFFFF" />
              <Text style={styles.btnBackText}>Kembali ke Pesanan</Text>
            </TouchableOpacity>

            {!isMobile && <View style={styles.topBarDivider} />}

            {!isMobile && (
              <View style={styles.titleGroup}>
                <View style={styles.badgeLive}>
                  <Text style={styles.badgeLiveText}>PRATINJAU DOKUMEN RESMI</Text>
                </View>
                <Text style={styles.topBarDocId} numberOfLines={1}>
                  INV/ELC/2026/{inquiry.inquiryCode}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.btnCopy}
              onPress={handleCopySummary}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Salin rincian invoice ke WhatsApp"
            >
              <Copy size={14} color="#03579D" />
              <Text style={styles.btnCopyText}>{isMobile ? 'Salin' : 'Salin Ringkasan (WA)'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnPrint}
              onPress={handlePrint}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Cetak atau simpan invoice sebagai PDF"
            >
              <Printer size={15} color="#FFFFFF" />
              <Text style={styles.btnPrintText}>Cetak / Simpan PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnClose}
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Tutup pratinjau"
            >
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacious Scrollable Canvas */}
        <ScrollView
          style={styles.canvasScroll}
          contentContainerStyle={styles.canvasContent}
          showsVerticalScrollIndicator={true}
        >
          <View
            nativeID="printable-invoice-container"
            {...(Platform.OS === 'web' ? ({ id: 'printable-invoice-container' } as any) : {})}
            style={[styles.invoiceSheet, isMobile && styles.invoiceSheetMobile]}
          >
            {/* Header: Company Letterhead */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetBrandCol}>
                <View style={styles.sheetLogoRow}>
                  <View style={styles.sheetLogoIcon}>
                    <Zap size={22} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.sheetBrandTitle}>ELECTRA</Text>
                    <Text style={styles.sheetBrandSub}>ELECTRIC VEHICLE RENTAL</Text>
                  </View>
                </View>
                <Text style={styles.sheetCompanyInfo}>PT Electra Mobility Indonesia</Text>
                <Text style={styles.sheetCompanyInfo}>
                  Pool Pusat: Jl. Bypass Ngurah Rai No. 88, Kuta, Bali 80361
                </Text>
                <Text style={styles.sheetCompanyInfo}>
                  Hotline / WhatsApp: 0812-3456-7890 • Email: billing@electra.co.id
                </Text>
              </View>

              <View style={styles.sheetDocCol}>
                <Text style={styles.docTypeTitle}>INVOICE &amp; KUITANSI</Text>
                <Text style={styles.docTypeSub}>SEWA KENDARAAN LISTRIK</Text>
                <View style={styles.docMetaTable}>
                  <View style={styles.docMetaRow}>
                    <Text style={styles.docMetaKey}>No. Dokumen:</Text>
                    <Text style={styles.docMetaVal}>INV/ELC/2026/{inquiry.inquiryCode}</Text>
                  </View>
                  <View style={styles.docMetaRow}>
                    <Text style={styles.docMetaKey}>Tanggal Terbit:</Text>
                    <Text style={styles.docMetaVal}>{dateFormatted}</Text>
                  </View>
                  <View style={styles.docMetaRow}>
                    <Text style={styles.docMetaKey}>Status Pembayaran:</Text>
                    <View
                      style={[
                        styles.statusPill,
                        isPaidFull
                          ? styles.statusPillGreen
                          : isDpPaid
                          ? styles.statusPillAmber
                          : styles.statusPillRed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isPaidFull
                            ? styles.statusPillTextGreen
                            : isDpPaid
                            ? styles.statusPillTextAmber
                            : styles.statusPillTextRed,
                        ]}
                      >
                        {isPaidFull
                          ? 'LUNAS (PAID)'
                          : isDpPaid
                          ? 'DP TERBAYAR'
                          : 'MENUNGGU PEMBAYARAN'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sheetDivider} />

            {/* Bill To & Rental Details Grid */}
            <View style={styles.partyGrid}>
              <View style={styles.partyBox}>
                <Text style={styles.partyHeader}>DITUJUKAN KEPADA (PENYEWA):</Text>
                <Text style={styles.partyName}>{inquiry.customerName}</Text>
                <Text style={styles.partyDetail}>No. WhatsApp / Telp: {inquiry.customerPhone}</Text>
                <Text style={styles.partyDetail}>
                  Lokasi Serah Terima: {inquiry.pickupLocation}
                </Text>
                <Text style={styles.partyDetail}>
                  Lokasi Pengembalian: {inquiry.returnLocation || inquiry.pickupLocation}
                </Text>
              </View>

              <View style={styles.partyBox}>
                <Text style={styles.partyHeader}>RINCIAN KENDARAAN &amp; DURASI:</Text>
                <Text style={styles.partyName}>
                  {inquiry.vehicleName}
                </Text>
                <Text style={styles.partyDetail}>
                  Tipe Layanan:{' '}
                  {inquiry.serviceType === 'LEPAS_KUNCI'
                    ? 'Sewa Lepas Kunci (24 Jam / Hari)'
                    : 'Sewa Dengan Sopir (12 Jam / Hari)'}
                </Text>
                <Text style={styles.partyDetail}>
                  Periode Sewa:{' '}
                  <Text style={styles.bold}>
                    {fmtDate(inquiry.startDate)} s/d {fmtDate(inquiry.endDate)}
                  </Text>{' '}
                  ({inquiry.durationDays} Hari)
                </Text>
              </View>
            </View>

            {/* Table of Charges */}
            <View style={styles.tableWrap}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>DESKRIPSI ITEM</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>DURASI / QTY</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>TARIF SATUAN</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>TOTAL (RP)</Text>
              </View>

              {/* Row 1: Vehicle Rental */}
              <View style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdTitle}>
                    Sewa Mobil Listrik - {inquiry.vehicleName}
                  </Text>
                  <Text style={styles.tdSub}>
                    Armada Listrik Premium • Termasuk Portable Charger 2.2 kW &amp; Akses Jaringan SPKLU
                  </Text>
                </View>
                <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>
                  {inquiry.durationDays} Hari
                </Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>
                  {rp(dailyRate)}
                </Text>
                <Text style={[styles.tdBold, { flex: 1, textAlign: 'right' }]}>
                  {rp(inquiry.estimatedTotal)}
                </Text>
              </View>

              {/* Row 2: Security Deposit */}
              <View style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdTitle}>Deposit Jaminan Keamanan (Refundable)</Text>
                  <Text style={styles.tdSub}>
                    Dikembalikan penuh H+1 s/d H+3 pasca verifikasi bebas tilang ETLE &amp; fisik unit
                  </Text>
                </View>
                <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>1 Unit</Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>
                  {rp(deposit)}
                </Text>
                <Text style={[styles.tdBold, { flex: 1, textAlign: 'right' }]}>
                  {rp(deposit)}
                </Text>
              </View>

              {/* Row 3: Roadside Assistance Protection */}
              <View style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdTitle}>
                    Garansi Layanan Derek EV &amp; Mobil Pengganti 24 Jam
                  </Text>
                  <Text style={styles.tdSub}>Fasilitas resmi Roadside Assistance standar pabrikan</Text>
                </View>
                <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>Include</Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>Rp 0</Text>
                <Text style={[styles.tdBold, { flex: 1, textAlign: 'right', color: '#16A34A' }]}>
                  GRATIS
                </Text>
              </View>
            </View>

            {/* Totals Summary Block */}
            <View style={styles.totalsBlock}>
              <View style={styles.totalsColLeft}>
                <Text style={styles.termsNoteHeader}>CATATAN KETENTUAN OPERASIONAL:</Text>
                <Text style={styles.termsNoteItem}>
                  • Level baterai diserahkan minimal 80%–100% dan dikembalikan minimal 20%–30%.
                </Text>
                <Text style={styles.termsNoteItem}>
                  • Keterlambatan toleransi maksimal 30 menit. Keterlambatan &gt;1 jam dikenakan 10%/jam.
                </Text>
                <Text style={styles.termsNoteItem}>
                  • Dilarang keras menarik armada EV dengan derek roda putar (hanya derek gendong flatbed).
                </Text>
              </View>

              <View style={styles.totalsColRight}>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLineLabel}>Subtotal Biaya Sewa:</Text>
                  <Text style={styles.totalLineVal}>{rp(inquiry.estimatedTotal)}</Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLineLabel}>Deposit Jaminan Keamanan:</Text>
                  <Text style={styles.totalLineVal}>{rp(deposit)}</Text>
                </View>
                <View style={[styles.totalLine, styles.grandTotalLine]}>
                  <Text style={styles.grandTotalLabel}>TOTAL KESELURUHAN:</Text>
                  <Text style={styles.grandTotalVal}>{rp(grandTotal)}</Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.paidLineLabel}>Jumlah Telah Terbayar:</Text>
                  <Text style={styles.paidLineVal}>- {rp(totalPaid)}</Text>
                </View>
                <View style={[styles.totalLine, styles.balanceLine]}>
                  <Text style={styles.balanceLineLabel}>SISA PELUNASAN:</Text>
                  <Text style={styles.balanceLineVal}>{rp(balanceDue)}</Text>
                </View>
              </View>
            </View>

            {/* Signatures */}
            <View style={styles.signSection}>
              <View style={styles.signBox}>
                <Text style={styles.signTitle}>Petugas Operasional Electra,</Text>
                <View style={styles.signStamp}>
                  <Text style={styles.signStampText}>PT ELECTRA MOBILITY</Text>
                  <Text style={styles.signStampSub}>OFFICIAL DISPATCH</Text>
                </View>
                <Text style={styles.signName}>( Bagian Operasional &amp; Billing )</Text>
              </View>

              <View style={styles.signBox}>
                <Text style={styles.signTitle}>Penyewa / Pengemudi,</Text>
                <View style={styles.signSpace} />
                <Text style={styles.signName}>( {inquiry.customerName} )</Text>
              </View>
            </View>

            {/* Footer Watermark */}
            <View style={styles.sheetFooter}>
              <Text style={styles.sheetFooterText}>
                Dokumen ini sah dan diterbitkan secara digital oleh Sistem Manajemen Armada PT Electra Mobility Indonesia.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#0B1726',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    height: 60,
    backgroundColor: '#071626',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnBackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  topBarDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#1E293B',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeLive: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  badgeLiveText: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  topBarDocId: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '700',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 8,
  },
  btnCopyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#03579D',
  },
  btnPrint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  btnPrintText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },

  // Spacious Canvas
  canvasScroll: {
    flex: 1,
    backgroundColor: '#0B1726',
    width: '100%',
  },
  canvasContent: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  invoiceSheet: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 840,
    borderRadius: 12,
    padding: 40,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 36,
    elevation: 12,
    marginBottom: 40,
  },
  invoiceSheetMobile: {
    padding: 18,
    borderRadius: 8,
    marginBottom: 20,
  },

  // Letterhead
  sheetHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  sheetBrandCol: {
    flex: 1,
    minWidth: 260,
    gap: 4,
  },
  sheetLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  sheetLogoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#03579D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBrandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0B1B2E',
    letterSpacing: 1.5,
  },
  sheetBrandSub: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#03579D',
    letterSpacing: 2,
  },
  sheetCompanyInfo: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 17,
  },
  sheetDocCol: {
    flex: 1,
    minWidth: 240,
    alignItems: 'flex-end',
  },
  docTypeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#03579D',
    letterSpacing: 0.5,
  },
  docTypeSub: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 8,
  },
  docMetaTable: {
    gap: 4,
    alignItems: 'flex-end',
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docMetaKey: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  docMetaVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusPillGreen: {
    backgroundColor: '#DCFCE7',
  },
  statusPillTextGreen: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusPillAmber: {
    backgroundColor: '#FEF3C7',
  },
  statusPillTextAmber: {
    color: '#B45309',
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusPillRed: {
    backgroundColor: '#FEE2E2',
  },
  statusPillTextRed: {
    color: '#B91C1C',
    fontSize: 10.5,
    fontWeight: '800',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },

  // Party Grid
  partyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 20,
  },
  partyBox: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  partyHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#03579D',
    letterSpacing: 1,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  partyDetail: {
    fontSize: 12,
    color: '#475569',
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },

  // Table of Charges
  tableWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  th: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  tdSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  td: {
    fontSize: 12,
    color: '#334155',
  },
  tdBold: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Totals Section
  totalsBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 24,
  },
  totalsColLeft: {
    flex: 1.2,
    minWidth: 260,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  termsNoteHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  termsNoteItem: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  totalsColRight: {
    flex: 1,
    minWidth: 240,
    gap: 6,
    justifyContent: 'center',
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  totalLineLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  totalLineVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  grandTotalLine: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    marginVertical: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#03579D',
  },
  grandTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#03579D',
  },
  paidLineLabel: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
  paidLineVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803D',
  },
  balanceLine: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginTop: 2,
  },
  balanceLineLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#B91C1C',
  },
  balanceLineVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#B91C1C',
  },

  // Signatures
  signSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
    gap: 20,
  },
  signBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  signTitle: {
    fontSize: 11.5,
    color: '#475569',
    marginBottom: 12,
  },
  signStamp: {
    borderWidth: 2,
    borderColor: '#03579D',
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: 10,
    transform: [{ rotate: '-4deg' }],
  },
  signStampText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#03579D',
    letterSpacing: 1,
  },
  signStampSub: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0EA5E9',
    letterSpacing: 1.5,
  },
  signSpace: {
    height: 52,
  },
  signName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },

  // Sheet Footer
  sheetFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    alignItems: 'center',
  },
  sheetFooterText: {
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
