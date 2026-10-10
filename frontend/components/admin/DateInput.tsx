import React from 'react';
import { Platform, TextInput } from 'react-native';
import { adminStyles } from './ui';
import { T } from './theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  error?: boolean;
  accessibilityLabel?: string;
}

// Web: date picker bawaan browser. Native: kolom teks YYYY-MM-DD (tanpa dependensi tambahan).
export const DateInput: React.FC<Props> = ({ value, onChange, min, max, error, accessibilityLabel }) =>
  Platform.OS === 'web' ? (
    React.createElement('input', {
      type: 'date',
      value,
      min,
      max,
      'aria-label': accessibilityLabel,
      onChange: (e: any) => onChange(e.target.value),
      style: {
        height: 44,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: error ? '#DC2626' : T.borderStrong,
        borderRadius: T.radiusSm,
        paddingLeft: 12,
        paddingRight: 12,
        fontSize: 14,
        backgroundColor: T.surfaceAlt,
        color: T.ink,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        boxSizing: 'border-box',
        width: '100%',
      },
    })
  ) : (
    <TextInput
      style={[adminStyles.input, error && adminStyles.inputError]}
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor="#64748B"
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      accessibilityLabel={accessibilityLabel}
    />
  );
