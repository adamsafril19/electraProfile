import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import Head from 'expo-router/head';
import { Cable, ExternalLink, MapPin, PlugZap, Zap } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { Callout, ContentWrap, InfoSection, PageHero, Paragraph, StepList } from '../components/ContentKit';

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
      <Head>
        <title>Panduan Charging & SPKLU untuk Mobil Listrik Sewa | Electra</title>
        <meta name="description" content="Cara mengisi daya mobil listrik sewa di hotel/villa, mengenal soket CCS2 dan GB/T, serta mencari SPKLU terdekat." />
      </Head>

      <PageHero
        eyebrow="PANDUAN OPERASIONAL KENDARAAN LISTRIK"
        title="Bebas Khawatir Mengemudi EV"
        subtitle="Informasi komprehensif mengenai tata cara pengisian daya di hotel/villa, pengenalan soket colokan, dan direktori jaringan SPKLU nasional."
        icon={Zap}
      />

      <ContentWrap>
        <InfoSection tag="PANDUAN 01" kicker="PENGISIAN DAYA MANDIRI DI TEMPAT MENGINAP" title="Penggunaan Portable Home Charger di Hotel & Villa" icon={PlugZap} tone="blue">
          <Paragraph>Setiap unit armada Electra dilengkapi kabel pengisian portabel resmi berdaya 2.2 kW. Pengisian semalaman saat beristirahat sangat dianjurkan:</Paragraph>
          <StepList
            items={[
              'Pastikan kapasitas daya listrik penginapan memiliki batas daya minimal 2.200 VA.',
              'Pasang charger langsung ke stopkontak dinding yang memiliki jalur pentanahan (grounding/arde) standar.',
              'Hindari penggunaan kabel rol sambungan berdiameter tipis yang tidak berstandar SNI untuk mencegah kelebihan panas (*overheating*).',
              'Indikator lampu hijau stabil menandakan daya telah mengalir normal ke baterai utama kendaraan.',
            ]}
          />
        </InfoSection>

        <InfoSection tag="PANDUAN 02" kicker="STANDARISASI INFRASTRUKTUR CHARGER" title="Mengenal Tipe Soket Colokan di Indonesia" icon={Cable} tone="amber" delay={80}>
          <View style={styles.gridTwo}>
            <View style={styles.socketCard}>
              <View style={styles.socketBadge}>
                <Text style={styles.socketBadgeText}>CCS2</Text>
              </View>
              <Text style={styles.socketTitle}>Soket CCS2 (Combined Charging System)</Text>
              <Text style={styles.socketDesc}>
                Standar umum kendaraan listrik modern (seperti BYD Atto 3, BYD M6, dan mobil Eropa/Korea). Mendukung pengisian lambat (AC) dan pengisian kilat (DC Fast Charging) di hampir seluruh stasiun SPKLU PLN.
              </Text>
            </View>
            <View style={styles.socketCard}>
              <View style={[styles.socketBadge, { backgroundColor: '#B45309' }]}>
                <Text style={styles.socketBadgeText}>GB/T</Text>
              </View>
              <Text style={styles.socketTitle}>Soket GB/T (Standar Wuling)</Text>
              <Text style={styles.socketDesc}>
                Digunakan pada unit Wuling Air EV dan Binguo EV. Untuk pengisian cepat di SPKLU umum bersoket CCS2, pihak rental telah menyediakan adaptor khusus di kompartemen bagasi.
              </Text>
            </View>
          </View>
        </InfoSection>

        <InfoSection tag="PANDUAN 03" kicker="JARINGAN STASIUN PENGISIAN UMUM (SPKLU)" title="Navigasi Titik Pengisian Daya Cepat Terdekat" icon={MapPin} tone="green" delay={160}>
          <Paragraph>Terdapat lebih dari 1.500 stasiun SPKLU aktif di kota-kota besar dan destinasi wisata utama di Indonesia. Akses ketersediaan stasiun secara langsung:</Paragraph>
          <TouchableOpacity style={styles.btnApp} onPress={handleOpenPln} accessibilityRole="link">
            <Text style={styles.btnAppText}>Buka Direktori SPKLU via Aplikasi PLN Mobile</Text>
            <ExternalLink size={17} color={COLORS.white} />
          </TouchableOpacity>
          <Callout tone="blue">* Buka menu "Electric Vehicle" → "SPKLU" pada aplikasi PLN Mobile untuk mengecek status slot kosong, daya pengisian (kW), dan petunjuk arah Google Maps.</Callout>
        </InfoSection>
      </ContentWrap>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  gridTwo: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  socketCard: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 18, gap: 8 },
  socketBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.brandBlue, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  socketBadgeText: { color: COLORS.white, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  socketTitle: { fontSize: 16, fontWeight: '800', color: COLORS.deepInk, lineHeight: 22 },
  socketDesc: { fontSize: 14.5, color: '#475569', lineHeight: 23 },
  btnApp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    minHeight: 50,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: COLORS.brandBlue,
  },
  btnAppText: { color: COLORS.white, fontSize: 14.5, fontWeight: '800' },
});
