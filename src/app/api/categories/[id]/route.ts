import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Category } from '@/models/Category';
import { categoryUpdateSchema } from '@/lib/validation/category';
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
    const item = await Category.findById(params.id);
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
    const body = await req.json();
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: 'Validation error', issues: parsed.error.flatten() }, { status: 400 });

    const existing = await Category.findById(params.id);
    if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!payload.roles?.includes('superadmin')) {
      if (String(existing.store || '') !== String(payload.store || '')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const updated = await Category.findByIdAndUpdate(params.id, parsed.data, { new: true });
    if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    const existing = await Category.findById(params.id);
    if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!payload.roles?.includes('superadmin')) {
      if (String(existing.store || '') !== String(payload.store || '')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    await Category.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
