import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { callTool } from '@/lib/aiGateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/ai/health?token=<calendar feed token from Team & Settings> — one tiny AI call to confirm the gateway works
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data } = await db.from('settings').select('value').eq('key', 'ics_token').single();
  if (!token || token !== data?.value) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const { args, model } = await callTool<{ ok: boolean; word: string }>(
      [{ role: 'user', content: 'Reply via the tool: ok=true and the Hebrew word for "hello".' }],
      { name: 'ping', description: 'health check', parameters: { type: 'object', properties: { ok: { type: 'boolean' }, word: { type: 'string' } }, required: ['ok', 'word'] } },
      100,
    );
    return NextResponse.json({ ok: true, model, args });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
