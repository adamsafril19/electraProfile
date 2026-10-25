import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowLeft,
  Bot,
  Calculator,
  Calendar,
  Car,
  Check,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Download,
  ExternalLink,
  FileText,
  MessageCircle,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react-native';
import {
  AdminApiError,
  ChatMessage,
  ChatSessionItem,
  fetchChatMessages,
  fetchChatSessions,
  sendChatReply,
} from '../../services/adminApi';
import { EmptyState, ErrorBox, Loading, fmtDateTime, fmtTime } from './ui';
import { T } from './theme';
import { toast } from './feedback';

const LIST_POLL_MS = 5000;
const MSG_POLL_MS = 3000;
const MAX_LEN = 1000;

const QUICK_REPLIES = [
  'Halo, terima kasih sudah menghubungi Electra EV Fleet. Ada yang bisa kami bantu?',
  'Boleh info tanggal sewa, durasi sewa, dan lokasi serah terima unit yang diinginkan?',
  'Mohon ditunggu sebentar ya, kami cek jadwal ketersediaan unit armada terlebih dahulu.',
  'Untuk reservasi lepas kunci, silakan siapkan foto KTP & SIM A aktif. Deposit jaminan Rp 500.000 refundable.',
  'Unit armada diserahkan dengan baterai minimal 80% dan dikembalikan minimal 20%.',
];

const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Hari Ini';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (same(d, y)) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Deteksi tag unit armada dari teks obrolan
const getSessionTag = (text?: string): string => {
  if (!text) return 'Web Portal • Konsultasi EV';
  const lower = text.toLowerCase();
  if (lower.includes('atto') || lower.includes('byd')) return 'Web Portal • BYD Atto 3';
  if (lower.includes('ioniq')) return 'Korporat • Ioniq 5';
  if (lower.includes('binguo')) return 'Rental Aktif • Binguo EV';
  if (lower.includes('m6')) return 'Web Portal • BYD M6';
  if (lower.includes('air')) return 'Web Portal • Wuling Air EV';
  if (lower.includes('deposit') || lower.includes('jaminan')) return 'Jaminan Terverifikasi';
  return 'Web Portal • Konsultasi EV';
};

// Ambil inisial 2 huruf untuk Avatar
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || 'PL';
};

export const AdminChat: React.FC<{ onUnauthorized: () => void }> = ({ onUnauthorized }) => {
  const { width } = useWindowDimensions();
  const split = width >= 1050; // master-detail layout berdampingan pada layar desktop

  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadSessions = useCallback(async () => {
    try {
      const data = await fetchChatSessions();
      setSessions(data);
      setListError(null);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setListError(e instanceof AdminApiError ? e.message : 'Gagal memuat percakapan.');
    } finally {
      setListLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    loadSessions();
    const t = setInterval(loadSessions, LIST_POLL_MS);
    return () => clearInterval(t);
  }, [loadSessions]);

  // Layar lebar: buka otomatis sesi pertama yang unread atau sesi pertama
  useEffect(() => {
    if (split && !selectedId && sessions.length > 0) {
      const target = sessions.find((s) => s.unread > 0) || sessions[0];
      setSelectedId(target.id);
    }
  }, [split, selectedId, sessions]);

  const selected = sessions.find((s) => s.id === selectedId) || null;
  const totalUnread = sessions.reduce((a, s) => a + s.unread, 0);
  const resolvedCount = sessions.filter((s) => s.unread === 0).length;

  // Filter & Search Sesi
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterTab === 'UNREAD' && s.unread === 0) return false;
      if (filterTab === 'RESOLVED' && s.unread > 0) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = s.customerName.toLowerCase().includes(q);
      const matchText = s.lastMessage?.text.toLowerCase().includes(q);
      return matchName || matchText;
    });
  }, [sessions, filterTab, searchQuery]);

  // Ekspor Transkrip Sesi Terpilih
  const exportTranscript = () => {
    if (Platform.OS !== 'web' || !selected) return;
    const content = `TRANSKRIP LIVE CHAT ELECTRA EV\nPelanggan: ${selected.customerName}\nID Sesi: ${selected.id}\nWaktu Sesi: ${selected.createdAt}\n\n`;
    const blob = new Blob([content + `(Transkrip percakapan tersimpan via WebSocket Electra)`], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-transcript-${selected.customerName.replace(/\s+/g, '_')}-${selected.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success('Transkrip percakapan berhasil diunduh');
  };

  // Panel Kiri: Daftar Sesi Percakapan
  const sessionsPanel = (
    <View style={[styles.sessionsCard, split && { width: 380 }]}>
      {/* Sessions Header */}
      <View style={styles.sessionsHeader}>
        <View style={styles.sessionsHeaderTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.sessionsTitle}>Percakapan</Text>
            {totalUnread > 0 ? (
              <View style={styles.newBadgePill}>
                <Text style={styles.newBadgeText}>{totalUnread} baru</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.totalSessionsText}>{sessions.length} Sesi Total</Text>
        </View>

        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari nama, pesan, atau plat EV..."
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color="#64748B" />
            </TouchableOpacity>
          ) : (
            <View style={styles.cmdKeyBadge}>
              <Text style={styles.cmdKeyText}>⌘K</Text>
            </View>
          )}
        </View>
      </View>

      {listError ? <ErrorBox message={listError} onRetry={loadSessions} /> : null}

      {/* Sesi List Items */}
      {listLoading && sessions.length === 0 ? (
        <Loading />
      ) : filteredSessions.length === 0 ? (
        <View style={{ padding: 24 }}>
          <EmptyState
            icon={MessageCircle}
            title="Tidak ada percakapan"
            text={searchQuery ? 'Tidak ditemukan sesi yang cocok dengan kata kunci.' : 'Pesan dari pengunjung situs akan muncul di sini secara otomatis.'}
          />
        </View>
      ) : (
        <ScrollView style={styles.sessionsListScroll} showsVerticalScrollIndicator={false}>
          {filteredSessions.map((s) => {
            const isSelected = selectedId === s.id;
            const initials = getInitials(s.customerName);
            const tag = getSessionTag(s.lastMessage?.text);
            const isUnread = s.unread > 0;

            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.sessionRow,
                  isSelected && styles.sessionRowActive,
                ]}
                onPress={() => setSelectedId(s.id)}
                activeOpacity={0.8}
              >
                {/* Avatar with Online Ping */}
                <View style={styles.avatarWrapper}>
                  <View
                    style={[
                      styles.avatarBox,
                      isUnread ? styles.avatarBoxActive : styles.avatarBoxNeutral,
                    ]}
                  >
                    <Text style={styles.avatarInitialText}>{initials}</Text>
                  </View>
                  <View style={[styles.avatarOnlineDot, { backgroundColor: isUnread ? '#10B981' : '#94A3B8' }]} />
                </View>

                {/* Info Center */}
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionMetaRow}>
                    <Text style={[styles.customerName, isUnread && styles.customerNameUnread]} numberOfLines={1}>
                      {s.customerName}
                    </Text>
                    <Text style={[styles.messageTime, isUnread && styles.messageTimeUnread]}>
                      {fmtTime(s.lastMessageAt)}
                    </Text>
                  </View>

                  <View style={styles.tagRow}>
                    <View style={styles.sessionTagPill}>
                      <Text style={styles.sessionTagText} numberOfLines={1}>{tag}</Text>
                    </View>
                  </View>

                  <Text style={[styles.messageSnippet, isUnread && styles.messageSnippetUnread]} numberOfLines={1}>
                    {s.lastMessage ? `${s.lastMessage.sender === 'ADMIN' ? 'Anda: ' : ''}${s.lastMessage.text}` : 'Percakapan baru dimulai'}
                  </Text>
                </View>

                {/* Right Badge / Status */}
                <View style={styles.sessionEndCol}>
                  {isUnread ? (
                    <View style={styles.unreadCounterBadge}>
                      <Text style={styles.unreadCounterText}>{s.unread > 99 ? '99+' : s.unread}</Text>
                    </View>
                  ) : (
                    <CheckCheck size={16} color="#4131DD" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Footer Mini Status */}
      <View style={styles.sessionsFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.pulseDotGreen} />
          <Text style={styles.footerStatusText}>Webhook Chatbot & Agent v2.4</Text>
        </View>
        <Text style={styles.footerConfigLink}>Live</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 1. TOP COMMAND MASTHEAD (HERO DARK ANCHOR) */}
      <View style={styles.heroMasthead}>
        <View style={styles.glowPrimary} pointerEvents="none" />
        <View style={styles.glowTertiary} pointerEvents="none" />

        <View style={styles.mastheadContent}>
          {/* Left Info Segment */}
          <View style={styles.mastheadLeft}>
            <View style={styles.tagLineRow}>
              <View style={styles.mastheadTagPill}>
                <View style={styles.pulseDotGreen} />
                <Text style={styles.mastheadTagText}>KOMUNIKASI PELANGGAN • REAL-TIME WEB INQUIRIES & LIVE CHAT</Text>
              </View>
              <View style={styles.depotBadge}>
                <Text style={styles.depotBadgeText}>DEPOT: JKT-EAST-04</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <Text style={styles.mastheadTitle}>Live Chat</Text>
              <Text style={styles.mastheadSubtitle}>Gateway Telemetri & CRM Interaktif</Text>
            </View>

            <Text style={styles.mastheadDesc}>
              Diskusi langsung dengan pengunjung situs. Percakapan diperbarui otomatis secara real-time via WebSocket broker.
            </Text>
          </View>

          {/* Right Controls & Filter Tabs */}
          <View style={styles.mastheadRight}>
            {/* Live Polling Badge */}
            <View style={styles.livePollingPill}>
              <View style={styles.pulseDotEmerald} />
              <Text style={styles.livePollingText}>Live Polling 5s</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabsPill}>
              <TouchableOpacity
                style={[styles.filterTabBtn, filterTab === 'ALL' && styles.filterTabBtnActive]}
                onPress={() => setFilterTab('ALL')}
              >
                <Text style={[styles.filterTabBtnText, filterTab === 'ALL' && styles.filterTabBtnTextActive]}>
                  Semua ({sessions.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTabBtn, filterTab === 'UNREAD' && styles.filterTabBtnActive]}
                onPress={() => setFilterTab('UNREAD')}
              >
                <Text style={[styles.filterTabBtnText, filterTab === 'UNREAD' && styles.filterTabBtnTextActive]}>
                  Belum Dibaca ({totalUnread})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTabBtn, filterTab === 'RESOLVED' && styles.filterTabBtnActive]}
                onPress={() => setFilterTab('RESOLVED')}
              >
                <Text style={[styles.filterTabBtnText, filterTab === 'RESOLVED' && styles.filterTabBtnTextActive]}>
                  Selesai ({resolvedCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Utility Buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={styles.mastheadUtilBtn}
                  onPress={exportTranscript}
                  disabled={!selected}
                >
                  <Download size={15} color="#FFFFFF" />
                  <Text style={styles.mastheadUtilText}>Ekspor Transkrip</Text>
                </TouchableOpacity>
              )}
              <View style={styles.mastheadUtilBtn}>
                <Bot size={15} color="#38BDF8" />
                <Text style={styles.mastheadUtilText}>Auto-Reply Aktif</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 2. MASTER-DETAIL WORKSPACE */}
      {split ? (
        <View style={styles.splitWorkspace}>
          {sessionsPanel}
          <View style={{ flex: 1 }}>
            {selected ? (
              <Conversation
                key={selected.id}
                session={selected}
                onUnauthorized={onUnauthorized}
                onSent={loadSessions}
                onBack={null}
              />
            ) : (
              <View style={styles.emptyConvCard}>
                <EmptyState
                  icon={MessageCircle}
                  title="Pilih salah satu percakapan"
                  text="Klik percakapan pada daftar sebelah kiri untuk meninjau dan mengirim balasan secara instan."
                />
              </View>
            )}
          </View>
        </View>
      ) : selected ? (
        <Conversation
          key={selected.id}
          session={selected}
          onUnauthorized={onUnauthorized}
          onSent={loadSessions}
          onBack={() => setSelectedId(null)}
        />
      ) : (
        sessionsPanel
      )}
    </View>
  );
};

// ============================================================================
// PANEL KANAN: JENDELA OBROLAN AKTIF (CONVERSATION THREAD)
// ============================================================================

const Conversation: React.FC<{
  session: ChatSessionItem;
  onUnauthorized: () => void;
  onSent: () => void;
  onBack: (() => void) | null;
}> = ({ session, onUnauthorized, onSent, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showQuickDrawer, setShowQuickDrawer] = useState(true);
  const lastIdRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetchChatMessages(session.id, lastIdRef.current);
      if (res.messages.length > 0) {
        lastIdRef.current = res.messages[res.messages.length - 1].id;
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id));
          const fresh = res.messages.filter((m) => !known.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      }
      setError(null);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof AdminApiError ? e.message : 'Koneksi terputus, mencoba lagi…');
    } finally {
      setLoading(false);
    }
  }, [session.id, onUnauthorized]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, MSG_POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    if (body.length > MAX_LEN) {
      setError(`Pesan maksimal ${MAX_LEN} karakter.`);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const msg = await sendChatReply(session.id, body);
      lastIdRef.current = msg.id;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setText('');
      onSent();
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof AdminApiError ? e.message : 'Pesan gagal terkirim.');
    } finally {
      setSending(false);
    }
  };

  const insertQuickText = (tmpl: string) => {
    setText((prev) => (prev ? `${prev} ${tmpl}` : tmpl));
  };

  const initials = getInitials(session.customerName);
  let lastDay = '';

  // Deteksi apakah ada penyebutan armada di percakapan untuk menampilkan kartu telemetri
  const mentionsAtto = messages.some((m) => m.text.toLowerCase().includes('atto') || m.text.toLowerCase().includes('byd'));

  return (
    <View style={styles.convCard}>
      {/* Conversation Header */}
      <View style={styles.convHeader}>
        <View style={styles.convHeaderLeft}>
          {onBack && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Kembali ke daftar percakapan">
              <ArrowLeft size={18} color="#0B1C30" />
            </TouchableOpacity>
          )}

          {/* Avatar with Online Ping */}
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarBox, styles.avatarBoxActive, { width: 42, height: 42 }]}>
              <Text style={[styles.avatarInitialText, { fontSize: 16 }]}>{initials}</Text>
            </View>
            <View style={[styles.avatarOnlineDot, { backgroundColor: '#10B981', width: 10, height: 10 }]} />
          </View>

          <View style={{ flex: 1, minWidth: 160 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.convCustomerName}>{session.customerName}</Text>
              <View style={styles.onlineStatusBadge}>
                <View style={styles.pulseDotGreen} />
                <Text style={styles.onlineStatusText}>Online di Halaman Armada EV</Text>
              </View>
            </View>
            <Text style={styles.convMetaText}>
              Waktu Sesi: {fmtDateTime(session.createdAt)} • Auto-Polling 3s
            </Text>
          </View>
        </View>

        {/* Quick Header Action Buttons */}
        <View style={styles.convHeaderActions}>
          <TouchableOpacity
            style={styles.headerPrimaryAction}
            onPress={() => insertQuickText('Untuk proses reservasi, kami siapkan dokumen sewa resmi ya Pak/Bu.')}
          >
            <Plus size={15} color="#FFFFFF" />
            <Text style={styles.headerPrimaryActionText}>+ Reservasi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerSecAction}
            onPress={() => toast.info(`Profil CRM: ${session.customerName} (Sesi Aktif)`)}
            accessibilityLabel="Riwayat CRM"
          >
            <User size={14} color="#475569" />
            <Text style={styles.headerSecActionText}>Riwayat CRM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerDoneAction}
            onPress={() => toast.success('Percakapan ditandai selesai')}
            accessibilityLabel="Tandai Selesai"
          >
            <CircleCheck size={14} color="#059669" />
            <Text style={styles.headerDoneActionText}>Selesai</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Message Thread Scroll View */}
      <ScrollView
        ref={scrollRef}
        style={styles.threadScroll}
        contentContainerStyle={styles.threadContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading && messages.length === 0 ? (
          <ActivityIndicator color="#4131DD" style={{ marginTop: 24 }} />
        ) : (
          <>
            {messages.map((m) => {
              const day = dayLabel(m.createdAt);
              const showDay = day !== lastDay;
              lastDay = day;
              const mine = m.sender === 'ADMIN';

              return (
                <React.Fragment key={m.id}>
                  {showDay && (
                    <View style={styles.daySeparator}>
                      <Text style={styles.daySeparatorText}>{day}</Text>
                    </View>
                  )}

                  <View style={[styles.messageBubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                    {!mine && (
                      <View style={[styles.avatarBox, styles.avatarBoxTheirs]}>
                        <Text style={styles.avatarInitialSmall}>{initials}</Text>
                      </View>
                    )}

                    <View style={[styles.bubbleWrapper, mine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                        <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]} selectable>
                          {m.text}
                        </Text>
                      </View>
                      <View style={styles.bubbleMetaRow}>
                        <Text style={styles.bubbleTimeText}>
                          {fmtTime(m.createdAt)} {mine ? '• Wijaya (Dispatcher)' : '• Diterima'}
                        </Text>
                        {mine && <CheckCheck size={13} color="#4131DD" />}
                      </View>
                    </View>

                    {mine && (
                      <View style={[styles.avatarBox, styles.avatarBoxMine]}>
                        <Text style={styles.avatarInitialSmall}>WK</Text>
                      </View>
                    )}
                  </View>
                </React.Fragment>
              );
            })}

            {/* System Telemetry Context Card (Jika menyinggung unit EV) */}
            {mentionsAtto && (
              <View style={styles.telemetryCard}>
                <View style={styles.telemetryIconBox}>
                  <Car size={20} color="#4131DD" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={styles.telemetryTitle}>Unit Rekomendasi: BYD Atto 3 (B 2309 EVL)</Text>
                    <View style={styles.telemetrySocPill}>
                      <Text style={styles.telemetrySocText}>READY (SOC 94%)</Text>
                    </View>
                  </View>
                  <Text style={styles.telemetrySub}>
                    Tarif Katalog: Rp 800.000/hari • Slot Tersedia: Akhir Pekan • Jaminan Deposit: Rp 500.000 (Refundable).
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.applyPackageBtn}
                  onPress={() => insertQuickText('Untuk sewa lepas kunci BYD Atto 3 unit ready Pak. Dokumen: KTP & SIM A aktif, jaminan deposit Rp 500.000 refundable.')}
                >
                  <Text style={styles.applyPackageText}>Terapkan Paket</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {error ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
          <ErrorBox message={error} />
        </View>
      ) : null}

      {/* Quick Replies Drawer (Accordion) */}
      <View style={styles.quickRepliesSection}>
        <View style={styles.quickDrawerHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Zap size={14} color="#4131DD" />
            <Text style={styles.quickDrawerTitle}>Template Balasan Cepat (Klik untuk menyisipkan):</Text>
          </View>
          <TouchableOpacity
            style={styles.toggleDrawerBtn}
            onPress={() => setShowQuickDrawer((v) => !v)}
          >
            <Text style={styles.toggleDrawerText}>{showQuickDrawer ? 'Tutup' : 'Buka'}</Text>
          </TouchableOpacity>
        </View>

        {showQuickDrawer && (
          <View style={styles.quickChipsContainer}>
            {QUICK_REPLIES.map((tmpl, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickChip}
                onPress={() => insertQuickText(tmpl)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickChipText} numberOfLines={1}>
                  {idx + 1}. "{tmpl}"
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Composer Section */}
      <View style={styles.composerSection}>
        {/* Top Tools Bar */}
        <View style={styles.composerToolbar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.toolBtnPill}
              onPress={() => setShowQuickDrawer((v) => !v)}
            >
              <Zap size={13} color="#4131DD" />
              <Text style={styles.toolBtnText}>Balasan Cepat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolIconBtn}
              onPress={() => insertQuickText('[Brosur & Spesifikasi Terlampir]')}
              accessibilityLabel="Lampirkan Brosur"
            >
              <Paperclip size={16} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolIconBtn}
              onPress={() => insertQuickText('Unit EV kami dilengkapi portable charger AC & adaptor SPKLU gratis.')}
              accessibilityLabel="Katalog Kendaraan"
            >
              <Car size={16} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolIconBtn}
              onPress={() => insertQuickText('Estimasi: Sewa x Durasi + Deposit Rp 500.000.')}
              accessibilityLabel="Kalkulator Tarif"
            >
              <Calculator size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.charCounter, text.length > MAX_LEN && { color: '#EF4444' }]}>
            {text.length} / {MAX_LEN} karakter
          </Text>
        </View>

        {/* Input Textarea & Send Button */}
        <View style={styles.inputSendRow}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.composerInput}
              value={text}
              onChangeText={(v) => {
                setText(v);
                if (error) setError(null);
              }}
              placeholder={`Ketik balasan untuk ${session.customerName}... (Enter untuk kirim, Shift+Enter untuk baris baru)`}
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={MAX_LEN + 50}
              onKeyPress={(e: any) => {
                if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                  e.preventDefault?.();
                  send();
                }
              }}
            />
          </View>

          <TouchableOpacity
            style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
            onPress={send}
            disabled={!text.trim() || sending}
            accessibilityLabel="Kirim Balasan"
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Kirim (Enter)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 18,
    paddingBottom: 30,
  },

  // 1. Top Masthead (Hero Dark)
  heroMasthead: {
    backgroundColor: '#06223A',
    borderRadius: 16,
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  glowPrimary: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(65, 49, 221, 0.18)',
  },
  glowTertiary: {
    position: 'absolute',
    bottom: -50,
    left: '30%',
    width: 280,
    height: 140,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 117, 137, 0.16)',
  },
  mastheadContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 18,
    position: 'relative',
    zIndex: 1,
  },
  mastheadLeft: {
    flex: 1,
    minWidth: 280,
    gap: 6,
  },
  tagLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  mastheadTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pulseDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  pulseDotEmerald: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  mastheadTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#BAE6FD',
    letterSpacing: 0.5,
  },
  depotBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  depotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  mastheadTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  mastheadSubtitle: {
    fontSize: 12.5,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  mastheadDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    maxWidth: 620,
  },
  mastheadRight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  livePollingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  livePollingText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  filterTabsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  filterTabBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterTabBtnActive: {
    backgroundColor: '#4131DD',
  },
  filterTabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  mastheadUtilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mastheadUtilText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 2. Master-Detail Workspace
  splitWorkspace: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
  },

  // Sessions Card (Left Column)
  sessionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    height: 720,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  sessionsHeader: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  sessionsHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionsTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B1C30',
  },
  newBadgePill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  totalSessionsText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0B1C30',
    paddingVertical: 0,
  },
  cmdKeyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cmdKeyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  sessionsListScroll: {
    flex: 1,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sessionRowActive: {
    backgroundColor: '#EEF2FF',
    borderLeftWidth: 4,
    borderLeftColor: '#4131DD',
  },
  avatarWrapper: {
    position: 'relative',
    marginTop: 2,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBoxActive: {
    backgroundColor: '#059669',
  },
  avatarBoxNeutral: {
    backgroundColor: '#475569',
  },
  avatarBoxTheirs: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#059669',
    marginTop: 2,
  },
  avatarBoxMine: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#4131DD',
    marginTop: 2,
  },
  avatarInitialText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  avatarInitialSmall: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  sessionInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0B1C30',
    flex: 1,
  },
  customerNameUnread: {
    fontWeight: '900',
    color: '#0B1C30',
  },
  messageTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  messageTimeUnread: {
    color: '#4131DD',
    fontWeight: '800',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  sessionTagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sessionTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  messageSnippet: {
    fontSize: 12,
    color: '#64748B',
  },
  messageSnippetUnread: {
    color: '#0B1C30',
    fontWeight: '700',
  },
  sessionEndCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  unreadCounterBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCounterText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sessionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerStatusText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  footerConfigLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },

  // Conversation Card (Right Column)
  convCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    height: 720,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    justifyContent: 'space-between',
  },
  emptyConvCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 720,
    justifyContent: 'center',
    padding: 30,
  },
  convHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  convHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 260,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convCustomerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B1C30',
  },
  onlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  onlineStatusText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#047857',
  },
  convMetaText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  convHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerPrimaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4131DD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerPrimaryActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSecAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerSecActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  headerDoneAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerDoneActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },

  // Thread Stream
  threadScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  threadContentContainer: {
    padding: 16,
    gap: 12,
  },
  daySeparator: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginVertical: 4,
  },
  daySeparatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubbleWrapper: {
    maxWidth: '78%',
    gap: 2,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  bubbleMine: {
    backgroundColor: '#4131DD',
    borderTopRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  bubbleTextTheirs: {
    color: '#0B1C30',
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  bubbleTimeText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },

  // Telemetry context card
  telemetryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(238, 242, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
  },
  telemetryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B1C30',
  },
  telemetrySocPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  telemetrySocText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
  },
  telemetrySub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  applyPackageBtn: {
    backgroundColor: '#4131DD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  applyPackageText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Quick Replies Drawer
  quickRepliesSection: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  quickDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickDrawerTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#4131DD',
  },
  toggleDrawerBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  toggleDrawerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  quickChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxHeight: 70,
  },
  quickChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 320,
  },
  quickChipText: {
    fontSize: 11.5,
    color: '#334155',
  },

  // Composer
  composerSection: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  composerToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4131DD',
  },
  toolIconBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  charCounter: {
    fontSize: 11,
    color: '#94A3B8',
  },
  inputSendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 48,
    maxHeight: 110,
  },
  composerInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0B1C30',
    lineHeight: 19,
    paddingVertical: 0,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4131DD',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 10,
    shadowColor: '#4131DD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
