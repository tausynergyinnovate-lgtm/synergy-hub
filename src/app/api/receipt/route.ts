import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

async function isManager(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const db = createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data } = await db.rpc('is_manager');
  return Boolean(data);
}
const admin = () => createClient(URL_, SERVICE, { auth: { persistSession: false } });

// Upload a receipt → returns its storage path
export async function POST(req: Request) {
  if (!(await isManager(req))) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'לא התקבל קובץ' }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'אפשר להעלות תמונה או PDF בלבד' }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'הקובץ גדול מ-4MB' }, { status: 400 });
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin().storage.from('receipts').upload(path, file, { contentType: file.type });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path });
}

// Short-lived link to view a receipt
export async function GET(req: Request) {
  if (!(await isManager(req))) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  const path = new globalThis.URL(req.url).searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'חסר path' }, { status: 400 });
  const { data, error } = await admin().storage.from('receipts').createSignedUrl(path, 600);
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ url: data.signedUrl });
}

// Remove a receipt file
export async function DELETE(req: Request) {
  if (!(await isManager(req))) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  const path = new globalThis.URL(req.url).searchParams.get('path');
  if (path) await admin().storage.from('receipts').remove([path]);
  return NextResponse.json({ ok: true });
}
