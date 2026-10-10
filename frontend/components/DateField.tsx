import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { COLORS } from '../constants/colors';
import { addDaysStr, formatDateId, isValidDateStr, todayStr } from '../utils/date';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  label?: string;
}

const QUICK_PICKS = [
  { label: 'Hari ini', offset: 0 },
  { label: 'Besok', offset: 1 },
  { label: 'Lusa', offset: 2 },
];

export const DateField: React.FC<DateFieldProps> = ({ value, onChange, error, label = 'TANGGAL MULAI SEWA' }) => {
  const hasError = !!error;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.pickRow}>
        {QUICK_PICKS.map((p) => {
          const target = addDaysStr(p.offset);
          const active = value === target;
          return (
            <TouchableOpacity
              key={p.label}
              style={[styles.pick, active && styles.pickActive]}
              onPress={() => onChange(target)}
            >
              <Text style={[styles.pickText, active && styles.pickTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {Platform.OS === 'web' ? (
        // Native date picker browser; React Native tidak punya input date bawaan
        React.createElement('input', {
          type: 'date',
          value,
          min: todayStr(),
          onChange: (e: any) => onChange(e.target.value),
          style: {
            height: 44,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: hasError ? COLORS.corporateRed : '#CBD5E1',
            borderRadius: 6,
            paddingLeft: 12,
            paddingRight: 12,
            fontSize: 13,
            backgroundColor: '#F8FAFC',
            color: COLORS.textInk,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            boxSizing: 'border-box',
            width: '100%',
          },
        })
      ) : (
        <TextInput
          style={[styles.input, hasError && styles.inputError]}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748B"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      )}

      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : isValidDateStr(value) ? (
        <Text style={styles.helperText}>{formatDateId(value)}</Text>
      ) : null}
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
  pickRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pick: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: COLORS.white,
  },
  pickActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brandBlue,
  },
  pickText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  pickTextActive: {
    color: COLORS.brandBlue,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
    color: COLORS.textInk,
  },
  inputError: {
    borderColor: COLORS.corporateRed,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.corporateRed,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
  },
});
