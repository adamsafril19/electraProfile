import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { COLORS } from '../constants/colors';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: 'Beranda', path: '/' },
    { label: 'Armada EV', path: '/armada' },
    { label: 'Panduan & SPKLU', path: '/panduan-ev' },
    { label: 'Syarat & Ketentuan', path: '/syarat-ketentuan' },
    { label: 'Layanan Darurat', path: '/bantuan-darurat' },
  ];

  const handleOpenWA = () => {
    const url = 'https://wa.me/6281234567890?text=Halo%20Admin%20Electra%2C%20saya%20ingin%20konsultasi%20reservasi%20mobil%20listrik';
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const handleCallCenter = () => {
    const phoneUrl = 'tel:081234567890';
    if (Platform.OS === 'web') {
      window.location.href = phoneUrl;
    } else {
      Linking.openURL(phoneUrl);
    }
  };

  return (
    <View style={styles.header}>
      {/* Top Bar Call Center Banner (Inspired by INDORENT) */}
      <View style={styles.topBar}>
        <View style={styles.topBarInner}>
          <TouchableOpacity style={styles.callPill} onPress={handleCallCenter}>
            <View style={styles.badge247}>
              <Text style={styles.badge247Text}>24/7</Text>
            </View>
            <View style={styles.callTextCol}>
              <Text style={styles.callLabel}>Call Center & Bantuan Darurat</Text>
              <Text style={styles.callNumber}>0812-3456-7890</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.topBarRight}>
            <Text style={styles.topBarNotice}>Standar Kepercayaan Korporat untuk Pasar Retail & Wisatawan</Text>
            <View style={styles.langPill}>
              <Text style={styles.langActive}>ID</Text>
              <Text style={styles.langSep}>|</Text>
              <Text style={styles.langInactive}>EN</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Navbar */}
      <View style={styles.mainNav}>
        <View style={styles.mainNavInner}>
          {/* Corporate Brand Logo */}
          <TouchableOpacity onPress={() => router.push('/')} style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>E</Text>
            </View>
            <View>
              <Text style={styles.brandName}>ELECTRA</Text>
              <Text style={styles.brandTagline}>ELECTRIC VEHICLE RENTAL</Text>
            </View>
          </TouchableOpacity>

          {/* Desktop Navigation Links */}
          <View style={styles.navMenu}>
            {navItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              return (
                <TouchableOpacity
                  key={item.path}
                  onPress={() => router.push(item.path as any)}
                  style={[styles.navLink, isActive && styles.navLinkActive]}
                >
                  <Text style={[styles.navText, isActive && styles.navTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* WhatsApp Action Button */}
          <TouchableOpacity style={styles.ctaWa} onPress={handleOpenWA}>
            <View style={styles.waDot} />
            <Text style={styles.ctaWaText}>Konsultasi WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.deepInk,
    borderBottomWidth: 1,
    borderBottomColor: '#0A253D',
    zIndex: 100,
  },
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  topBarInner: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  badge247: {
    backgroundColor: COLORS.brandBlue,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badge247Text: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  callTextCol: {
    justifyContent: 'center',
  },
  callLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  callNumber: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarNotice: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '400',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  langActive: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  langSep: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  langInactive: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  mainNav: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  mainNavInner: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: COLORS.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  brandTagline: {
    fontSize: 8.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 1,
  },
  navMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  navLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  navLinkActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  navText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.2,
  },
  navTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  ctaWa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.whatsapp,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  waDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#86EFAC',
  },
  ctaWaText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
