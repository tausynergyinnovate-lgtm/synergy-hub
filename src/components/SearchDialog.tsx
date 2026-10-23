'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CalendarRange, CheckSquare, FolderKanban, Notebook, Search, User, Users } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { fmtDate } from '@/lib/labels';
import { Modal } from './ui';

type Hit = { key: string; icon: typeof Search; title: string; sub?: string; go: () => void };

export function SearchDialog() {
  const { searchOpen, setSearchOpen, data, openTask, project } = useHub();
  const router = useRouter();
  const [q, setQ] = useState('');

  const hits = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const has = (...xs: (string | null | undefined)[]) => xs.some((x) => x?.toLowerCase().includes(s));
    const nav = (href: string) => () => { setSearchOpen(false); router.push(href); };
    const out: Hit[] = [];
    data.projects.filter((p) => has(p.name, p.description)).forEach((p) =>
      out.push({ key: 'p' + p.id, icon: FolderKanban, title: p.name, sub: 'פרויקט', go: nav(`/projects/${p.slug}`) }));
    data.managers.filter((m) => has(m.name, m.role)).forEach((m) =>
      out.push({ key: 'm' + m.id, icon: User, title: m.name, sub: m.role ?? 'מנהל/ת', go: nav(`/people/${m.id}`) }));
    data.tasks.filter((t) => has(t.title, t.notes)).slice(0, 12).forEach((t) =>
      out.push({ key: 't' + t.id, icon: CheckSquare, title: t.title, sub: ['משימה', project(t.project_id)?.name, t.status === 'done' ? 'בוצע' : ''].filter(Boolean).join(' · '),
        go: () => { setSearchOpen(false); openTask(t.id); } }));
    data.events.filter((e) => has(e.title, e.notes)).forEach((e) =>
      out.push({ key: 'e' + e.id, icon: CalendarRange, title: e.title, sub: 'לוח זמנים · ' + fmtDate(e.start_date, true), go: nav('/timeline') }));
    data.contacts.filter((c) => has(c.name, c.org, c.topic)).forEach((c) =>
      out.push({ key: 'c' + c.id, icon: Users, title: c.name, sub: ['איש קשר', c.org, c.topic].filter(Boolean).join(' · '), go: nav(`/contacts?id=${c.id}`) }));
    data.meetings.filter((m) => has(m.title, m.notes)).forEach((m) =>
      out.push({ key: 'g' + m.id, icon: Notebook, title: m.title, sub: 'פגישה · ' + fmtDate(m.date, true), go: nav('/meetings') }));
    data.decisions.filter((d) => has(d.title, d.proposal)).forEach((d) =>
      out.push({ key: 'd' + d.id, icon: Notebook, title: d.title, sub: 'החלטה', go: nav('/meetings') }));
    return out.slice(0, 30);
  }, [q, data, router, setSearchOpen, openTask, project]);

  return (
    <Modal open={searchOpen} onClose={() => { setSearchOpen(false); setQ(''); }} title="חיפוש">
      <div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
        <Search size={16} className="text-stone-400" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="פרויקט, משימה, איש קשר, אירוע…"
          className="flex-1 text-sm focus:outline-none bg-transparent"
          onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) { hits[0].go(); setQ(''); } }} />
      </div>
      <div className="mt-3 max-h-[60vh] overflow-y-auto">
        {q && hits.length === 0 && <p className="text-sm text-stone-400 p-2">לא נמצא כלום</p>}
        {hits.map(({ key, icon: Icon, title, sub, go }) => (
          <button key={key} onClick={() => { go(); setQ(''); }} className="w-full flex items-center gap-3 text-start rounded-xl px-2 py-2 hover:bg-stone-50">
            <Icon size={16} className="text-stone-400 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm text-stone-800 truncate">{title}</span>
              {sub && <span className="block text-xs text-stone-400 truncate">{sub}</span>}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
