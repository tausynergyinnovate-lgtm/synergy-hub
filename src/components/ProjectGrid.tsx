'use client';

import Link from 'next/link';
import { useHub } from '@/lib/hub';
import { fmtDate, todayISO } from '@/lib/labels';
import { Avatar, Empty, Progress } from './ui';

export function ProjectGrid({ onlyIds }: { onlyIds?: Set<string> }) {
  const { data } = useHub();
  const today = todayISO();
  const projects = data.projects.filter((p) => p.status !== 'done' && (!onlyIds || onlyIds.has(p.id)));
  if (!projects.length) return <Empty>אין פרויקטים פעילים</Empty>;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {projects.map((p) => {
        const ts = data.tasks.filter((t) => t.project_id === p.id);
        const done = ts.filter((t) => t.status === 'done').length;
        const next = ts.filter((t) => t.status !== 'done' && t.due_date).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0];
        const late = ts.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today).length;
        return (
          <Link key={p.id} href={`/projects/${p.slug}`} className="group min-w-0 rounded-xl border border-stone-200 p-3 hover:border-stone-300 hover:shadow-sm transition bg-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color ?? '#0ea5e9' }} />
              <span className="font-medium text-sm flex-1 truncate group-hover:underline">{p.name}</span>
              <Avatar id={p.owner_id} size={22} />
            </div>
            <div className="mt-3"><Progress done={done} total={ts.length} color={p.color} /></div>
            <div className="mt-2 text-xs text-stone-500 truncate min-h-[16px]">
              {late > 0 ? <span className="text-red-600">{late} באיחור</span> : next ? <>הבא: {next.title} · {fmtDate(next.due_date)}</> : ts.length ? 'אין דדליינים קרובים' : 'אין משימות עדיין'}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
