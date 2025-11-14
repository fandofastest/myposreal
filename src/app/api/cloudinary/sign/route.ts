import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function signParams(params: Record<string, any>, apiSecret: string) {
  const sorted = Object.keys(params)
    .filter((k) => typeof params[k] !== 'undefined' && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const toSign = sorted + apiSecret;
  return crypto.createHash('sha1').update(toSign).digest('hex');
}

export async function POST(req: NextRequest) {
  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const API_KEY = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json({ message: 'Cloudinary env not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { folder, public_id, eager, invalidate } = body as { folder?: string; public_id?: string; eager?: string; invalidate?: boolean };
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign: Record<string, any> = { timestamp };
  if (folder) paramsToSign.folder = folder;
  if (public_id) paramsToSign.public_id = public_id;
  if (eager) paramsToSign.eager = eager;
  if (typeof invalidate !== 'undefined') paramsToSign.invalidate = invalidate ? 'true' : 'false';

  const signature = signParams(paramsToSign, API_SECRET);
  return NextResponse.json({ cloudName: CLOUD_NAME, apiKey: API_KEY, timestamp, signature, folder: folder || undefined });
}
