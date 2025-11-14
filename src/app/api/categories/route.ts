import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Category } from '@/models/Category';
import { StoreSetting } from '@/models/StoreSetting';
import { categoryCreateSchema } from '@/lib/validation/category';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);

    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const storeParam = url.searchParams.get('store');

    const filter: any = {};
    if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }];

    if (payload.roles?.includes('superadmin')) {
      if (storeParam) filter.store = storeParam;
    } else {
      if (!payload.store) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });
      filter.store = payload.store;
    }

    const items = await Category.find(filter).populate('parent', 'name').sort({ createdAt: -1 });
    return NextResponse.json({ items });
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
    const parsed = categoryCreateSchema.safeParse(body);
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

    if (data.parent) {
      const parentExists = await Category.findById(data.parent);
      if (!parentExists) return NextResponse.json({ message: 'Parent not found' }, { status: 404 });
    }

    if (!data.imageUrl) {
      try {
        if (data.store) {
          const setting = await StoreSetting.findOne({ store: data.store });
          if (setting?.defaultCategoryImage) {
            data.imageUrl = setting.defaultCategoryImage;
          }
        }
      } catch {}
      if (!data.imageUrl && process.env.DEFAULT_CATEGORY_IMAGE) {
        data.imageUrl = process.env.DEFAULT_CATEGORY_IMAGE;
      }
    }

    const created = await Category.create(data);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json({ message: 'Code already exists' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
