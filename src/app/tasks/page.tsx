'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { TASK_STATUS, dueLabel, todayISO } from '@/lib/labels';
import type { Task, TaskStatus } from '@/lib/types';
import { Avatars, Button, Card, PageHeader, Pills, ProjectLink, selectCls } from '@/components/ui';
import { DoneToggle, TaskRow, TaskTree, sortTasks } from '@/components/tasks';

type View = 'board' | 'list' | 'overdue';

function TasksInner() {
  const { data, openNewTask, openTask, save, subtasks } = useHub();
  const params = useSearchParams();
  const [view, setView] = useState<View>('board');
  const [who, setWho] = useState('');
  const [proj, setProj] = useState('');
  const [q, setQ] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  useEffect(() => { const v = params.get('view'); if (v === 'overdue' || v === 'list' || v === 'board') setView(v); }, [params]);

  const filtered = useMemo(() => data.tasks.filter((t) =>
    (!who || (who === 'team' ? !t.assignee_ids?.length : t.assignee_ids?.includes(who))) &&
    (!proj || (proj === 'none' ? !t.project_id : t.project_id === proj)) &&
    (!q || t.title.toLowerCase().includes(q.toLowerCase()))), [data.tasks, who, proj, q]);

  const today = todayISO();
  const top = filtered.filter((t) => !t.parent_id);

  return (
    <div>
      <PageHeader title="משימות" subtitle={`${data.tasks.filter((t) => t.status !== 'done').length} פתוחות`}
        actions={<Button variant="primary" onClick={() => openNewTask({ assignee_ids: who && who !== 'team' ? [who] : [], project_id: proj && proj !== 'none' ? proj : null })}><Plus size={15} />משימה חדשה</Button>} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Pills value={view} onChange={setView} options={[{ value: 'board', label: 'לוח' }, { value: 'list', label: 'לפי פרויקט' }, { value: 'overdue', label: 'באיחור' }]} />
        <select className={selectCls} value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">כל האחראים</option>
          <option value="team">כל הצוות (ללא אחראי)</option>
          {data.managers.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className={selectCls} value={proj} onChange={(e) => setProj(e.target.value)}>
          <option value="">כל הפרויקטים</option>
          <option value="none">ללא פרויקט</option>
          {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className={selectCls + ' flex-1 min-w-[140px]'} placeholder="סינון לפי טקסט…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {view === 'board' && (
        <div className="grid grid-flow-col auto-cols-[85%] sm:auto-cols-[minmax(240px,1fr)] gap-3 overflow-x-auto pb-4 snap-x">
          {(Object.keys(TASK_STATUS) as TaskStatus[]).map((st) => {
            const col = sortTasks(top.filter((t) => t.status === st));
            return (
              <div key={st} className="snap-start rounded-2xl bg-stone-100/70 p-2 min-h-[200px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId) save('tasks', { id: dragId, status: st }); setDragId(null); }}>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm font-semibold text-stone-700">{TASK_STATUS[st].label}</span>
                  <span className="text-xs text-stone-400 tabular-nums">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((t) => <BoardCard key={t.id} t={t} subs={subtasks(t.id)} onDrag={setDragId} onOpen={() => openTask(t.id)} />)}
                </div>
                {st === 'todo' && (
                  <button onClick={() => openNewTask({ project_id: proj && proj !== 'none' ? proj : null, assignee_ids: who && who !== 'team' ? [who] : [] })}
                    className="w-full mt-2 flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 px-2 py-1.5"><Plus size={14} />הוספה</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-4">
          {[...data.projects.filter((p) => !proj || p.id === proj), ...(proj && proj !== 'none' ? [] : [null])].map((p) => {
            const ts = filtered.filter((t) => (p ? t.project_id === p.id : !t.project_id));
            if (!ts.length && (who || q)) return null;
            return (
              <Card key={p?.id ?? 'none'} title={p ? <ProjectLink id={p.id} /> : 'ללא פרויקט'}>
                <TaskTree tasks={ts} defaults={{ project_id: p?.id ?? null, assignee_ids: who && who !== 'team' ? [who] : [] }} showProject={false} />
              </Card>
            );
          })}
        </div>
      )}

      {view === 'overdue' && (
        <Card>
          {filtered.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today).length === 0 && <p className="text-sm text-stone-400 py-3">אין משימות באיחור</p>}
          {sortTasks(filtered.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today)).map((t) => <TaskRow key={t.id} task={t} expandable={false} />)}
        </Card>
      )}
    </div>
  );
}

function BoardCard({ t, subs, onDrag, onOpen }: { t: Task; subs: Task[]; onDrag: (id: string) => void; onOpen: () => void }) {
  const due = t.status !== 'done' ? dueLabel(t.due_date) : null;
  const done = subs.filter((s) => s.status === 'done').length;
  return (
    <div draggable onDragStart={() => onDrag(t.id)} onClick={onOpen}
      className="bg-white rounded-xl border border-stone-200/80 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer hover:border-stone-300 active:cursor-grabbing">
      <div className="flex items-start gap-2">
        <DoneToggle task={t} size={18} />
        <div className={`flex-1 text-sm leading-snug ${t.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
          {t.priority === 'high' && t.status !== 'done' && <span className="text-red-500">! </span>}{t.title}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2.5 text-xs text-stone-500">
        {t.project_id && <span className="truncate max-w-[55%]"><ProjectLink id={t.project_id} /></span>}
        {subs.length > 0 && <span className="tabular-nums">☐ {done}/{subs.length}</span>}
        <span className="flex-1" />
        {due && <span className={due.cls}>{due.text}</span>}
        <Avatars ids={t.assignee_ids} size={22} />
      </div>
    </div>
  );
}

export default function TasksPage() {
  return <Suspense><TasksInner /></Suspense>;
}
