import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Store } from '@/models/Store';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload.roles?.includes('superadmin')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const store = req.nextUrl.searchParams.get('store');
    const q: any = {};
    if (store) q.store = store;
    const users = await User.find(q).sort({ createdAt: -1 });
    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload.roles?.includes('superadmin')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { name, email, password, storeId, roles } = body as { name: string; email: string; password: string; storeId?: string; roles?: string[] };
    if (!name || !email || !password) return NextResponse.json({ message: 'Name, email, and password are required' }, { status: 400 });

    const existing = await User.findOne({ email });
    if (existing) return NextResponse.json({ message: 'Email already in use' }, { status: 409 });

    let storeDoc = null as any;
    if (storeId) {
      storeDoc = await Store.findById(storeId);
      if (!storeDoc) return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      roles: roles && roles.length ? roles : ['admin'],
      status: 'active',
      store: storeDoc ? storeDoc._id : null,
    });

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, roles: user.roles, store: user.store } }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
