import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Product } from '@/models/Product';
import { productUpdateSchema } from '@/lib/validation/product';
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

    const item = await Product.findById(params.id);
    if (!item) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!payload.roles?.includes('superadmin')) {
      if (String(item.store || '') !== String(payload.store || '')) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
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
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Validation error', issues: parsed.error.flatten() }, { status: 400 });
    }
    const existing = await Product.findById(params.id);
    if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!payload.roles?.includes('superadmin')) {
      if (String(existing.store || '') !== String(payload.store || '')) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }
    const updated = await Product.findByIdAndUpdate(params.id, parsed.data, { new: true });
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
    const existing = await Product.findById(params.id);
    if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!payload.roles?.includes('superadmin')) {
      if (String(existing.store || '') !== String(payload.store || '')) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }
    const deleted = await Product.findByIdAndDelete(params.id);
    if (!deleted) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
