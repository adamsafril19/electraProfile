import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import Head from 'expo-router/head';
import { Cable, ExternalLink, MapPin, PlugZap, Zap } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { Callout, ContentWrap, InfoSection, PageHero, Paragraph, StepList } from '../components/ContentKit';
import { useLanguage } from '../context/LanguageContext';

export default function EvGuideScreen() {
  const { locale, t } = useLanguage();
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
        eyebrow={t('PANDUAN OPERASIONAL KENDARAAN LISTRIK', 'ELECTRIC VEHICLE OPERATIONAL GUIDE')}
        title={t('Bebas Khawatir Mengemudi EV', 'Worry-Free EV Driving')}
        subtitle={t(
          'Informasi komprehensif mengenai tata cara pengisian daya di hotel/villa, pengenalan soket colokan, dan direktori jaringan SPKLU nasional.',
          'Comprehensive information on charging at hotels/villas, connector types (CCS2 & GB/T), and the national SPKLU fast-charging network.'
        )}
        icon={Zap}
      />

      <ContentWrap>
        <InfoSection
          tag={t('PANDUAN 01', 'GUIDE 01')}
          kicker={t('PENGISIAN DAYA MANDIRI DI TEMPAT MENGINAP', 'SELF-CHARGING AT ACCOMMODATION')}
          title={t('Penggunaan Portable Home Charger di Hotel & Villa', 'Using the 2.2 kW Portable Charger at Hotels & Villas')}
          icon={PlugZap}
          tone="blue"
        >
          <Paragraph>
            {t(
              'Setiap unit armada Electra dilengkapi kabel pengisian portabel resmi berdaya 2.2 kW. Pengisian semalaman saat beristirahat sangat dianjurkan:',
              'Every Electra rental vehicle includes an official 2.2 kW portable charging cable. Overnight charging while resting is highly recommended:'
            )}
          </Paragraph>
          <StepList
            items={[
              t('Pastikan kapasitas daya listrik penginapan memiliki batas daya minimal 2.200 VA.', 'Ensure the hotel or villa electrical capacity has a minimum threshold of 2,200 VA.'),
              t('Pasang charger langsung ke stopkontak dinding yang memiliki jalur pentanahan (grounding/arde) standar.', 'Plug the charger directly into a grounded wall socket with standard earthing.'),
              t('Hindari penggunaan kabel rol sambungan berdiameter tipis yang tidak berstandar SNI untuk mencegah kelebihan panas (*overheating*).', 'Avoid using thin extension cords or uncertified power strips to prevent overheating.'),
              t('Indikator lampu hijau stabil menandakan daya telah mengalir normal ke baterai utama kendaraan.', 'A steady green indicator light confirms power is charging normally into the high-voltage battery.'),
            ]}
          />
        </InfoSection>

        <InfoSection
          tag={t('PANDUAN 02', 'GUIDE 02')}
          kicker={t('STANDARISASI INFRASTRUKTUR CHARGER', 'CHARGING INFRASTRUCTURE STANDARDS')}
          title={t('Mengenal Tipe Soket Colokan di Indonesia', 'Understanding EV Plug & Socket Types in Indonesia')}
          icon={Cable}
          tone="amber"
          delay={80}
        >
          <View style={styles.gridTwo}>
            <View style={styles.socketCard}>
              <View style={styles.socketBadge}>
                <Text style={styles.socketBadgeText}>CCS2</Text>
              </View>
              <Text style={styles.socketTitle}>
                {t('Soket CCS2 (Combined Charging System)', 'CCS2 Connector (Combined Charging System)')}
              </Text>
              <Text style={styles.socketDesc}>
                {t(
                  'Standar umum kendaraan listrik modern (seperti BYD Atto 3, BYD M6, dan mobil Eropa/Korea). Mendukung pengisian lambat (AC) dan pengisian kilat (DC Fast Charging) di hampir seluruh stasiun SPKLU PLN.',
                  'The universal standard for modern electric cars (including BYD Atto 3, BYD M6, and European/Korean models). Supports both slow AC and ultra-fast DC charging across nearly all PLN public SPKLU stations.'
                )}
              </Text>
            </View>
            <View style={styles.socketCard}>
              <View style={[styles.socketBadge, { backgroundColor: '#B45309' }]}>
                <Text style={styles.socketBadgeText}>GB/T</Text>
              </View>
              <Text style={styles.socketTitle}>
                {t('Soket GB/T (Standar Wuling)', 'GB/T Connector (Wuling Standard)')}
              </Text>
              <Text style={styles.socketDesc}>
                {t(
                  'Digunakan pada unit Wuling Air EV dan Binguo EV. Untuk pengisian cepat di SPKLU umum bersoket CCS2, pihak rental telah menyediakan adaptor khusus di kompartemen bagasi.',
                  'Used in Wuling Air EV and Binguo EV units. For fast charging at public CCS2 stations, an approved adapter is provided in the trunk compartment.'
                )}
              </Text>
            </View>
          </View>
        </InfoSection>

        <InfoSection
          tag={t('PANDUAN 03', 'GUIDE 03')}
          kicker={t('JARINGAN STASIUN PENGISIAN UMUM (SPKLU)', 'PUBLIC FAST-CHARGING STATIONS (SPKLU)')}
          title={t('Navigasi Titik Pengisian Daya Cepat Terdekat', 'Navigating the Nearest Fast Charging Stations')}
          icon={MapPin}
          tone="green"
          delay={160}
        >
          <Paragraph>
            {t(
              'Terdapat lebih dari 1.500 stasiun SPKLU aktif di kota-kota besar dan destinasi wisata utama di Indonesia. Akses ketersediaan stasiun secara langsung:',
              'There are more than 1,500 active public SPKLU charging stations across major cities and primary tourism hubs in Indonesia. Access live station availability directly:'
            )}
          </Paragraph>
          <TouchableOpacity style={styles.btnApp} onPress={handleOpenPln} accessibilityRole="link">
            <Text style={styles.btnAppText}>
              {t('Buka Direktori SPKLU via Aplikasi PLN Mobile', 'Open SPKLU Directory via PLN Mobile App')}
            </Text>
            <ExternalLink size={17} color={COLORS.white} />
          </TouchableOpacity>
          <Callout tone="blue">
            {t(
              '* Buka menu "Electric Vehicle" → "SPKLU" pada aplikasi PLN Mobile untuk mengecek status slot kosong, daya pengisian (kW), dan petunjuk arah Google Maps.',
              '* Open the "Electric Vehicle" → "SPKLU" menu in the PLN Mobile app to verify slot vacancies, charging power (kW), and Google Maps navigation.'
            )}
          </Callout>
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
