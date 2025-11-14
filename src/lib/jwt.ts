import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET or NEXTAUTH_SECRET in environment variables');
}

export interface JwtPayloadCustom {
  sub: string; // user id
  email: string;
  roles: string[];
  store?: string | null;
}

export function signToken(payload: JwtPayloadCustom, expiresIn: string = '7d') {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayloadCustom & jwt.JwtPayload;
}
