import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface OfflineBannerProps {
  onRetry?: () => void;
  retrying?: boolean;
  message?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  onRetry,
  retrying = false,
  message = 'Tidak terhubung ke server. Menampilkan data cadangan, tarif dan ketersediaan bisa berbeda. Konfirmasi ke admin sebelum membayar.',
}) => (
  <View style={styles.banner} accessibilityRole="alert">
    <Text style={styles.text}>{message}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.btn} onPress={onRetry} disabled={retrying} accessibilityRole="button">
        <Text style={styles.btnText}>{retrying ? 'Mencoba…' : 'Coba lagi'}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  text: {
    flex: 1,
    minWidth: 220,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#78350F',
  },
  btn: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#78350F',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
