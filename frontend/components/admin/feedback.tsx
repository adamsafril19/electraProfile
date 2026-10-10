import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react-native';
import { T, shadowLg } from './theme';
import { FadeIn } from '../FadeIn';

// ---------- Registri global ----------
// Komponen mana pun cukup memanggil toast.success(...) / showConfirm(...). Host dipasang sekali di layout admin.

type ToastKind = 'success' | 'error' | 'info';
let toastSink: ((kind: ToastKind, message: string) => void) | null = null;

export const toast = {
  success: (message: string) => toastSink?.('success', message),
  error: (message: string) => toastSink?.('error', message),
  info: (message: string) => toastSink?.('info', message),
};

interface DialogRequest {
  kind: 'confirm' | 'prompt';
  message: string;
  title?: string;
  confirmLabel?: string;
  destructive?: boolean;
  initialValue?: string;
  placeholder?: string;
  resolve: (value: boolean | string | null) => void;
}
let dialogSink: ((req: DialogRequest) => void) | null = null;

// Kata kerja yang berarti tindakan merusak -> tombol merah
const DESTRUCTIVE = /(batalkan|hapus|nonaktifkan|sembunyikan|lepas|tolak)/i;

export const showConfirm = (message: string, opts: { title?: string; confirmLabel?: string; destructive?: boolean } = {}): Promise<boolean> | null => {
  if (!dialogSink) return null;
  return new Promise<boolean>((resolve) =>
    dialogSink!({ kind: 'confirm', message, ...opts, destructive: opts.destructive ?? DESTRUCTIVE.test(message), resolve: (v) => resolve(v === true) })
  );
};

export const showPrompt = (message: string, opts: { title?: string; confirmLabel?: string; initialValue?: string; placeholder?: string } = {}): Promise<string | null> | null => {
  if (!dialogSink) return null;
  return new Promise<string | null>((resolve) => dialogSink!({ kind: 'prompt', message, ...opts, destructive: true, resolve: (v) => resolve(typeof v === 'string' ? v : null) }));
};

// ---------- Host ----------

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const fixed: any = Platform.OS === 'web' ? 'fixed' : 'absolute';

export const FeedbackHost: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState('');
  const [valueError, setValueError] = useState<string | null>(null);
  const idRef = useRef(0);
  const confirmRef = useRef<any>(null);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  useEffect(() => {
    toastSink = (kind, message) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 6500 : 4000);
    };
    dialogSink = (req) => {
      setValue(req.initialValue || '');
      setValueError(null);
      setDialog(req);
    };
    return () => {
      toastSink = null;
      dialogSink = null;
    };
  }, [dismiss]);

  const close = useCallback(
    (result: boolean | string | null) => {
      dialog?.resolve(result);
      setDialog(null);
    },
    [dialog]
  );

  const submit = useCallback(() => {
    if (!dialog) return;
    if (dialog.kind === 'prompt') {
      const v = value.trim();
      if (v.length < 3) {
        setValueError('Isi minimal 3 karakter.');
        return;
      }
      close(v);
    } else close(true);
  }, [dialog, value, close]);

  // Escape = batal; fokus ke tombol utama saat dialog terbuka (web)
  useEffect(() => {
    if (!dialog || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(dialog.kind === 'confirm' ? false : null);
    };
    document.addEventListener('keydown', onKey);
    if (dialog.kind === 'confirm') setTimeout(() => confirmRef.current?.focus?.(), 40);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  return (
    <>
      {/* Toast */}
      <View pointerEvents="box-none" style={[styles.toastLayer, isMobile ? { left: 12, right: 12, top: 12 } : { right: 20, top: 20, width: 380 }]}>
        {toasts.map((t) => {
          const c = TOAST[t.kind];
          const Icon = c.icon;
          return (
            <FadeIn key={t.id} distance={-10} duration={220}>
              <View style={[styles.toast, { borderLeftColor: c.color }]} accessibilityRole={t.kind === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite">
                <Icon size={20} color={c.color} />
                <Text style={styles.toastText}>{t.message}</Text>
                <TouchableOpacity onPress={() => dismiss(t.id)} style={styles.toastClose} accessibilityRole="button" accessibilityLabel="Tutup notifikasi">
                  <X size={16} color={T.muted} />
                </TouchableOpacity>
              </View>
            </FadeIn>
          );
        })}
      </View>

      {/* Dialog */}
      {dialog && (
        <View style={styles.dialogLayer}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => close(dialog.kind === 'confirm' ? false : null)} accessibilityLabel="Tutup dialog" />
          <FadeIn distance={12} duration={200}>
            <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
              <Text style={styles.dialogTitle}>{dialog.title || (dialog.kind === 'prompt' ? 'Alasan diperlukan' : 'Konfirmasi')}</Text>
              <Text style={styles.dialogMessage}>{dialog.message}</Text>

              {dialog.kind === 'prompt' && (
                <View style={{ gap: 6 }}>
                  <TextInput
                    style={[styles.input, !!valueError && { borderColor: '#DC2626' }]}
                    value={value}
                    onChangeText={(v) => {
                      setValue(v);
                      if (valueError) setValueError(null);
                    }}
                    autoFocus
                    maxLength={200}
                    placeholder={dialog.placeholder || 'Tulis alasan singkat'}
                    placeholderTextColor="#64748B"
                    onSubmitEditing={submit}
                    accessibilityLabel="Alasan"
                  />
                  {valueError ? <Text style={styles.inputError}>{valueError}</Text> : null}
                </View>
              )}

              <View style={styles.dialogActions}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => close(dialog.kind === 'confirm' ? false : null)} accessibilityRole="button">
                  <Text style={styles.btnCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  ref={confirmRef}
                  style={[styles.btn, dialog.destructive ? styles.btnDanger : styles.btnPrimary]}
                  onPress={submit}
                  accessibilityRole="button"
                >
                  <Text style={styles.btnPrimaryText}>{dialog.confirmLabel || (dialog.kind === 'prompt' ? 'Simpan' : dialog.destructive ? 'Ya, lanjutkan' : 'Lanjutkan')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>
        </View>
      )}
    </>
  );
};

const TOAST = {
  success: { color: '#16A34A', icon: CircleCheck },
  error: { color: '#DC2626', icon: TriangleAlert },
  info: { color: '#2563EB', icon: Info },
};

const styles = StyleSheet.create({
  toastLayer: { position: fixed, zIndex: 300, gap: 8 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 6,
    ...shadowLg,
  },
  toastText: { flex: 1, fontSize: 14, fontWeight: '600', color: T.ink, lineHeight: 20 },
  toastClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dialogLayer: { position: fixed, top: 0, left: 0, right: 0, bottom: 0, zIndex: 400, alignItems: 'center', justifyContent: 'center', padding: 16 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,34,58,0.55)' },
  dialog: { width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 22, gap: 14, ...shadowLg },
  dialogTitle: { fontSize: 18, fontWeight: '900', color: T.ink },
  dialogMessage: { fontSize: 14.5, lineHeight: 22, color: T.inkSoft },
  input: { minHeight: 46, borderWidth: 1, borderColor: T.borderStrong, borderRadius: 10, paddingHorizontal: 12, fontSize: 14.5, backgroundColor: T.surfaceAlt, color: T.ink },
  inputError: { fontSize: 12.5, color: '#DC2626', fontWeight: '600' },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  btn: { minHeight: 46, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: T.borderStrong },
  btnCancelText: { fontSize: 14, fontWeight: '700', color: T.ink },
  btnPrimary: { backgroundColor: T.brand },
  btnDanger: { backgroundColor: '#DC2626' },
  btnPrimaryText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
