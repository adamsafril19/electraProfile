import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Copy, Check, KeyRound, Zap } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { adminLogin, AdminApiError } from '../../services/adminApi';
import { Input, InputField } from '@gluestack-ui/themed';
import { Btn, Card, ErrorBox, adminStyles, HStack, GBadge, BadgeText } from './ui';

const DEMO_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

export const AdminLogin: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [username, setUsername] = useState(DEMO_CREDENTIALS.username);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);

  const handleCopy = async (text: string, field: 'username' | 'password') => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback: field state still updates for user feedback
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleAutoFill = () => {
    setUsername(DEMO_CREDENTIALS.username);
    setPassword(DEMO_CREDENTIALS.password);
    setError(null);
    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 2500);
  };

  const submit = async () => {
    if (loading) return;
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await adminLogin(username.trim(), password);
      onSuccess();
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Terjadi kesalahan tak terduga.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <HStack alignItems="center" justifyContent="space-between" mb={6}>
          <Text style={styles.eyebrow}>ELECTRA ADMIN</Text>
          <GBadge size="sm" variant="solid" action="info" borderRadius={999}>
            <BadgeText fontSize={10} fontWeight="700">Gluestack UI</BadgeText>
          </GBadge>
        </HStack>
        <Text style={styles.title}>Masuk Panel Admin</Text>
        <Text style={[adminStyles.muted, { marginBottom: 14 }]}>
          Kelola reservasi, status unit baterai, dan penugasan sopir armada EV.
        </Text>

        {/* Demo Credentials Box */}
        <View style={styles.demoBox}>
          <View style={styles.demoHeader}>
            <View style={styles.demoHeaderLeft}>
              <KeyRound size={16} color={COLORS.brandBlue} />
              <Text style={styles.demoTitle}>Kredensial Login Demo</Text>
            </View>
            <TouchableOpacity
              style={styles.autoFillBtn}
              onPress={handleAutoFill}
              activeOpacity={0.7}
              accessibilityLabel="Isi kredensial otomatis"
            >
              <Zap size={13} color="#0795FE" />
              <Text style={styles.autoFillBtnText}>Isi Otomatis</Text>
            </TouchableOpacity>
          </View>

          {/* Username Row */}
          <View style={styles.demoRow}>
            <View style={styles.demoKeyCol}>
              <Text style={styles.demoLabel}>Username:</Text>
              <Text
                style={[styles.demoValue, Platform.OS === 'web' && ({ userSelect: 'all' } as any)]}
                selectable
              >
                {DEMO_CREDENTIALS.username}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.copyBtn, copiedField === 'username' && styles.copyBtnSuccess]}
              onPress={() => handleCopy(DEMO_CREDENTIALS.username, 'username')}
              activeOpacity={0.7}
            >
              {copiedField === 'username' ? (
                <>
                  <Check size={12} color="#10B981" />
                  <Text style={styles.copyBtnTextSuccess}>Tersalin</Text>
                </>
              ) : (
                <>
                  <Copy size={12} color="#64748B" />
                  <Text style={styles.copyBtnText}>Salin</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Password Row */}
          <View style={styles.demoRow}>
            <View style={styles.demoKeyCol}>
              <Text style={styles.demoLabel}>Password:</Text>
              <Text
                style={[styles.demoValue, Platform.OS === 'web' && ({ userSelect: 'all' } as any)]}
                selectable
              >
                {DEMO_CREDENTIALS.password}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.copyBtn, copiedField === 'password' && styles.copyBtnSuccess]}
              onPress={() => handleCopy(DEMO_CREDENTIALS.password, 'password')}
              activeOpacity={0.7}
            >
              {copiedField === 'password' ? (
                <>
                  <Check size={12} color="#10B981" />
                  <Text style={styles.copyBtnTextSuccess}>Tersalin</Text>
                </>
              ) : (
                <>
                  <Copy size={12} color="#64748B" />
                  <Text style={styles.copyBtnText}>Salin</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {autoFilled ? (
            <View style={styles.autoFillNotice}>
              <Check size={13} color="#10B981" />
              <Text style={styles.autoFillNoticeText}>
                Kredensial berhasil diisikan ke form! Silakan klik Masuk.
              </Text>
            </View>
          ) : (
            <Text style={styles.demoHint}>
              💡 Tinggal klik tombol &quot;Salin&quot; atau &quot;Isi Otomatis&quot; tanpa perlu repot mengetik.
            </Text>
          )}
        </View>

        <Text style={adminStyles.label}>USERNAME</Text>
        <Input size="md" variant="outline" style={styles.inputWrap}>
          <InputField
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            placeholder="Masukkan username"
            placeholderTextColor="#64748B"
          />
        </Input>

        <Text style={[adminStyles.label, { marginTop: 12 }]}>PASSWORD</Text>
        <Input size="md" variant="outline" style={styles.inputWrap}>
          <InputField
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            onSubmitEditing={submit}
            placeholder="Masukkan password"
            placeholderTextColor="#64748B"
          />
        </Input>

        {error ? (
          <View style={{ marginTop: 12 }}>
            <ErrorBox message={error} />
          </View>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <Btn label="Masuk ke Panel Admin" onPress={submit} loading={loading} />
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: 520 },
  card: { width: '100%', maxWidth: 440, padding: 24 },
  eyebrow: { fontSize: 12, fontWeight: '800', color: COLORS.brandBlue, letterSpacing: 1.2 },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.deepInk, marginVertical: 4 },

  demoBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    gap: 8,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  demoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.3,
  },
  autoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7DD3FC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  autoFillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  demoKeyCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  demoLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    minWidth: 65,
  },
  demoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  copyBtnSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  copyBtnTextSuccess: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  autoFillNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 2,
  },
  autoFillNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  demoHint: {
    fontSize: 10.5,
    color: '#0369A1',
    fontStyle: 'italic',
    marginTop: 2,
  },
  inputWrap: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
  },
});

