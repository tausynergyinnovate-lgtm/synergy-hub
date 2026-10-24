'use client';

import { useEffect, useState } from 'react';
import { Copy, Plus, RefreshCw } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { Avatar, Badge, Button, Card, PageHeader } from '@/components/ui';
import { LINK_FIELDS, MANAGER_FIELDS } from '@/components/forms';
import { useEditor } from '@/components/useEditor';
import { LINK_KIND } from '@/lib/labels';

export default function TeamPage() {
  const { data, me, setSetting } = useHub();
  const editor = useEditor();
  const [cal, setCal] = useState(data.settings.calendar_id ?? '');
  const [drive, setDrive] = useState(data.settings.drive_root_url ?? '');
  const [copied, setCopied] = useState(false);
  useEffect(() => { setCal(data.settings.calendar_id ?? ''); }, [data.settings.calendar_id]);
  useEffect(() => { setDrive(data.settings.drive_root_url ?? ''); }, [data.settings.drive_root_url]);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const ics = data.settings.ics_token ? `${origin}/api/ics?token=${data.settings.ics_token}` : '';
  const openCount = (id: string) => data.tasks.filter((t) => t.assignee_ids?.includes(id) && t.status !== 'done').length;

  const editManager = (row: Record<string, unknown>, title: string) => editor.open('managers', MANAGER_FIELDS, row, title, (r) => {
    // never let someone lock themselves out
    if (me && r.id === me.id) return { ...r, active: true, email: r.email || me.email };
    return { ...r, email: typeof r.email === 'string' ? r.email.trim().toLowerCase() : r.email };
  });

  return (
    <div className="space-y-5">
      <PageHeader title="צוות והגדרות" subtitle="מי נכנס להאב, והחיבורים ללוח השנה ולדרייב" />

      <Card title="מנהלים" action={<Button onClick={() => editManager({ active: true, color: '#14b8a6', sort: data.managers.length + 1 }, 'מנהל/ת חדש/ה')}><Plus size={14} />הוספה</Button>}>
        <p className="text-xs text-stone-500 mb-2">רק מי שמופיע כאן עם מייל Google ומסומן פעיל יכול להתחבר. ההרשאה מתעדכנת מיד.</p>
        <ul className="divide-y divide-stone-100">
          {data.managers.map((m) => (
            <li key={m.id} className={`py-3 flex flex-wrap items-center gap-x-3 gap-y-1 cursor-pointer hover:bg-stone-50 -mx-2 px-2 rounded-lg ${m.active ? '' : 'opacity-50'}`}
              onClick={() => editManager({ ...m }, `עריכה — ${m.name}`)}>
              <Avatar id={m.id} size={32} />
              <div className="flex-1 min-w-[160px]">
                <div className="text-sm font-medium">{m.name}{me?.id === m.id && <span className="text-stone-400 font-normal"> (אני)</span>}</div>
                <div className="text-xs text-stone-500">{m.role}</div>
              </div>
              <span dir="ltr" className={`text-xs ${m.email ? 'text-stone-500' : 'text-amber-600'}`}>{m.email ?? 'חסר מייל — לא יכול/ה להתחבר'}</span>
              <span className="text-xs text-stone-400 w-16 text-start">{openCount(m.id)} פתוחות</span>
              {!m.active && <Badge>לא פעיל/ה</Badge>}
            </li>
          ))}
        </ul>
        <p className="text-xs text-stone-400 mt-2">מנהל/ת שעזב/ה: מסמנים ״לא פעיל/ה״ במקום למחוק — המשימות וההיסטוריה נשמרות.</p>
      </Card>

      <Card title="לוח השנה של סינרגי">
        <label className="block text-xs font-medium text-stone-500 mb-1">מזהה הלוח (Calendar ID)</label>
        <div className="flex gap-2">
          <input dir="ltr" className="flex-1 min-w-0 rounded-xl border border-stone-200 px-3 py-2 text-sm" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="לדוגמה: name@gmail.com" />
          <Button onClick={() => setSetting('calendar_id', cal.trim())} disabled={cal === (data.settings.calendar_id ?? '')}>שמירה</Button>
        </div>
        <p className="text-xs text-stone-500 mt-1.5">ב-Google Calendar ← הגדרות הלוח ← ״שילוב הלוח״ ← Calendar ID. לוח ראשי של חשבון = כתובת המייל שלו. הלוח מוצג בהאב רק למי שהלוח משותף איתו.</p>

        <div className="mt-5 rounded-xl bg-stone-50 border border-stone-100 p-3">
          <div className="text-sm font-medium">סנכרון אירועי ההאב ללוח</div>
          <p className="text-xs text-stone-500 mt-1">כל האירועים, השלבים והדדליינים מההאב מתפרסמים כפיד. מוסיפים אותו פעם אחת בחשבון של סינרגי: Google Calendar ← ״לוחות שנה אחרים״ ← + ← ״מכתובת URL״ ← מדביקים. גוגל מתעדכן מהפיד כמה פעמים ביום.</p>
          {ics ? (
            <div className="flex gap-2 mt-2">
              <input readOnly dir="ltr" className="flex-1 min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs" value={ics} onFocus={(e) => e.target.select()} />
              <Button className="!py-1.5" onClick={async () => { await navigator.clipboard.writeText(ics); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={13} />{copied ? 'הועתק' : 'העתקה'}</Button>
              <Button variant="ghost" className="!py-1.5" title="יצירת קישור חדש (הישן יפסיק לעבוד)" onClick={() => {
                if (!confirm('ליצור קישור חדש? הלוח שכבר נרשם לקישור הישן יפסיק להתעדכן.')) return;
                const tok = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');
                setSetting('ics_token', tok);
              }}><RefreshCw size={13} /></Button>
            </div>
          ) : <p className="text-xs text-amber-600 mt-2">חסר טוקן — הריצו את seed.sql</p>}
        </div>
      </Card>

      <Card title="דרייב וקישורים" action={<Button onClick={() => editor.open('links', LINK_FIELDS, { kind: 'drive', pinned: true }, 'קישור חדש')}><Plus size={14} />קישור</Button>}>
        <label className="block text-xs font-medium text-stone-500 mb-1">תיקיית השורש של סינרגי בדרייב</label>
        <div className="flex gap-2">
          <input dir="ltr" className="flex-1 min-w-0 rounded-xl border border-stone-200 px-3 py-2 text-sm" value={drive} onChange={(e) => setDrive(e.target.value)} placeholder="לדוגמה: https://drive.google.com/drive/folders/…" />
          <Button onClick={() => setSetting('drive_root_url', drive.trim())} disabled={drive === (data.settings.drive_root_url ?? '')}>שמירה</Button>
        </div>
        <p className="text-xs text-stone-500 mt-1.5">תיקייה לכל פרויקט מגדירים בעמוד הפרויקט (״עריכה״).</p>
        <ul className="divide-y divide-stone-100 mt-4">
          {data.links.filter((l) => !l.project_id).map((l) => (
            <li key={l.id} className="py-2 flex items-center gap-2 text-sm cursor-pointer" onClick={() => editor.open('links', LINK_FIELDS, { ...l }, 'עריכת קישור')}>
              <span className="flex-1 hover:underline">{l.title}</span><span className="text-xs text-stone-400">{LINK_KIND[l.kind]}{l.pinned ? ' · בדף הבית' : ''}</span>
            </li>
          ))}
        </ul>
      </Card>
      {editor.element}
    </div>
  );
}
