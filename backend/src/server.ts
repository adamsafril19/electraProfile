import app from './app';
import { ENV } from './config/env';
import { checkDatabaseConnection } from './config/database';

const server = app.listen(ENV.PORT, async () => {
  console.log(`⚡ [Electra Backend] Server berjalan di http://localhost:${ENV.PORT}`);
  console.log(`🌱 [Environment] Mode: ${ENV.NODE_ENV}`);
  console.log(`🔌 [WhatsApp Admin Target] ${ENV.ADMIN_WHATSAPP_NUMBER}`);
  console.log(`🚗 [API Endpoints]:`);
  console.log(`   - GET  /api/v1/health`);
  console.log(`   - GET  /api/v1/fleet`);
  console.log(`   - GET  /api/v1/fleet/:slug`);
  console.log(`   - POST /api/v1/inquiries`);
  console.log(`   - POST /api/v1/soc/handover`);
  console.log(`   - POST /api/v1/soc/return`);

  // Verifikasi koneksi PostgreSQL
  await checkDatabaseConnection();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal diterima: menutup HTTP server');
  server.close(() => {
    console.log('HTTP server ditutup');
  });
});
