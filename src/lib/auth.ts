import { NextRequest } from 'next/server';
import { verifyToken, JwtPayloadCustom } from './jwt';

export interface AuthContext {
  user: JwtPayloadCustom | null;
}

export function getAuthHeader(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const [, token] = auth.split(' ');
  return token || null;
}

export function requireAuth(req: NextRequest) {
  const token = getAuthHeader(req);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return payload;
  } catch {
    return null;
  }
}
