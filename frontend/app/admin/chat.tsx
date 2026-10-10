import React from 'react';
import { AdminChat } from '../../components/admin/AdminChat';
import { useAdmin } from '../../components/admin/AdminContext';

export default function ChatScreen() {
  const { onUnauthorized } = useAdmin();
  return <AdminChat onUnauthorized={onUnauthorized} />;
}
