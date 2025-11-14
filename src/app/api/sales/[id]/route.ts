import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { Sale } from '@/models/Sale';
import { Product } from '@/models/Product';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await ctx.params;
    const sale = await Sale.findById(id).populate('paymentMethod', 'name type').populate('customer', 'name code');
    if (!sale) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(sale);
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
    const body = await req.json().catch(() => ({}));
    const { action, reason } = body as { action?: string; reason?: string };
    if (action !== 'void') return NextResponse.json({ message: 'Unsupported action' }, { status: 400 });
    const roles = Array.isArray((payload as any)?.roles) ? (payload as any).roles : [];
    const isAdmin = roles.includes('admin') || roles.includes('superadmin');
    if (!isAdmin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const sale = await Sale.findById(id);
    if (!sale) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (sale.status === 'voided') return NextResponse.json({ message: 'Already voided' }, { status: 400 });

    // Restock
    for (const it of sale.items as any[]) {
      const p = await Product.findById(it.product);
      if (p && p.trackStock) {
        p.stock = (p.stock || 0) + (it.qty || 0);
        await p.save();
      }
    }

    sale.status = 'voided';
    sale.voidedAt = new Date();
    sale.voidReason = reason || '';
    sale.voidBy = payload.sub as any;
    await sale.save();
    return NextResponse.json(sale);
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
