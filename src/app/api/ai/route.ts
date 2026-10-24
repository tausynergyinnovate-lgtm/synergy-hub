import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PLAN_TOOL, type AiPlan } from '@/lib/aiPlan';
import { callTool, simplifySchema } from '@/lib/aiGateway';
import { driveIdsIn, readFile, searchDrive, type DriveFile } from '@/lib/drive';

export const runtime = 'nodejs';
export const maxDuration = 60; // seconds; callTool stops itself at ~50s so we always answer with JSON

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  // Act as the logged-in manager: Row Level Security applies to every read.
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: ok } = await db.rpc('is_manager');
  if (!ok) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });

  const body = (await req.json()) as {
    message: string; projectId?: string; history?: { role: 'user' | 'assistant'; content: string }[]; me?: string;
  };
  if (!body.message?.trim()) return NextResponse.json({ error: 'הודעה ריקה' }, { status: 400 });

  const [managers, projects, tasks, events, contacts, decisions] = await Promise.all([
    db.from('managers').select('id,name,role,active').eq('active', true),
    db.from('projects').select('id,name,description,owner_ids,status,start_date,end_date'),
    db.from('tasks').select('id,title,status,assignee_ids,project_id,parent_id,due_date,priority').neq('status', 'done'),
    db.from('events').select('id,title,kind,start_date,end_date,project_id,owner_ids').gte('start_date', new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)),
    db.from('contacts').select('id,name,org,kind,status,topic,project_id'),
    db.from('decisions').select('id,title,status,project_id').eq('status', 'pending'),
  ]);

  // ── Drive context: pasted links are read directly; otherwise a quick check decides whether to search ──
  const sources: { name: string; url?: string; kind: string }[] = [];
  let driveContext = '';
  try {
    const docs: { file: DriveFile; text: string }[] = [];
    const ids = driveIdsIn(body.message);
    if (ids.length) {
      for (const id of ids) docs.push(await readFile(id));
    } else {
      const projectNames = (projects.data ?? []).map((p: { name: string }) => p.name).join(', ');
      const { args } = await callTool<{ needed: boolean; query: string }>(
        [
          { role: 'system', content: `You decide whether answering a manager's message needs documents from the team's Google Drive (meeting summaries, plans, registration sheets, feedback, presentations, budgets, speaker lists, past cohort material). Projects: ${projectNames}. If yes, give 1-4 short search keywords (Hebrew or English, as the files are likely named). Plain task updates ("finished X", "assign Y to Z") do NOT need Drive.` },
          { role: 'user', content: body.message },
        ],
        { name: 'drive_lookup', description: 'Decide whether to search Drive', parameters: { type: 'object', properties: { needed: { type: 'boolean' }, query: { type: 'string' } }, required: ['needed', 'query'] } },
        200, 12_000,
      );
      if (args.needed && args.query?.trim()) {
        const hits = await searchDrive(args.query, 8);
        hits.forEach((h) => sources.push({ name: h.name, url: h.webViewLink, kind: h.kind }));
        const readable = hits.filter((h) => ['מסמך', 'גיליון', 'מצגת'].includes(h.kind)).slice(0, 2);
        for (const h of readable) docs.push(await readFile(h.id, 8000));
        if (hits.length) driveContext += `\nקבצים שנמצאו בדרייב לחיפוש "${args.query}":\n` + hits.map((h) => `- ${h.name} (${h.kind}) ${h.webViewLink ?? ''}`).join('\n');
      }
    }
    for (const d of docs) {
      if (!sources.some((x) => x.name === d.file.name)) sources.push({ name: d.file.name, url: d.file.webViewLink, kind: d.file.kind });
      driveContext += `\n\n=== קובץ: ${d.file.name} (${d.file.kind}) ${d.file.webViewLink ?? ''} ===\n${d.text}`;
    }
  } catch (e) {
    console.error('[ai] drive context failed:', e);
    driveContext = '\n(הגישה לדרייב נכשלה כרגע — ענה בלי קבצים וציין זאת.)';
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
  const weekday = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long' }).format(new Date());
  const snapshot = {
    today, weekday,
    current_user_manager_id: body.me ?? null,
    focus_project_id: body.projectId ?? null,
    managers: managers.data, projects: projects.data, open_tasks: tasks.data,
    upcoming_events: events.data, contacts: contacts.data, pending_decisions: decisions.data,
  };

  const system = `אתה העוזר שמנהל את Synergy Hub — מערכת הניהול של Synergy Innovate, קהילת יזמות רפואית (medtech) של סטודנטים בפקולטה לרפואה ומדעי הבריאות ע״ש גריי באוניברסיטת תל אביב. המשתמשים הם צוות המנהלים.

התפקיד שלך: המנהלים כותבים בשפה חופשית על מה הם עובדים, מה צריך לקרות, או מדביקים סיכום פגישה — ואתה מפרק את זה לתוכנית עבודה ומשבץ כל פריט במקום הנכון בהאב, דרך הכלי propose_changes. הם יאשרו לפני שמירה.

כללים:
- תמיד ענה דרך הכלי propose_changes. השדה reply בעברית, קצר וישיר.
- משימות: קונקרטיות ובנות ביצוע ("לשלוח מייל הזמנה לד״ר X" ולא "לטפל בדובר"). עבודה עם כמה שלבים = משימת אב + תתי־משימות (parent_ref). אל תשכפל משימות פתוחות שכבר קיימות — אם משהו כבר קיים, הוסף לו תתי־משימות עם parent_ref = id של המשימה הקיימת.
- שיוך אחראים (assignee_ids / owner_ids — מערך): לפי תחומי האחריות (role) של המנהלים. אפשר כמה אחראים למשימה כשזה באמת עבודה משותפת או כשהמשתמש ציין כמה אנשים. אם המשתמש אמר "אני"/"עליי" — current_user_manager_id. אם לא ברור — מערך ריק (כל הצוות) וציין זאת ב-reply.
- פרויקט: שייך לפרויקט קיים מתאים (לפי שם ותיאור). אם focus_project_id קיים — ברירת המחדל היא הפרויקט הזה. צור new_project רק לעבודה רוחבית חדשה באמת.
- תאריכים: YYYY-MM-DD, ביחס ל-today (${today}, יום ${weekday}). תזמן דדליינים לאחור מתאריך היעד (למשל פנייה לדובר 3–4 שבועות לפני, פוסט שיווקי שבוע לפני, תזכורת יום לפני, משוב עד 3 ימים אחרי). אל תמציא תאריך יעד שלא נאמר — אם חסר, שאל ב-reply ותן דדליינים יחסיים סבירים רק למה שתלוי בהווה.
- אירוע עם תאריך (וובינר, מפגש, אירוע, פגישה) → גם ב-events.
- אנשים חדשים שהוזכרו (דוברים, מרצים, שותפים) → contacts; אם כבר קיימים ומצבם השתנה → contact_updates.
- "סיימתי X" / "X בוצע" → task_updates עם status=done למשימה הקיימת.
- שאלה בלבד ("מה פתוח אצל גל?") → ענה ב-reply מהנתונים, בלי שינויים.
- כסף שהוזכר → expenses (בשקלים). החלטות → decisions.
- השתמש רק ב-id-ים שמופיעים בתמונת המצב. אל תמציא id.

- אם מצורף תוכן מהדרייב — השתמש בו כמקור, ציין ב-reply מאיזה קובץ לקחת את המידע. אם לא נמצא קובץ רלוונטי — אמור זאת בפשטות.

תמונת מצב של ההאב (JSON):
${JSON.stringify(snapshot)}
${driveContext ? '\nתוכן מהדרייב של סינרגי (לקריאה בלבד):' + driveContext : ''}`;

  const history = (body.history ?? []).slice(-8);
  try {
    const { args, model } = await callTool<AiPlan>(
      [{ role: 'system', content: system }, ...history.map((h) => ({ role: h.role, content: h.content })), { role: 'user', content: body.message }],
      { name: PLAN_TOOL.name, description: PLAN_TOOL.description, parameters: simplifySchema(PLAN_TOOL.input_schema) as Record<string, unknown> },
      6000, 38_000,
    );
    return NextResponse.json({ plan: { ...args, reply: args.reply ?? '' }, model, sources });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
