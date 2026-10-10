import crypto from 'crypto';
import { ChatMessage, ChatSession } from '../types';
import { store } from '../utils/JsonStore';
import { AppError } from '../utils/AppError';

const MAX_SESSIONS = 5000;
const MAX_MESSAGES_PER_SESSION = 300;
export const MAX_TEXT = 1000;

const SESSION_ID_RE = /^[a-f0-9]{32}$/;

const cleanText = (raw: unknown): string => {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) throw new AppError('Pesan tidak boleh kosong', 400);
  if (text.length > MAX_TEXT) throw new AppError(`Pesan maksimal ${MAX_TEXT} karakter`, 400);
  return text;
};

const messagesOf = (sessionId: string): ChatMessage[] => store.data.chatMessages.filter((m) => m.sessionId === sessionId);

const after = (list: ChatMessage[], afterId?: string): ChatMessage[] => {
  if (!afterId) return list;
  const idx = list.findIndex((m) => m.id === afterId);
  return idx === -1 ? list : list.slice(idx + 1);
};

export class ChatService {
  private static getSession(id: string): ChatSession {
    // Format dicek dulu agar input aneh tidak sampai ke pencarian
    const session = SESSION_ID_RE.test(id) ? store.data.chatSessions.find((s) => s.id === id) : undefined;
    if (!session) throw new AppError('Sesi chat tidak ditemukan', 404);
    return session;
  }

  private static append(session: ChatSession, sender: 'CUSTOMER' | 'ADMIN', text: string): ChatMessage {
    const msg: ChatMessage = {
      id: crypto.randomBytes(8).toString('hex'),
      sessionId: session.id,
      sender,
      text,
      createdAt: new Date().toISOString(),
    };
    store.data.chatMessages.push(msg);

    // Batasi riwayat per sesi agar berkas data tidak membengkak
    const mine = messagesOf(session.id);
    if (mine.length > MAX_MESSAGES_PER_SESSION) {
      const drop = new Set(mine.slice(0, mine.length - MAX_MESSAGES_PER_SESSION).map((m) => m.id));
      store.data.chatMessages = store.data.chatMessages.filter((m) => !drop.has(m.id));
    }

    session.lastMessageAt = msg.createdAt;
    if (sender === 'CUSTOMER') session.unreadForAdmin++;
    else session.unreadForCustomer++;
    store.save();
    return msg;
  }

  // ---------- Pelanggan (publik, dilindungi ID sesi rahasia) ----------

  public static createSession(name?: string): { sessionId: string } {
    if (store.data.chatSessions.length >= MAX_SESSIONS) {
      throw new AppError('Layanan chat sedang penuh. Silakan hubungi kami via WhatsApp.', 503);
    }
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: crypto.randomBytes(16).toString('hex'),
      customerName: (name || '').trim().slice(0, 60) || 'Pengunjung',
      createdAt: now,
      lastMessageAt: now,
      unreadForAdmin: 0,
      unreadForCustomer: 0,
    };
    store.data.chatSessions.push(session);
    store.save();
    return { sessionId: session.id };
  }

  public static customerSend(sessionId: string, text: unknown): ChatMessage {
    const session = ChatService.getSession(sessionId);
    return ChatService.append(session, 'CUSTOMER', cleanText(text));
  }

  public static customerPoll(sessionId: string, afterId?: string): { messages: ChatMessage[]; unread: number } {
    const session = ChatService.getSession(sessionId);
    const messages = after(messagesOf(session.id), afterId);
    return { messages, unread: session.unreadForCustomer };
  }

  public static customerMarkRead(sessionId: string): void {
    const session = ChatService.getSession(sessionId);
    if (session.unreadForCustomer !== 0) {
      session.unreadForCustomer = 0;
      store.save();
    }
  }

  // ---------- Admin ----------

  public static adminList() {
    return [...store.data.chatSessions]
      .filter((s) => messagesOf(s.id).length > 0) // sesi yang belum pernah mengirim pesan tidak ditampilkan
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      .map((s) => {
        const last = messagesOf(s.id).slice(-1)[0];
        return {
          id: s.id,
          customerName: s.customerName,
          createdAt: s.createdAt,
          lastMessageAt: s.lastMessageAt,
          unread: s.unreadForAdmin,
          lastMessage: last ? { sender: last.sender, text: last.text.slice(0, 120) } : null,
        };
      });
  }

  public static adminMessages(sessionId: string, afterId?: string) {
    const session = ChatService.getSession(sessionId);
    if (session.unreadForAdmin !== 0) {
      session.unreadForAdmin = 0;
      store.save();
    }
    return { session: { id: session.id, customerName: session.customerName, createdAt: session.createdAt }, messages: after(messagesOf(session.id), afterId) };
  }

  public static adminReply(sessionId: string, text: unknown): ChatMessage {
    const session = ChatService.getSession(sessionId);
    return ChatService.append(session, 'ADMIN', cleanText(text));
  }

  public static unreadTotal(): number {
    return store.data.chatSessions.reduce((acc, s) => acc + s.unreadForAdmin, 0);
  }
}
