import React from 'react';
import { AdminFleet } from '../../components/admin/AdminFleet';
import { useAdmin } from '../../components/admin/AdminContext';

export default function ArmadaScreen() {
  const { onUnauthorized } = useAdmin();
  return <AdminFleet onUnauthorized={onUnauthorized} />;
}
