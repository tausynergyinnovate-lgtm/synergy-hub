'use client';

import { useParams } from 'next/navigation';
import { useHub } from '@/lib/hub';
import { CONTACT_STATUS, EVENT_KIND, addDays, fmtDate, todayISO } from '@/lib/labels';
import { Avatar, Badge, Card, Empty, ProjectLink } from '@/components/ui';
import { QuickAdd, TaskRow, sortTasks } from '@/components/tasks';
import { ProjectGrid } from '@/components/ProjectGrid';

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const { data, manager, me } = useHub();
  const m = manager(id);
  if (!m) return <div className="text-stone-500 py-10 text-center">לא נמצא</div>;

  const today = todayISO();
  const week = addDays(today, 7);
  const mine = data.tasks.filter((t) => t.assignee_id === m.id);
  const open = sortTasks(mine.filter((t) => t.status !== 'done'));
  const overdue = open.filter((t) => t.due_date && t.due_date < today);
  const thisWeek = open.filter((t) => t.due_date && t.due_date >= today && t.due_date <= week);
  const later = open.filter((t) => !t.due_date || t.due_date > week);
  const doneRecent = mine.filter((t) => t.status === 'done' && t.completed_at && t.completed_at.slice(0, 10) >= addDays(today, -14))
    .sort((a, b) => ((a.completed_at ?? '') < (b.completed_at ?? '') ? 1 : -1));
  const projectIds = new Set([...data.projects.filter((p) => p.owner_id === m.id).map((p) => p.id), ...open.map((t) => t.project_id).filter(Boolean) as string[]]);
  const events = data.events.filter((e) => e.owner_id === m.id && (e.end_date ?? e.start_date) >= today).sort((a, b) => (a.start_date < b.start_date ? -1 : 1)).slice(0, 8);
  const contacts = data.contacts.filter((c) => c.owner_id === m.id && c.status !== 'done');
  // team-wide tasks nobody owns, shown to everyone as "up for grabs"
  const team = sortTasks(data.tasks.filter((t) => !t.assignee_id && t.status !== 'done' && !t.parent_id));

  const group = (title: string, items: typeof open, cls?: string) => items.length ? (
    <div className="mb-3">
      <div className={`text-xs font-semibold mb-0.5 ${cls ?? 'text-stone-400'}`}>{title} · {items.length}</div>
      {items.map((t) => <TaskRow key={t.id} task={t} showAssignee={false} expandable={!t.parent_id} />)}
    </div>
  ) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar id={m.id} size={56} />
        <div>
          <h1 className="text-2xl font-bold">{me?.id === m.id ? 'הלוח שלי' : `הלוח של ${m.name}`}</h1>
          <p className="text-sm text-stone-500">{m.role}</p>
          <p className="text-xs text-stone-400 mt-0.5">{open.length} פתוחות{overdue.length ? ` · ${overdue.length} באיחור` : ''} · {doneRecent.length} הושלמו בשבועיים האחרונים</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <Card title="משימות" className="lg:col-span-3">
          <QuickAdd defaults={{ assignee_id: m.id }} placeholder={`משימה חדשה ל${m.name}…`} />
          {open.length === 0 && <Empty>אין משימות פתוחות</Empty>}
          {group('באיחור', overdue, 'text-red-600')}
          {group('השבוע', thisWeek, 'text-orange-600')}
          {group('בהמשך', later)}
          {group('הושלם לאחרונה', doneRecent, 'text-emerald-600')}
        </Card>

        <div className="lg:col-span-2 space-y-5 min-w-0">
          <Card title="אירועים באחריות">
            {events.length === 0 && <Empty>אין</Empty>}
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="text-sm flex items-start gap-2">
                  <span className="text-xs tabular-nums text-stone-500 w-10 pt-0.5">{fmtDate(e.start_date)}</span>
                  <span className="flex-1">{e.title}<span className="flex items-center gap-2 mt-0.5"><Badge cls={EVENT_KIND[e.kind].cls}>{EVENT_KIND[e.kind].label}</Badge><ProjectLink id={e.project_id} plain /></span></span>
                </li>
              ))}
            </ul>
          </Card>
          {contacts.length > 0 && (
            <Card title="אנשי קשר באחריות">
              <ul className="space-y-1.5">
                {contacts.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm"><span className="flex-1">{c.name}</span><Badge cls={CONTACT_STATUS[c.status]?.cls}>{CONTACT_STATUS[c.status]?.label}</Badge></li>
                ))}
              </ul>
            </Card>
          )}
          {team.length > 0 && (
            <Card title="משימות צוות פתוחות" action={<span className="text-xs text-stone-400">בלי אחראי — אפשר לקחת</span>}>
              {team.slice(0, 8).map((t) => <TaskRow key={t.id} task={t} expandable={false} />)}
            </Card>
          )}
        </div>
      </div>

      <Card title="הפרויקטים">
        <ProjectGrid onlyIds={projectIds} />
      </Card>
    </div>
  );
}
