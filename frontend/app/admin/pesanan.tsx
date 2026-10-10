import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AdminInquiries } from '../../components/admin/AdminInquiries';
import { useAdmin } from '../../components/admin/AdminContext';
import type { InquiryFlag, InquiryStatus } from '../../services/adminApi';

const STATUSES: InquiryStatus[] = ['PENDING_WHATSAPP', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const FLAGS: InquiryFlag[] = ['unpaid', 'needDriver', 'overdue'];

export default function PesananScreen() {
  const { onUnauthorized } = useAdmin();
  const params = useLocalSearchParams<{ focus?: string; code?: string; status?: string; flags?: string }>();
  const focus = params.focus && params.code ? { id: String(params.focus), code: String(params.code) } : null;
  const status = STATUSES.find((s) => s === params.status) || null;
  const flags = String(params.flags || '')
    .split(',')
    .filter((f): f is InquiryFlag => (FLAGS as string[]).includes(f));

  // key memaksa pemuatan ulang saat berpindah dari halaman lain dengan filter/fokus berbeda
  return (
    <AdminInquiries
      key={`${focus?.id || 'all'}|${status || ''}|${flags.join(',')}`}
      onUnauthorized={onUnauthorized}
      focus={focus}
      initialStatus={status}
      initialFlags={flags}
    />
  );
}
