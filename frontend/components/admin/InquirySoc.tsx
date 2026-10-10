import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { BatteryCharging } from 'lucide-react-native';
import { AdminApiError, AdminInquiry, recordHandover, recordReturn } from '../../services/adminApi';
import { Btn, ErrorBox, FormField, adminStyles, confirmAction, rp } from './ui';
import { T } from './theme';

const parseSoc = (s: string): number | null => (/^\d{1,3}$/.test(s.trim()) && Number(s.trim()) <= 100 ? Number(s.trim()) : null);
const parseKm = (s: string): number | null => {
  const n = Number(s.trim().replace(',', '.'));
  return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
};

const Fields: React.FC<{
  soc: string;
  setSoc: (v: string) => void;
  odo: string;
  setOdo: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  errors: Record<string, string>;
}> = ({ soc, setSoc, odo, setOdo, notes, setNotes, errors }) => (
  <View style={{ gap: 10 }}>
    <View style={adminStyles.row}>
      <FormField label="BATERAI (%)" error={errors.soc} style={{ flex: 1, minWidth: 140 }}>
        <TextInput
          style={[adminStyles.input, !!errors.soc && adminStyles.inputError]}
          value={soc}
          onChangeText={setSoc}
          keyboardType="number-pad"
          maxLength={3}
          placeholder="0–100"
          placeholderTextColor="#64748B"
          accessibilityLabel="Persentase baterai"
        />
      </FormField>
      <FormField label="ODOMETER (KM)" error={errors.odo} style={{ flex: 1, minWidth: 140 }}>
        <TextInput
          style={[adminStyles.input, !!errors.odo && adminStyles.inputError]}
          value={odo}
          onChangeText={setOdo}
          keyboardType="decimal-pad"
          placeholder="Contoh: 12500"
          placeholderTextColor="#64748B"
          accessibilityLabel="Odometer"
        />
      </FormField>
    </View>
    <FormField label="CATATAN PETUGAS (OPSIONAL)">
      <TextInput
        style={adminStyles.input}
        value={notes}
        onChangeText={setNotes}
        placeholder="Kondisi unit, kelengkapan charger, dll."
        placeholderTextColor="#64748B"
      />
    </FormField>
  </View>
);

interface Props {
  inquiry: AdminInquiry;
  onDone: (message: string) => void;
  onUnauthorized: () => void;
}

export const SocSummary: React.FC<{ inquiry: AdminInquiry }> = ({ inquiry: i }) =>
  i.soc ? (
    <View style={styles.summary}>
      <View style={styles.head}>
        <BatteryCharging size={17} color={T.brand} />
        <Text style={styles.title}>Catatan baterai (SoC)</Text>
      </View>
      <Text style={styles.line}>
        Serah terima: <Text style={styles.strong}>{i.soc.handoverSocPct}%</Text> • odometer {i.soc.handoverOdometerKm.toLocaleString('id-ID')} km
      </Text>
      {i.soc.returnSocPct !== undefined ? (
        <Text style={styles.line}>
          Kembali: <Text style={styles.strong}>{i.soc.returnSocPct}%</Text> • odometer {(i.soc.returnOdometerKm ?? 0).toLocaleString('id-ID')} km
          {i.soc.recoveryFeeAmount > 0 ? ` • biaya pemulihan ${rp(i.soc.recoveryFeeAmount)} (dipotong dari deposit)` : ' • tanpa penalti baterai'}
        </Text>
      ) : (
        <Text style={styles.line}>Unit belum dikembalikan.</Text>
      )}
      {i.soc.officerNotes ? <Text style={styles.line}>Catatan petugas: {i.soc.officerNotes}</Text> : null}
    </View>
  ) : null;

export const HandoverForm: React.FC<Props> = ({ inquiry, onDone, onUnauthorized }) => {
  const [soc, setSoc] = useState('100');
  const [odo, setOdo] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const submit = async () => {
    const e: Record<string, string> = {};
    const socN = parseSoc(soc);
    const odoN = parseKm(odo);
    if (socN === null) e.soc = 'Isi angka 0–100.';
    if (odoN === null) e.odo = 'Isi odometer lebih dari 0.';
    setErrors(e);
    setApiError(null);
    if (Object.keys(e).length) return;

    // Standar PRD: unit diserahkan dengan baterai minimal 80%
    if (socN! < 80 && !(await confirmAction(`Baterai ${socN}% di bawah standar serah terima (80%). Tetap catat?`))) return;
    if (inquiry.serviceType === 'DENGAN_DRIVER' && !inquiry.driverId && !(await confirmAction('Reservasi Dengan Sopir ini belum punya driver. Tetap catat serah terima?'))) return;

    setBusy(true);
    try {
      await recordHandover({
        inquiryId: inquiry.id,
        vehicleId: inquiry.vehicleId,
        handoverSocPct: socN!,
        handoverOdometerKm: odoN!,
        officerNotes: notes.trim() || undefined,
      });
      onDone('Serah terima tercatat. Status reservasi menjadi Sedang Disewa.');
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) return onUnauthorized();
      setApiError(err instanceof AdminApiError ? err.message : 'Gagal mencatat serah terima.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Catat serah terima unit</Text>
      {inquiry.status === 'PENDING_WHATSAPP' && (
        <Text style={adminStyles.muted}>Reservasi ini belum dikonfirmasi. Disarankan konfirmasi dulu sebelum serah terima.</Text>
      )}
      <Fields soc={soc} setSoc={setSoc} odo={odo} setOdo={setOdo} notes={notes} setNotes={setNotes} errors={errors} />
      {apiError ? <ErrorBox message={apiError} /> : null}
      <Btn label="Simpan serah terima" onPress={submit} loading={busy} />
    </View>
  );
};

export const ReturnForm: React.FC<Props> = ({ inquiry, onDone, onUnauthorized }) => {
  const [soc, setSoc] = useState('');
  const [odo, setOdo] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const submit = async () => {
    const e: Record<string, string> = {};
    const socN = parseSoc(soc);
    const odoN = parseKm(odo);
    if (socN === null) e.soc = 'Isi angka 0–100.';
    if (odoN === null) e.odo = 'Isi odometer lebih dari 0.';
    else if (inquiry.soc && odoN < inquiry.soc.handoverOdometerKm) {
      e.odo = `Tidak boleh kurang dari odometer serah terima (${inquiry.soc.handoverOdometerKm.toLocaleString('id-ID')} km).`;
    }
    setErrors(e);
    setApiError(null);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const res = await recordReturn({
        inquiryId: inquiry.id,
        returnSocPct: socN!,
        returnOdometerKm: odoN!,
        officerNotes: notes.trim() || undefined,
      });
      onDone(`Pengembalian tercatat. ${res.warningMessage}`);
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) return onUnauthorized();
      setApiError(err instanceof AdminApiError ? err.message : 'Gagal mencatat pengembalian.');
    } finally {
      setBusy(false);
    }
  };

  const socNow = parseSoc(soc);
  const feeHint = socNow === null ? null : socNow < 10 ? 'Biaya pemulihan Rp 150.000' : socNow < 20 ? 'Biaya pemulihan Rp 50.000' : 'Tanpa penalti baterai';

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Catat pengembalian unit</Text>
      <Fields soc={soc} setSoc={setSoc} odo={odo} setOdo={setOdo} notes={notes} setNotes={setNotes} errors={errors} />
      {feeHint ? <Text style={[adminStyles.muted, { fontWeight: '700' }]}>{feeHint}</Text> : null}
      {apiError ? <ErrorBox message={apiError} /> : null}
      <Btn label="Simpan pengembalian & selesaikan" onPress={submit} loading={busy} />
    </View>
  );
};

const styles = StyleSheet.create({
  summary: { gap: 4, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceAlt },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  title: { fontSize: 14, fontWeight: '900', color: T.ink },
  line: { fontSize: 13.5, color: T.inkSoft, lineHeight: 20 },
  strong: { fontWeight: '900', color: T.ink },
  form: { gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: T.infoSoft },
});
