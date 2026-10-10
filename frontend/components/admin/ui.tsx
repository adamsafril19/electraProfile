import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, Linking, Animated } from 'react-native';
import { Inbox, X } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { InquiryStatus, STATUS_LABEL } from '../../services/adminApi';
import { T, shadow } from './theme';
import { showConfirm, showPrompt } from './feedback';

export type IconType = LucideIcon;

// ---------- Format ----------

export const rp = (n: number): string => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export const rpShort = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} jt`;
  if (abs >= 1_000) return `${sign}Rp ${Math.round(abs / 1_000)} rb`;
  return `${sign}Rp ${abs}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const fmtDate = (ymd: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ymd;
};

export const fmtDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// ---------- Aksi platform ----------

// Konfirmasi lintas platform (Alert.alert tidak berfungsi di web)
export const confirmAction = (message: string): Promise<boolean> => {
  const custom = showConfirm(message);
  if (custom) return custom;
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    Alert.alert('Konfirmasi', message, [
      { text: 'Batal', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Lanjutkan', onPress: () => resolve(true) },
    ]);
  });
};

// Minta alasan singkat (mis. pembatalan). Web: prompt browser. Native: tidak ada prompt teks lintas-OS,
// jadi cukup konfirmasi dan pakai alasan bawaan. null = dibatalkan pengguna.
export const askReason = async (message: string, fallbackReason = 'Dibatalkan oleh admin'): Promise<string | null> => {
  const custom = showPrompt(message, { initialValue: fallbackReason, confirmLabel: 'Batalkan pencatatan' });
  if (custom) return custom;
  if (Platform.OS === 'web') {
    const v = window.prompt(message);
    return v === null ? null : v.trim() || null;
  }
  return (await confirmAction(message)) ? fallbackReason : null;
};

export const openExternal = (url: string) => {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
  else Linking.openURL(url);
};

export const openWhatsAppTo = (phone: string, text?: string) => {
  const digits = phone.replace(/[\s-]/g, '').replace(/^\+/, '').replace(/^0/, '62');
  openExternal(`https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`);
};

// ---------- Komponen dasar ----------

const STATUS_COLORS: Record<InquiryStatus, { bg: string; fg: string; dot: string }> = {
  PENDING_WHATSAPP: { bg: T.warnSoft, fg: '#92400E', dot: '#F59E0B' },
  CONFIRMED: { bg: T.infoSoft, fg: '#1E40AF', dot: '#3B82F6' },
  ACTIVE: { bg: T.successSoft, fg: '#166534', dot: '#22C55E' },
  COMPLETED: { bg: '#E2E8F0', fg: '#334155', dot: '#64748B' },
  CANCELLED: { bg: T.dangerSoft, fg: '#991B1B', dot: '#EF4444' },
};

export const statusColor = (s: InquiryStatus) => STATUS_COLORS[s];

export const StatusBadge: React.FC<{ status: InquiryStatus }> = ({ status }) => (
  <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status].bg }]}>
    <View style={[styles.badgeDot, { backgroundColor: STATUS_COLORS[status].dot }]} />
    <Text style={[styles.badgeText, { color: STATUS_COLORS[status].fg }]}>{STATUS_LABEL[status]}</Text>
  </View>
);

type Tone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';
const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: T.surfaceAlt, fg: T.inkSoft, border: T.border },
  info: { bg: T.infoSoft, fg: '#1E40AF', border: '#BFDBFE' },
  success: { bg: T.successSoft, fg: '#166534', border: '#BBF7D0' },
  warn: { bg: T.warnSoft, fg: '#92400E', border: '#FDE68A' },
  danger: { bg: T.dangerSoft, fg: '#991B1B', border: '#FECACA' },
};
export const toneColors = (t: Tone) => TONES[t];

export const Pill: React.FC<{ label: string; tone?: Tone }> = ({ label, tone = 'neutral' }) => (
  <View style={[styles.pill, { backgroundColor: TONES[tone].bg, borderColor: TONES[tone].border }]}>
    <Text style={[styles.pillText, { color: TONES[tone].fg }]}>{label}</Text>
  </View>
);

export const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; hint?: string; right?: React.ReactNode }> = ({ children, hint, right }) => (
  <View style={styles.sectionTitleRow}>
    <View style={{ flex: 1, minWidth: 160 }}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
    {right}
  </View>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <View style={styles.pageHeader}>
    <View style={{ flex: 1, minWidth: 220 }}>
      <Text style={styles.pageTitle} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
    </View>
    {right ? <View style={styles.pageActions}>{right}</View> : null}
  </View>
);

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
export const Btn: React.FC<{
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  icon?: LucideIcon;
}> = ({ label, onPress, variant = 'primary', disabled, loading, small, icon: Icon }) => {
  const v = btnVariants[variant];
  return (
    <TouchableOpacity
      style={[styles.btn, small && styles.btnSmall, v.box, (disabled || loading) && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.textColor} />
      ) : (
        <View style={styles.btnInner}>
          {Icon ? <Icon size={small ? 15 : 17} color={v.textColor} /> : null}
          <Text style={[styles.btnText, { color: v.textColor }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const Chip: React.FC<{
  label: string;
  active?: boolean;
  onPress?: () => void;
  count?: number | null;
  tone?: Tone;
}> = ({ label, active, onPress, count, tone }) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipActive, !active && tone ? { borderColor: TONES[tone].border } : null]}
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    {count !== null && count !== undefined ? (
      <View style={[styles.chipCount, active && { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
        <Text style={[styles.chipCountText, active && { color: '#FFFFFF' }]}>{count}</Text>
      </View>
    ) : null}
  </TouchableOpacity>
);

export const StatTile: React.FC<{
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  icon?: LucideIcon;
  onPress?: () => void;
}> = ({ label, value, hint, tone = 'info', icon: Icon, onPress }) => {
  const c = TONES[tone];
  const body = (
    <>
      <View style={styles.tileTop}>
        <Text style={styles.tileLabel}>{label}</Text>
        {Icon ? (
          <View style={[styles.tileIcon, { backgroundColor: c.bg }]}>
            <Icon size={17} color={c.fg} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.tileValue, { color: tone === 'neutral' ? T.ink : c.fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </>
  );
  return onPress ? (
    <TouchableOpacity style={[styles.tile, shadow]} onPress={onPress} accessibilityRole="button">
      {body}
    </TouchableOpacity>
  ) : (
    <View style={[styles.tile, shadow]}>{body}</View>
  );
};

export const Avatar: React.FC<{ name: string; size?: number; tone?: Tone }> = ({ name, size = 40, tone = 'info' }) => {
  const initials = name
    .split(/\s+/)
    .map((p) => p.replace(/^[^\p{L}]+/u, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: TONES[tone].bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38, color: TONES[tone].fg }]}>{initials || '?'}</Text>
    </View>
  );
};

export const EmptyState: React.FC<{
  title: string;
  text?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}> = ({ title, text, icon: Icon = Inbox, action }) => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Icon size={26} color={T.muted} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
  </View>
);

export const FormField: React.FC<{ label: string; error?: string | null; hint?: string; children: React.ReactNode; style?: any }> = ({
  label,
  error,
  hint,
  children,
  style,
}) => (
  <View style={[{ gap: 5 }, style]}>
    <Text style={adminStyles.label}>{label}</Text>
    {children}
    {error ? <Text style={adminStyles.fieldError}>{error}</Text> : hint ? <Text style={adminStyles.muted}>{hint}</Text> : null}
  </View>
);

export const ErrorBox: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <View style={styles.errorBox} accessibilityRole="alert">
    <Text style={styles.errorText}>{message}</Text>
    {onRetry ? <Btn label="Coba lagi" onPress={onRetry} variant="danger" small /> : null}
  </View>
);

export const WarnBox: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.warnBox} accessibilityRole="alert">
    <Text style={styles.warnText}>{message}</Text>
  </View>
);

export const InfoBox: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.infoBox}>
    <Text style={styles.infoText}>{message}</Text>
  </View>
);

// Kerangka kartu saat memuat: tata letak tidak melompat ketika data tiba
export const SkeletonBlock: React.FC<{ height?: number; width?: number | string; radius?: number; style?: any }> = ({ height = 14, width = '100%', radius = 8, style }) => {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.5, duration: 750, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ height, width: width as any, borderRadius: radius, backgroundColor: '#E2E8F0', opacity: pulse }, style]} />;
};

export const Loading: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <View style={{ gap: 14 }} accessibilityLabel="Memuat data" accessibilityRole="progressbar">
    {Array.from({ length: rows }, (_, i) => (
      <View key={i} style={styles.skeletonCard}>
        <SkeletonBlock height={42} width={42} radius={21} />
        <View style={{ flex: 1, gap: 9 }}>
          <SkeletonBlock width="30%" height={11} />
          <SkeletonBlock width="55%" height={16} />
          <SkeletonBlock width="80%" height={12} />
        </View>
        <SkeletonBlock width={90} height={26} radius={13} />
      </View>
    ))}
  </View>
);

// Pemberitahuan yang bisa ditutup (ingat per sesi tab)
export const DismissibleNotice: React.FC<{ id: string; message: string }> = ({ id, message }) => {
  const key = `electra_admin_notice_${id}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return Platform.OS === 'web' && window.sessionStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  return (
    <View style={[styles.warnBox, styles.noticeRow]} accessibilityRole="alert">
      <Text style={[styles.warnText, { flex: 1 }]}>{message}</Text>
      <TouchableOpacity
        style={styles.noticeClose}
        onPress={() => {
          setHidden(true);
          try {
            if (Platform.OS === 'web') window.sessionStorage.setItem(key, '1');
          } catch {
            // penyimpanan diblokir: cukup tutup untuk render ini
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Tutup pemberitahuan"
      >
        <X size={16} color="#78350F" />
      </TouchableOpacity>
    </View>
  );
};

const btnVariants: Record<BtnVariant, { box: any; textColor: string }> = {
  primary: { box: { backgroundColor: T.brand, borderColor: T.brand }, textColor: '#FFFFFF' },
  success: { box: { backgroundColor: T.success, borderColor: T.success }, textColor: '#FFFFFF' },
  secondary: { box: { backgroundColor: '#FFFFFF', borderColor: T.borderStrong }, textColor: T.ink },
  danger: { box: { backgroundColor: '#FFFFFF', borderColor: '#F87171' }, textColor: T.danger },
  ghost: { box: { backgroundColor: 'transparent', borderColor: 'transparent' }, textColor: T.brand },
};

export const adminStyles = StyleSheet.create({
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: T.borderStrong,
    borderRadius: T.radiusSm,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: T.surfaceAlt,
    color: T.ink,
  },
  inputError: { borderColor: '#DC2626' },
  label: { fontSize: 12, fontWeight: '800', color: T.inkSoft, letterSpacing: 0.5 },
  fieldError: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  muted: { fontSize: 12.5, color: T.muted, lineHeight: 18 },
});

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius,
    padding: 18,
    ...shadow,
  },
  sectionTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: T.ink },
  sectionHint: { fontSize: 12.5, color: T.muted, marginTop: 2, lineHeight: 18 },
  pageHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: T.ink, letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 14, color: T.muted, marginTop: 3, lineHeight: 20 },
  pageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', maxWidth: '100%' },
  btn: { minHeight: 44, paddingHorizontal: 16, borderRadius: T.radiusSm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { minHeight: 40, paddingHorizontal: 12 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  btnText: { fontSize: 13, fontWeight: '800' },
  chip: {
    minHeight: 40,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.borderStrong,
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: T.ink, borderColor: T.ink },
  chipText: { fontSize: 13, fontWeight: '700', color: T.inkSoft },
  chipTextActive: { color: '#FFFFFF' },
  chipCount: { minWidth: 20, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  chipCountText: { fontSize: 12, fontWeight: '800', color: T.inkSoft },
  tile: {
    flexGrow: 1,
    flexBasis: 160,
    minWidth: 0,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius,
    padding: 16,
    gap: 4,
  },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, minHeight: 36 },
  tileLabel: { fontSize: 13, fontWeight: '700', color: T.muted, flex: 1 },
  tileIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  tileHint: { fontSize: 12.5, color: T.muted },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 16 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: T.ink, textAlign: 'center' },
  emptyText: { fontSize: 13, color: T.muted, marginTop: 4, textAlign: 'center', maxWidth: 360, lineHeight: 19 },
  skeletonCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: T.radius, padding: 16 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingRight: 4 },
  noticeClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  errorBox: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, borderRadius: T.radiusSm, padding: 12, gap: 8, alignItems: 'flex-start' },
  errorText: { color: '#991B1B', fontSize: 13, lineHeight: 18 },
  warnBox: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D', borderWidth: 1, borderRadius: T.radiusSm, padding: 12 },
  warnText: { color: '#78350F', fontSize: 13, lineHeight: 18 },
  infoBox: { backgroundColor: T.infoSoft, borderColor: '#BFDBFE', borderWidth: 1, borderRadius: T.radiusSm, padding: 12 },
  infoText: { color: '#1E3A8A', fontSize: 13, lineHeight: 18 },
});
