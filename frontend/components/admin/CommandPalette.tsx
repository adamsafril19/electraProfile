import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  CalendarDays,
  Car,
  ClipboardList,
  CornerDownLeft,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Search,
  TriangleAlert,
  UserRound,
  Wallet,
} from 'lucide-react-native';
import { AdminApiError, AdminVehicle, Driver, fetchAdminFleet, fetchDrivers, fetchInquiries } from '../../services/adminApi';
import { T, shadowLg } from './theme';

interface Item {
  key: string;
  section: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  run: () => void;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onUnauthorized: () => void;
}

const PAGES: { title: string; path: string; icon: LucideIcon; words: string }[] = [
  { title: 'Ringkasan', path: '/admin', icon: LayoutDashboard, words: 'dashboard beranda ringkasan' },
  { title: 'Pesanan', path: '/admin/pesanan', icon: ClipboardList, words: 'pesanan reservasi booking order' },
  { title: 'Jadwal', path: '/admin/jadwal', icon: CalendarDays, words: 'jadwal kalender timeline' },
  { title: 'Armada', path: '/admin/armada', icon: Car, words: 'armada unit mobil tarif' },
  { title: 'Driver', path: '/admin/driver', icon: UserRound, words: 'driver sopir cuti' },
  { title: 'Keuangan', path: '/admin/keuangan', icon: Wallet, words: 'keuangan pembayaran pengeluaran piutang kas' },
  { title: 'Live Chat', path: '/admin/chat', icon: MessageCircle, words: 'chat pesan percakapan' },
];

const ACTIONS: { title: string; subtitle: string; path: string; icon: LucideIcon; words: string }[] = [
  { title: 'Catat pengeluaran', subtitle: 'Keuangan', path: '/admin/keuangan?expense=1', icon: Plus, words: 'catat tambah pengeluaran biaya' },
  { title: 'Tambah driver', subtitle: 'Driver', path: '/admin/driver?add=1', icon: Plus, words: 'tambah driver sopir baru' },
  { title: 'Reservasi menunggu konfirmasi', subtitle: 'Pesanan', path: '/admin/pesanan?status=PENDING_WHATSAPP', icon: ClipboardList, words: 'menunggu konfirmasi baru pending' },
  { title: 'Unit terlambat kembali', subtitle: 'Pesanan', path: '/admin/pesanan?flags=overdue', icon: TriangleAlert, words: 'terlambat overdue telat kembali' },
  { title: 'Reservasi belum lunas', subtitle: 'Pesanan', path: '/admin/pesanan?flags=unpaid', icon: Wallet, words: 'belum lunas piutang tagih' },
  { title: 'Reservasi butuh driver', subtitle: 'Pesanan', path: '/admin/pesanan?flags=needDriver', icon: UserRound, words: 'butuh driver sopir tugaskan' },
];

const matches = (hay: string, needle: string) => needle.split(/\s+/).every((w) => hay.toLowerCase().includes(w));

export const CommandPalette: React.FC<Props> = ({ visible, onClose, onNavigate, onUnauthorized }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [inquiryItems, setInquiryItems] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const inputRef = useRef<TextInput>(null);
  const seq = useRef(0);

  const go = useCallback(
    (path: string) => {
      onClose();
      onNavigate(path);
    },
    [onClose, onNavigate]
  );

  // Data pendukung dimuat saat palet dibuka; gagal memuat tidak menghalangi pencarian halaman/aksi
  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setActive(0);
    setInquiryItems([]);
    Promise.all([fetchDrivers().catch(() => []), fetchAdminFleet().catch(() => [])]).then(([d, v]) => {
      setDrivers(d as Driver[]);
      setVehicles(v as AdminVehicle[]);
    });
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [visible]);

  // Cari reservasi ke server (debounce)
  useEffect(() => {
    const q = query.trim();
    if (!visible || q.length < 2) {
      setInquiryItems([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetchInquiries({ q, pageSize: 6 });
        if (my !== seq.current) return;
        setInquiryItems(
          res.items.map((i) => ({
            key: `inq-${i.id}`,
            section: 'Reservasi',
            title: `${i.customerName} • ${i.inquiryCode}`,
            subtitle: `${i.vehicleName} • ${i.startDate} s/d ${i.endDate}`,
            icon: ClipboardList,
            run: () => go(`/admin/pesanan?focus=${encodeURIComponent(i.id)}&code=${encodeURIComponent(i.inquiryCode)}`),
          }))
        );
      } catch (e) {
        if (e instanceof AdminApiError && e.status === 401) onUnauthorized();
        if (my === seq.current) setInquiryItems([]);
      } finally {
        if (my === seq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, visible, go, onUnauthorized]);

  const items: Item[] = useMemo(() => {
    const q = query.trim();
    const pageItems: Item[] = PAGES.filter((p) => !q || matches(`${p.title} ${p.words}`, q)).map((p) => ({
      key: `page-${p.path}`,
      section: 'Halaman',
      title: p.title,
      icon: p.icon,
      run: () => go(p.path),
    }));
    const actionItems: Item[] = ACTIONS.filter((a) => !q || matches(`${a.title} ${a.words}`, q)).map((a) => ({
      key: `act-${a.path}`,
      section: 'Aksi cepat',
      title: a.title,
      subtitle: a.subtitle,
      icon: a.icon,
      run: () => go(a.path),
    }));
    const driverItems: Item[] =
      q.length >= 2
        ? drivers
            .filter((d) => matches(`${d.name} ${d.phone}`, q))
            .slice(0, 4)
            .map((d) => ({ key: `drv-${d.id}`, section: 'Driver', title: d.name, subtitle: d.phone, icon: UserRound, run: () => go('/admin/driver') }))
        : [];
    const vehicleItems: Item[] =
      q.length >= 2
        ? vehicles
            .filter((v) => matches(`${v.brand} ${v.model} ${v.licensePlate}`, q))
            .slice(0, 4)
            .map((v) => ({ key: `veh-${v.id}`, section: 'Armada', title: `${v.brand} ${v.model}`, subtitle: v.licensePlate, icon: Car, run: () => go('/admin/armada') }))
        : [];
    // Hasil data lebih relevan saat mengetik, jadi tampil di depan
    return q.length >= 2 ? [...inquiryItems, ...driverItems, ...vehicleItems, ...pageItems, ...actionItems] : [...pageItems, ...actionItems];
  }, [query, inquiryItems, drivers, vehicles, go]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const onKey = (e: any) => {
    const k = e.nativeEvent.key;
    if (k === 'ArrowDown') {
      e.preventDefault?.();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (k === 'ArrowUp') {
      e.preventDefault?.();
      setActive((a) => Math.max(0, a - 1));
    } else if (k === 'Enter') {
      e.preventDefault?.();
      items[active]?.run();
    } else if (k === 'Escape') {
      onClose();
    }
  };

  if (!visible) return null;

  let lastSection = '';
  return (
    <View style={styles.layer}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityLabel="Tutup pencarian" />
      <View style={styles.panel} accessibilityViewIsModal accessibilityLabel="Pencarian cepat">
        <View style={styles.inputRow}>
          <Search size={19} color={T.muted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onKeyPress={onKey}
            placeholder="Cari reservasi, pelanggan, driver, unit, atau halaman…"
            placeholderTextColor="#64748B"
            autoFocus
            autoCapitalize="none"
            accessibilityLabel="Cari"
          />
          <Text style={styles.kbd}>Esc</Text>
        </View>

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {items.length === 0 ? (
            <Text style={styles.empty}>{searching ? 'Mencari…' : `Tidak ada hasil untuk "${query}".`}</Text>
          ) : (
            items.map((it, idx) => {
              const header = it.section !== lastSection;
              lastSection = it.section;
              const Icon = it.icon;
              return (
                <React.Fragment key={it.key}>
                  {header && <Text style={styles.section}>{it.section.toUpperCase()}</Text>}
                  <TouchableOpacity style={[styles.item, idx === active && styles.itemActive]} onPress={it.run} accessibilityRole="button">
                    <View style={[styles.itemIcon, idx === active && { backgroundColor: T.brand }]}>
                      <Icon size={17} color={idx === active ? '#FFFFFF' : T.brand} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {it.title}
                      </Text>
                      {it.subtitle ? (
                        <Text style={styles.itemSub} numberOfLines={1}>
                          {it.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {idx === active && <CornerDownLeft size={16} color={T.muted} />}
                  </TouchableOpacity>
                </React.Fragment>
              );
            })
          )}
          {searching && items.length > 0 && <Text style={styles.searching}>Mencari reservasi…</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>↑↓ pilih • Enter buka • Esc tutup</Text>
        </View>
      </View>
    </View>
  );
};

const fixed: any = Platform.OS === 'web' ? 'fixed' : 'absolute';

const styles = StyleSheet.create({
  layer: { position: fixed, top: 0, left: 0, right: 0, bottom: 0, zIndex: 350, alignItems: 'center', paddingTop: 80, paddingHorizontal: 12 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,34,58,0.5)' },
  panel: { width: '100%', maxWidth: 620, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', ...shadowLg },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  // Pembungkus baris sudah menjadi penanda visual; garis fokus bawaan browser dihilangkan
  input: { flex: 1, minHeight: 56, fontSize: 16, color: T.ink, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null) },
  kbd: { fontSize: 12, fontWeight: '700', color: T.muted, borderWidth: 1, borderColor: T.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: T.surfaceAlt },
  list: { maxHeight: 420 },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: T.muted, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 6, borderRadius: 10, minHeight: 52 },
  itemActive: { backgroundColor: T.brandSoft },
  itemIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: T.brandSoft, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14.5, fontWeight: '700', color: T.ink },
  itemSub: { fontSize: 12.5, color: T.muted, marginTop: 1 },
  empty: { padding: 24, textAlign: 'center', color: T.muted, fontSize: 14 },
  searching: { padding: 12, textAlign: 'center', color: T.muted, fontSize: 12.5 },
  footer: { borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: T.surfaceAlt },
  footerText: { fontSize: 12, color: T.muted },
});
