import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { COLORS } from '../constants/colors';

export const MIN_DURATION_DAYS = 1;
export const MAX_DURATION_DAYS = 30; // sama dengan batas validasi backend

interface DurationStepperProps {
  value: number;
  onChange: (days: number) => void;
  label?: string;
}

const clamp = (n: number) => Math.min(MAX_DURATION_DAYS, Math.max(MIN_DURATION_DAYS, n));

export const DurationStepper: React.FC<DurationStepperProps> = ({ value, onChange, label = 'DURASI PENYEWAAN' }) => {
  // Teks disimpan terpisah agar kolom bisa dikosongkan sementara saat mengetik
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw.replace(/\D/g, ''), 10);
    const next = Number.isNaN(parsed) ? MIN_DURATION_DAYS : clamp(parsed);
    setText(String(next));
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, value <= MIN_DURATION_DAYS && styles.btnDisabled]}
          onPress={() => onChange(clamp(value - 1))}
          disabled={value <= MIN_DURATION_DAYS}
          accessibilityLabel="Kurangi durasi"
        >
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>

        <View style={styles.valueBox}>
          <TextInput
            style={styles.valueInput}
            value={text}
            onChangeText={(v) => setText(v.replace(/\D/g, '').slice(0, 2))}
            onBlur={() => commit(text)}
            onSubmitEditing={() => commit(text)}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            accessibilityLabel="Jumlah hari sewa"
          />
          <Text style={styles.unit}>hari</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, value >= MAX_DURATION_DAYS && styles.btnDisabled]}
          onPress={() => onChange(clamp(value + 1))}
          disabled={value >= MAX_DURATION_DAYS}
          accessibilityLabel="Tambah durasi"
        >
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.helper}>Maksimal {MAX_DURATION_DAYS} hari. Untuk sewa lebih lama, hubungi admin.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.deepInk,
    lineHeight: 24,
  },
  valueBox: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  valueInput: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.deepInk,
    padding: 0,
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  helper: {
    fontSize: 12,
    color: '#64748B',
  },
});
