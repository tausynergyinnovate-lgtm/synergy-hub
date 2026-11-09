import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Free Supabase projects pause after 7 days without activity.
// A Vercel cron (vercel.json) and a GitHub Action both hit this daily so the hub never goes to sleep.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: 'not configured' }, { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  const { error } = await db.from('settings').upsert({ key: 'last_keepalive', value: now });
  const { count } = await db.from('managers').select('id', { count: 'exact', head: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true, at: now, managers: count });
}
