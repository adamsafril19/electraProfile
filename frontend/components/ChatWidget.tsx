import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { usePathname } from 'expo-router';
import { MessageCircle, Send, X } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import {
  ChatApiError,
  PublicChatMessage,
  createChatSession,
  getStoredSession,
  pollChat,
  sendChatMessage,
  storeSession,
} from '../services/chatApi';

const OPEN_POLL_MS = 3000;
const CLOSED_POLL_MS = 15000;
const MAX_LEN = 1000;

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const ChatWidget: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const pathname = usePathname();
  const isMobile = width < 768;
  // Halaman detail unit punya bar CTA tetap di bawah (mobile): geser tombol chat ke atasnya
  const hasStickyBar = isMobile && pathname.startsWith('/armada/') && pathname !== '/armada';

  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const lastIdRef = useRef<string | undefined>(undefined);

  // Ambil sesi tersimpan setelah mount (localStorage tidak tersedia saat render awal)
  useEffect(() => {
    setSessionId(getStoredSession());
  }, []);

  const resetSession = useCallback(() => {
    storeSession(null);
    setSessionId(null);
    setMessages([]);
    setUnread(0);
    lastIdRef.current = undefined;
  }, []);

  const poll = useCallback(
    async (markRead: boolean) => {
      if (!sessionId) return;
      try {
        const res = await pollChat(sessionId, lastIdRef.current, markRead);
        setOffline(false);
        setUnread(markRead ? 0 : res.unread);
        if (res.messages.length > 0) {
          lastIdRef.current = res.messages[res.messages.length - 1].id;
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id));
            const fresh = res.messages.filter((m) => !known.has(m.id));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
        }
      } catch (e) {
        if (e instanceof ChatApiError && e.status === 404) return resetSession(); // sesi sudah tidak ada di server
        setOffline(true);
      }
    },
    [sessionId, resetSession]
  );

  // Muat riwayat penuh saat jendela dibuka, lalu polling cepat; saat tertutup polling lambat hanya untuk badge
  useEffect(() => {
    if (!sessionId) return;
    if (open) {
      lastIdRef.current = undefined;
      setMessages([]);
      poll(true);
      const t = setInterval(() => poll(true), OPEN_POLL_MS);
      return () => clearInterval(t);
    }
    poll(false);
    const t = setInterval(() => poll(false), CLOSED_POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId]);

  useEffect(() => {
    if (open) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length, open]);

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
      let id = sessionId;
      if (!id) {
        id = (await createChatSession(name.trim() || undefined)).sessionId;
        storeSession(id);
        setSessionId(id);
      }
      const msg = await sendChatMessage(id, body);
      lastIdRef.current = msg.id;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setText('');
      setOffline(false);
    } catch (e) {
      if (e instanceof ChatApiError && e.status === 404) {
        resetSession();
        setError('Sesi chat berakhir. Silakan kirim ulang pesan Anda.');
      } else {
        setError(e instanceof ChatApiError ? e.message : 'Pesan gagal terkirim.');
      }
    } finally {
      setSending(false);
    }
  };

  const bottom = hasStickyBar ? 92 : 20;
  const panelHeight = Math.min(540, height - (isMobile ? 90 : 120));

  return (
    <>
      {open && (
        <View
          style={[
            styles.panel,
            { bottom: bottom + 64, height: panelHeight },
            isMobile ? { left: 10, right: 10 } : { right: 20, width: 370 },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MessageCircle size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Chat dengan Admin</Text>
              <Text style={styles.headerSub}>{offline ? 'Koneksi terputus, mencoba lagi…' : 'Biasanya membalas dalam beberapa menit'}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Tutup chat">
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={{ padding: 12, gap: 8 }} keyboardShouldPersistTaps="handled">
            <View style={styles.welcome}>
              <Text style={styles.welcomeText}>
                Halo! Tanyakan ketersediaan unit, tarif, atau proses sewa. Admin kami aktif 07.00–23.00 WIB.
              </Text>
            </View>
            {messages.map((m) => (
              <View key={m.id} style={[styles.row, m.sender === 'CUSTOMER' ? styles.rowMe : styles.rowThem]}>
                <View style={[styles.bubble, m.sender === 'CUSTOMER' ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.msgText, m.sender === 'CUSTOMER' && { color: '#FFFFFF' }]}>{m.text}</Text>
                  <Text style={[styles.time, m.sender === 'CUSTOMER' && { color: 'rgba(255,255,255,0.75)' }]}>{hhmm(m.createdAt)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {error ? (
            <View style={styles.errorBar} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!sessionId && (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Nama Anda (opsional)"
              placeholderTextColor="#64748B"
              maxLength={60}
              accessibilityLabel="Nama Anda"
            />
          )}

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={(v) => {
                setText(v);
                if (error) setError(null);
              }}
              placeholder="Tulis pesan…"
              placeholderTextColor="#64748B"
              multiline
              maxLength={MAX_LEN + 50}
              accessibilityLabel="Tulis pesan"
              onKeyPress={(e: any) => {
                // Enter kirim, Shift+Enter baris baru (web)
                if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                  e.preventDefault?.();
                  send();
                }
              }}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
              onPress={send}
              disabled={!text.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel="Kirim pesan"
            >
              {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Send size={19} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom, right: isMobile ? 12 : 20 }, isMobile && styles.fabSmall]}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Tutup chat' : `Buka chat dengan admin${unread ? `, ${unread} pesan baru` : ''}`}
      >
        {open ? <X size={26} color="#FFFFFF" /> : <MessageCircle size={26} color="#FFFFFF" />}
        {!open && unread > 0 && (
          <View style={styles.unread}>
            <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
};

const fixed: any = Platform.OS === 'web' ? 'fixed' : 'absolute';

const styles = StyleSheet.create({
  fab: {
    position: fixed,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  fabSmall: { width: 48, height: 48, borderRadius: 24, opacity: 0.96 },
  unread: { position: 'absolute', top: -2, right: -2, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: '#FFFFFF' },
  unreadText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  panel: {
    position: fixed,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 70,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.deepInk, paddingHorizontal: 14, paddingVertical: 12 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.brandBlue, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, backgroundColor: '#F1F5F9' },
  welcome: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  welcomeText: { fontSize: 13, color: '#334155', lineHeight: 19 },
  row: { flexDirection: 'row' },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { backgroundColor: COLORS.brandBlue, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  time: { fontSize: 12, color: '#64748B', marginTop: 3, alignSelf: 'flex-end' },
  errorBar: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#FECACA' },
  errorText: { color: '#991B1B', fontSize: 12.5 },
  nameInput: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingHorizontal: 14, minHeight: 44, fontSize: 14, color: '#0F172A', backgroundColor: '#FFFFFF' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  input: { flex: 1, minHeight: 44, maxHeight: 110, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.brandBlue, alignItems: 'center', justifyContent: 'center' },
});
