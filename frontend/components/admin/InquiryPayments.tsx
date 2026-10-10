import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Wallet } from 'lucide-react-native';
import {
  AdminApiError,
  AdminInquiry,
  InquiryFinance,
  PAYMENT_METHOD_LABEL,
  PAYMENT_TYPE_LABEL,
  PaymentMethod,
  PaymentType,
  createPayment,
  fetchInquiryFinance,
  voidPayment,
} from '../../services/adminApi';
import { isPastDateStr, isValidDateStr, todayStr } from '../../utils/date';
import { Btn, Chip, ErrorBox, FormField, adminStyles, askReason, fmtDate, rp } from './ui';
import { DateInput } from './DateInput';
import { T } from './theme';
import { toast } from './feedback';

interface Props {
  inquiry: AdminInquiry;
  onChanged: () => void;
  onUnauthorized: () => void;
}

const METHODS: PaymentMethod[] = ['TRANSFER', 'QRIS', 'TUNAI'];

export const InquiryPayments: React.FC<Props> = ({ inquiry, onChanged, onUnauthorized }) => {
  const [fin, setFin] = useState<InquiryFinance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [type, setType] = useState<PaymentType>('DP');
  const [method, setMethod] = useState<PaymentMethod>('TRANSFER');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(todayStr());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const f = await fetchInquiryFinance(inquiry.id);
      setFin(f);
      setLoadError(null);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setLoadError(e instanceof AdminApiError ? e.message : 'Gagal memuat data pembayaran.');
    }
  }, [inquiry.id, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load, inquiry.paidAmount, inquiry.status]);

  // Jenis yang masuk akal sesuai kondisi reservasi
  const types: PaymentType[] =
    inquiry.status === 'CANCELLED'
      ? ['REFUND_DEPOSIT']
      : ['DP', 'PELUNASAN', 'DEPOSIT', 'DENDA', ...(inquiry.status === 'COMPLETED' ? (['REFUND_DEPOSIT'] as PaymentType[]) : [])];

  useEffect(() => {
    if (!types.includes(type)) setType(types[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiry.status]);

  const refundable = fin ? (inquiry.status === 'CANCELLED' ? Math.max(0, fin.depositPaid - fin.depositRefunded) : fin.depositHeld) : 0;
  const suggestion =
    !fin ? null
    : (type === 'DP' || type === 'PELUNASAN') && fin.outstanding > 0 ? { label: `Isi sisa tagihan (${rp(fin.outstanding)})`, value: fin.outstanding }
    : type === 'REFUND_DEPOSIT' && refundable > 0 ? { label: `Isi deposit yang dapat dikembalikan (${rp(refundable)})`, value: refundable }
    : null;

  const submit = async () => {
    if (!fin || busy) return;
    const e: Record<string, string> = {};
    const n = Number(amount);
    if (!amount || !Number.isInteger(n) || n <= 0) e.amount = 'Isi jumlah lebih dari 0.';
    else if ((type === 'DP' || type === 'PELUNASAN') && n > fin.outstanding) e.amount = `Melebihi sisa tagihan (${rp(fin.outstanding)}).`;
    else if (type === 'REFUND_DEPOSIT' && n > refundable) e.amount = `Melebihi deposit yang dapat dikembalikan (${rp(refundable)}).`;
    if (!isValidDateStr(paidAt)) e.paidAt = 'Tanggal tidak valid.';
    else if (!isPastDateStr(paidAt) && paidAt > todayStr()) e.paidAt = 'Tanggal tidak boleh di masa depan.';
    setErrors(e);
    setApiError(null);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      await createPayment({ inquiryId: inquiry.id, type, method, amount: n, paidAt, note: note.trim() || undefined });
      setAmount('');
      setNote('');
      toast.success('Pembayaran dicatat');
      await load();
      onChanged();
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) return onUnauthorized();
      setApiError(err instanceof AdminApiError ? err.message : 'Gagal mencatat pembayaran.');
    } finally {
      setBusy(false);
    }
  };

  const doVoid = async (id: string) => {
    const reason = await askReason('Alasan membatalkan pencatatan ini?', 'Salah input');
    if (!reason) return;
    try {
      await voidPayment(id, reason);
      toast.success('Pencatatan pembayaran dibatalkan');
      await load();
      onChanged();
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) return onUnauthorized();
      setApiError(err instanceof AdminApiError ? err.message : 'Gagal membatalkan.');
    }
  };

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Wallet size={17} color={T.brand} />
        <Text style={styles.title}>Pembayaran</Text>
      </View>

      {loadError ? <ErrorBox message={loadError} onRetry={load} /> : null}

      {fin && (
        <>
          <View style={styles.grid}>
            <Metric label="Tagihan sewa" value={rp(fin.rentDue)} />
            <Metric label="Sudah dibayar" value={rp(fin.rentPaid)} tone={fin.rentPaid > 0 ? 'ok' : undefined} />
            <Metric label="Sisa tagihan" value={rp(fin.outstanding)} tone={fin.outstanding > 0 ? 'warn' : 'ok'} />
            <Metric label="Deposit ditahan" value={rp(fin.depositHeld)} hint={fin.batteryFee > 0 ? `termasuk potongan baterai ${rp(fin.batteryFee)}` : undefined} />
          </View>

          {fin.payments.length > 0 && (
            <View style={{ gap: 6 }}>
              {fin.payments.map((p) => (
                <View key={p.id} style={[styles.payRow, p.voidedAt ? { opacity: 0.55 } : null]}>
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <Text style={[styles.payTitle, p.voidedAt ? { textDecorationLine: 'line-through' } : null]}>
                      {PAYMENT_TYPE_LABEL[p.type]} • {PAYMENT_METHOD_LABEL[p.method]}
                    </Text>
                    <Text style={adminStyles.muted}>
                      {fmtDate(p.paidAt)}
                      {p.note ? ` • ${p.note}` : ''}
                      {p.voidedAt ? ` • DIBATALKAN: ${p.voidReason}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.payAmount, p.type === 'REFUND_DEPOSIT' && { color: T.danger }, p.voidedAt ? { textDecorationLine: 'line-through' } : null]}>
                    {p.type === 'REFUND_DEPOSIT' ? '−' : '+'}
                    {rp(p.amount)}
                  </Text>
                  {!p.voidedAt && <Btn label="Batalkan" variant="ghost" small onPress={() => doVoid(p.id)} />}
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.form}>
        <Text style={styles.formTitle}>Catat pembayaran</Text>
        <View style={adminStyles.row}>
          {types.map((t) => (
            <Chip key={t} label={PAYMENT_TYPE_LABEL[t]} active={type === t} onPress={() => setType(t)} />
          ))}
        </View>
        <View style={adminStyles.row}>
          {METHODS.map((m) => (
            <Chip key={m} label={PAYMENT_METHOD_LABEL[m]} active={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>

        <View style={adminStyles.row}>
          <FormField label="JUMLAH (RP)" error={errors.amount} style={{ flex: 1, minWidth: 180 }} hint={amount ? rp(Number(amount)) : undefined}>
            <TextInput
              style={[adminStyles.input, !!errors.amount && adminStyles.inputError]}
              value={amount}
              onChangeText={(v) => {
                setAmount(v.replace(/\D/g, '').slice(0, 10));
                if (errors.amount) setErrors((p) => ({ ...p, amount: '' }));
              }}
              keyboardType="number-pad"
              placeholder="Contoh: 500000"
              placeholderTextColor="#64748B"
              accessibilityLabel="Jumlah pembayaran"
            />
          </FormField>
          <FormField label="TANGGAL BAYAR" error={errors.paidAt} style={{ flex: 1, minWidth: 170 }}>
            <DateInput value={paidAt} onChange={setPaidAt} max={todayStr()} error={!!errors.paidAt} accessibilityLabel="Tanggal pembayaran" />
          </FormField>
        </View>

        {suggestion && <Btn label={suggestion.label} variant="secondary" small onPress={() => setAmount(String(suggestion.value))} />}

        <FormField label="CATATAN (OPSIONAL)">
          <TextInput
            style={adminStyles.input}
            value={note}
            onChangeText={setNote}
            maxLength={200}
            placeholder="Mis. nomor referensi transfer"
            placeholderTextColor="#64748B"
          />
        </FormField>

        {apiError ? <ErrorBox message={apiError} /> : null}
        <Btn label="Simpan pembayaran" onPress={submit} loading={busy} disabled={!fin} />
      </View>
    </View>
  );
};

const Metric: React.FC<{ label: string; value: string; tone?: 'ok' | 'warn'; hint?: string }> = ({ label, value, tone, hint }) => (
  <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, tone === 'ok' && { color: T.success }, tone === 'warn' && { color: T.warn }]}>{value}</Text>
    {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  box: { gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: '900', color: T.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, flexBasis: 140, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 10, gap: 2 },
  metricLabel: { fontSize: 12, fontWeight: '700', color: T.muted },
  metricValue: { fontSize: 15, fontWeight: '900', color: T.ink },
  metricHint: { fontSize: 12, color: T.muted },
  payRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  payTitle: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  payAmount: { fontSize: 14, fontWeight: '900', color: T.success },
  form: { gap: 10, borderTopWidth: 1, borderTopColor: T.border, paddingTop: 12 },
  formTitle: { fontSize: 13.5, fontWeight: '900', color: T.ink },
});
