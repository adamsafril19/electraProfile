import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Menu, Search, X } from 'lucide-react-native';
import { AdminApiError, AdminBadges, adminLogout, checkAdminSession, fetchBadges } from '../../services/adminApi';
import { AdminContext } from '../../components/admin/AdminContext';
import { AdminLogin } from '../../components/admin/AdminLogin';
import { AdminSidebar, NAV_ITEMS, isActivePath } from '../../components/admin/AdminSidebar';
import { ErrorBox } from '../../components/admin/ui';
import { FeedbackHost } from '../../components/admin/feedback';
import { CommandPalette } from '../../components/admin/CommandPalette';
import { T } from '../../components/admin/theme';

const BADGE_REFRESH_MS = 10000;

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= T.desktopBreakpoint;

  // checking = memeriksa token tersimpan; out = perlu login; in = sesi valid; error = server tak terjangkau saat cek sesi
  const [session, setSession] = useState<'checking' | 'out' | 'in' | 'error'>('checking');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [badges, setBadges] = useState<AdminBadges | null>(null);
  const [connected, setConnected] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const verify = useCallback(async () => {
    setSession('checking');
    try {
      setSession((await checkAdminSession()) ? 'in' : 'out');
    } catch (e) {
      setSessionError(e instanceof AdminApiError ? e.message : 'Gagal memeriksa sesi.');
      setSession('error');
    }
  }, []);

  useEffect(() => {
    verify();
  }, [verify]);

  const logout = useCallback(() => {
    adminLogout();
    setBadges(null);
    setSessionExpired(false);
    setDrawerOpen(false);
    setSession('out');
  }, []);

  const onUnauthorized = useCallback(() => {
    adminLogout();
    setBadges(null);
    setSessionExpired(true);
    setSession('out');
  }, []);

  const refreshBadges = useCallback(async () => {
    try {
      setBadges(await fetchBadges());
      setConnected(true);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setConnected(false);
    }
  }, [onUnauthorized]);

  // Badge sidebar diperbarui berkala selama sesi aktif (pemantauan hampir real-time)
  useEffect(() => {
    if (session !== 'in') return;
    refreshBadges();
    const t = setInterval(refreshBadges, BADGE_REFRESH_MS);
    return () => clearInterval(t);
  }, [session, refreshBadges]);

  // Laci tertutup otomatis setelah berpindah halaman
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Ctrl/Cmd + K membuka pencarian cepat (web)
  useEffect(() => {
    if (Platform.OS !== 'web' || session !== 'in') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [session]);

  const ctx = useMemo(
    () => ({ onUnauthorized, logout, badges, refreshBadges, connected }),
    [onUnauthorized, logout, badges, refreshBadges, connected]
  );

  const navigate = (path: string) => {
    setDrawerOpen(false);
    if (path !== pathname) router.push(path as any);
  };

  if (session === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={T.brand} />
      </View>
    );
  }

  if (session === 'error') {
    return (
      <View style={styles.center}>
        <View style={{ maxWidth: 420, width: '100%', padding: 16 }}>
          <ErrorBox message={sessionError || 'Tidak dapat terhubung ke server.'} onRetry={verify} />
        </View>
      </View>
    );
  }

  if (session === 'out') {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        {sessionExpired && (
          <View style={styles.expired}>
            <Text style={styles.expiredText}>Sesi berakhir. Silakan masuk kembali.</Text>
          </View>
        )}
        <AdminLogin
          onSuccess={() => {
            setSessionExpired(false);
            setSession('in');
          }}
        />
      </View>
    );
  }

  const current = NAV_ITEMS.find((i) => isActivePath(pathname, i.path));
  const sidebar = (
    <AdminSidebar
      pathname={pathname}
      badges={badges}
      connected={connected}
      onNavigate={navigate}
      onLogout={logout}
      onOpenSite={() => router.push('/')}
    />
  );

  return (
    <AdminContext.Provider value={ctx}>
      <View style={[styles.shell, isDesktop ? { flexDirection: 'row' } : { flexDirection: 'column' }]}>
        {isDesktop ? (
          sidebar
        ) : (
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setDrawerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Buka menu navigasi"
            >
              <Menu size={22} color="#FFFFFF" />
              {badges && badges.unreadChats + badges.pendingInquiries + badges.overdueReturns > 0 && <View style={styles.menuDot} />}
            </TouchableOpacity>
            <Text style={styles.topTitle}>{current?.label || 'Admin'}</Text>
            <TouchableOpacity style={styles.menuBtn} onPress={() => setPaletteOpen(true)} accessibilityRole="button" accessibilityLabel="Cari">
              <Search size={21} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flex: 1, minWidth: 0, backgroundColor: T.bg }}>
          {isDesktop && (
            <View style={styles.utilBar}>
              <TouchableOpacity style={styles.searchTrigger} onPress={() => setPaletteOpen(true)} accessibilityRole="button" accessibilityLabel="Buka pencarian cepat">
                <Search size={17} color={T.muted} />
                <Text style={styles.searchTriggerText}>Cari reservasi, pelanggan, driver, atau halaman…</Text>
                <Text style={styles.kbd}>Ctrl K</Text>
              </TouchableOpacity>
              <View style={styles.utilChips}>
                {badges && badges.pendingInquiries > 0 && (
                  <TouchableOpacity style={[styles.utilChip, styles.utilChipWarn]} onPress={() => navigate('/admin/pesanan?status=PENDING_WHATSAPP')} accessibilityRole="link">
                    <Text style={[styles.utilChipText, { color: '#92400E' }]}>{badges.pendingInquiries} menunggu konfirmasi</Text>
                  </TouchableOpacity>
                )}
                {badges && badges.overdueReturns > 0 && (
                  <TouchableOpacity style={[styles.utilChip, styles.utilChipDanger]} onPress={() => navigate('/admin/pesanan?flags=overdue')} accessibilityRole="link">
                    <Text style={[styles.utilChipText, { color: '#991B1B' }]}>{badges.overdueReturns} terlambat kembali</Text>
                  </TouchableOpacity>
                )}
                {badges && badges.unreadChats > 0 && (
                  <TouchableOpacity style={[styles.utilChip, styles.utilChipOk]} onPress={() => navigate('/admin/chat')} accessibilityRole="link">
                    <Text style={[styles.utilChipText, { color: '#166534' }]}>{badges.unreadChats} chat baru</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={[styles.content, !isDesktop && { padding: 16, paddingBottom: 40 }]}>
              <Slot />
            </View>
          </ScrollView>
        </View>

        {!isDesktop && drawerOpen && (
          <View style={styles.drawerLayer}>
            <TouchableOpacity style={styles.backdrop} onPress={() => setDrawerOpen(false)} accessibilityLabel="Tutup menu" />
            <View style={styles.drawer}>
              {sidebar}
              <TouchableOpacity style={styles.drawerClose} onPress={() => setDrawerOpen(false)} accessibilityRole="button" accessibilityLabel="Tutup menu">
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      <FeedbackHost />
      <CommandPalette visible={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} onUnauthorized={onUnauthorized} />
    </AdminContext.Provider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: T.bg, minHeight: '100vh' as any, height: '100vh' as any },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 400, backgroundColor: T.bg },
  utilBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingHorizontal: 28, height: 60, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  searchTrigger: { flex: 1, maxWidth: 520, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt },
  searchTriggerText: { flex: 1, fontSize: 13.5, color: T.muted },
  kbd: { fontSize: 12, fontWeight: '700', color: T.muted, borderWidth: 1, borderColor: T.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: T.surface },
  utilChips: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  utilChip: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  utilChipWarn: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  utilChipDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  utilChipOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  utilChipText: { fontSize: 12.5, fontWeight: '800' },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center', padding: 28, paddingBottom: 56 },
  topBar: { height: 56, backgroundColor: T.sidebar, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menuDot: { position: 'absolute', top: 9, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: '#F59E0B', borderWidth: 1.5, borderColor: T.sidebar },
  topTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  drawerLayer: { position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, flexDirection: 'row' },
  backdrop: { position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,25,42,0.55)' },
  drawer: { width: T.sidebarWidth, maxWidth: '85%' as any, height: '100%' as any },
  drawerClose: { position: 'absolute', top: 14, right: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  expired: { backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FCD34D', padding: 12, alignItems: 'center' },
  expiredText: { color: '#78350F', fontSize: 13, fontWeight: '700' },
});
