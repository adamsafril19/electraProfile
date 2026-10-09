import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';

export const Footer: React.FC = () => {
  const router = useRouter();

  const handleOpenEmergency = () => {
    const phoneUrl = 'tel:081234567890';
    if (Platform.OS === 'web') {
      window.location.href = phoneUrl;
    } else {
      Linking.openURL(phoneUrl);
    }
  };

  return (
    <View style={styles.footer}>
      {/* Pre-footer Callout Banner */}
      <View style={styles.preFooter}>
        <View style={styles.preFooterInner}>
          <View>
            <Text style={styles.preFooterLabel}>BUTUH BANTUAN OPERASIONAL ATAU DEREK DARURAT?</Text>
            <Text style={styles.preFooterTitle}>Layanan Call Center & Emergency Roadside Siaga 24 Jam</Text>
          </View>
          <TouchableOpacity style={styles.preFooterCallBtn} onPress={handleOpenEmergency}>
            <Text style={styles.preFooterCallBtnText}>Hubungi Hotline 0812-3456-7890</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Footer Links */}
      <View style={styles.mainFooter}>
        <View style={styles.mainFooterInner}>
          {/* Company Column */}
          <View style={styles.colBrand}>
            <View style={styles.brandBadgeRow}>
              <View style={styles.logoMarkSmall}>
                <Text style={styles.logoMarkSmallText}>E</Text>
              </View>
              <Text style={styles.brandTitle}>ELECTRA</Text>
            </View>
            <Text style={styles.brandDesc}>
              Penyedia layanan rental kendaraan listrik (EV) mandiri terdepan dengan standar operasional korporat teruji untuk wisatawan dan konsumen retail.
            </Text>
            <Text style={styles.contactItem}>Pool Pusat: Jl. Bypass Ngurah Rai No. 88, Bali</Text>
            <Text style={styles.contactItem}>Jam Operasional Admin: 07.00 - 23.00 WITA</Text>
            <Text style={styles.contactItem}>Layanan Darurat: 24 Jam Nonstop</Text>
          </View>

          {/* Nav Column 1 */}
          <View style={styles.colNav}>
            <Text style={styles.colHeader}>Layanan & Armada</Text>
            <TouchableOpacity onPress={() => router.push('/armada')} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Katalog Mobil Listrik</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/armada')} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Sewa Lepas Kunci (24 Jam)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/armada')} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Sewa Dengan Pengemudi</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/panduan-ev')} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Panduan Charging & SPKLU</Text>
            </TouchableOpacity>
          </View>

          {/* Nav Column 2 */}
          <View style={styles.colNav}>
            <Text style={styles.colHeader}>Standar & Kebijakan</Text>
            <TouchableOpacity onPress={() => router.push('/syarat-ketentuan')} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Syarat Verifikasi Dokumen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/syarat-ketentuan')} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Aturan State of Charge (SoC)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/bantuan-darurat')} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Garansi Mobil Pengganti</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/bantuan-darurat')} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Layanan Derek Darurat 24 Jam</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <Text style={styles.copyrightText}>
            © 2026 Electra Mobility Indonesia. Seluruh hak cipta dilindungi.
          </Text>
          <Text style={styles.legalSub}>
            Semua armada diasuransikan, terawat berkala, dan dilengkapi charger portable.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: COLORS.deepInk,
    borderTopWidth: 1,
    borderTopColor: '#07243B',
  },
  preFooter: {
    backgroundColor: '#07243B',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  preFooterInner: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  preFooterLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandBlueHover,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  preFooterTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  preFooterCallBtn: {
    backgroundColor: COLORS.brandBlue,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  preFooterCallBtnText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  mainFooter: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  mainFooterInner: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 36,
    justifyContent: 'space-between',
  },
  colBrand: {
    flex: 1.4,
    minWidth: 280,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logoMarkSmall: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: COLORS.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkSmallText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 14,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  brandDesc: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 20,
    marginBottom: 16,
  },
  contactItem: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  colNav: {
    flex: 1,
    minWidth: 200,
  },
  colHeader: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  footerLink: {
    minHeight: 32,
    justifyContent: 'center',
  },
  footerLinkText: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  bottomBar: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 40,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  copyrightText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  legalSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
  },
});
