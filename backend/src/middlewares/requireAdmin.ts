import { Request, Response, NextFunction } from 'express';
import { AdminAuth } from '../services/adminAuth';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !AdminAuth.verifyToken(token)) {
    return res.status(401).json({ success: false, message: 'Sesi admin tidak valid atau sudah berakhir. Silakan login kembali.' });
  }
  next();
};
