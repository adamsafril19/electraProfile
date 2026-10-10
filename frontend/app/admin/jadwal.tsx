import React from 'react';
import { useRouter } from 'expo-router';
import { AdminSchedule } from '../../components/admin/AdminSchedule';
import { useAdmin } from '../../components/admin/AdminContext';

export default function JadwalScreen() {
  const router = useRouter();
  const { onUnauthorized } = useAdmin();

  return (
    <AdminSchedule
      onUnauthorized={onUnauthorized}
      onOpenInquiry={(e) => router.push({ pathname: '/admin/pesanan', params: { focus: e.id, code: e.inquiryCode } } as any)}
    />
  );
}
