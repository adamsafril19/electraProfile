import crypto from 'crypto';
import { ENV } from '../config/env';

const b64 = (input: Buffer | string) => Buffer.from(input).toString('base64url');

const sign = (payload: string): string =>
  crypto.createHmac('sha256', ENV.ADMIN_TOKEN_SECRET).update(payload).digest('base64url');

// Bandingkan lewat hash agar panjang input tidak bocor dan perbandingan konstan-waktu
const safeEqual = (a: string, b: string): boolean => {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export class AdminAuth {
  public static isEnabled(): boolean {
    return !!ENV.ADMIN_PASSWORD;
  }

  public static checkCredentials(username: string, password: string): boolean {
    if (!AdminAuth.isEnabled()) return false;
    // Dua perbandingan selalu dijalankan agar waktu respons tidak membedakan username salah/benar
    const userOk = safeEqual(username, ENV.ADMIN_USERNAME);
    const passOk = safeEqual(password, ENV.ADMIN_PASSWORD);
    return userOk && passOk;
  }

  public static issueToken(username: string): { token: string; expiresAt: string } {
    const exp = Date.now() + ENV.ADMIN_TOKEN_TTL_HOURS * 60 * 60 * 1000;
    const payload = b64(JSON.stringify({ sub: username, exp }));
    return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(exp).toISOString() };
  }

  public static verifyToken(token: string): { sub: string; exp: number } | null {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    if (!safeEqual(signature, sign(payload))) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
      return data;
    } catch {
      return null;
    }
  }
}
