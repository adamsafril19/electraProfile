import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AdminFinance } from '../../components/admin/AdminFinance';
import { useAdmin } from '../../components/admin/AdminContext';

export default function KeuanganScreen() {
  const router = useRouter();
  const { onUnauthorized } = useAdmin();
  const params = useLocalSearchParams<{ expense?: string }>();

  return (
    <AdminFinance
      key={params.expense ? 'expense' : 'main'}
      autoExpense={params.expense === '1'}
      onUnauthorized={onUnauthorized}
      onOpenInquiry={(code, id) => router.push({ pathname: '/admin/pesanan', params: { focus: id, code } } as any)}
    />
  );
}
