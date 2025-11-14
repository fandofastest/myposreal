import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Product } from '@/models/Product';
import { StoreSetting } from '@/models/StoreSetting';
import { productCreateSchema } from '@/lib/validation/product';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);

    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const storeParam = url.searchParams.get('store');

    const filter: any = {};
    if (q) {
      filter.$text = { $search: q };
    }
    if (payload.roles?.includes('superadmin')) {
      if (storeParam) filter.store = storeParam;
    } else {
      if (payload.store) filter.store = payload.store;
      else return NextResponse.json({ message: 'Store scope required' }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Product.find(filter).populate('category', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json({ items, page, limit, total });
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
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Validation error', issues: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data as any;
    if (payload.roles?.includes('superadmin')) {
      if (!data.store && req.nextUrl.searchParams.get('store')) {
        data.store = req.nextUrl.searchParams.get('store');
      }
    } else {
      if (!payload.store) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });
      data.store = payload.store;
    }
    // sanitize optional fields
    if (data.category === '') delete data.category;
    if (typeof data.stock === 'undefined') data.stock = 0;
    if (!data.imageUrl) {
      // prefer store setting, fallback to env
      try {
        if (data.store) {
          const setting = await StoreSetting.findOne({ store: data.store });
          if (setting?.defaultProductImage) {
            data.imageUrl = setting.defaultProductImage;
          }
        }
      } catch {}
      if (!data.imageUrl && process.env.DEFAULT_PRODUCT_IMAGE) {
        data.imageUrl = process.env.DEFAULT_PRODUCT_IMAGE;
      }
    }
    const created = await Product.create(data);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json({ message: 'SKU already exists' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
