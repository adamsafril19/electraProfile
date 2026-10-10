import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AdminDrivers } from '../../components/admin/AdminDrivers';
import { useAdmin } from '../../components/admin/AdminContext';

export default function DriverScreen() {
  const router = useRouter();
  const { onUnauthorized } = useAdmin();
  const params = useLocalSearchParams<{ add?: string }>();

  return (
    <AdminDrivers
      key={params.add ? 'add' : 'list'}
      autoAdd={params.add === '1'}
      onUnauthorized={onUnauthorized}
      onOpenInquiry={(i) => router.push({ pathname: '/admin/pesanan', params: { focus: i.id, code: i.inquiryCode } } as any)}
    />
  );
}
