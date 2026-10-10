import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  CalendarDays,
  Car,
  ClipboardList,
  Globe,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  UserRound,
  Wallet,
  Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AdminBadges } from '../../services/adminApi';
import { T } from './theme';

type Icon = LucideIcon;

interface NavItem {
  path: string;
  label: string;
  icon: Icon;
  badge?: keyof AdminBadges;
  badgeColor?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/admin', label: 'Ringkasan', icon: LayoutDashboard },
  { path: '/admin/pesanan', label: 'Pesanan', icon: ClipboardList, badge: 'pendingInquiries', badgeColor: '#F59E0B' },
  { path: '/admin/jadwal', label: 'Jadwal', icon: CalendarDays, badge: 'overdueReturns', badgeColor: '#EF4444' },
  { path: '/admin/armada', label: 'Armada', icon: Car },
  { path: '/admin/driver', label: 'Driver', icon: UserRound },
  { path: '/admin/keuangan', label: 'Keuangan', icon: Wallet, badge: 'unpaid', badgeColor: '#F59E0B' },
  { path: '/admin/chat', label: 'Live Chat', icon: MessageCircle, badge: 'unreadChats', badgeColor: '#22C55E' },
];

export const isActivePath = (pathname: string, itemPath: string): boolean =>
  itemPath === '/admin' ? pathname === '/admin' : pathname === itemPath || pathname.startsWith(`${itemPath}/`);

interface Props {
  pathname: string;
  badges: AdminBadges | null;
  connected: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onOpenSite: () => void;
}

export const AdminSidebar: React.FC<Props> = ({ pathname, badges, connected, onNavigate, onLogout, onOpenSite }) => (
  <View style={styles.sidebar}>
    <View style={styles.brandRow}>
      <View style={styles.logo}>
        <Zap size={18} color="#FFFFFF" />
      </View>
      <View>
        <Text style={styles.brand}>Electra</Text>
        <Text style={styles.brandSub}>Panel Admin</Text>
      </View>
    </View>

    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8 }}>
      <Text style={styles.section}>OPERASIONAL</Text>
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.path);
        const Icon = item.icon;
        const count = item.badge && badges ? badges[item.badge] : 0;
        return (
          <TouchableOpacity
            key={item.path}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => onNavigate(item.path)}
            accessibilityRole="link"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label + (count ? `, ${count} perlu perhatian` : '')}
          >
            {active && <View style={styles.activeBar} />}
            <Icon size={19} color={active ? '#7DD3FC' : 'rgba(255,255,255,0.72)'} />
            <Text style={[styles.itemText, active && styles.itemTextActive]}>{item.label}</Text>
            {count > 0 && (
              <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
                <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>

    <View style={styles.footer}>
      <View style={styles.status}>
        <View style={[styles.statusDot, { backgroundColor: connected ? '#22C55E' : '#EF4444' }]} />
        <Text style={styles.statusText}>{connected ? 'Terhubung ke server' : 'Server tidak terjangkau'}</Text>
      </View>
      <TouchableOpacity style={styles.footerBtn} onPress={onOpenSite} accessibilityRole="link">
        <Globe size={17} color="rgba(255,255,255,0.72)" />
        <Text style={styles.footerBtnText}>Lihat situs</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerBtn} onPress={onLogout} accessibilityRole="button">
        <LogOut size={17} color="rgba(255,255,255,0.72)" />
        <Text style={styles.footerBtnText}>Keluar</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  sidebar: { width: T.sidebarWidth, flexShrink: 0, flexGrow: 0, backgroundColor: T.sidebar, height: '100%' as any, paddingTop: 18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  brandSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  section: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '800', letterSpacing: 1, paddingHorizontal: 20, marginTop: 14, marginBottom: 6 },
  item: {
    minHeight: 46,
    marginHorizontal: 10,
    marginVertical: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    position: 'relative',
  },
  itemActive: { backgroundColor: T.sidebarActive },
  activeBar: { position: 'absolute', left: -10, top: 10, bottom: 10, width: 3, borderRadius: 2, backgroundColor: '#38BDF8' },
  itemText: { flex: 1, color: 'rgba(255,255,255,0.78)', fontSize: 14.5, fontWeight: '600' },
  itemTextActive: { color: '#FFFFFF', fontWeight: '800' },
  badge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  footer: { padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', gap: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, fontWeight: '600' },
  footerBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, borderRadius: 10 },
  footerBtnText: { color: 'rgba(255,255,255,0.78)', fontSize: 14, fontWeight: '600' },
});
