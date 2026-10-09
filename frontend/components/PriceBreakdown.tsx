import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';

type ServiceType = 'LEPAS_KUNCI' | 'DENGAN_DRIVER';

const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

// Penjelasan layanan, supaya "24 jam" vs "12 jam" tidak disalahartikan
export const ServiceNote: React.FC<{ serviceType: ServiceType }> = ({ serviceType }) => (
  <Text style={styles.serviceNote}>
    {serviceType === 'LEPAS_KUNCI'
      ? 'Lepas Kunci: Anda menyetir sendiri. Satu hari sewa = 24 jam penuh sejak unit diserahkan.'
      : 'Dengan Sopir: sopir kami menyetir untuk Anda. Satu hari sewa = 12 jam pemakaian (tarif sudah termasuk sopir).'}
  </Text>
);

interface PriceBreakdownProps {
  serviceType: ServiceType;
  dailyRate: number;
  days: number;
  depositAmount: number;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({ serviceType, dailyRate, days, depositAmount }) => {
  const [showExtra, setShowExtra] = useState(false);
  const rental = dailyRate * days;
  const deposit = serviceType === 'LEPAS_KUNCI' ? depositAmount : 0;
  const payNow = rental + deposit;
  const unitLabel = serviceType === 'LEPAS_KUNCI' ? '24 jam' : '12 jam';

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Text style={styles.key}>Sewa ({rp(dailyRate)} × {days} hari @ {unitLabel})</Text>
        <Text style={styles.val}>{rp(rental)}</Text>
      </View>

      {deposit > 0 && (
        <View style={styles.row}>
          <Text style={styles.key}>Deposit jaminan (dikembalikan penuh)</Text>
          <Text style={styles.val}>{rp(deposit)}</Text>
        </View>
      )}

      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalKey}>
          {deposit > 0 ? 'Dana yang disiapkan saat serah terima' : 'Estimasi total sewa'}
        </Text>
        <Text style={styles.totalVal}>{rp(payNow)}</Text>
      </View>
      {deposit > 0 && (
        <Text style={styles.note}>
          Biaya sewa sebenarnya {rp(rental)}; deposit {rp(deposit)} dikembalikan setelah unit kembali tanpa pelanggaran/ETLE.
        </Text>
      )}

      <TouchableOpacity onPress={() => setShowExtra((v) => !v)} style={styles.toggle}>
        <Text style={styles.toggleText}>
          {showExtra ? '▲ Sembunyikan biaya yang mungkin timbul' : '▼ Biaya lain yang mungkin timbul'}
        </Text>
      </TouchableOpacity>

      {showExtra && (
        <View style={styles.extraList}>
          <Text style={styles.extraItem}>• Pengantaran/penjemputan di luar radius gratis (lebih dari 15 km dari pool): biaya mengikuti jarak, konfirmasi ke admin.</Text>
          <Text style={styles.extraItem}>• Baterai dikembalikan di bawah 20%: Rp 50.000 (10–19%) atau Rp 150.000 (di bawah 10%), dipotong dari deposit.</Text>
          <Text style={styles.extraItem}>• Terlambat mengembalikan: toleransi 30 menit; jam ke-1 s/d ke-3 dikenakan 10% tarif harian per jam; 4 jam atau lebih dihitung 1 hari penuh.</Text>
          <Text style={styles.extraItem}>• Pengisian daya di SPKLU umum berbayar, e-toll, parkir, dan retribusi jalan ditanggung penyewa.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  serviceNote: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  box: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  key: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  val: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.deepInk,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 2,
  },
  totalKey: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.deepInk,
  },
  totalVal: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.brandBlue,
  },
  note: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  toggle: {
    paddingVertical: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandBlue,
  },
  extraList: {
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  extraItem: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
});
