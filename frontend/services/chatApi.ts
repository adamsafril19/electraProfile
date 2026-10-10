import { Platform } from 'react-native';

const API_BASE_URL = 'http://localhost:5000/api/v1';
const SESSION_KEY = 'electra_chat_session';
const TIMEOUT_MS = 10000;

export interface PublicChatMessage {
  id: string;
  sessionId: string;
  sender: 'CUSTOMER' | 'ADMIN';
  text: string;
  createdAt: string;
}

export class ChatApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// ---------- ID sesi (rahasia pelanggan) ----------
let memorySession: string | null = null;

export const getStoredSession = (): string | null => {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(SESSION_KEY);
    } catch {
      return memorySession;
    }
  }
  return memorySession;
};

export const storeSession = (id: string | null) => {
  memorySession = id;
  if (Platform.OS === 'web') {
    try {
      if (id) window.localStorage.setItem(SESSION_KEY, id);
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // penyimpanan diblokir: cukup memori (sesi hilang saat halaman dimuat ulang)
    }
  }
};

// ---------- Request ----------
const call = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
  } catch (e: any) {
    throw new ChatApiError(e?.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Tidak dapat terhubung ke server.', 0);
  } finally {
    clearTimeout(timer);
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // bukan JSON
  }
  if (!res.ok) throw new ChatApiError(body?.message || `Permintaan gagal (${res.status}).`, res.status);
  return body?.data as T;
};

export const createChatSession = (name?: string) =>
  call<{ sessionId: string }>('/chat/sessions', { method: 'POST', body: JSON.stringify({ name }) });

export const sendChatMessage = (sessionId: string, text: string) =>
  call<PublicChatMessage>(`/chat/sessions/${sessionId}/messages`, { method: 'POST', body: JSON.stringify({ text }) });

export const pollChat = (sessionId: string, afterId?: string, markRead = false) => {
  const qs = new URLSearchParams();
  if (afterId) qs.set('after', afterId);
  if (markRead) qs.set('markRead', '1');
  const q = qs.toString();
  return call<{ messages: PublicChatMessage[]; unread: number }>(`/chat/sessions/${sessionId}/messages${q ? `?${q}` : ''}`);
};
