'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, Plus } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { EVENT_KIND, MONTHS_HE, fmtDate, gcalLink, todayISO } from '@/lib/labels';
import { Avatars, Badge, Button, Card, Empty, PageHeader, Pills, ProjectLink } from '@/components/ui';
import { EVENT_FIELDS } from '@/components/forms';
import { useEditor } from '@/components/useEditor';

type View = 'gantt' | 'list' | 'calendar';

const t = (d: string) => Date.parse(d + 'T12:00:00Z') / 864e5;

export default function TimelinePage() {
  const { data, project } = useHub();
  const editor = useEditor();
  const [view, setView] = useState<View>('gantt');
  const today = todayISO();
  const events = [...data.events].sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  const calId = data.settings.calendar_id;

  // ── gantt geometry ──
  const all = events.flatMap((e) => [e.start_date, e.end_date ?? e.start_date]).concat(today);
  const minD = all.reduce((a, b) => (a < b ? a : b), today);
  const maxD = all.reduce((a, b) => (a > b ? a : b), today);
  const start = minD.slice(0, 8) + '01';
  const endMonth = new Date(maxD + 'T12:00:00Z'); endMonth.setUTCMonth(endMonth.getUTCMonth() + 1, 1);
  const end = endMonth.toISOString().slice(0, 10);
  const span = t(end) - t(start);
  const pct = (d: string) => ((t(d) - t(start)) / span) * 100;
  const months: string[] = [];
  for (let d = new Date(start + 'T12:00:00Z'); d.toISOString().slice(0, 10) < end; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.toISOString().slice(0, 10));

  // group rows by project (in project order), unassigned last
  const groups = [...data.projects.map((p) => ({ p, rows: events.filter((e) => e.project_id === p.id) })), { p: null, rows: events.filter((e) => !e.project_id || !project(e.project_id)) }]
    .filter((g) => g.rows.length);

  return (
    <div>
      <PageHeader title="לוח זמנים" subtitle="שלבים, אירועים ודדליינים של השנה — מסונכרנים ללוח של סינרגי"
        actions={<>
          <Pills value={view} onChange={setView} options={[{ value: 'gantt', label: 'גאנט' }, { value: 'list', label: 'רשימה' }, { value: 'calendar', label: 'לוח Google' }]} />
          <Button variant="primary" onClick={() => editor.open('events', EVENT_FIELDS, { kind: 'event', start_date: today }, 'אירוע / שלב חדש')}><Plus size={15} />חדש</Button>
        </>} />

      {view === 'gantt' && (
        <Card>
          {events.length === 0 ? <Empty>אין אירועים עדיין</Empty> : (
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[200px_1fr] text-xs text-stone-500 border-b border-stone-100 pb-1.5">
                  <div />
                  <div className="relative h-5">
                    {months.map((m) => (
                      <span key={m} className="absolute top-0" style={{ insetInlineStart: `${pct(m)}%` }}>{MONTHS_HE[Number(m.slice(5, 7)) - 1]}{m.slice(5, 7) === '01' ? ` ${m.slice(2, 4)}` : ''}</span>
                    ))}
                  </div>
                </div>
                {groups.map(({ p, rows }) => (
                  <div key={p?.id ?? 'none'} className="border-b border-stone-100 last:border-0 py-1.5">
                    <div className="text-xs font-semibold text-stone-400 py-1">{p ? <ProjectLink id={p.id} /> : 'כללי'}</div>
                    {rows.map((e) => {
                      const color = project(e.project_id)?.color ?? '#64748b';
                      const point = !e.end_date || e.end_date === e.start_date;
                      const past = (e.end_date ?? e.start_date) < today;
                      return (
                        <div key={e.id} className="grid grid-cols-[200px_1fr] items-center h-8 group cursor-pointer" onClick={() => editor.open('events', EVENT_FIELDS, { ...e }, 'עריכה')}>
                          <div className={`text-sm truncate pe-3 ${past ? 'text-stone-400' : 'text-stone-700'} group-hover:underline`}>{e.title}</div>
                          <div className="relative h-full">
                            {months.map((m) => <span key={m} className="absolute top-0 bottom-0 border-s border-stone-100" style={{ insetInlineStart: `${pct(m)}%` }} />)}
                            <span className="absolute top-0 bottom-0 border-s-2 border-dashed border-red-300" style={{ insetInlineStart: `${pct(today)}%` }} />
                            {point ? (
                              <span title={fmtDate(e.start_date, true)} className="absolute top-1/2 w-3.5 h-3.5 rotate-45 -translate-y-1/2 rounded-[3px]"
                                style={{ insetInlineStart: `calc(${pct(e.start_date)}% - 7px)`, background: color, opacity: past ? 0.4 : 1 }} />
                            ) : (
                              <span title={`${fmtDate(e.start_date, true)} – ${fmtDate(e.end_date, true)}`} className="absolute top-1/2 -translate-y-1/2 h-4 rounded-full"
                                style={{ insetInlineStart: `${pct(e.start_date)}%`, width: `${Math.max(pct(e.end_date!) - pct(e.start_date), 0.8)}%`, background: color, opacity: past ? 0.35 : 0.85 }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-stone-400 mt-3">הקו האדום המקווקו = היום. לחיצה על שורה פותחת עריכה.</p>
        </Card>
      )}

      {view === 'list' && (
        <Card>
          {events.length === 0 && <Empty>אין אירועים</Empty>}
          <ul className="divide-y divide-stone-100">
            {events.map((e) => {
              const past = (e.end_date ?? e.start_date) < today;
              return (
                <li key={e.id} className={`py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 ${past ? 'opacity-50' : ''}`}>
                  <span className="w-24 text-sm tabular-nums text-stone-600">{fmtDate(e.start_date, true)}{e.end_date && e.end_date !== e.start_date ? `–${fmtDate(e.end_date)}` : ''}</span>
                  <Badge cls={EVENT_KIND[e.kind].cls}>{EVENT_KIND[e.kind].label}</Badge>
                  <button className="flex-1 text-start text-sm text-stone-800 hover:underline min-w-[150px]" onClick={() => editor.open('events', EVENT_FIELDS, { ...e }, 'עריכה')}>{e.title}</button>
                  <ProjectLink id={e.project_id} plain />
                  <Avatars ids={e.owner_ids} size={22} team={false} />
                  <a href={gcalLink(e)} target="_blank" rel="noreferrer" title="הוספה ידנית ל-Google Calendar" className="text-stone-400 hover:text-indigo-600"><CalendarPlus size={16} /></a>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {view === 'calendar' && (
        <Card>
          {calId ? (
            <iframe title="Synergy calendar" className="w-full h-[70vh] rounded-xl border border-stone-100"
              src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calId)}&ctz=Asia%2FJerusalem&hl=iw&mode=MONTH&showTitle=0&showPrint=0`} />
          ) : (
            <Empty>עוד לא הוגדר לוח. מגדירים את מזהה הלוח של סינרגי ב<Link href="/team" className="text-indigo-600 underline">צוות והגדרות</Link>.</Empty>
          )}
        </Card>
      )}
      {editor.element}
    </div>
  );
}
