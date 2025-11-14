import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Unit } from '@/models/Unit';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);

    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const storeParam = url.searchParams.get('store');

    const filter: any = {};
    if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }];

    if (payload.roles?.includes('superadmin')) {
      if (storeParam) filter.store = storeParam;
    } else {
      if (!payload.store) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });
      filter.store = payload.store;
    }

    const items = await Unit.find(filter).sort({ base: -1, createdAt: -1 });
    return NextResponse.json({ items });
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

    const { name, code, factor, base } = await req.json();
    if (!name || !code || typeof factor !== 'number') {
      return NextResponse.json({ message: 'name, code, factor required' }, { status: 400 });
    }

    const data: any = { name, code, factor, base: Boolean(base) };

    if (payload.roles?.includes('superadmin')) {
      const storeParam = req.nextUrl.searchParams.get('store');
      if (storeParam) data.store = storeParam;
    } else {
      if (!payload.store) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });
      data.store = payload.store;
    }

    if (data.base) {
      // ensure only one base per store: unset previous base units
      await Unit.updateMany({ store: data.store, base: true }, { $set: { base: false } });
      data.factor = 1; // base must be factor 1
    } else if (data.factor <= 0) {
      return NextResponse.json({ message: 'factor must be > 0' }, { status: 400 });
    }

    const created = await Unit.create(data);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json({ message: 'Code already exists' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
