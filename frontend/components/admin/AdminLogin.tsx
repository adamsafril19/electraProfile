import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { adminLogin, AdminApiError } from '../../services/adminApi';
import { Btn, Card, ErrorBox, adminStyles } from './ui';

export const AdminLogin: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <Text style={styles.eyebrow}>ELECTRA ADMIN</Text>
        <Text style={styles.title}>Masuk Panel Admin</Text>
        <Text style={[adminStyles.muted, { marginBottom: 16 }]}>
          Khusus pengelola. Kredensial diatur lewat ADMIN_USERNAME dan ADMIN_PASSWORD di server.
        </Text>

        <Text style={adminStyles.label}>USERNAME</Text>
        <TextInput
          style={adminStyles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          placeholderTextColor="#64748B"
        />

        <Text style={[adminStyles.label, { marginTop: 12 }]}>PASSWORD</Text>
        <TextInput
          style={adminStyles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          onSubmitEditing={submit}
          placeholder="Masukkan password"
          placeholderTextColor="#64748B"
        />

        {error ? (
          <View style={{ marginTop: 12 }}>
            <ErrorBox message={error} />
          </View>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <Btn label="Masuk" onPress={submit} loading={loading} />
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: 520 },
  card: { width: '100%', maxWidth: 420, padding: 24 },
  eyebrow: { fontSize: 12, fontWeight: '800', color: COLORS.brandBlue, letterSpacing: 1.2 },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.deepInk, marginVertical: 4 },
});
