'use client';

import { ExternalLink, Plus, Sparkles } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { DECISION_STATUS, fmtDate, todayISO } from '@/lib/labels';
import { Badge, Button, Card, Empty, PageHeader, ProjectLink } from '@/components/ui';
import { DECISION_FIELDS, MEETING_FIELDS } from '@/components/forms';
import { useEditor } from '@/components/useEditor';

export default function MeetingsPage() {
  const { data, openAi } = useHub();
  const editor = useEditor();
  const meetings = [...data.meetings].sort((a, b) => (a.date < b.date ? 1 : -1));
  const order = { pending: 0, approved: 1, rejected: 2 } as Record<string, number>;
  const decisions = [...data.decisions].sort((a, b) => order[a.status] - order[b.status]);
  const meetingTitle = (id: string | null) => data.meetings.find((m) => m.id === id)?.title;

  return (
    <div>
      <PageHeader title="פגישות והחלטות" subtitle="סיכומי פגישות צוות ולוג ההחלטות"
        actions={<>
          <Button onClick={() => openAi()}><Sparkles size={15} />סיכום פגישה → משימות</Button>
          <Button variant="primary" onClick={() => editor.open('meetings', MEETING_FIELDS, { date: todayISO() }, 'פגישה חדשה')}><Plus size={15} />פגישה</Button>
        </>} />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="החלטות" action={<button className="text-xs text-indigo-600 hover:underline" onClick={() => editor.open('decisions', DECISION_FIELDS, { status: 'pending' }, 'החלטה חדשה')}>+ החלטה</button>}>
          {decisions.length === 0 && <Empty>אין החלטות</Empty>}
          <ul className="divide-y divide-stone-100">
            {decisions.map((d) => (
              <li key={d.id} className="py-2.5 cursor-pointer hover:bg-stone-50 -mx-2 px-2 rounded-lg" onClick={() => editor.open('decisions', DECISION_FIELDS, { ...d }, 'עריכת החלטה')}>
                <div className="flex items-start gap-2">
                  <Badge cls={DECISION_STATUS[d.status].cls}>{DECISION_STATUS[d.status].label}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-800">{d.title}</div>
                    {d.proposal && <div className="text-sm text-stone-600 mt-0.5">{d.proposal}</div>}
                    <div className="flex flex-wrap gap-x-3 text-xs text-stone-400 mt-1">
                      {d.decided_on && <span>{fmtDate(d.decided_on, true)}</span>}
                      {d.meeting_id && <span>{meetingTitle(d.meeting_id)}</span>}
                      <ProjectLink id={d.project_id} plain />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="פגישות">
          {meetings.length === 0 && <Empty>עוד לא נרשמו פגישות. אפשר גם להדביק סיכום לעוזר ה-AI והוא יוציא ממנו משימות והחלטות.</Empty>}
          <ul className="divide-y divide-stone-100">
            {meetings.map((m) => (
              <li key={m.id} className="py-2.5 cursor-pointer hover:bg-stone-50 -mx-2 px-2 rounded-lg" onClick={() => editor.open('meetings', MEETING_FIELDS, { ...m }, 'עריכת פגישה')}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 tabular-nums w-14">{fmtDate(m.date, true)}</span>
                  <span className="flex-1 text-sm font-medium text-stone-800">{m.title}</span>
                  {m.doc_url && <a href={m.doc_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-stone-400 hover:text-indigo-600"><ExternalLink size={14} /></a>}
                </div>
                {m.notes && <p className="text-sm text-stone-600 mt-1 ms-16 line-clamp-3 whitespace-pre-wrap">{m.notes}</p>}
                {data.decisions.filter((d) => d.meeting_id === m.id).length > 0 && (
                  <p className="text-xs text-stone-400 mt-1 ms-16">{data.decisions.filter((d) => d.meeting_id === m.id).length} החלטות</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {editor.element}
    </div>
  );
}
