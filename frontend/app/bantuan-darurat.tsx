import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import Head from 'expo-router/head';
import { MessageCircle, Phone, Siren, Truck } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ContentWrap, InfoSection, PageHero, Paragraph, StepList } from '../components/ContentKit';
import { FadeIn } from '../components/FadeIn';

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
      <Head>
        <title>Layanan Darurat 24 Jam & Mobil Pengganti | Electra</title>
        <meta name="description" content="Hotline darurat 24 jam, derek gratis, dan garansi mobil pengganti 60-90 menit untuk penyewa mobil listrik Electra." />
      </Head>

      <PageHero
        eyebrow="LAYANAN DARURAT & JAMINAN KELANGSUNGAN PERJALANAN"
        title="Roadside Assistance & Mobil Pengganti 24 Jam"
        subtitle="Komitmen kami mendampingi perjalanan Anda tanpa henti. Ketenangan pikiran Anda adalah prioritas utama standar operasional kami."
        icon={Siren}
        accent="#F87171"
      />

      <ContentWrap>
        {/* Kartu hotline: elemen terpenting halaman ini */}
        <FadeIn>
          <View style={styles.dispatchCard}>
            <View style={styles.dispatchTopBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.dispatchTopBadgeText}>HOTLINE RESMI 24/7</Text>
            </View>
            <Text style={styles.dispatchTitle}>Emergency Dispatch Call Center</Text>
            <Text style={styles.dispatchPhone} selectable>
              0812-3456-7890
            </Text>
            <Text style={styles.dispatchDesc}>
              Siaga 24 jam nonstop untuk evakuasi armada, layanan derek resmi, jumper baterai 12V pendukung, dan penanganan kendala teknis di jalan.
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnCall} onPress={handleCallHotline} accessibilityRole="link">
                <Phone size={19} color={COLORS.white} />
                <Text style={styles.btnCallText}>Hubungi Hotline Darurat Sekarang</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnWa} onPress={handleOpenEmergencyWA} accessibilityRole="link">
                <MessageCircle size={19} color={COLORS.white} />
                <Text style={styles.btnWaText}>Chat Dispatcher via WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>

        <InfoSection tag="STANDAR SLA" kicker="JAMINAN KENDARAAN PENGGANTI" title="Garansi Pengiriman Mobil Pengganti (Replacement Car)" icon={Truck} tone="red" delay={100}>
          <Paragraph>Apabila unit kendaraan mengalami malfungsi teknis pada sistem kelistrikan murni (bukan akibat kelalaian pemakaian penyewa):</Paragraph>
          <StepList
            items={[
              '**SLA Pengiriman 60–90 Menit**: Unit pengganti segera dikirimkan ke titik lokasi Anda dalam wilayah jangkauan perkotaan.',
              '**Spesifikasi Kendaraan Setara**: Kami mengutamakan unit mobil listrik setara, atau alternatif kendaraan bensin premium jika seluruh unit EV sedang terisi.',
              '**Bebas Biaya Evakuasi**: Seluruh beban biaya mobil derek (*towing*) ditanggung sepenuhnya oleh pihak rental.',
            ]}
          />
        </InfoSection>
      </ContentWrap>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  dispatchCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 3,
  },
  dispatchTopBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 14 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FECACA' },
  dispatchTopBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  dispatchTitle: { fontSize: 19, fontWeight: '800', color: '#991B1B', marginBottom: 4, textAlign: 'center' },
  dispatchPhone: { fontSize: 42, fontWeight: '900', color: '#DC2626', letterSpacing: 0.5, marginVertical: 8, textAlign: 'center' },
  dispatchDesc: { fontSize: 15, color: '#7F1D1D', textAlign: 'center', maxWidth: 600, marginBottom: 24, lineHeight: 24 },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignSelf: 'stretch' },
  btnCall: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, backgroundColor: '#DC2626', paddingHorizontal: 24, borderRadius: 12, flexShrink: 1, maxWidth: '100%', justifyContent: 'center' },
  btnCallText: { color: COLORS.white, fontWeight: '800', fontSize: 14.5, flexShrink: 1, textAlign: 'center' },
  btnWa: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, backgroundColor: COLORS.whatsapp, paddingHorizontal: 24, borderRadius: 12, flexShrink: 1, maxWidth: '100%', justifyContent: 'center' },
  btnWaText: { color: COLORS.white, fontWeight: '800', fontSize: 14.5, flexShrink: 1, textAlign: 'center' },
});
