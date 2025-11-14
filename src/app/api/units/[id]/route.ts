import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Unit } from '@/models/Unit';
import { verifyToken } from '@/lib/jwt';

interface Params {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);

    const item = await Unit.findById(params.id);
    if (!item) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!payload.roles?.includes('superadmin')) {
      if (String(item.store || '') !== String(payload.store || '')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(item);
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    const { name, code, factor, base, status } = await req.json();

    const existing = await Unit.findById(params.id);
    if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!payload.roles?.includes('superadmin')) {
      if (String(existing.store || '') !== String(payload.store || '')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const update: any = {};
    if (typeof name !== 'undefined') update.name = name;
    if (typeof code !== 'undefined') update.code = code;
    if (typeof status !== 'undefined') update.status = status;
    if (typeof base !== 'undefined') update.base = Boolean(base);
    if (typeof factor !== 'undefined') update.factor = Number(factor);

    if (update.base === true) {
      await Unit.updateMany({ store: existing.store, base: true }, { $set: { base: false } });
      update.factor = 1;
    }
    if (update.base === false && update.factor <= 0) {
      return NextResponse.json({ message: 'factor must be > 0' }, { status: 400 });
    }

    const updated = await Unit.findByIdAndUpdate(params.id, update, { new: true });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json({ message: 'Code already exists' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);

    const existing = await Unit.findById(params.id);
    if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!payload.roles?.includes('superadmin')) {
      if (String(existing.store || '') !== String(payload.store || '')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await Unit.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
