import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:8081', 'http://localhost:19006'],
  ADMIN_WHATSAPP_NUMBER: process.env.ADMIN_WHATSAPP_NUMBER || '6281234567890',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/electra_rental?schema=public',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  ADMIN_TOKEN_SECRET: process.env.ADMIN_TOKEN_SECRET || '',
  ADMIN_TOKEN_TTL_HOURS: Number(process.env.ADMIN_TOKEN_TTL_HOURS) || 8
};

export const ADMIN_PASSWORD_GENERATED = false;
if (!ENV.ADMIN_TOKEN_SECRET) {
  // Acak per proses: token lama tidak berlaku lagi setelah server restart
  ENV.ADMIN_TOKEN_SECRET = crypto.randomBytes(32).toString('hex');
}
