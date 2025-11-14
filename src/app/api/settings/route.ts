import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { StoreSetting } from '@/models/StoreSetting';

function getScope(req: NextRequest, payload: any) {
  const isSuper = Array.isArray(payload?.roles) && payload.roles.includes('superadmin');
  let store: string | null = null;
  if (isSuper) {
    store = req.nextUrl.searchParams.get('store');
  } else {
    store = payload?.store || null;
  }
  return { isSuper, store };
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    const { store } = getScope(req, payload);
    if (!store) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });

    const setting = await StoreSetting.findOne({ store });
    return NextResponse.json({ setting: setting || null });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    const { store } = getScope(req, payload);
    if (!store) return NextResponse.json({ message: 'Store scope required' }, { status: 400 });

    const body = await req.json();
    const { defaultProductImage, defaultCategoryImage, logoUrl, receiptHeader, receiptFooter, taxRate, taxInclusive, defaultMarginPct } = body as {
      defaultProductImage?: string;
      defaultCategoryImage?: string;
      logoUrl?: string;
      receiptHeader?: string;
      receiptFooter?: string;
      taxRate?: number;
      taxInclusive?: boolean;
      defaultMarginPct?: number;
    };

    const update: any = {};
    if (typeof defaultProductImage !== 'undefined') update.defaultProductImage = defaultProductImage || undefined;
    if (typeof defaultCategoryImage !== 'undefined') update.defaultCategoryImage = defaultCategoryImage || undefined;
    if (typeof logoUrl !== 'undefined') update.logoUrl = logoUrl || undefined;
    if (typeof receiptHeader !== 'undefined') update.receiptHeader = receiptHeader || undefined;
    if (typeof receiptFooter !== 'undefined') update.receiptFooter = receiptFooter || undefined;
    if (typeof taxRate !== 'undefined') update.taxRate = typeof taxRate === 'number' ? taxRate : undefined;
    if (typeof taxInclusive !== 'undefined') update.taxInclusive = Boolean(taxInclusive);
    if (typeof defaultMarginPct !== 'undefined') update.defaultMarginPct = typeof defaultMarginPct === 'number' ? defaultMarginPct : undefined;

    const setting = await StoreSetting.findOneAndUpdate(
      { store },
      { $set: update, $setOnInsert: { store } },
      { new: true, upsert: true }
    );

    return NextResponse.json({ setting });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e?.message }, { status: 500 });
  }
}
