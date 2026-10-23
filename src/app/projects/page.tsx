'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useHub } from '@/lib/hub';
import { PROJECT_STATUS, fmtDate } from '@/lib/labels';
import { Avatar, Badge, Button, Card, PageHeader, Progress } from '@/components/ui';
import { PROJECT_FIELDS, newSlug } from '@/components/forms';
import { useEditor } from '@/components/useEditor';

export default function ProjectsPage() {
  const { data } = useHub();
  const editor = useEditor();
  const groups = [
    { key: 'active', title: 'פעילים', items: data.projects.filter((p) => p.status === 'active') },
    { key: 'planning', title: 'בתכנון', items: data.projects.filter((p) => p.status === 'planning') },
    { key: 'other', title: 'מושהים והושלמו', items: data.projects.filter((p) => p.status === 'on_hold' || p.status === 'done') },
  ];
  return (
    <div>
      <PageHeader title="פרויקטים רוחביים" subtitle="לכל פרויקט עמוד עם המשימות, הלו״ז, האנשים, ההוצאות והקבצים שלו"
        actions={<Button variant="primary" onClick={() => editor.open('projects', PROJECT_FIELDS,
          { status: 'planning', color: '#0ea5e9', sort: data.projects.length + 1 }, 'פרויקט חדש', (r) => ({ ...r, slug: r.slug ?? newSlug() }))}>
          <Plus size={15} />פרויקט חדש</Button>} />
      <div className="space-y-5">
        {groups.filter((g) => g.items.length).map((g) => (
          <Card key={g.key} title={`${g.title} · ${g.items.length}`}>
            <div className="divide-y divide-stone-100">
              {g.items.map((p) => {
                const ts = data.tasks.filter((t) => t.project_id === p.id);
                const done = ts.filter((t) => t.status === 'done').length;
                const contacts = data.contacts.filter((c) => c.project_id === p.id).length;
                const events = data.events.filter((e) => e.project_id === p.id).length;
                return (
                  <Link key={p.id} href={`/projects/${p.slug}`} className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 py-3 group">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color ?? '#0ea5e9' }} />
                    <div className="flex-1 min-w-[180px]">
                      <div className="font-medium text-stone-800 group-hover:underline">{p.name}</div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {[p.start_date && (p.end_date && p.end_date !== p.start_date ? `${fmtDate(p.start_date, true)}–${fmtDate(p.end_date, true)}` : fmtDate(p.start_date, true)),
                          events && `${events} אירועים`, contacts && `${contacts} אנשי קשר`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="w-32"><Progress done={done} total={ts.length} color={p.color} /></div>
                    <Badge cls={PROJECT_STATUS[p.status].cls}>{PROJECT_STATUS[p.status].label}</Badge>
                    <Avatar id={p.owner_id} size={26} />
                  </Link>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      {editor.element}
    </div>
  );
}
