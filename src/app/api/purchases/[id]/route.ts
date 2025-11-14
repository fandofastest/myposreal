import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { Purchase } from '@/models/Purchase';
import { Product } from '@/models/Product';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await ctx.params;
    const doc = await Purchase.findById(id).populate('supplier', 'name');
    if (!doc) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(doc);
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
    const roles: string[] = Array.isArray((payload as any)?.roles) ? (payload as any).roles : [];
    const isAdmin = roles.includes('admin') || roles.includes('superadmin');
    if (!isAdmin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const { action, overrides } = body as { action?: string; overrides?: Array<{ productId: string; unitPrices?: Array<{ code: string; price: number; factor?: number }> }> };
    if (action !== 'receive') return NextResponse.json({ message: 'Unsupported action' }, { status: 400 });

    const doc = await Purchase.findById(id);
    if (!doc) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    if (doc.status === 'received') return NextResponse.json({ message: 'Already received' }, { status: 400 });

    // Increase stock and update pricing
    const { StoreSetting } = await import('@/models/StoreSetting');
    const setting = await StoreSetting.findOne({ store: doc.store });
    const overrideMap = new Map<string, { unitPrices?: Array<{ code: string; price: number; factor?: number }> }>();
    if (Array.isArray(overrides)) {
      for (const o of overrides) {
        if (o?.productId) overrideMap.set(String(o.productId), { unitPrices: Array.isArray(o.unitPrices) ? o.unitPrices.filter(u => u && typeof u.code === 'string' && typeof u.price === 'number') : undefined });
      }
    }

    for (const it of (doc.items as any[])) {
      const p = await Product.findById(it.product);
      if (!p) continue;
      if (p.trackStock) {
        p.stock = (p.stock || 0) + (it.qty || 0);
      }
      // update last cost per base unit
      const lastCost = Number(it.cost) || 0;
      p.cost = lastCost;
      // unitPrices override per item (optional)
      const ov = overrideMap.get(String(p._id));
      if (ov?.unitPrices && ov.unitPrices.length) {
        // update unitPrices array, ensuring unique by code
        const map = new Map<string, { code: string; price: number; factor?: number }>();
        for (const up of (p as any).unitPrices || []) {
          if (up?.code) map.set(String(up.code), { code: String(up.code), price: Number(up.price || 0), factor: typeof (up as any).factor === 'number' ? Number((up as any).factor) : undefined });
        }
        for (const up of ov.unitPrices) {
          map.set(String(up.code), { code: String(up.code), price: Math.max(0, Math.round(up.price)), factor: typeof (up as any).factor === 'number' ? Number((up as any).factor) : map.get(String(up.code))?.factor });
        }
        (p as any).unitPrices = Array.from(map.values());
      }
      await p.save();
    }

    doc.status = 'received';
    doc.receivedAt = new Date();
    await doc.save();
    return NextResponse.json(doc);
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
