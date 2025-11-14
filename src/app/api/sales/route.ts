import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { Sale } from '@/models/Sale';
import { Product } from '@/models/Product';
import { PaymentMethod } from '@/models/PaymentMethod';

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

    // Optional server-side filters
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from || to) {
      filter.createdAt = {} as any;
      if (from) (filter.createdAt as any).$gte = new Date(from);
      if (to) {
        const t = new Date(to);
        // include the whole day if only date is passed
        if (to.length <= 10) t.setHours(23,59,59,999);
        (filter.createdAt as any).$lte = t;
      }
    }
    const cashier = searchParams.get('cashier');
    if (cashier) filter.cashier = cashier;
    const paymentMethod = searchParams.get('paymentMethod');
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    const customer = searchParams.get('customer');
    if (customer) filter.customer = customer;

    const [items, total] = await Promise.all([
      Sale.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('paymentMethod', 'name type')
        .populate('cashier', 'name email')
        .populate('customer', 'name'),
      Sale.countDocuments(filter),
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

    const { items, paymentMethodId, customerId, amountPaid, discount } = body as { items: Array<{ productId: string; qty: number; unitCode?: string }>; paymentMethodId: string; customerId?: string; amountPaid?: number; discount?: number };
    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ message: 'Items required' }, { status: 400 });

    let storeId: any = payload.store;
    const isSuper = Array.isArray(payload?.roles) && payload.roles.includes('superadmin');
    if (isSuper) {
      const s = req.nextUrl.searchParams.get('store');
      if (!s) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });
      storeId = s;
    }
    if (!storeId) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });

    const pm = await PaymentMethod.findById(paymentMethodId);
    if (!pm || String(pm.store) !== String(storeId)) return NextResponse.json({ message: 'Invalid payment method' }, { status: 400 });

    // Build sale items and verify stock
    const prodIds = items.map((i) => i.productId);
    const uniqueIds = Array.from(new Set(prodIds));
    const products = await Product.find({ _id: { $in: uniqueIds }, store: storeId });
    if (products.length !== uniqueIds.length) return NextResponse.json({ message: 'Some products not found' }, { status: 400 });

    const saleItems = items.map((i) => {
      const p = products.find((pp) => String(pp._id) === i.productId)! as any;
      const unitCode = i.unitCode as string | undefined;
      if (!unitCode) throw new Error('unitCode required for each item');
      const up = Array.isArray((p as any).unitPrices) ? (p as any).unitPrices.find((u: any) => u.code === unitCode) : null;
      if (!up) throw new Error(`Missing unit config for ${p.name} (${unitCode})`);
      const factor = Math.max(1, Math.round(Number((up as any).factor || 1)));
      const qtyBase = Math.max(1, Math.round(Number(i.qty || 1) * factor));
      if (!up || typeof up.price !== 'number' || up.price <= 0) throw new Error(`Missing unit price for ${p.name} (${unitCode})`);
      const pricePerBase = Math.max(0, Math.round(Number(up.price) / factor));
      return {
        product: p._id,
        name: p.name,
        sku: p.sku,
        price: pricePerBase,
        qty: qtyBase,
        subtotal: pricePerBase * qtyBase,
      };
    });
    const subtotal = saleItems.reduce((a, b) => a + b.subtotal, 0);
    // load store tax setting
    const { StoreSetting } = await import('@/models/StoreSetting');
    const setting = await StoreSetting.findOne({ store: storeId });
    const rate = typeof setting?.taxRate === 'number' ? setting.taxRate : 0;
    const inclusive = Boolean(setting?.taxInclusive);
    const disc = Math.max(0, typeof discount === 'number' ? discount : 0);
    const preTaxBase = Math.max(0, subtotal - disc);
    let tax = 0;
    let total = 0;
    if (rate > 0) {
      if (inclusive) {
        tax = +(preTaxBase * (rate / (100 + rate))).toFixed(0);
        total = preTaxBase;
      } else {
        tax = +((preTaxBase * rate) / 100).toFixed(0);
        total = preTaxBase + tax;
      }
    } else {
      tax = 0;
      total = preTaxBase;
    }

    // Deduct stock for products with trackStock
    for (const it of items) {
      const p = products.find((pp) => String(pp._id) === it.productId) as any;
      if (p?.trackStock) {
        if (!it.unitCode) return NextResponse.json({ message: 'unitCode required for each item' }, { status: 400 });
        const up = Array.isArray((p as any).unitPrices) ? (p as any).unitPrices.find((u: any) => u.code === it.unitCode) : null;
        if (!up) return NextResponse.json({ message: `Missing unit config for ${p.name} (${it.unitCode})` }, { status: 400 });
        const factor = Math.max(1, Math.round(Number((up as any).factor || 1)));
        const qtyBase = Math.max(1, Math.round(Number(it.qty || 1) * factor));
        const newStock = (p.stock || 0) - qtyBase;
        if (newStock < 0) return NextResponse.json({ message: `Stock not enough for ${p.name}` }, { status: 400 });
        p.stock = newStock;
        await p.save();
      }
    }

    let paid = undefined as number | undefined;
    let change = undefined as number | undefined;
    if (pm.type === 'cash') {
      const paidNum = typeof amountPaid === 'number' ? amountPaid : NaN;
      if (!isFinite(paidNum)) return NextResponse.json({ message: 'amountPaid required for cash' }, { status: 400 });
      if (paidNum < total) return NextResponse.json({ message: 'Amount paid is less than total' }, { status: 400 });
      paid = paidNum;
      change = +(paidNum - total).toFixed(2);
    }

    const sale = await Sale.create({
      store: storeId,
      items: saleItems,
      subtotal,
      discount: disc,
      tax,
      total,
      paymentMethod: pm._id,
      paymentType: pm.type,
      customer: customerId || null,
      cashier: payload.sub,
      amountPaid: paid,
      change,
      paidAt: new Date(),
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
