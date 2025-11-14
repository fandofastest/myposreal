import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { Supplier } from '@/models/Supplier';
import { supplierCreateSchema } from '@/lib/validation/supplier';

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

    const filter: any = {};
    if (isSuper && searchParams.get('store')) filter.store = searchParams.get('store');
    else if (payload.store) filter.store = payload.store;

    if (q) filter.$text = { $search: q };

    const [items, total] = await Promise.all([
      Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Supplier.countDocuments(filter),
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
    const parsed = supplierCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: 'Invalid data', errors: parsed.error.flatten() }, { status: 400 });
    const data: any = parsed.data;

    if (isSuper) {
      if (!data.store && req.nextUrl.searchParams.get('store')) data.store = req.nextUrl.searchParams.get('store');
    } else {
      if (!payload.store) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });
      data.store = payload.store;
    }

    const created = await Supplier.create(data);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === 11000) return NextResponse.json({ message: 'Code already exists' }, { status: 409 });
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
