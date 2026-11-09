'use client';

import Link from 'next/link';
import { AlertCircle, CircleDot, ExternalLink, FolderOpen, Scale, Wallet } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { EVENT_KIND, LINK_KIND, addDays, daysBetween, fmtDate, ils, todayISO } from '@/lib/labels';
import { Badge, Card, Empty, ProjectLink } from '@/components/ui';
import { TaskRow, TaskTree, sortTasks } from '@/components/tasks';
import { ProjectGrid } from '@/components/ProjectGrid';

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 21 ? 'ערב טוב' : 'לילה טוב';
}

export default function Dashboard() {
  const { data, me } = useHub();
  const today = todayISO();
  const in14 = addDays(today, 14);
  const open = data.tasks.filter((t) => t.status !== 'done');
  const overdue = sortTasks(open.filter((t) => t.due_date && t.due_date < today));
  const mine = data.tasks.filter((t) => me && t.assignee_ids?.includes(me.id));
  const upcoming = [
    ...data.events.filter((e) => (e.end_date ?? e.start_date) >= today && e.start_date <= in14).map((e) => ({ kind: 'event' as const, date: e.start_date < today ? today : e.start_date, e })),
    ...open.filter((t) => t.due_date && t.due_date >= today && t.due_date <= in14 && !t.parent_id).map((t) => ({ kind: 'task' as const, date: t.due_date!, t })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));
  const spent = data.expenses.filter((x) => x.status !== 'planned').reduce((s, x) => s + Number(x.amount), 0);
  const pendingDecisions = data.decisions.filter((d) => d.status === 'pending').length;
  const pinned = data.links.filter((l) => l.pinned);
  const dateStr = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-stone-500">{dateStr}</p>
        <h1 className="text-[1.875rem] leading-tight font-bold tracking-tight text-stone-900 mt-0.5">{greeting()}{me ? `, ${me.name}` : ''}</h1>
      </div>

      {/* status at a glance: tappable, quiet, and never color-only */}
      <nav aria-label="תמונת מצב" className="flex flex-wrap gap-2">
        {[
          { label: 'פתוחות', value: open.length, href: '/tasks', icon: CircleDot },
          { label: 'באיחור', value: overdue.length, href: '/tasks?view=overdue', icon: AlertCircle, warn: overdue.length > 0 },
          { label: 'החלטות ממתינות', value: pendingDecisions, href: '/meetings', icon: Scale },
          { label: 'שולמו', value: ils(spent), href: '/budget', icon: Wallet },
        ].map(({ label, value, href, icon: Icon, warn }) => (
          <Link key={label} href={href}
            className={`press inline-flex items-center gap-2 rounded-full bg-surface ps-3 pe-4 min-h-tap text-sm ${warn ? 'text-signal' : 'text-stone-700'}`}>
            <Icon size={17} aria-hidden className={warn ? '' : 'text-stone-500'} />
            <span className="font-semibold tabular-nums">{value}</span>{label}
          </Link>
        ))}
      </nav>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5 min-w-0">
          {me && (
            <Card title="המשימות שלי" action={<Link href={`/people/${me.id}`} className="text-sm text-link hover:underline py-2">ללוח האישי</Link>}>
              <TaskTree tasks={mine} defaults={{ assignee_ids: [me.id] }} hideDone emptyText="אין לך משימות פתוחות" />
            </Card>
          )}
          {overdue.length > 0 && (
            <Card title={<span className="text-signal inline-flex items-center gap-1.5"><AlertCircle size={18} aria-hidden />באיחור — כל הצוות</span>}>
              {overdue.map((t) => <TaskRow key={t.id} task={t} expandable={false} />)}
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5 min-w-0">
          <Card title="14 הימים הקרובים" action={<Link href="/timeline" className="text-sm text-link hover:underline py-2">לוח זמנים</Link>}>
            {upcoming.length === 0 && <Empty>אין אירועים או דדליינים בשבועיים הקרובים</Empty>}
            <ul className="space-y-2.5">
              {upcoming.map((u) => {
                const n = daysBetween(today, u.date);
                return (
                  <li key={u.kind + (u.kind === 'event' ? u.e.id : u.t.id)} className="flex items-start gap-3">
                    <div className="w-12 shrink-0 text-center rounded-xl bg-stone-100 py-1.5">
                      <div className="text-sm font-semibold tabular-nums">{fmtDate(u.date)}</div>
                      <div className="text-[0.6875rem] text-stone-500">{n === 0 ? 'היום' : n === 1 ? 'מחר' : `עוד ${n}`}</div>
                    </div>
                    {u.kind === 'event' ? (
                      <div className="min-w-0 text-[0.9375rem] pt-0.5">
                        <div className="text-stone-900">{u.e.title}</div>
                        <div className="flex items-center gap-2 mt-0.5"><Badge cls={EVENT_KIND[u.e.kind].cls}>{EVENT_KIND[u.e.kind].label}</Badge><ProjectLink id={u.e.project_id} plain /></div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0"><TaskRow task={u.t} expandable={false} /></div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="קישורים מהירים">
            <div className="space-y-1">
              {data.settings.drive_root_url && (
                <a href={data.settings.drive_root_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-2 min-h-tap -mx-2 hover:bg-stone-100 text-[0.9375rem]">
                  <FolderOpen size={16} className="text-amber-500" />הדרייב של סינרגי
                </a>
              )}
              {pinned.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-2 min-h-tap -mx-2 hover:bg-stone-100 text-[0.9375rem]">
                  <ExternalLink size={15} className="text-stone-400" /><span className="flex-1">{l.title}</span><span className="text-xs text-stone-400">{LINK_KIND[l.kind]}</span>
                </a>
              ))}
              {!pinned.length && !data.settings.drive_root_url && <Empty>מוסיפים קישורים בעמוד הפרויקט או ב״צוות והגדרות״</Empty>}
            </div>
          </Card>
        </div>
      </div>

      <Card title="פרויקטים" action={<Link href="/projects" className="text-sm text-link hover:underline py-2">כל הפרויקטים</Link>}>
        <ProjectGrid />
      </Card>
    </div>
  );
}
