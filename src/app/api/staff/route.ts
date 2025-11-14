import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    const isSuper = Array.isArray(payload?.roles) && payload.roles.includes('superadmin');

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const filter: any = { roles: { $in: ['staff'] } };
    if (isSuper && searchParams.get('store')) filter.store = searchParams.get('store');
    else if (payload.store) filter.store = payload.store;

    if (q) filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];

    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-passwordHash'),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    const isSuper = Array.isArray(payload?.roles) && payload.roles.includes('superadmin');

    const body = await req.json();
    const { name, email, password } = body as { name: string; email: string; password: string };
    if (!name || !email || !password) return NextResponse.json({ message: 'Invalid data' }, { status: 400 });

    const data: any = { name, email, roles: ['staff'] };
    if (isSuper) {
      const store = req.nextUrl.searchParams.get('store');
      if (!store) return NextResponse.json({ message: 'Store is required' }, { status: 400 });
      data.store = store;
    } else {
      if (!payload.store) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });
      data.store = payload.store;
    }

    const existing = await User.findOne({ email });
    if (existing) return NextResponse.json({ message: 'Email already exists' }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await User.create({ ...data, passwordHash });
    return NextResponse.json({ _id: created._id, name: created.name, email: created.email, roles: created.roles, store: created.store }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
