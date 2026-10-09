// Tanggal ditulis dalam format YYYY-MM-DD berdasarkan zona waktu lokal perangkat
// (toISOString memakai UTC dan bisa menggeser tanggal satu hari).
export const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayStr = (): string => toDateStr(new Date());

export const addDaysStr = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

export const isValidDateStr = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

export const isPastDateStr = (value: string): boolean => value < todayStr();

export const formatDateId = (value: string): string => {
  if (!isValidDateStr(value)) return value;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const getDateError = (value: string): string | null => {
  if (!value.trim()) return 'Tanggal mulai sewa wajib diisi.';
  if (!isValidDateStr(value)) return 'Format tanggal tidak valid (YYYY-MM-DD).';
  if (isPastDateStr(value)) return 'Tanggal mulai tidak boleh sebelum hari ini.';
  return null;
};
