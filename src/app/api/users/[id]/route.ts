import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { User } from '@/models/User';

interface Params { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload.roles?.includes('superadmin')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const user = await User.findById(params.id);
    if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(user);
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
    const { name, email, roles, status, store } = body as any;
    if (typeof name !== 'undefined') update.name = name;
    if (typeof email !== 'undefined') update.email = email;
    if (typeof roles !== 'undefined') update.roles = roles;
    if (typeof status !== 'undefined') update.status = status;
    if (typeof store !== 'undefined') update.store = store || null;

    const updated = await User.findByIdAndUpdate(params.id, update, { new: true });
    if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === 11000) return NextResponse.json({ message: 'Email already exists' }, { status: 409 });
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

    const deleted = await User.findByIdAndDelete(params.id);
    if (!deleted) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
