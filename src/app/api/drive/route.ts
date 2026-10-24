import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { folderIdFromUrl, listFolder, searchDrive } from '@/lib/drive';

export const runtime = 'nodejs';

async function isManager(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data } = await db.rpc('is_manager');
  return Boolean(data);
}

// GET /api/drive?folder=<folder url or id>  |  /api/drive?q=<search>
export async function GET(req: Request) {
  if (!(await isManager(req))) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  try {
    const folder = sp.get('folder');
    if (folder) {
      const id = folderIdFromUrl(folder) ?? folder;
      return NextResponse.json({ files: await listFolder(id) });
    }
    const q = sp.get('q');
    if (q) return NextResponse.json({ files: await searchDrive(q, 15) });
    return NextResponse.json({ error: 'חסר folder או q' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const notShared = /404|notFound/i.test(msg);
    return NextResponse.json({ error: notShared ? 'התיקייה לא משותפת עם הבוט של ההאב' : msg }, { status: notShared ? 404 : 500 });
  }
}
