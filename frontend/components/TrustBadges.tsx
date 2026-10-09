import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export const TrustBadges: React.FC = () => {
  const pillars = [
    {
      code: '01',
      title: 'Garansi Kendaraan Pengganti',
      desc: 'Jika terjadi kendala teknis pada sistem kelistrikan, kami menyediakan armada pengganti dalam 60–90 menit.',
    },
    {
      code: '02',
      title: 'Layanan Darurat 24 Jam',
      desc: 'Dukungan Roadside Assistance 24/7, layanan derek resmi, dan tim teknisi siaga di seluruh wilayah operasional.',
    },
    {
      code: '03',
      title: 'Baterai Prima 80% - 100%',
      desc: 'Seluruh unit diserahkan dalam kondisi baterai siap tempuh, interior steril, dan kelengkapan charger portable.',
    },
    {
      code: '04',
      title: 'Transparansi Tarif Penuh',
      desc: 'Struktur harga harian terbuka untuk konsumen retail tanpa biaya tersembunyi saat pengembalian kendaraan.',
    },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrowText}>STANDAR KEPERCAYAAN LAYANAN</Text>
          <View style={styles.eyebrowLine} />
        </View>
        <Text style={styles.headingTitle}>Komitmen Mobilitas Listrik Tanpa Keraguan</Text>
        <Text style={styles.headingDesc}>
          Mengadopsi keandalan tata kelola armada korporat terkemuka untuk kenyamanan wisatawan dan konsumen retail.
        </Text>
      </View>

      <View style={styles.grid}>
        {pillars.map((item, idx) => (
          <View key={idx} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.badgeCode}>
                <Text style={styles.badgeCodeText}>{item.code}</Text>
              </View>
              <View style={styles.lineIndicator} />
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingVertical: 48,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  header: {
    maxWidth: 750,
    marginBottom: 36,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brandBlue,
    letterSpacing: 1.5,
  },
  eyebrowLine: {
    width: 40,
    height: 1.5,
    backgroundColor: COLORS.brandBlue,
  },
  headingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.deepInk,
    lineHeight: 32,
    marginBottom: 8,
  },
  headingDesc: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    flex: 1,
    minWidth: 240,
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#03192A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badgeCode: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandBlue,
  },
  lineIndicator: {
    flex: 1,
    height: 1,
    backgroundColor: '#EDF2F7',
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.textInk,
    marginBottom: 8,
    lineHeight: 22,
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 20,
  },
});
