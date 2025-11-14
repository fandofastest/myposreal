import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { CustomerGroup } from '@/models/CustomerGroup';
import { z } from 'zod';

const groupUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

function hasAccess(payload: any, doc: any) {
  const isSuper = Array.isArray(payload?.roles) && payload.roles.includes('superadmin');
  if (isSuper) return true;
  if (!payload?.store) return false;
  return String(doc.store) === String(payload.store);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const doc = await CustomerGroup.findById(params.id);
    if (!doc) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);

    const doc = await CustomerGroup.findById(params.id);
    if (!doc) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!hasAccess(payload, doc)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = groupUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: 'Invalid data', errors: parsed.error.flatten() }, { status: 400 });

    Object.assign(doc, parsed.data);
    await doc.save();
    return NextResponse.json(doc);
  } catch (e: any) {
    if (e?.code === 11000) return NextResponse.json({ message: 'Code already exists' }, { status: 409 });
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);

    const doc = await CustomerGroup.findById(params.id);
    if (!doc) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!hasAccess(payload, doc)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await doc.deleteOne();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
