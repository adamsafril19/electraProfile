import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/errorHandler';

import path from 'path';

const app = express();

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti mobile apps, Postman) atau origin dalam daftar ENV
      if (!origin || ENV.CORS_ORIGIN.includes(origin) || ENV.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Origin tidak diizinkan oleh CORS'));
      }
    },
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Assets (Vehicle Cutout Images)
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// API Base Routes
app.use('/api/v1', apiRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
