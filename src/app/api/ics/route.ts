import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// iCalendar feed of hub events + task deadlines.
// Google Calendar subscribes to it ("From URL"), so everything in the hub shows up in Synergy's calendar.

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const day = (iso: string) => iso.slice(0, 10).replace(/-/g, '');
const nextDay = (iso: string) => { const d = new Date(iso.slice(0, 10) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return day(d.toISOString()); };
// fold lines to 75 octets as RFC 5545 asks
const fold = (line: string) => {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 74) return line;
  const out: string[] = []; let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch, 'utf8') > 73) { out.push(cur); cur = ' '; }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
};

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response('ICS feed not configured (SUPABASE_SERVICE_ROLE_KEY missing)', { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: setting } = await db.from('settings').select('value').eq('key', 'ics_token').single();
  if (!token || !setting?.value || token !== setting.value) return new Response('Forbidden', { status: 403 });

  const [{ data: events }, { data: tasks }, { data: projects }, { data: managers }] = await Promise.all([
    db.from('events').select('*'),
    db.from('tasks').select('id,title,due_date,assignee_ids,project_id,status,parent_id').not('due_date', 'is', null).neq('status', 'done').is('parent_id', null),
    db.from('projects').select('id,name'),
    db.from('managers').select('id,name'),
  ]);
  const pName = (id: string | null) => projects?.find((p) => p.id === id)?.name;
  const mName = (id: string | null) => managers?.find((m) => m.id === id)?.name;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const origin = new URL(req.url).origin;

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Synergy Innovate//Synergy Hub//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Synergy Hub', 'X-WR-TIMEZONE:Asia/Jerusalem', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
  ];
  for (const e of events ?? []) {
    const desc = [e.notes, pName(e.project_id) && `פרויקט: ${pName(e.project_id)}`, (e.owner_ids?.length ? `אחראים: ${e.owner_ids.map(mName).filter(Boolean).join(', ')}` : ''), origin + '/timeline'].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT', `UID:event-${e.id}@synergy-hub`, `DTSTAMP:${stamp}`);
    if (e.start_time) {
      const t = String(e.start_time).slice(0, 5).replace(':', '') + '00';
      lines.push(`DTSTART;TZID=Asia/Jerusalem:${day(e.start_date)}T${t}`, 'DURATION:PT1H30M');
    } else {
      lines.push(`DTSTART;VALUE=DATE:${day(e.start_date)}`, `DTEND;VALUE=DATE:${nextDay(e.end_date ?? e.start_date)}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(desc)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    lines.push('END:VEVENT');
  }
  for (const t of tasks ?? []) {
    const who = (t.assignee_ids ?? []).map(mName).filter(Boolean).join(', ') || 'צוות';
    lines.push('BEGIN:VEVENT', `UID:task-${t.id}@synergy-hub`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(t.due_date)}`, `DTEND;VALUE=DATE:${nextDay(t.due_date)}`,
      `SUMMARY:${esc(`☐ ${t.title} (${who})`)}`,
      `DESCRIPTION:${esc([pName(t.project_id) && `פרויקט: ${pName(t.project_id)}`, origin + '/tasks'].filter(Boolean).join('\n'))}`,
      'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');

  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
