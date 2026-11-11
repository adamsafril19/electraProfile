import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, Headphones, BatteryCharging, BadgePercent } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

export const TrustBadges: React.FC = () => {
  const pillars = [
    {
      code: '01',
      icon: ShieldCheck,
      title: 'Garansi Mobil Pengganti',
      desc: 'Jika terjadi kendala teknis pada sistem kelistrikan, kami menyediakan armada pengganti dalam 60–90 menit.',
    },
    {
      code: '02',
      icon: Headphones,
      title: 'Layanan Darurat 24 Jam',
      desc: 'Dukungan Roadside Assistance 24/7, layanan derek resmi, dan tim teknisi siaga di seluruh wilayah operasional.',
    },
    {
      code: '03',
      icon: BatteryCharging,
      title: 'Baterai Prima 80% - 100%',
      desc: 'Seluruh unit diserahkan dalam kondisi baterai siap tempuh, interior steril, dan kelengkapan charger portable.',
    },
    {
      code: '04',
      icon: BadgePercent,
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
        {pillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <View key={idx} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconCircle}>
                  <Icon size={22} color={COLORS.brandBlue} />
                </View>
                <View style={styles.badgeCode}>
                  <Text style={styles.badgeCodeText}>{item.code}</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingVertical: 56,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    marginVertical: 20,
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
    fontSize: 12,
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
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.deepInk,
    lineHeight: 36,
    marginBottom: 8,
  },
  headingDesc: {
    fontSize: 14.5,
    color: '#64748B',
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  card: {
    flex: 1,
    minWidth: 260,
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#03192A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 114, 201, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCode: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  badgeCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textInk,
    marginBottom: 8,
    lineHeight: 23,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 21,
  },
});
