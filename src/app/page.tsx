'use client';

import Link from 'next/link';
import { ExternalLink, FolderOpen, Sparkles } from 'lucide-react';
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
  const { data, me, openAi } = useHub();
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
        <p className="text-sm text-stone-500">{dateStr}</p>
        <h1 className="text-2xl font-bold text-stone-900 mt-0.5">{greeting()}{me ? `, ${me.name}` : ''}</h1>
      </div>

      <button onClick={() => openAi()}
        className="w-full flex items-center gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-l from-indigo-50 to-white px-4 py-3.5 text-start hover:border-indigo-300 transition">
        <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0"><Sparkles size={18} /></span>
        <span className="flex-1">
          <span className="block font-medium text-stone-800">על מה עובדים?</span>
          <span className="block text-xs text-stone-500">כתבו בשפה חופשית — העוזר יפרק לתתי־משימות וישבץ אותן בפרויקט ואצל האחראים</span>
        </span>
      </button>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'משימות פתוחות', value: open.length, href: '/tasks' },
          { label: 'באיחור', value: overdue.length, href: '/tasks?view=overdue', warn: overdue.length > 0 },
          { label: 'החלטות ממתינות', value: pendingDecisions, href: '/meetings' },
          { label: 'הוצאות ששולמו', value: ils(spent), href: '/budget' },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-2xl border border-stone-200/80 px-4 py-3 hover:border-stone-300">
            <div className={`text-2xl font-bold tabular-nums ${s.warn ? 'text-red-600' : 'text-stone-900'}`}>{s.value}</div>
            <div className="text-xs text-stone-500 mt-0.5">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5 min-w-0">
          {me && (
            <Card title="המשימות שלי" action={<Link href={`/people/${me.id}`} className="text-xs text-indigo-600 hover:underline">ללוח האישי</Link>}>
              <TaskTree tasks={mine} defaults={{ assignee_ids: [me.id] }} hideDone emptyText="אין לך משימות פתוחות" />
            </Card>
          )}
          {overdue.length > 0 && (
            <Card title={<span className="text-red-600">באיחור — כל הצוות</span>}>
              {overdue.map((t) => <TaskRow key={t.id} task={t} expandable={false} />)}
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5 min-w-0">
          <Card title="14 הימים הקרובים" action={<Link href="/timeline" className="text-xs text-indigo-600 hover:underline">לוח זמנים</Link>}>
            {upcoming.length === 0 && <Empty>אין אירועים או דדליינים בשבועיים הקרובים</Empty>}
            <ul className="space-y-2.5">
              {upcoming.map((u) => {
                const n = daysBetween(today, u.date);
                return (
                  <li key={u.kind + (u.kind === 'event' ? u.e.id : u.t.id)} className="flex items-start gap-3">
                    <div className="w-11 shrink-0 text-center rounded-lg bg-stone-50 border border-stone-100 py-1">
                      <div className="text-sm font-semibold tabular-nums">{fmtDate(u.date)}</div>
                      <div className="text-[10px] text-stone-400">{n === 0 ? 'היום' : n === 1 ? 'מחר' : `עוד ${n}`}</div>
                    </div>
                    {u.kind === 'event' ? (
                      <div className="min-w-0 text-sm">
                        <div className="text-stone-800">{u.e.title}</div>
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
                <a href={data.settings.drive_root_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-stone-50 text-sm">
                  <FolderOpen size={16} className="text-amber-500" />הדרייב של סינרגי
                </a>
              )}
              {pinned.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-stone-50 text-sm">
                  <ExternalLink size={15} className="text-stone-400" /><span className="flex-1">{l.title}</span><span className="text-xs text-stone-400">{LINK_KIND[l.kind]}</span>
                </a>
              ))}
              {!pinned.length && !data.settings.drive_root_url && <Empty>מוסיפים קישורים בעמוד הפרויקט או ב״צוות והגדרות״</Empty>}
            </div>
          </Card>
        </div>
      </div>

      <Card title="פרויקטים" action={<Link href="/projects" className="text-xs text-indigo-600 hover:underline">כל הפרויקטים</Link>}>
        <ProjectGrid />
      </Card>
    </div>
  );
}
