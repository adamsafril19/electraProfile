import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:8081', 'http://localhost:19006'],
  ADMIN_WHATSAPP_NUMBER: process.env.ADMIN_WHATSAPP_NUMBER || '6281234567890',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/electra_rental?schema=public'
};
