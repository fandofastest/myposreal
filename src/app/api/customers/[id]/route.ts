import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { Customer } from '@/models/Customer';
import { customerUpdateSchema } from '@/lib/validation/customer';

function hasAccess(payload: any, customer: any) {
  const isSuper = Array.isArray(payload?.roles) && payload.roles.includes('superadmin');
  if (isSuper) return true;
  if (!payload?.store) return false;
  return String(customer.store) === String(payload.store);
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await ctx.params;
    const customer = await Customer.findById(id);
    if (!customer) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(customer);
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);

    const { id } = await ctx.params;
    const customer = await Customer.findById(id);
    if (!customer) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!hasAccess(payload, customer)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = customerUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: 'Invalid data', errors: parsed.error.flatten() }, { status: 400 });

    Object.assign(customer, parsed.data);
    await customer.save();
    return NextResponse.json(customer);
  } catch (e: any) {
    if (e?.code === 11000) return NextResponse.json({ message: 'Code already exists' }, { status: 409 });
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);

    const { id } = await ctx.params;
    const customer = await Customer.findById(id);
    if (!customer) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (!hasAccess(payload, customer)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await customer.deleteOne();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
