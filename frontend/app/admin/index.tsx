import React from 'react';
import { useRouter } from 'expo-router';
import { AdminDashboard } from '../../components/admin/AdminDashboard';
import { useAdmin } from '../../components/admin/AdminContext';

export default function AdminHome() {
  const router = useRouter();
  const { onUnauthorized } = useAdmin();

  return (
    <AdminDashboard
      onUnauthorized={onUnauthorized}
      onNavigate={(path) => router.push(path as any)}
      onOpenInquiry={(inq) => router.push({ pathname: '/admin/pesanan', params: { focus: inq.id, code: inq.inquiryCode } } as any)}
    />
  );
}
