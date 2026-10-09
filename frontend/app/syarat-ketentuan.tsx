import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export default function TermsScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowText}>TRANSPARANSI KEBIJAKAN OPERASIONAL</Text>
            <View style={styles.eyebrowLine} />
          </View>
          <Text style={styles.title}>Syarat & Ketentuan Penyewaan</Text>
          <Text style={styles.subtitle}>
            Ketentuan transparan tanpa klausul tersembunyi demi kenyamanan, keselamatan, dan integritas armada kendaraan listrik mandiri.
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Module 1: Document Verification */}
        <View style={styles.card}>
          <View style={styles.cardTagRow}>
            <Text style={styles.cardTag}>PASAL 01</Text>
            <Text style={styles.cardHeaderSmall}>PERSYARATAN VERIFIKASI SEWA LEPAS KUNCI</Text>
          </View>
          <Text style={styles.cardTitle}>Verifikasi Identitas Penyewa Retail & Wisatawan</Text>
          <Text style={styles.cardDesc}>
            Sebagai langkah mitigasi keamanan armada, calon penyewa wajib melampirkan berkas verifikasi berikut sebelum serah terima unit dilakukan:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• e-KTP Asli (Foto jelas tanpa blur atau tertutup jari).</Text>
            <Text style={styles.bulletItem}>• SIM A Asli yang masih berlaku.</Text>
            <Text style={styles.bulletItem}>• Bukti Tiket Penerbangan / Kereta Api Pulang-Pergi (khusus wisatawan luar kota).</Text>
            <Text style={styles.bulletItem}>• Bukti Reservasi Hotel, Resort, atau Villa selama periode sewa kendaraan.</Text>
            <Text style={styles.bulletItem}>• Akun Media Sosial Aktif (LinkedIn / Instagram) untuk verifikasi domisili & identitas.</Text>
          </View>
        </View>

        {/* Module 2: Battery Policy */}
        <View style={styles.card}>
          <View style={styles.cardTagRow}>
            <Text style={styles.cardTag}>PASAL 02</Text>
            <Text style={styles.cardHeaderSmall}>STANDAR KESEHATAN BATERAI & STATE OF CHARGE (SOC)</Text>
          </View>
          <Text style={styles.cardTitle}>Aturan Tingkat Daya Baterai Saat Serah Terima & Pengembalian</Text>
          <Text style={styles.cardDesc}>
            Kendaraan listrik memerlukan perlakuan teknis khusus untuk menjaga keandalan sel baterai:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              1. **Penyerahan Unit (Outbound)**: Kendaraan diserahkan kepada penyewa dengan tingkat daya baterai prima minimal **80% hingga 100%**.
            </Text>
            <Text style={styles.bulletItem}>
              2. **Pengembalian Unit (Inbound)**: Penyewa wajib mengembalikan kendaraan dengan sisa baterai minimal **20% hingga 30%** guna mencegah *deep discharge* sel baterai.
            </Text>
            <Text style={styles.bulletItem}>
              3. **Biaya Pemulihan Daya Baterai**: Apabila kendaraan dikembalikan dengan baterai di bawah 20%, dikenakan biaya pemulihan pengisian flat Rp 50.000 (10–19%) atau Rp 150.000 (di bawah 10%) yang dipotong langsung dari deposit jaminan.
            </Text>
          </View>
        </View>

        {/* Module 3: Security Deposit */}
        <View style={styles.card}>
          <View style={styles.cardTagRow}>
            <Text style={styles.cardTag}>PASAL 03</Text>
            <Text style={styles.cardHeaderSmall}>DEPOSIT JAMINAN KEAMANAN & PENGEMBALIAN</Text>
          </View>
          <Text style={styles.cardTitle}>Besaran Deposit & Ketentuan Pengembalian</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• City Car (Wuling Air EV / Binguo EV): **Rp 500.000**</Text>
            <Text style={styles.bulletItem}>• Compact SUV & MPV (BYD Atto 3 / BYD M6): **Rp 1.000.000**</Text>
            <Text style={styles.bulletItem}>
              • **Jadwal Pengembalian Dana**: Deposit ditransfer 100% penuh dalam kurun waktu **H+1 hingga maksimal H+3 hari kerja** pasca unit dikembalikan, setelah diverifikasi bebas tilang elektronik (ETLE) kepolisian dan kondisi fisik kendaraan.
            </Text>
          </View>
        </View>

        {/* Module 4: Overtime */}
        <View style={styles.card}>
          <View style={styles.cardTagRow}>
            <Text style={styles.cardTag}>PASAL 04</Text>
            <Text style={styles.cardHeaderSmall}>KETERLAMBATAN PENGEMBALIAN (OVERTIME)</Text>
          </View>
          <Text style={styles.cardTitle}>Toleransi Waktu & Tarif Keterlambatan</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • **Grace Period**: Toleransi keterlambatan maksimal 30 menit tanpa biaya dengan konfirmasi terlebih dahulu ke admin operasional.
            </Text>
            <Text style={styles.bulletItem}>
              • **Jam ke-1 hingga ke-3**: Dikenakan biaya tambahan 10% dari tarif sewa harian per jam.
            </Text>
            <Text style={styles.bulletItem}>
              • **Keterlambatan 4 jam atau lebih**: Dikenakan biaya penuh sewa 1 hari (24 jam) karena mengganggu ketersediaan penyewa berikutnya.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: COLORS.deepInk,
    paddingTop: 48,
    paddingBottom: 36,
    paddingHorizontal: 16,
  },
  headerInner: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  eyebrowText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.5,
  },
  eyebrowLine: {
    width: 36,
    height: 1.5,
    backgroundColor: '#38BDF8',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.7)',
    maxWidth: 720,
    lineHeight: 22,
  },
  content: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
    gap: 20,
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTag: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandBlue,
    letterSpacing: 1,
  },
  cardHeaderSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.deepInk,
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 14,
  },
  bulletList: {
    gap: 10,
  },
  bulletItem: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 21,
  },
});
