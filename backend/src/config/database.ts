import { PrismaClient } from '@prisma/client';
import { ENV } from './env';

// Inisialisasi Prisma Client singleton
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ENV.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (ENV.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Helper untuk verifikasi koneksi database
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ [Database] Berhasil terhubung ke PostgreSQL database.');
    return true;
  } catch (error: any) {
    console.warn('⚠️ [Database Warning] Tidak dapat terhubung ke PostgreSQL:', error.message);
    console.warn('ℹ️ [Database Notice] Menggunakan runtime fallback in-memory data untuk memastikan API tetap online.');
    return false;
  }
};
