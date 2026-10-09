import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { COLORS } from '../constants/colors';

export default function EvGuideScreen() {
  const handleOpenPln = () => {
    const url = 'https://play.google.com/store/apps/details?id=com.icon.pln123';
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowText}>PANDUAN OPERASIONAL KENDARAAN LISTRIK</Text>
            <View style={styles.eyebrowLine} />
          </View>
          <Text style={styles.title}>Bebas Khawatir Mengemudi EV</Text>
          <Text style={styles.subtitle}>
            Informasi komprehensif mengenai tata cara pengisian daya di hotel/villa, pengenalan soket colokan, dan direktori jaringan SPKLU nasional.
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Module 1: Home Charging */}
        <View style={styles.card}>
          <View style={styles.cardTagRow}>
            <Text style={styles.cardTag}>PANDUAN 01</Text>
            <Text style={styles.cardHeaderSmall}>PENGISIAN DAYA MANDIRI DI TEMPAT MENGINAP</Text>
          </View>
          <Text style={styles.cardTitle}>Penggunaan Portable Home Charger di Hotel & Villa</Text>
          <Text style={styles.cardDesc}>
            Setiap unit armada Electra dilengkapi kabel pengisian portabel resmi berdaya 2.2 kW. Pengisian semalaman saat beristirahat sangat dianjurkan:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              1. Pastikan kapasitas daya listrik penginapan memiliki batas daya minimal 2.200 VA.
            </Text>
            <Text style={styles.bulletItem}>
              2. Pasang charger langsung ke stopkontak dinding yang memiliki jalur pentanahan (grounding/arde) standar.
            </Text>
            <Text style={styles.bulletItem}>
              3. Hindari penggunaan kabel rol sambungan berdiameter tipis yang tidak berstandar SNI untuk mencegah kelebihan panas (*overheating*).
            </Text>
            <Text style={styles.bulletItem}>
              4. Indikator lampu hijau stabil menandakan daya telah mengalir normal ke baterai utama kendaraan.
            </Text>
          </View>
        </View>

        {/* Module 2: Socket Standards */}
        <View style={styles.card}>
          <View style={styles.cardTagRow}>
            <Text style={styles.cardTag}>PANDUAN 02</Text>
            <Text style={styles.cardHeaderSmall}>STANDARISASI INFRASTRUKTUR CHARGER</Text>
          </View>
          <Text style={styles.cardTitle}>Mengenal Tipe Soket Colokan di Indonesia</Text>
          <View style={styles.gridTwo}>
            <View style={styles.subBox}>
              <Text style={styles.subBoxTitle}>Soket CCS2 (Combined Charging System)</Text>
              <Text style={styles.subBoxDesc}>
                Standar umum kendaraan listrik modern (seperti BYD Atto 3, BYD M6, dan mobil Eropa/Korea). Mendukung pengisian lambat (AC) dan pengisian kilat (DC Fast Charging) di hampir seluruh stasiun SPKLU PLN.
              </Text>
            </View>
            <View style={styles.subBox}>
              <Text style={styles.subBoxTitle}>Soket GB/T (Standar Wuling)</Text>
              <Text style={styles.subBoxDesc}>
                Digunakan pada unit Wuling Air EV dan Binguo EV. Untuk pengisian cepat di SPKLU umum bersoket CCS2, pihak rental telah menyediakan adaptor khusus di kompartemen bagasi.
              </Text>
            </View>
          </View>
        </View>

        {/* Module 3: SPKLU Locator */}
        <View style={styles.card}>
          <View style={styles.cardTagRow}>
            <Text style={styles.cardTag}>PANDUAN 03</Text>
            <Text style={styles.cardHeaderSmall}>JARINGAN STASIUN PENGISIAN UMUM (SPKLU)</Text>
          </View>
          <Text style={styles.cardTitle}>Navigasi Titik Pengisian Daya Cepat Terdekat</Text>
          <Text style={styles.cardDesc}>
            Terdapat lebih dari 1.500 stasiun SPKLU aktif di kota-kota besar dan destinasi wisata utama di Indonesia. Akses ketersediaan stasiun secara langsung:
          </Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnApp} onPress={handleOpenPln}>
              <Text style={styles.btnAppText}>Buka Direktori SPKLU via Aplikasi PLN Mobile →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.noteFoot}>
            * Buka menu "Electric Vehicle" → "SPKLU" pada aplikasi PLN Mobile untuk mengecek status slot kosong, daya pengisian (kW), dan petunjuk arah Google Maps.
          </Text>
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
    gap: 24,
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
    gap: 8,
  },
  bulletItem: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 21,
  },
  gridTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 6,
  },
  subBox: {
    flex: 1,
    minWidth: 280,
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  subBoxTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.deepInk,
    marginBottom: 6,
  },
  subBoxDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 19,
  },
  btnRow: {
    marginVertical: 12,
  },
  btnApp: {
    backgroundColor: COLORS.brandBlue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  btnAppText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  noteFoot: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
});
