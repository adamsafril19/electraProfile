import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Linking, Platform, useWindowDimensions } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { COLORS } from '../constants/colors';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isCompact = width < 1024;
  const isPhone = width < 640;
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (path: string) => {
    setMenuOpen(false);
    router.push(path as any);
  };

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
      {/* Main Navbar - Single Row Header matching INDORENT */}
      <View style={styles.mainNav}>
        <View style={styles.mainNavInner}>
          {/* Corporate Brand Logo & Call Center Pill */}
          <View style={styles.leftGroup}>
            <TouchableOpacity onPress={() => navigate('/')} style={styles.brandRow}>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkText}>E</Text>
              </View>
              <View>
                <Text style={styles.brandName}>ELECTRA</Text>
                {!isPhone && <Text style={styles.brandTagline}>ELECTRIC VEHICLE RENTAL</Text>}
              </View>
            </TouchableOpacity>

            {!isPhone && <View style={styles.headerDivider} />}

            {!isPhone && (
              <TouchableOpacity style={styles.callPill} onPress={handleCallCenter} activeOpacity={0.8}>
                <View style={styles.badge247}>
                  <Text style={styles.badge247Text}>24/7</Text>
                </View>
                <View style={styles.callTextCol}>
                  <Text style={styles.callLabel}>Call Center</Text>
                  <Text style={styles.callNumber}>0812-3456-7890</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Desktop Navigation Links */}
          {!isCompact && (
            <View style={styles.navMenu}>
              {navItems.map((item) => {
                const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
                return (
                  <Pressable
                    key={item.path}
                    onPress={() => navigate(item.path)}
                    accessibilityRole="link"
                    style={({ hovered }: any) => [styles.navLink, isActive && styles.navLinkActive, hovered && !isActive && styles.navLinkHover]}
                  >
                    <Text style={[styles.navText, isActive && styles.navTextActive]}>
                      {item.label}
                    </Text>
                    {isActive && <View style={styles.navUnderline} />}
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.rightGroup}>
            {/* WhatsApp Action Button */}
            <TouchableOpacity
              style={[styles.ctaWa, isPhone && styles.ctaWaIcon]}
              onPress={handleOpenWA}
              accessibilityRole="link"
              accessibilityLabel="Konsultasi WhatsApp"
            >
              {isPhone ? (
                <MessageCircle size={22} color={COLORS.white} />
              ) : (
                <>
                  <View style={styles.waDot} />
                  <Text style={styles.ctaWaText}>Konsultasi WhatsApp</Text>
                </>
              )}
            </TouchableOpacity>

            {isCompact && (
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={() => setMenuOpen((o) => !o)}
                accessibilityLabel={menuOpen ? 'Tutup menu' : 'Buka menu'}
              >
                <View style={[styles.menuBar, menuOpen && styles.menuBarTopOpen]} />
                <View style={[styles.menuBar, menuOpen && styles.menuBarMidOpen]} />
                <View style={[styles.menuBar, menuOpen && styles.menuBarBotOpen]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Mobile Dropdown Menu */}
        {isCompact && menuOpen && (
          <View style={styles.mobileMenu}>
            <TouchableOpacity style={styles.mobileCallPill} onPress={handleCallCenter}>
              <View style={styles.badge247}>
                <Text style={styles.badge247Text}>24/7</Text>
              </View>
              <View style={styles.callTextCol}>
                <Text style={styles.callLabel}>Call Center 24 Jam</Text>
                <Text style={styles.callNumber}>0812-3456-7890</Text>
              </View>
            </TouchableOpacity>

            {navItems.map((item) => {
              const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
              return (
                <TouchableOpacity
                  key={item.path}
                  onPress={() => navigate(item.path)}
                  style={[styles.mobileLink, isActive && styles.mobileLinkActive]}
                >
                  <Text style={[styles.mobileLinkText, isActive && styles.navTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  badge247: {
    backgroundColor: COLORS.brandBlue,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badge247Text: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  callTextCol: {
    justifyContent: 'center',
  },
  callLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  callNumber: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mobileCallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(7, 149, 254, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(7, 149, 254, 0.25)',
    marginBottom: 8,
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
    fontSize: 12,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    position: 'relative',
    ...(Platform.OS === 'web' ? ({ transitionProperty: 'background-color', transitionDuration: '150ms', cursor: 'pointer' } as any) : null),
  },
  navLinkHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  navUnderline: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#38BDF8',
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
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  menuBar: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.white,
  },
  menuBarTopOpen: {
    transform: [{ translateY: 6 }, { rotate: '45deg' }],
  },
  menuBarMidOpen: {
    opacity: 0,
  },
  menuBarBotOpen: {
    transform: [{ translateY: -6 }, { rotate: '-45deg' }],
  },
  mobileMenu: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
  },
  mobileLink: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  mobileLinkActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  mobileLinkText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  ctaWa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.whatsapp,
    minHeight: 48,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
  },
  ctaWaIcon: {
    width: 48,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    borderRadius: 24,
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
