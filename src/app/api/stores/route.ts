import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Store } from '@/models/Store';
import { verifyToken } from '@/lib/jwt';

export async function GET() {
  try {
    await connectToDatabase();
    const stores = await Store.find().sort({ createdAt: -1 });
    return NextResponse.json({ stores });
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
    const { name, code, address, phone, status } = body as { name: string; code: string; address?: string; phone?: string; status?: 'active' | 'disabled' };
    if (!name || !code) return NextResponse.json({ message: 'Name and code are required' }, { status: 400 });

    const exists = await Store.findOne({ $or: [{ code }, { name }] });
    if (exists) return NextResponse.json({ message: 'Store with same name or code already exists' }, { status: 409 });

    const store = await Store.create({ name, code, address, phone, status: status || 'active' });
    return NextResponse.json({ store }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
