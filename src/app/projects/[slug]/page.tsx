'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink, FolderOpen, Pencil, Plus, Sparkles } from 'lucide-react';
import { useHub } from '@/lib/hub';
import {
  CONTACT_KIND, CONTACT_STATUS, DECISION_STATUS, EVENT_KIND, EXPENSE_STATUS, LINK_KIND, PROJECT_STATUS, fmtDate, ils, todayISO,
} from '@/lib/labels';
import { Avatar, Badge, Button, Card, Empty, PersonLink, Progress } from '@/components/ui';
import { TaskTree } from '@/components/tasks';
import { openReceipt } from '@/components/Receipt';
import { useEditor } from '@/components/useEditor';
import {
  CONTACT_FIELDS, DECISION_FIELDS, EVENT_FIELDS, EXPENSE_FIELDS, LINK_FIELDS, PROJECT_FIELDS, driveFolderId,
} from '@/components/forms';

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, openAi, manager } = useHub();
  const editor = useEditor();
  const p = data.projects.find((x) => x.slug === decodeURIComponent(slug));
  if (!p) return <div className="text-stone-500 py-10 text-center">הפרויקט לא נמצא. <Link className="text-indigo-600 underline" href="/projects">לכל הפרויקטים</Link></div>;

  const today = todayISO();
  const tasks = data.tasks.filter((t) => t.project_id === p.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  const late = tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today).length;
  const events = data.events.filter((e) => e.project_id === p.id).sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  const contacts = data.contacts.filter((c) => c.project_id === p.id);
  const expenses = data.expenses.filter((x) => x.project_id === p.id);
  const spent = expenses.filter((x) => x.status !== 'planned').reduce((s, x) => s + Number(x.amount), 0);
  const planned = expenses.filter((x) => x.status === 'planned').reduce((s, x) => s + Number(x.amount), 0);
  const decisions = data.decisions.filter((d) => d.project_id === p.id);
  const links = data.links.filter((l) => l.project_id === p.id);
  const folderId = driveFolderId(p.drive_url);
  // people involved: owner + task assignees + event owners + contact owners
  const peopleIds = Array.from(new Set([p.owner_id, ...tasks.map((t) => t.assignee_id), ...events.map((e) => e.owner_id), ...contacts.map((c) => c.owner_id)].filter(Boolean))) as string[];

  const addBtn = (onClick: () => void, label = 'הוספה') => (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"><Plus size={13} />{label}</button>
  );

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden">
        <div className="h-1.5" style={{ background: p.color ?? '#0ea5e9' }} />
        <div className="p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[220px]">
              <Link href="/projects" className="text-xs text-stone-400 hover:underline">פרויקטים</Link>
              <h1 className="text-2xl font-bold text-stone-900 mt-0.5">{p.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-stone-600">
                <Badge cls={PROJECT_STATUS[p.status].cls}>{PROJECT_STATUS[p.status].label}</Badge>
                {p.owner_id ? <PersonLink id={p.owner_id} /> : <span className="text-stone-400">ללא אחראי</span>}
                {p.start_date && <span className="text-stone-500">{fmtDate(p.start_date, true)}{p.end_date && p.end_date !== p.start_date ? ` – ${fmtDate(p.end_date, true)}` : ''}</span>}
                {p.drive_url && <a href={p.drive_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stone-600 hover:underline"><FolderOpen size={15} className="text-amber-500" />דרייב</a>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => editor.open('projects', PROJECT_FIELDS, { ...p }, 'עריכת פרויקט')}><Pencil size={14} />עריכה</Button>
              <Button variant="primary" onClick={() => openAi({ projectId: p.id })}><Sparkles size={15} />פירוק עם AI</Button>
            </div>
          </div>
          {p.description && <p className="text-sm text-stone-600 mt-3 whitespace-pre-wrap">{p.description}</p>}
          <div className="grid grid-cols-3 gap-4 mt-4 max-w-xl">
            <div><div className="text-xs text-stone-500 mb-1">התקדמות</div><Progress done={done} total={tasks.length} color={p.color} /></div>
            <div><div className="text-xs text-stone-500">באיחור</div><div className={`font-semibold tabular-nums ${late ? 'text-red-600' : ''}`}>{late}</div></div>
            <div><div className="text-xs text-stone-500">הוצא{planned ? ' / מתוכנן' : ''}</div><div className="font-semibold tabular-nums">{ils(spent)}{planned ? <span className="text-stone-400 font-normal"> / {ils(planned)}</span> : ''}</div></div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* main column */}
        <div className="lg:col-span-3 space-y-5 min-w-0">
          <Card title="משימות ותתי־משימות" action={<span className="text-xs text-stone-400">לחיצה על משימה פותחת אותה · החץ פותח תתי־משימות</span>}>
            <TaskTree tasks={tasks} defaults={{ project_id: p.id, assignee_id: p.owner_id }} showProject={false} emptyText="אין משימות פתוחות. הוסיפו כאן או בקשו מהעוזר לפרק את הפרויקט." />
          </Card>

          <Card title="לו״ז הפרויקט" action={addBtn(() => editor.open('events', EVENT_FIELDS, { kind: 'event', project_id: p.id, owner_id: p.owner_id }, 'אירוע / שלב חדש'))}>
            {events.length === 0 && <Empty>אין אירועים או שלבים</Empty>}
            <ol className="relative border-s-2 border-stone-100 ms-2 space-y-3">
              {events.map((e) => {
                const past = (e.end_date ?? e.start_date) < today;
                return (
                  <li key={e.id} className="ps-4 relative cursor-pointer group" onClick={() => editor.open('events', EVENT_FIELDS, { ...e }, 'עריכת אירוע')}>
                    <span className={`absolute -start-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${past ? 'bg-stone-300' : ''}`} style={past ? {} : { background: p.color ?? '#0ea5e9' }} />
                    <div className={`text-sm ${past ? 'text-stone-400' : 'text-stone-800'} group-hover:underline`}>{e.title}</div>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                      <Badge cls={EVENT_KIND[e.kind].cls}>{EVENT_KIND[e.kind].label}</Badge>
                      {fmtDate(e.start_date, true)}{e.end_date ? ` – ${fmtDate(e.end_date, true)}` : ''}{e.start_time ? ` · ${e.start_time.slice(0, 5)}` : ''}
                      {e.owner_id && <Avatar id={e.owner_id} size={18} />}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          {folderId && (
            <Card title="קבצים בדרייב" action={<a href={p.drive_url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"><ExternalLink size={12} />פתיחה בדרייב</a>}>
              <iframe title="Drive" src={`https://drive.google.com/embeddedfolderview?id=${folderId}#list`} className="w-full h-72 rounded-xl border border-stone-100" />
              <p className="text-xs text-stone-400 mt-2">מוצג רק למי שהתיקייה משותפת איתו ומחובר לגוגל בדפדפן.</p>
            </Card>
          )}
        </div>

        {/* side column */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <Card title="אנשים">
            <div className="flex flex-wrap gap-2 mb-3">
              {peopleIds.length === 0 && <span className="text-sm text-stone-400">עוד לא שויכו מנהלים</span>}
              {peopleIds.map((id) => (
                <Link key={id} href={`/people/${id}`} className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 border border-stone-100 ps-1 pe-2.5 py-0.5 text-sm hover:bg-stone-100">
                  <Avatar id={id} size={22} />{manager(id)?.name}
                  {id === p.owner_id && <span className="text-[10px] text-stone-400">אחראי/ת</span>}
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-stone-400">אנשי קשר · {contacts.length}</span>
              {addBtn(() => editor.open('contacts', CONTACT_FIELDS, { kind: 'speaker', status: 'not_contacted', project_id: p.id }, 'איש קשר חדש'))}
            </div>
            {contacts.length === 0 && <Empty>אין אנשי קשר</Empty>}
            <ul className="divide-y divide-stone-100">
              {contacts.map((c) => (
                <li key={c.id} className="py-2 cursor-pointer group" onClick={() => editor.open('contacts', CONTACT_FIELDS, { ...c }, c.name)}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-800 flex-1 group-hover:underline">{c.name}{c.org && <span className="text-stone-400"> · {c.org}</span>}</span>
                    <Badge cls={CONTACT_STATUS[c.status]?.cls}>{CONTACT_STATUS[c.status]?.label}</Badge>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">{CONTACT_KIND[c.kind]}{c.topic && ` · ${c.topic}`}{c.owner_id && <Avatar id={c.owner_id} size={16} />}</div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="הוצאות" action={addBtn(() => editor.open('expenses', EXPENSE_FIELDS, { status: 'planned', category: 'אחר', project_id: p.id, date: today }, 'הוצאה חדשה'))}>
            {expenses.length === 0 && <Empty>אין הוצאות</Empty>}
            <ul className="divide-y divide-stone-100">
              {expenses.map((x) => (
                <li key={x.id} className="py-2 flex items-center gap-2 text-sm cursor-pointer hover:bg-stone-50 -mx-2 px-2 rounded-lg" onClick={() => editor.open('expenses', EXPENSE_FIELDS, { ...x }, 'עריכת הוצאה')}>
                  <span className="flex-1">{x.title}<span className="block text-xs text-stone-400">{x.category}{x.date && ` · ${fmtDate(x.date, true)}`}</span></span>
                  {x.receipt_path && <button onClick={(e) => { e.stopPropagation(); openReceipt(x.receipt_path!); }} className="text-xs text-emerald-700 hover:underline">קבלה</button>}
                  <Badge cls={EXPENSE_STATUS[x.status].cls}>{EXPENSE_STATUS[x.status].label}</Badge>
                  <span className="tabular-nums font-medium w-20 text-start">{ils(Number(x.amount))}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="החלטות" action={addBtn(() => editor.open('decisions', DECISION_FIELDS, { status: 'pending', project_id: p.id }, 'החלטה חדשה'))}>
            {decisions.length === 0 && <Empty>אין החלטות</Empty>}
            <ul className="space-y-2">
              {decisions.map((d) => (
                <li key={d.id} className="flex items-start gap-2 text-sm cursor-pointer" onClick={() => editor.open('decisions', DECISION_FIELDS, { ...d }, 'עריכת החלטה')}>
                  <Badge cls={DECISION_STATUS[d.status].cls}>{DECISION_STATUS[d.status].label}</Badge>
                  <span className="hover:underline">{d.title}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="קישורים" action={addBtn(() => editor.open('links', LINK_FIELDS, { kind: 'doc', project_id: p.id, pinned: false }, 'קישור חדש'))}>
            {links.length === 0 && !p.drive_url && <Empty>מסמכים, טפסים וגיליונות של הפרויקט</Empty>}
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.id} className="flex items-center gap-2 text-sm group">
                  <ExternalLink size={14} className="text-stone-400" />
                  <a href={l.url} target="_blank" rel="noreferrer" className="flex-1 hover:underline">{l.title}</a>
                  <span className="text-xs text-stone-400">{LINK_KIND[l.kind]}</span>
                  <button onClick={() => editor.open('links', LINK_FIELDS, { ...l }, 'עריכת קישור')} className="opacity-0 group-hover:opacity-100 text-stone-400"><Pencil size={12} /></button>
                </li>
              ))}
            </ul>
            {!p.drive_url && <button onClick={() => editor.open('projects', PROJECT_FIELDS, { ...p }, 'עריכת פרויקט')} className="text-xs text-stone-500 hover:underline mt-2">+ קישור תיקיית דרייב לפרויקט</button>}
          </Card>
        </div>
      </div>
      {editor.element}
    </div>
  );
}
