import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { Purchase } from '@/models/Purchase';
import { Supplier } from '@/models/Supplier';
import { Product } from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    const isSuper = Array.isArray(payload?.roles) && payload.roles.includes('superadmin');

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (isSuper && searchParams.get('store')) filter.store = searchParams.get('store');
    else if (payload.store) filter.store = payload.store;

    const [items, total] = await Promise.all([
      Purchase.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('supplier', 'name'),
      Purchase.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, limit });
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
    const body = await req.json();

    const { supplierId, items, discount, note } = body as { supplierId: string; items: Array<{ productId: string; cost: number; qty: number; unitName?: string; conversionToBase?: number }>; discount?: number; note?: string };
    if (!supplierId || !Array.isArray(items) || items.length === 0) return NextResponse.json({ message: 'Invalid data' }, { status: 400 });

    let storeId: any = payload.store;
    const isSuper = Array.isArray(payload?.roles) && payload.roles.includes('superadmin');
    if (isSuper) {
      const s = req.nextUrl.searchParams.get('store');
      if (!s) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });
      storeId = s;
    }
    if (!storeId) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });

    const prodIds = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: prodIds }, store: storeId });
    if (products.length !== items.length) return NextResponse.json({ message: 'Some products not found' }, { status: 400 });

    const purchaseItems = items.map(i => {
      const p = products.find(pp => String(pp._id) === i.productId) as any;
      const qtyPurchase = Math.max(1, Number(i.qty || 1));
      const costPerPurchase = Math.max(0, Number(i.cost || 0));
      const conv = Math.max(1, Number(i.conversionToBase || 1));
      const qtyBase = qtyPurchase * conv;
      const costPerBase = conv > 0 ? costPerPurchase / conv : costPerPurchase;
      return { product: p._id, name: p.name, sku: p.sku, cost: costPerBase, qty: qtyBase, subtotal: costPerBase * qtyBase };
    });
    const subtotal = purchaseItems.reduce((a, b) => a + b.subtotal, 0);

    // tax & discount
    const { StoreSetting } = await import('@/models/StoreSetting');
    const setting = await StoreSetting.findOne({ store: storeId });
    const rate = typeof setting?.taxRate === 'number' ? setting.taxRate : 0;
    const inclusive = Boolean(setting?.taxInclusive);
    const disc = Math.max(0, typeof discount === 'number' ? discount : 0);
    const base = Math.max(0, subtotal - disc);
    let tax = 0; let total = 0;
    if (rate > 0) {
      if (inclusive) { tax = +(base * (rate / (100 + rate))).toFixed(0); total = base; }
      else { tax = +((base * rate) / 100).toFixed(0); total = base + tax; }
    } else { total = base; }

    const created = await Purchase.create({ store: storeId, supplier: supplier._id, items: purchaseItems, subtotal, discount: disc, tax, total, note, status: 'draft' });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
