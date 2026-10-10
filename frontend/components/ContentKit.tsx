import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RichText } from './RichText';
import { FadeIn } from './FadeIn';

// ---------- Hero halaman ----------

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent?: string;
}

export const PageHero: React.FC<PageHeroProps> = ({ eyebrow, title, subtitle, icon: Icon, accent = '#38BDF8' }) => (
  <View style={styles.hero}>
    <View style={[styles.heroGlow, { backgroundColor: accent }]} pointerEvents="none" />
    <View style={styles.heroInner}>
      <FadeIn>
        <View style={styles.heroRow}>
          <View style={{ flex: 1, minWidth: 260 }}>
            <View style={styles.eyebrowRow}>
              <Text style={[styles.eyebrowText, { color: accent }]}>{eyebrow}</Text>
              <View style={[styles.eyebrowLine, { backgroundColor: accent }]} />
            </View>
            <Text style={styles.heroTitle} accessibilityRole="header">
              {title}
            </Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
          <View style={[styles.heroIcon, { borderColor: accent + '55', backgroundColor: accent + '1F' }]}>
            <Icon size={42} color={accent} />
          </View>
        </View>
      </FadeIn>
    </View>
  </View>
);

export const ContentWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => <View style={styles.content}>{children}</View>;

// ---------- Bagian berkartu ----------

interface InfoSectionProps {
  tag: string;
  kicker?: string;
  title: string;
  icon: LucideIcon;
  tone?: 'blue' | 'amber' | 'green' | 'red';
  delay?: number;
  children: React.ReactNode;
}

const TONES = {
  blue: { bg: '#EBF4FC', fg: COLORS.brandBlue, stripe: COLORS.brandBlue },
  amber: { bg: '#FEF3C7', fg: '#B45309', stripe: '#F59E0B' },
  green: { bg: '#DCFCE7', fg: '#15803D', stripe: '#22C55E' },
  red: { bg: '#FEE2E2', fg: '#B91C1C', stripe: '#EF4444' },
};

export const InfoSection: React.FC<InfoSectionProps> = ({ tag, kicker, title, icon: Icon, tone = 'blue', delay = 0, children }) => {
  const t = TONES[tone];
  return (
    <FadeIn delay={delay} distance={18}>
      <View style={styles.card}>
        <View style={[styles.stripe, { backgroundColor: t.stripe }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardHead}>
            <View style={[styles.iconBadge, { backgroundColor: t.bg }]}>
              <Icon size={22} color={t.fg} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.tagRow}>
                <View style={[styles.tagChip, { backgroundColor: t.bg }]}>
                  <Text style={[styles.tagText, { color: t.fg }]}>{tag}</Text>
                </View>
                {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
              </View>
              <Text style={styles.cardTitle} accessibilityRole="header">
                {title}
              </Text>
            </View>
          </View>
          <View style={{ gap: 14 }}>{children}</View>
        </View>
      </View>
    </FadeIn>
  );
};

export const Paragraph: React.FC<{ children: string }> = ({ children }) => <RichText style={styles.paragraph}>{children}</RichText>;

// Daftar langkah bernomor
export const StepList: React.FC<{ items: string[] }> = ({ items }) => (
  <View style={{ gap: 12 }}>
    {items.map((text, i) => (
      <View key={i} style={styles.stepRow}>
        <View style={styles.stepNum}>
          <Text style={styles.stepNumText}>{i + 1}</Text>
        </View>
        <RichText style={styles.stepText}>{text}</RichText>
      </View>
    ))}
  </View>
);

// Daftar poin dengan tanda centang
export const CheckList: React.FC<{ items: string[]; color?: string }> = ({ items, color = COLORS.brandBlue }) => (
  <View style={{ gap: 10 }}>
    {items.map((text, i) => (
      <View key={i} style={styles.checkRow}>
        <View style={[styles.checkDot, { backgroundColor: color + '1A' }]}>
          <Check size={14} color={color} />
        </View>
        <RichText style={styles.stepText}>{text}</RichText>
      </View>
    ))}
  </View>
);

export const Callout: React.FC<{ tone?: 'amber' | 'blue' | 'red'; children: string }> = ({ tone = 'amber', children }) => {
  const c = { amber: ['#FFFBEB', '#FDE68A', '#78350F'], blue: ['#EFF6FF', '#BFDBFE', '#1E3A8A'], red: ['#FEF2F2', '#FECACA', '#7F1D1D'] }[tone];
  return (
    <View style={[styles.callout, { backgroundColor: c[0], borderColor: c[1] }]}>
      <RichText style={[styles.calloutText, { color: c[2] }]}>{children}</RichText>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { backgroundColor: COLORS.deepInk, paddingTop: 52, paddingBottom: 44, paddingHorizontal: 16, overflow: 'hidden' },
  heroGlow: { position: 'absolute', top: -140, right: -100, width: 380, height: 380, borderRadius: 190, opacity: 0.1 },
  heroInner: { maxWidth: 1000, width: '100%', alignSelf: 'center' },
  heroRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 24 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  eyebrowText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, flexShrink: 1 },
  eyebrowLine: { width: 36, height: 1.5 },
  heroTitle: { fontSize: 34, fontWeight: '900', color: COLORS.white, letterSpacing: -0.5, lineHeight: 42, marginBottom: 12 },
  heroSubtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.75)', maxWidth: 680, lineHeight: 26 },
  heroIcon: { width: 92, height: 92, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  content: { maxWidth: 1000, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 40, gap: 22 },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#03192A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  stripe: { width: 5 },
  cardBody: { flex: 1, padding: 24, gap: 18, minWidth: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconBadge: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 },
  tagChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  kicker: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 0.6, flexShrink: 1 },
  cardTitle: { fontSize: 21, fontWeight: '900', color: COLORS.deepInk, letterSpacing: -0.3, lineHeight: 28 },
  paragraph: { fontSize: 15, color: '#334155', lineHeight: 24 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.brandBlue, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 15, color: '#334155', lineHeight: 24 },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  callout: { borderWidth: 1, borderRadius: 12, padding: 14 },
  calloutText: { fontSize: 14, lineHeight: 21 },
});
