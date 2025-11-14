import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    return NextResponse.json({ user: { id: payload.sub, email: payload.email, roles: payload.roles, store: payload.store ?? null } });
  } catch (e: any) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
