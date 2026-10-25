import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Car,
  CircleDollarSign,
  Clock,
  KeyRound,
  MessageCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  CalendarCheck2,
  CheckCircle2,
  MapPin,
  Sparkles,
  PhoneCall,
  ChevronRight,
  ShieldCheck,
  Check,
  Zap,
} from 'lucide-react-native';
import {
  Box,
  Heading,
  VStack,
  HStack,
  GButton,
  ButtonText,
  GBadge,
  BadgeText,
  GCard,
  Pressable,
  Spinner,
} from './ui';
import {
  AdminApiError,
  AdminInquiry,
  AdminSummary,
  FinanceSummary,
  fetchFinanceSummary,
  fetchSummary,
} from '../../services/adminApi';
import {
  Avatar,
  Btn,
  Chip,
  DismissibleNotice,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  StatusBadge,
  adminStyles,
  fmtDate,
  fmtTime,
  openWhatsAppTo,
  rp,
  rpShort,
} from './ui';
import { confirmInquiryFlow } from './inquiryActions';
import { T, shadow } from './theme';

interface Props {
  onUnauthorized: () => void;
  onOpenInquiry: (inquiry: AdminInquiry) => void;
  onNavigate: (path: string) => void;
}

const REFRESH_MS = 30000;

const daysLeft = (endDate: string, today: string): number =>
  Math.round((Date.parse(endDate) - Date.parse(today)) / 86400000);

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'Selamat Pagi 🌤️';
  if (hour >= 11 && hour < 15) return 'Selamat Siang ☀️';
  if (hour >= 15 && hour < 18) return 'Selamat Sore ⛅';
  return 'Selamat Malam 🌙';
};

export const AdminDashboard: React.FC<Props> = ({ onUnauthorized, onOpenInquiry, onNavigate }) => {
  const [data, setData] = useState<AdminSummary | null>(null);
  const [fin, setFin] = useState<FinanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [agendaDay, setAgendaDay] = useState<'today' | 'tomorrow'>('today');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const summary = await fetchSummary();
        const finance = await fetchFinanceSummary(`${summary.today.slice(0, 8)}01`, summary.today).catch((e) => {
          if (e instanceof AdminApiError && e.status === 401) throw e;
          return null;
        });
        setData(summary);
        setFin(finance);
        setError(null);
        setUpdatedAt(new Date().toISOString());
      } catch (e) {
        if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
        setError(e instanceof AdminApiError ? e.message : 'Gagal memuat ringkasan.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [onUnauthorized]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const quickConfirm = async (i: AdminInquiry) => {
    if (busyId) return;
    setBusyId(i.id);
    try {
      if (await confirmInquiryFlow(i, onUnauthorized)) await load(true);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox message={error || 'Data tidak tersedia.'} onRetry={() => load()} />;

  const { needsAction, agenda, trend, fleet } = data;
  const todayLabel = new Date(`${data.today}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const maxDay = Math.max(1, ...data.last7Days.map((d) => d.count));
  const trendDelta = trend.weekTotal - trend.prevWeekTotal;
  const trendText =
    trend.prevWeekTotal === 0 && trend.weekTotal === 0
      ? 'Belum ada reservasi'
      : `${trendDelta >= 0 ? '+' : ''}${trendDelta} dari mgg lalu`;
  const day = agenda[agendaDay];

  // Hitung utilisasi armada aktif
  const occupancyPct = fleet.active > 0 ? Math.round((fleet.inUse / fleet.active) * 100) : 0;
  const availablePct = fleet.active > 0 ? Math.round((fleet.available / fleet.active) * 100) : 0;

  // Unit kritis pertama untuk alert banner (jika ada)
  const criticalOverdue = needsAction.overdueReturns[0] || null;

  return (
    <VStack gap={20}>
      {/* ======================================================== */}
      {/* 1. TOP HEADER BANNER (Inspired by Stitch Banner)         */}
      {/* ======================================================== */}
      <PageHeader
        tag="OPERASIONAL REAL-TIME"
        title={`${getGreeting()} Admin`}
        subtitle={`${todayLabel} • Kelola manajemen operasional rental EV armada Anda secara real-time`}
        statusBadge={
          <GBadge
            size="sm"
            variant="outline"
            borderColor="rgba(110, 231, 183, 0.4)"
            bg="rgba(16, 185, 129, 0.15)"
            borderRadius={999}
            px="$2.5"
            py="$0.5"
          >
            <HStack alignItems="center" gap={6}>
              <Box style={styles.pulseDot} />
              <BadgeText style={{ color: '#A7F3D0', fontSize: 11, fontWeight: '700' }}>
                {data.storage === 'database' ? 'PostgreSQL : Connected' : 'Local Storage : Active'}
                {updatedAt ? ` • ${fmtTime(updatedAt)}` : ''}
              </BadgeText>
            </HStack>
          </GBadge>
        }
        right={
          <GButton
            size="sm"
            variant="outline"
            borderColor="rgba(255,255,255,0.25)"
            bg="rgba(255,255,255,0.12)"
            borderRadius="$xl"
            onPress={() => load()}
            isDisabled={refreshing}
          >
            <HStack alignItems="center" gap={6}>
              {refreshing ? (
                <Spinner size="small" color="#FFFFFF" />
              ) : (
                <RefreshCw size={14} color="#FFFFFF" />
              )}
              <ButtonText style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                {refreshing ? 'Memperbarui...' : 'Refresh Data'}
              </ButtonText>
            </HStack>
          </GButton>
        }
      />

      {/* Notice jika pakai memory storage */}
      {data.storage === 'memory' && (
        <DismissibleNotice
          id="storage-memory"
          message="PostgreSQL belum terhubung. Data tersimpan di berkas lokal server (backend/data/store.json). Operasional tetap berjalan normal."
        />
      )}

      {error ? <ErrorBox message={`Pembaruan gagal: ${error}`} onRetry={() => load()} /> : null}

      {/* ======================================================== */}
      {/* 2. CRITICAL ALERT BANNER (Jika ada unit Terlambat Kembali) */}
      {/* ======================================================== */}
      {criticalOverdue && (
        <Box style={[styles.criticalAlertCard, shadow]}>
          <HStack flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={14}>
            <HStack alignItems="center" gap={12} flex={1} minWidth={280}>
              <Box style={styles.alertIconCircle}>
                <AlertTriangle size={20} color="#DC2626" />
              </Box>
              <VStack gap={2} flex={1}>
                <HStack alignItems="center" gap={8} flexWrap="wrap">
                  <GBadge size="sm" variant="solid" bg="#FEE2E2" borderRadius={6} px="$2" py="$0.5">
                    <BadgeText style={{ color: '#991B1B', fontWeight: '800', fontSize: 11 }}>
                      PERINGATAN KRITIS
                    </BadgeText>
                  </GBadge>
                  <Text style={styles.alertTitle}>
                    {criticalOverdue.vehicleName} ({criticalOverdue.inquiryCode}) Terlambat Kembali!
                  </Text>
                </HStack>
                <Text style={styles.alertSub}>
                  Penyewa: <Text style={{ fontWeight: '700', color: '#7F1D1D' }}>{criticalOverdue.customerName}</Text> ({criticalOverdue.customerPhone}) • Seharusnya kembali {fmtDate(criticalOverdue.endDate)} ({Math.abs(daysLeft(criticalOverdue.endDate, data.today))} hari lewat)
                </Text>
              </VStack>
            </HStack>

            <HStack alignItems="center" gap={8}>
              <GButton
                size="sm"
                variant="solid"
                bg="#DC2626"
                borderRadius="$lg"
                onPress={() =>
                  openWhatsAppTo(
                    criticalOverdue.customerPhone,
                    `Halo ${criticalOverdue.customerName}, mengingatkan bahwa unit ${criticalOverdue.vehicleName} (${criticalOverdue.inquiryCode}) telah melewati batas waktu pengembalian (${fmtDate(criticalOverdue.endDate)}). Mohon konfirmasi posisi dan estimasi kepulangan unit. Terima kasih - Electra.`
                  )
                }
              >
                <HStack alignItems="center" gap={6}>
                  <MessageCircle size={14} color="#FFFFFF" />
                  <ButtonText style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    Hubungi Penyewa
                  </ButtonText>
                </HStack>
              </GButton>
              <GButton
                size="sm"
                variant="outline"
                borderColor="#FCA5A5"
                bg="#FFFFFF"
                borderRadius="$lg"
                onPress={() => onOpenInquiry(criticalOverdue)}
              >
                <ButtonText style={{ color: '#B91C1C', fontSize: 12, fontWeight: '700' }}>
                  Detail Booking
                </ButtonText>
              </GButton>
            </HStack>
          </HStack>
        </Box>
      )}

      {/* ======================================================== */}
      {/* 3. ROW KPI METRICS (5 Cards persis komposisi Stitch)       */}
      {/* ======================================================== */}
      <View style={styles.kpiGrid}>
        {/* Card 1: Menunggu Konfirmasi */}
        <Pressable
          style={[styles.kpiCard, shadow]}
          onPress={() => onNavigate('/admin/pesanan?status=PENDING_WHATSAPP')}
          accessibilityRole="button"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <Text style={styles.kpiLabel}>MENUNGGU KONFIRMASI</Text>
            <Box style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Clock size={16} color="#D97706" />
            </Box>
          </HStack>
          <VStack mt={10} gap={3}>
            <HStack alignItems="baseline" gap={6}>
              <Heading size="2xl" style={{ color: '#1E293B', fontWeight: '900' }}>
                {needsAction.pendingConfirmation}
              </Heading>
              <Text style={styles.kpiUnit}>Pesanan</Text>
            </HStack>
            <HStack alignItems="center" gap={6} mt={2}>
              <GBadge
                size="sm"
                variant="solid"
                bg={needsAction.pendingConfirmation > 0 ? '#FEF3C7' : '#E2E8F0'}
                borderRadius={6}
                px="$1.5"
                py="$0.5"
              >
                <BadgeText
                  style={{
                    color: needsAction.pendingConfirmation > 0 ? '#B45309' : '#64748B',
                    fontSize: 10.5,
                    fontWeight: '800',
                  }}
                >
                  {needsAction.pendingConfirmation > 0 ? 'ACTION' : 'CLEAR'}
                </BadgeText>
              </GBadge>
              <Text style={{ fontSize: 11.5, color: '#D97706', fontWeight: '600' }}>
                {needsAction.pendingConfirmation > 0 ? 'Perlu review cepat' : 'Semua terverifikasi'}
              </Text>
            </HStack>
          </VStack>
        </Pressable>

        {/* Card 2: Sedang Disewa */}
        <Pressable
          style={[styles.kpiCard, shadow]}
          onPress={() => onNavigate('/admin/pesanan?status=ACTIVE')}
          accessibilityRole="button"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <Text style={styles.kpiLabel}>SEDANG DISEWA</Text>
            <Box style={[styles.kpiIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Zap size={16} color="#4F46E5" />
            </Box>
          </HStack>
          <VStack mt={10} gap={3}>
            <HStack alignItems="baseline" gap={6}>
              <Heading size="2xl" style={{ color: '#1E293B', fontWeight: '900' }}>
                {fleet.inUse}
              </Heading>
              <Text style={styles.kpiUnit}>Unit EV Aktif</Text>
            </HStack>
            <HStack alignItems="center" gap={6} mt={2}>
              <Box style={[styles.pulseDot, { backgroundColor: '#4F46E5' }]} />
              <Text style={{ fontSize: 11.5, color: '#4F46E5', fontWeight: '700' }}>
                {occupancyPct}% Utilisasi Armada
              </Text>
            </HStack>
          </VStack>
        </Pressable>

        {/* Card 3: Terlambat Kembali */}
        <Pressable
          style={[
            styles.kpiCard,
            shadow,
            needsAction.overdueReturns.length > 0 && { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
          ]}
          onPress={
            needsAction.overdueReturns.length > 0 ? () => onNavigate('/admin/pesanan?flags=overdue') : undefined
          }
          accessibilityRole="button"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <Text
              style={[
                styles.kpiLabel,
                needsAction.overdueReturns.length > 0 && { color: '#DC2626' },
              ]}
            >
              TERLAMBAT KEMBALI
            </Text>
            <Box
              style={[
                styles.kpiIconWrap,
                { backgroundColor: needsAction.overdueReturns.length > 0 ? '#FEE2E2' : '#F1F5F9' },
              ]}
            >
              <AlertTriangle
                size={16}
                color={needsAction.overdueReturns.length > 0 ? '#DC2626' : '#64748B'}
              />
            </Box>
          </HStack>
          <VStack mt={10} gap={3}>
            <HStack alignItems="baseline" gap={6}>
              <Heading
                size="2xl"
                style={{
                  color: needsAction.overdueReturns.length > 0 ? '#DC2626' : '#166534',
                  fontWeight: '900',
                }}
              >
                {needsAction.overdueReturns.length}
              </Heading>
              <Text
                style={[
                  styles.kpiUnit,
                  needsAction.overdueReturns.length > 0 && { color: '#B91C1C' },
                ]}
              >
                {needsAction.overdueReturns.length > 0 ? 'Unit Kritis' : 'Unit'}
              </Text>
            </HStack>
            <Text
              style={{
                fontSize: 11.5,
                color: needsAction.overdueReturns.length > 0 ? '#DC2626' : '#16A34A',
                fontWeight: '600',
              }}
              numberOfLines={1}
            >
              {needsAction.overdueReturns.length > 0
                ? `${criticalOverdue?.vehicleName || 'Unit'} (+${Math.abs(daysLeft(criticalOverdue?.endDate || data.today, data.today))}h)`
                : '✓ Semua unit on schedule'}
            </Text>
          </VStack>
        </Pressable>

        {/* Card 4: Armada Tersedia */}
        <Pressable
          style={[styles.kpiCard, shadow]}
          onPress={() => onNavigate('/admin/armada')}
          accessibilityRole="button"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <Text style={styles.kpiLabel}>ARMADA TERSEDIA</Text>
            <Box style={[styles.kpiIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={16} color="#059669" />
            </Box>
          </HStack>
          <VStack mt={10} gap={3}>
            <HStack alignItems="baseline" gap={4}>
              <Heading size="2xl" style={{ color: '#1E293B', fontWeight: '900' }}>
                {fleet.available}
                <Text style={{ fontSize: 18, color: '#94A3B8', fontWeight: '400' }}>/{fleet.active}</Text>
              </Heading>
              <Text style={styles.kpiUnit}>Unit</Text>
            </HStack>
            <HStack alignItems="center" gap={4} mt={2}>
              <TrendingUp size={13} color="#059669" />
              <Text style={{ fontSize: 11.5, color: '#059669', fontWeight: '700' }}>
                {availablePct}% Ready disewa
              </Text>
            </HStack>
          </VStack>
        </Pressable>

        {/* Card 5: Ringkasan Finansial */}
        <Pressable
          style={[styles.kpiCard, shadow]}
          onPress={() => onNavigate('/admin/keuangan')}
          accessibilityRole="button"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <Text style={styles.kpiLabel}>TOTAL PENDAPATAN</Text>
            <Box style={[styles.kpiIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <CircleDollarSign size={16} color="#7C3AED" />
            </Box>
          </HStack>
          <VStack mt={6} gap={2}>
            <Heading size="md" style={{ color: '#0F172A', fontWeight: '900' }} numberOfLines={1}>
              {fin ? rpShort(fin.income.total) : 'Rp 0'}
            </Heading>
            <VStack gap={2} pt={4} style={{ borderTopWidth: 1, borderColor: '#F1F5F9' }}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text style={{ fontSize: 11, color: '#64748B' }}>Laba Bersih:</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: (fin?.net ?? 0) >= 0 ? '#059669' : '#DC2626' }}>
                  {fin ? rpShort(fin.net) : 'Rp 0'}
                </Text>
              </HStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Text style={{ fontSize: 11, color: '#64748B' }}>Piutang:</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: (fin?.receivables.total ?? 0) > 0 ? '#D97706' : '#64748B' }}>
                  {fin ? rpShort(fin.receivables.total) : 'Rp 0'}
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </Pressable>
      </View>

      {/* ======================================================== */}
      {/* 4. CORE TWO-COLUMN OPERATIONAL LAYOUT (Kolom 7 : 5)        */}
      {/* ======================================================== */}
      <View style={styles.twoColumnWrapper}>
        {/* ---------------------------------------------------- */}
        {/* KOLOM KIRI (Aksi Mendesak & Monitoring EV Aktif)      */}
        {/* ---------------------------------------------------- */}
        <VStack gap={20} style={{ flex: 1.3, minWidth: 320 }}>
          {/* Card: Perlu Tindakan Mendesak */}
          <GCard style={[styles.contentCard, shadow]}>
            <HStack justifyContent="space-between" alignItems="center" pb={12} style={{ borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
              <HStack alignItems="center" gap={8}>
                <Box style={[styles.pulseDot, { backgroundColor: '#F59E0B' }]} />
                <Heading size="sm" style={styles.cardHeaderTitle}>
                  Perlu Tindakan Mendesak
                </Heading>
              </HStack>
              <GBadge size="sm" variant="solid" bg="#FEF3C7" borderRadius={999} px="$2.5" py="$0.5">
                <BadgeText style={{ color: '#B45309', fontWeight: '800', fontSize: 11 }}>
                  {needsAction.pendingConfirmation + needsAction.needDriver.length + needsAction.unpaidSoon.length} Task Prioritas
                </BadgeText>
              </GBadge>
            </HStack>

            <VStack gap={12} pt={12}>
              {/* Item Group 1: Booking Masuk Menunggu Konfirmasi */}
              {needsAction.pending.length > 0 &&
                needsAction.pending.slice(0, 2).map((inq) => (
                  <Box key={`pending-${inq.id}`} style={styles.actionItemBox}>
                    <HStack justifyContent="space-between" alignItems="flex-start" gap={12} flexWrap="wrap">
                      <HStack gap={12} flex={1} minWidth={240}>
                        <Box style={styles.evBadgeIcon}>
                          <Text style={{ fontWeight: '900', color: '#4F46E5', fontSize: 13 }}>EV</Text>
                        </Box>
                        <VStack gap={3} flex={1}>
                          <HStack alignItems="center" gap={6}>
                            <GBadge size="sm" variant="solid" bg="#EEF2FF" borderRadius={4} px="$1.5">
                              <BadgeText style={{ color: '#4338CA', fontWeight: '800', fontSize: 10.5 }}>
                                #{inq.inquiryCode}
                              </BadgeText>
                            </GBadge>
                            <Text style={styles.actionItemName}>
                              {inq.customerName} • {inq.vehicleName}
                            </Text>
                          </HStack>
                          <Text style={styles.actionItemDesc}>
                            {inq.serviceType === 'DENGAN_DRIVER' ? 'Dengan Sopir' : 'Lepas Kunci'} {inq.durationDays} Hari • {rp(inq.estimatedTotal)}
                          </Text>
                          <Text style={styles.actionItemSub}>
                            Mulai: {fmtDate(inq.startDate)} • Lokasi: {inq.pickupLocation || 'Kantor Pusat'}
                          </Text>
                        </VStack>
                      </HStack>

                      <HStack alignItems="center" gap={6} alignSelf="flex-end">
                        <GButton
                          size="xs"
                          variant="solid"
                          bg="#059669"
                          borderRadius="$lg"
                          onPress={() => quickConfirm(inq)}
                          isDisabled={busyId === inq.id}
                        >
                          <HStack alignItems="center" gap={5}>
                            {busyId === inq.id ? (
                              <Spinner size="small" color="#FFFFFF" />
                            ) : (
                              <Check size={13} color="#FFFFFF" />
                            )}
                            <ButtonText style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                              Konfirmasi 1-Klik
                            </ButtonText>
                          </HStack>
                        </GButton>
                        <Pressable
                          style={styles.actionIconButton}
                          onPress={() =>
                            openWhatsAppTo(
                              inq.customerPhone,
                              `Halo ${inq.customerName}, kami dari Electra ingin mengonfirmasi booking #${inq.inquiryCode} untuk unit ${inq.vehicleName}. Terima kasih.`
                            )
                          }
                          accessibilityLabel="Hubungi WhatsApp"
                        >
                          <MessageCircle size={15} color="#059669" />
                        </Pressable>
                      </HStack>
                    </HStack>
                  </Box>
                ))}

              {/* Item Group 2: Butuh Driver */}
              {needsAction.needDriver.length > 0 &&
                needsAction.needDriver.slice(0, 2).map((inq) => (
                  <Box key={`driver-${inq.id}`} style={styles.actionItemBox}>
                    <HStack justifyContent="space-between" alignItems="center" gap={12} flexWrap="wrap">
                      <HStack gap={12} flex={1} minWidth={240}>
                        <Box style={[styles.evBadgeIcon, { backgroundColor: '#FEF3C7' }]}>
                          <Car size={16} color="#D97706" />
                        </Box>
                        <VStack gap={3} flex={1}>
                          <HStack alignItems="center" gap={6}>
                            <GBadge size="sm" variant="solid" bg="#FEF3C7" borderRadius={4} px="$1.5">
                              <BadgeText style={{ color: '#92400E', fontWeight: '800', fontSize: 10 }}>
                                BUTUH SOPIR
                              </BadgeText>
                            </GBadge>
                            <Text style={styles.actionItemName}>
                              {inq.vehicleName} • {inq.customerName}
                            </Text>
                          </HStack>
                          <Text style={styles.actionItemSub}>
                            Jadwal Penjemputan: {fmtDate(inq.startDate)} • Lokasi: {inq.pickupLocation}
                          </Text>
                        </VStack>
                      </HStack>

                      <GButton
                        size="xs"
                        variant="solid"
                        bg="#4F46E5"
                        borderRadius="$lg"
                        onPress={() => onOpenInquiry(inq)}
                      >
                        <ButtonText style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                          Tugaskan Sopir
                        </ButtonText>
                      </GButton>
                    </HStack>
                  </Box>
                ))}

              {/* Item Group 3: Belum Lunas (Unpaid) */}
              {needsAction.unpaidSoon.length > 0 &&
                needsAction.unpaidSoon.slice(0, 2).map((inq) => (
                  <Box key={`unpaid-${inq.id}`} style={styles.actionItemBox}>
                    <HStack justifyContent="space-between" alignItems="center" gap={12} flexWrap="wrap">
                      <HStack gap={12} flex={1} minWidth={240}>
                        <Box style={[styles.evBadgeIcon, { backgroundColor: '#FEE2E2' }]}>
                          <CircleDollarSign size={16} color="#DC2626" />
                        </Box>
                        <VStack gap={3} flex={1}>
                          <HStack alignItems="center" gap={6}>
                            <GBadge size="sm" variant="solid" bg="#FEE2E2" borderRadius={4} px="$1.5">
                              <BadgeText style={{ color: '#991B1B', fontWeight: '800', fontSize: 10 }}>
                                TAGIHAN SEWA
                              </BadgeText>
                            </GBadge>
                            <Text style={styles.actionItemName}>
                              {inq.customerName} • {inq.vehicleName}
                            </Text>
                          </HStack>
                          <Text style={styles.actionItemSub}>
                            Estimasi Tagihan: {rp(inq.estimatedTotal)} • Ambil: {fmtDate(inq.startDate)}
                          </Text>
                        </VStack>
                      </HStack>

                      <GButton
                        size="xs"
                        variant="outline"
                        borderColor="#DC2626"
                        borderRadius="$lg"
                        onPress={() =>
                          openWhatsAppTo(
                            inq.customerPhone,
                            `Halo ${inq.customerName}, mengingatkan terkait pembayaran sewa unit ${inq.vehicleName} (${inq.inquiryCode}) sebesar ${rp(inq.estimatedTotal)}. Terima kasih - Electra.`
                          )
                        }
                      >
                        <HStack alignItems="center" gap={4}>
                          <MessageCircle size={13} color="#DC2626" />
                          <ButtonText style={{ color: '#DC2626', fontSize: 11, fontWeight: '700' }}>
                            Kirim Tagihan WA
                          </ButtonText>
                        </HStack>
                      </GButton>
                    </HStack>
                  </Box>
                ))}

              {needsAction.pendingConfirmation === 0 &&
                needsAction.needDriver.length === 0 &&
                needsAction.unpaidSoon.length === 0 && (
                  <EmptyState
                    title="Semua Operasional Terkendali"
                    text="Tidak ada reservasi yang memerlukan tindakan mendesak saat ini."
                  />
                )}
            </VStack>
          </GCard>

          {/* Card: Monitoring Unit Sedang Disewa (Live Operasional) */}
          <GCard style={[styles.contentCard, shadow]}>
            <HStack justifyContent="space-between" alignItems="center" pb={12} style={{ borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
              <VStack gap={2}>
                <Heading size="sm" style={styles.cardHeaderTitle}>
                  Monitoring Unit Sedang Disewa
                </Heading>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  Status reservasi aktif di jalan & jadwal kepulangan unit
                </Text>
              </VStack>
              <GBadge size="sm" variant="solid" bg="#ECFDF5" borderRadius={999} px="$2.5" py="$0.5">
                <HStack alignItems="center" gap={5}>
                  <Box style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
                  <BadgeText style={{ color: '#065F46', fontWeight: '800', fontSize: 11 }}>
                    {data.activeRentals.length} Unit Aktif
                  </BadgeText>
                </HStack>
              </GBadge>
            </HStack>

            <VStack gap={10} pt={12}>
              {data.activeRentals.length === 0 ? (
                <EmptyState
                  title="Tidak Ada Unit Sedang Disewa"
                  text="Unit yang telah diserahterimakan ke penyewa akan otomatis terpantau di sini."
                />
              ) : (
                data.activeRentals.map((item) => {
                  const left = daysLeft(item.endDate, data.today);
                  const isOverdue = left < 0;
                  const isTodayReturn = left === 0;

                  return (
                    <Box key={`active-${item.id}`} style={[styles.activeRentalRow, isOverdue && styles.activeRentalOverdue]}>
                      <HStack justifyContent="space-between" alignItems="center" gap={10} flexWrap="wrap">
                        <HStack alignItems="center" gap={12} flex={1} minWidth={220}>
                          <Box style={[styles.carDotCircle, isOverdue && { backgroundColor: '#FEE2E2' }]}>
                            <Car size={16} color={isOverdue ? '#DC2626' : '#4F46E5'} />
                          </Box>
                          <VStack gap={2} flex={1}>
                            <Text style={styles.activeVehicleTitle}>
                              {item.vehicleName}
                              <Text style={{ color: '#64748B', fontWeight: '500', fontSize: 12 }}>
                                {' '}• #{item.inquiryCode}
                              </Text>
                            </Text>
                            <Text style={styles.activeCustomerName}>
                              Penyewa: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{item.customerName}</Text>
                              {item.driverName ? ` • Driver: ${item.driverName}` : ''}
                            </Text>
                          </VStack>
                        </HStack>

                        <HStack alignItems="center" gap={10}>
                          <VStack alignItems="flex-end" gap={2}>
                            <GBadge
                              size="sm"
                              variant="solid"
                              bg={isOverdue ? '#FEE2E2' : isTodayReturn ? '#FEF3C7' : '#ECFDF5'}
                              borderRadius={6}
                              px="$2"
                              py="$0.5"
                            >
                              <BadgeText
                                style={{
                                  color: isOverdue ? '#991B1B' : isTodayReturn ? '#92400E' : '#065F46',
                                  fontSize: 11,
                                  fontWeight: '800',
                                }}
                              >
                                {isOverdue
                                  ? `Terlambat +${Math.abs(left)}h`
                                  : isTodayReturn
                                  ? 'Kembali Hari Ini'
                                  : `Sisa ${left} Hari`}
                              </BadgeText>
                            </GBadge>
                            <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>
                              Sampai: {fmtDate(item.endDate)}
                            </Text>
                          </VStack>

                          <Pressable
                            style={styles.detailChevronButton}
                            onPress={() => onOpenInquiry(item)}
                            accessibilityLabel={`Buka reservasi ${item.inquiryCode}`}
                          >
                            <ChevronRight size={16} color="#64748B" />
                          </Pressable>
                        </HStack>
                      </HStack>
                    </Box>
                  );
                })
              )}
            </VStack>
          </GCard>
        </VStack>

        {/* ---------------------------------------------------- */}
        {/* KOLOM KANAN (Agenda Operasional & Statistik Tren)     */}
        {/* ---------------------------------------------------- */}
        <VStack gap={20} style={{ flex: 1, minWidth: 300 }}>
          {/* Card: Agenda Operasional (Hand-over & Return) */}
          <GCard style={[styles.contentCard, shadow]}>
            <HStack justifyContent="space-between" alignItems="center" pb={12} style={{ borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
              <VStack gap={2}>
                <Heading size="sm" style={styles.cardHeaderTitle}>
                  Agenda Operasional
                </Heading>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  Jadwal serah terima & pengembalian unit
                </Text>
              </VStack>

              <HStack gap={6} bg="#F1F5F9" p="$1" borderRadius="$lg">
                <Pressable
                  style={[styles.tabButton, agendaDay === 'today' && styles.tabButtonActive]}
                  onPress={() => setAgendaDay('today')}
                >
                  <Text style={[styles.tabText, agendaDay === 'today' && styles.tabTextActive]}>
                    Hari Ini ({agenda.today.pickups.length + agenda.today.returns.length})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tabButton, agendaDay === 'tomorrow' && styles.tabButtonActive]}
                  onPress={() => setAgendaDay('tomorrow')}
                >
                  <Text style={[styles.tabText, agendaDay === 'tomorrow' && styles.tabTextActive]}>
                    Besok ({agenda.tomorrow.pickups.length + agenda.tomorrow.returns.length})
                  </Text>
                </Pressable>
              </HStack>
            </HStack>

            <VStack gap={14} pt={12}>
              {/* Pickup / Hand-over */}
              <VStack gap={8}>
                <HStack alignItems="center" gap={6}>
                  <Box style={[styles.agendaTypeDot, { backgroundColor: '#059669' }]} />
                  <Text style={styles.agendaSectionTitle}>
                    Serah Terima / Pickup ({day.pickups.length})
                  </Text>
                </HStack>
                {day.pickups.length === 0 ? (
                  <Text style={styles.mutedText}>Tidak ada jadwal serah terima.</Text>
                ) : (
                  day.pickups.map((inq) => (
                    <Pressable
                      key={`pickup-${inq.id}`}
                      style={styles.agendaItemRow}
                      onPress={() => onOpenInquiry(inq)}
                    >
                      <HStack justifyContent="space-between" alignItems="center" gap={8}>
                        <VStack gap={2} flex={1}>
                          <HStack alignItems="center" gap={6}>
                            <GBadge size="sm" variant="solid" bg="#ECFDF5" borderRadius={4} px="$1.5">
                              <BadgeText style={{ color: '#065F46', fontWeight: '800', fontSize: 10 }}>
                                IN
                              </BadgeText>
                            </GBadge>
                            <Text style={styles.agendaItemTitle} numberOfLines={1}>
                              {inq.vehicleName}
                            </Text>
                          </HStack>
                          <Text style={styles.agendaItemSub} numberOfLines={1}>
                            {inq.customerName} • {inq.pickupLocation || 'Kantor Pusat'}
                          </Text>
                        </VStack>
                        <ChevronRight size={15} color="#94A3B8" />
                      </HStack>
                    </Pressable>
                  ))
                )}
              </VStack>

              {/* Return / Pengembalian */}
              <VStack gap={8} pt={6}>
                <HStack alignItems="center" gap={6}>
                  <Box style={[styles.agendaTypeDot, { backgroundColor: '#D97706' }]} />
                  <Text style={styles.agendaSectionTitle}>
                    Pengembalian / Return ({day.returns.length})
                  </Text>
                </HStack>
                {day.returns.length === 0 ? (
                  <Text style={styles.mutedText}>Tidak ada jadwal pengembalian.</Text>
                ) : (
                  day.returns.map((inq) => (
                    <Pressable
                      key={`return-${inq.id}`}
                      style={styles.agendaItemRow}
                      onPress={() => onOpenInquiry(inq)}
                    >
                      <HStack justifyContent="space-between" alignItems="center" gap={8}>
                        <VStack gap={2} flex={1}>
                          <HStack alignItems="center" gap={6}>
                            <GBadge size="sm" variant="solid" bg="#FEF3C7" borderRadius={4} px="$1.5">
                              <BadgeText style={{ color: '#92400E', fontWeight: '800', fontSize: 10 }}>
                                OUT
                              </BadgeText>
                            </GBadge>
                            <Text style={styles.agendaItemTitle} numberOfLines={1}>
                              {inq.vehicleName}
                            </Text>
                          </HStack>
                          <Text style={styles.agendaItemSub} numberOfLines={1}>
                            {inq.customerName} • {inq.returnLocation || 'Kantor Pusat'}
                          </Text>
                        </VStack>
                        <ChevronRight size={15} color="#94A3B8" />
                      </HStack>
                    </Pressable>
                  ))
                )}
              </VStack>
            </VStack>
          </GCard>

          {/* Card: Status Okupansi & Tren 7 Hari */}
          <GCard style={[styles.contentCard, shadow]}>
            <HStack justifyContent="space-between" alignItems="center" pb={12} style={{ borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
              <Heading size="sm" style={styles.cardHeaderTitle}>
                Tren Reservasi & Armada Terlaris
              </Heading>
              <GBadge size="sm" variant="solid" bg="#EEF2FF" borderRadius={6} px="$2">
                <BadgeText style={{ color: '#4338CA', fontWeight: '700', fontSize: 11 }}>
                  {trendText}
                </BadgeText>
              </GBadge>
            </HStack>

            <VStack gap={16} pt={14}>
              {/* Bar Chart 7 Hari Terakhir */}
              <VStack gap={6}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                  Reservasi 7 Hari Terakhir
                </Text>
                <View style={styles.chartContainer}>
                  {data.last7Days.map((d, idx) => {
                    const isToday = idx === data.last7Days.length - 1;
                    const barHeightPct = Math.max(8, (d.count / maxDay) * 100);

                    return (
                      <View key={d.date} style={styles.barCol}>
                        <Text style={[styles.barValue, isToday && { color: '#4F46E5', fontWeight: '900' }]}>
                          {d.count}
                        </Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${barHeightPct}%`,
                                backgroundColor: isToday ? '#4F46E5' : '#818CF8',
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.barLabel, isToday && { color: '#4F46E5', fontWeight: '800' }]}>
                          {d.date.slice(8)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </VStack>

              <View style={styles.divider} />

              {/* Armada Terlaris Bulan Ini */}
              <VStack gap={8}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                  Armada Terlaris Bulan Ini
                </Text>
                {data.topVehicles.length === 0 ? (
                  <Text style={styles.mutedText}>Belum ada data persewaan bulan ini.</Text>
                ) : (
                  data.topVehicles.slice(0, 3).map((v, idx) => (
                    <HStack
                      key={v.vehicleId}
                      justifyContent="space-between"
                      alignItems="center"
                      style={styles.topVehicleRow}
                    >
                      <HStack alignItems="center" gap={10} flex={1}>
                        <Box
                          style={[
                            styles.rankBadge,
                            idx === 0
                              ? { backgroundColor: '#FEF3C7' }
                              : idx === 1
                              ? { backgroundColor: '#F1F5F9' }
                              : { backgroundColor: '#FFEDD5' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.rankText,
                              idx === 0
                                ? { color: '#B45309' }
                                : idx === 1
                                ? { color: '#475569' }
                                : { color: '#C2410C' },
                            ]}
                          >
                            {idx + 1}
                          </Text>
                        </Box>
                        <Text style={styles.topVehicleName} numberOfLines={1}>
                          {v.vehicleName}
                        </Text>
                      </HStack>
                      <GBadge size="sm" variant="solid" bg="#F1F5F9" borderRadius={6} px="$2">
                        <BadgeText style={{ color: '#334155', fontWeight: '700', fontSize: 11 }}>
                          {v.count}× Sewa
                        </BadgeText>
                      </GBadge>
                    </HStack>
                  ))
                )}
              </VStack>
            </VStack>
          </GCard>
        </VStack>
      </View>
    </VStack>
  );
};

// ==========================================================
// STYLES
// ==========================================================

const styles = StyleSheet.create({
  // Header Banner
  headerBanner: {
    backgroundColor: '#06223A',
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.22)',
  },
  headerTagText: {
    color: '#BAE6FD',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerGreeting: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(224, 242, 254, 0.82)',
    fontSize: 12.5,
    fontWeight: '500',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },

  // Critical Alert
  criticalAlertCard: {
    backgroundColor: '#FFF1F2',
    borderLeftWidth: 5,
    borderLeftColor: '#E11D48',
    borderRadius: 14,
    padding: 14,
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#9F1239',
  },
  alertSub: {
    fontSize: 12,
    color: '#BE123C',
    lineHeight: 17,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  kpiIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // Operational Layout
  twoColumnWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'flex-start',
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
  },

  // Action Items
  actionItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  evBadgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionItemDesc: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  actionItemSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionIconButton: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  // Active Rentals
  activeRentalRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activeRentalOverdue: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  carDotCircle: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeVehicleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeCustomerName: {
    fontSize: 11.5,
    color: '#64748B',
  },
  detailChevronButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },

  // Tabs
  tabButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...shadow,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  // Agenda
  agendaTypeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  agendaSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  agendaItemRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  agendaItemTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  agendaItemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  mutedText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // Chart
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
    paddingTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 5,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  // Top Vehicles
  topVehicleRow: {
    paddingVertical: 5,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '900',
  },
  topVehicleName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
});
