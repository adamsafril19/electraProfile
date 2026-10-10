const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

// Operasional di Indonesia: "hari ini" dihitung dalam WIB, bukan UTC server
export const dateWib = (d: Date = new Date()): string => new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);

export const addDaysStr = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const isValidDateStr = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// Rentang setengah terbuka [start, end): unit yang kembali tanggal X bisa disewa lagi mulai tanggal X
export const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean =>
  aStart < bEnd && bStart < aEnd;
