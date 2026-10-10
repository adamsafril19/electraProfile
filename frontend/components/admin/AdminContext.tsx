import { createContext, useContext } from 'react';
import { AdminBadges } from '../../services/adminApi';

interface AdminCtx {
  // Dipanggil saat API membalas 401: bersihkan sesi dan tampilkan halaman login
  onUnauthorized: () => void;
  logout: () => void;
  badges: AdminBadges | null;
  refreshBadges: () => void;
  // false bila polling badge terakhir gagal (server tidak terjangkau)
  connected: boolean;
}

export const AdminContext = createContext<AdminCtx>({
  onUnauthorized: () => {},
  logout: () => {},
  badges: null,
  refreshBadges: () => {},
  connected: true,
});

export const useAdmin = () => useContext(AdminContext);
