import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { COLORS } from '../constants/colors';

export default function EmergencyScreen() {
  const handleCallHotline = () => {
    const phoneUrl = 'tel:081234567890';
    if (Platform.OS === 'web') {
      window.location.href = phoneUrl;
    } else {
      Linking.openURL(phoneUrl);
    }
  };

  const handleOpenEmergencyWA = () => {
    const waUrl = 'https://wa.me/6281234567890?text=EMERGENCY%3A%20Saya%20membutuhkan%20bantuan%20darurat%20di%20jalan';
    if (Platform.OS === 'web') {
      window.open(waUrl, '_blank');
    } else {
      Linking.openURL(waUrl);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowText}>LAYANAN DARURAT & JAMINAN KELANGSUNGAN PERJALANAN</Text>
            <View style={styles.eyebrowLine} />
          </View>
          <Text style={styles.title}>Roadside Assistance & Mobil Pengganti 24 Jam</Text>
          <Text style={styles.subtitle}>
            Komitmen kami mendampingi perjalanan Anda tanpa henti. Ketenangan pikiran Anda adalah prioritas utama standar operasional kami.
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Hotline Dispatch Box */}
        <View style={styles.dispatchCard}>
          <View style={styles.dispatchTopBadge}>
            <Text style={styles.dispatchTopBadgeText}>HOTLINE RESMI 24/7</Text>
          </View>
          <Text style={styles.dispatchTitle}>Emergency Dispatch Call Center</Text>
          <Text style={styles.dispatchPhone}>0812-3456-7890</Text>
          <Text style={styles.dispatchDesc}>
            Siaga 24 jam nonstop untuk evakuasi armada, layanan derek resmi, jumper baterai 12V pendukung, dan penanganan kendala teknis di jalan.
          </Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnCall} onPress={handleCallHotline}>
              <Text style={styles.btnCallText}>Hubungi Hotline Darurat Sekarang</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnWa} onPress={handleOpenEmergencyWA}>
              <Text style={styles.btnWaText}>Chat Dispatcher via WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Replacement Vehicle Guarantee (INDORENT Benchmark) */}
        <View style={styles.guaranteeCard}>
          <View style={styles.cardTagRow}>
            <Text style={styles.cardTag}>STANDAR SLA</Text>
            <Text style={styles.cardHeaderSmall}>JAMINAN KENDARAAN PENGGANTI</Text>
          </View>
          <Text style={styles.guaranteeTitle}>Garansi Pengiriman Mobil Pengganti (Replacement Car)</Text>
          <Text style={styles.guaranteeDesc}>
            Apabila unit kendaraan mengalami malfungsi teknis pada sistem kelistrikan murni (bukan akibat kelalaian pemakaian penyewa):
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              1. **SLA Pengiriman 60–90 Menit**: Unit pengganti segera dikirimkan ke titik lokasi Anda dalam wilayah jangkauan perkotaan.
            </Text>
            <Text style={styles.bulletItem}>
              2. **Spesifikasi Kendaraan Setara**: Kami mengutamakan unit mobil listrik setara, atau alternatif kendaraan bensin premium jika seluruh unit EV sedang terisi.
            </Text>
            <Text style={styles.bulletItem}>
              3. **Bebas Biaya Evakuasi**: Seluruh beban biaya mobil derek (*towing*) ditanggung sepenuhnya oleh pihak rental.
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
    color: '#F87171',
    letterSpacing: 1.5,
  },
  eyebrowLine: {
    width: 36,
    height: 1.5,
    backgroundColor: '#F87171',
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
    gap: 24,
  },
  dispatchCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
  },
  dispatchTopBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 12,
  },
  dispatchTopBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dispatchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 4,
  },
  dispatchPhone: {
    fontSize: 32,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
    marginVertical: 10,
  },
  dispatchDesc: {
    fontSize: 13,
    color: '#7F1D1D',
    textAlign: 'center',
    maxWidth: 580,
    marginBottom: 24,
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  btnCall: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 6,
  },
  btnCallText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  btnWa: {
    backgroundColor: COLORS.whatsapp,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 6,
  },
  btnWaText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  guaranteeCard: {
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
  guaranteeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.deepInk,
    marginBottom: 10,
  },
  guaranteeDesc: {
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
