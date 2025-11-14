import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Store } from '@/models/Store';
import { verifyToken } from '@/lib/jwt';

interface Params { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload.roles?.includes('superadmin')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const store = await Store.findById(params.id);
    if (!store) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(store);
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload.roles?.includes('superadmin')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const update: any = {};
    const { name, code, address, phone, status } = body as any;
    if (typeof name !== 'undefined') update.name = name;
    if (typeof code !== 'undefined') update.code = code;
    if (typeof address !== 'undefined') update.address = address;
    if (typeof phone !== 'undefined') update.phone = phone;
    if (typeof status !== 'undefined') update.status = status;

    const updated = await Store.findByIdAndUpdate(params.id, update, { new: true });
    if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === 11000) return NextResponse.json({ message: 'Name or code already exists' }, { status: 409 });
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload.roles?.includes('superadmin')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const deleted = await Store.findByIdAndDelete(params.id);
    if (!deleted) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
