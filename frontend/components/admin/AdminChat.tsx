import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react-native';
import {
  AdminApiError,
  ChatMessage,
  ChatSessionItem,
  fetchChatMessages,
  fetchChatSessions,
  sendChatReply,
} from '../../services/adminApi';
import { Avatar, Card, EmptyState, ErrorBox, Loading, PageHeader, adminStyles, fmtDateTime, fmtTime } from './ui';
import { T } from './theme';

const LIST_POLL_MS = 5000;
const MSG_POLL_MS = 3000;
const MAX_LEN = 1000;

const QUICK_REPLIES = [
  'Halo, terima kasih sudah menghubungi Electra. Ada yang bisa kami bantu?',
  'Boleh info tanggal sewa, durasi, dan lokasi serah terima unit yang diinginkan?',
  'Mohon ditunggu, kami cek ketersediaan unit terlebih dahulu.',
  'Untuk reservasi, silakan isi form di situs. Setelah itu kami konfirmasi dan minta foto KTP & SIM via WhatsApp.',
  'Unit diserahkan dengan baterai minimal 80% dan dikembalikan minimal 20%.',
];

const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Hari ini';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (same(d, y)) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const AdminChat: React.FC<{ onUnauthorized: () => void }> = ({ onUnauthorized }) => {
  const { width } = useWindowDimensions();
  const split = width >= 1100; // dua panel berdampingan; di bawahnya satu panel bergantian

  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await fetchChatSessions());
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

  // Layar lebar: langsung buka percakapan (yang belum dibaca lebih dulu) agar panel kanan tidak kosong
  useEffect(() => {
    if (split && !selectedId && sessions.length > 0) setSelectedId((sessions.find((s) => s.unread > 0) || sessions[0]).id);
  }, [split, selectedId, sessions]);

  const selected = sessions.find((s) => s.id === selectedId) || null;
  const totalUnread = sessions.reduce((a, s) => a + s.unread, 0);

  const list = (
    <Card style={[styles.listCard, split && { width: 340 }]}>
      <Text style={styles.listTitle}>
        Percakapan{totalUnread > 0 ? ` • ${totalUnread} belum dibaca` : ''}
      </Text>
      {listError ? <ErrorBox message={listError} onRetry={loadSessions} /> : null}
      {listLoading ? (
        <Loading />
      ) : sessions.length === 0 ? (
        <EmptyState icon={MessageCircle} title="Belum ada percakapan" text="Pesan dari tombol chat di situs akan muncul di sini secara otomatis." />
      ) : (
        <ScrollView style={{ maxHeight: split ? 640 : 520 }}>
          {sessions.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sessionRow, selectedId === s.id && styles.sessionRowActive]}
              onPress={() => setSelectedId(s.id)}
              accessibilityRole="button"
              accessibilityLabel={`Percakapan dengan ${s.customerName}${s.unread ? `, ${s.unread} belum dibaca` : ''}`}
            >
              <Avatar name={s.customerName} size={42} tone={s.unread > 0 ? 'success' : 'neutral'} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.sessionTop}>
                  <Text style={[styles.sessionName, s.unread > 0 && { fontWeight: '900' }]} numberOfLines={1}>
                    {s.customerName}
                  </Text>
                  <Text style={styles.sessionTime}>{fmtTime(s.lastMessageAt)}</Text>
                </View>
                <Text style={[styles.sessionPreview, s.unread > 0 && { color: T.ink, fontWeight: '700' }]} numberOfLines={1}>
                  {s.lastMessage ? `${s.lastMessage.sender === 'ADMIN' ? 'Anda: ' : ''}${s.lastMessage.text}` : '—'}
                </Text>
              </View>
              {s.unread > 0 && (
                <View style={styles.unread}>
                  <Text style={styles.unreadText}>{s.unread > 99 ? '99+' : s.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Card>
  );

  return (
    <View style={{ gap: 16 }}>
      <PageHeader title="Live Chat" subtitle="Diskusi langsung dengan pengunjung situs. Percakapan diperbarui otomatis." />

      {split ? (
        <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-start' }}>
          {list}
          <View style={{ flex: 1 }}>
            {selected ? (
              <Conversation key={selected.id} session={selected} onUnauthorized={onUnauthorized} onSent={loadSessions} onBack={null} />
            ) : (
              <Card>
                <EmptyState icon={MessageCircle} title="Pilih percakapan" text="Pilih salah satu percakapan di kiri untuk mulai membalas." />
              </Card>
            )}
          </View>
        </View>
      ) : selected ? (
        <Conversation key={selected.id} session={selected} onUnauthorized={onUnauthorized} onSent={loadSessions} onBack={() => setSelectedId(null)} />
      ) : (
        list
      )}
    </View>
  );
};

// ---------- Percakapan ----------

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
  const [showQuick, setShowQuick] = useState(false);
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
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
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

  let lastDay = '';

  return (
    <Card style={styles.conv}>
      <View style={styles.convHead}>
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Kembali ke daftar percakapan">
            <ArrowLeft size={20} color={T.ink} />
          </TouchableOpacity>
        )}
        <Avatar name={session.customerName} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.convName}>{session.customerName}</Text>
          <Text style={adminStyles.muted}>Mulai {fmtDateTime(session.createdAt)}</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.thread} contentContainerStyle={{ padding: 14, gap: 8 }}>
        {loading ? (
          <ActivityIndicator color={T.brand} />
        ) : (
          messages.map((m) => {
            const day = dayLabel(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            const mine = m.sender === 'ADMIN';
            return (
              <React.Fragment key={m.id}>
                {showDay && (
                  <View style={styles.dayChip}>
                    <Text style={styles.dayChipText}>{day}</Text>
                  </View>
                )}
                <View style={[styles.msgRow, mine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.msgText, mine && { color: '#FFFFFF' }]} selectable>
                      {m.text}
                    </Text>
                    <Text style={[styles.msgTime, mine && { color: 'rgba(255,255,255,0.75)' }]}>{fmtTime(m.createdAt)}</Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })
        )}
      </ScrollView>

      {error ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
          <ErrorBox message={error} />
        </View>
      ) : null}

      {showQuick && (
        <View style={styles.quickWrap}>
          {QUICK_REPLIES.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.quick}
              onPress={() => {
                setText(q);
                setShowQuick(false);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.quickText} numberOfLines={2}>
                {q}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.composer}>
        <TouchableOpacity style={styles.quickToggle} onPress={() => setShowQuick((v) => !v)} accessibilityRole="button" accessibilityLabel="Balasan cepat">
          <Text style={styles.quickToggleText}>{showQuick ? '✕' : '⚡'}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (error) setError(null);
          }}
          placeholder="Tulis balasan…"
          placeholderTextColor="#64748B"
          multiline
          maxLength={MAX_LEN + 50}
          accessibilityLabel="Tulis balasan"
          onKeyPress={(e: any) => {
            // Enter kirim, Shift+Enter baris baru (web)
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
              e.preventDefault?.();
              send();
            }
          }}
        />
        <TouchableOpacity style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]} onPress={send} disabled={!text.trim() || sending} accessibilityRole="button" accessibilityLabel="Kirim balasan">
          {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Send size={19} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
      {text.length > MAX_LEN - 100 && <Text style={[styles.counter, text.length > MAX_LEN && { color: T.danger }]}>{text.length}/{MAX_LEN}</Text>}
    </Card>
  );
};

const styles = StyleSheet.create({
  listCard: { padding: 14, gap: 10, width: '100%' },
  listTitle: { fontSize: 15, fontWeight: '900', color: T.ink },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, minHeight: 64 },
  sessionRowActive: { backgroundColor: T.brandSoft },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sessionName: { flex: 1, fontSize: 14.5, fontWeight: '700', color: T.ink },
  sessionTime: { fontSize: 12, color: T.muted },
  sessionPreview: { fontSize: 13, color: T.muted, marginTop: 2 },
  unread: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  conv: { padding: 0, overflow: 'hidden' },
  convHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  convName: { fontSize: 16, fontWeight: '900', color: T.ink },
  thread: { height: 440, backgroundColor: '#F1F5F9' },
  dayChip: { alignSelf: 'center', backgroundColor: '#E2E8F0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3, marginVertical: 4 },
  dayChipText: { fontSize: 12, fontWeight: '700', color: T.inkSoft },
  msgRow: { flexDirection: 'row' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleMine: { backgroundColor: T.brand, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: T.border, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14.5, color: T.ink, lineHeight: 21 },
  msgTime: { fontSize: 12, color: T.muted, marginTop: 3, alignSelf: 'flex-end' },
  quickWrap: { gap: 6, padding: 10, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surfaceAlt },
  quick: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: '#FFFFFF', minHeight: 44, justifyContent: 'center' },
  quickText: { fontSize: 13, color: T.inkSoft },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: '#FFFFFF' },
  quickToggle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceAlt, borderWidth: 1, borderColor: T.border },
  quickToggleText: { fontSize: 18 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 12, borderWidth: 1, borderColor: T.borderStrong, backgroundColor: T.surfaceAlt, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14.5, color: T.ink },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' },
  counter: { fontSize: 12, color: T.muted, textAlign: 'right', paddingRight: 14, paddingBottom: 8 },
});
