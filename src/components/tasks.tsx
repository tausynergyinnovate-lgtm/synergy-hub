'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, CornerDownLeft, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { PRIORITY, TASK_STATUS, dueLabel, opts } from '@/lib/labels';
import type { Task } from '@/lib/types';
import { Avatars, Badge, Button, FieldInput, Modal, PeopleLinks, ProjectLink, type Field } from './ui';

export function sortTasks(ts: Task[]): Task[] {
  const pr = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  return [...ts].sort((a, b) => {
    if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
    if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1;
    if (!!a.due_date !== !!b.due_date) return a.due_date ? -1 : 1;
    return (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1);
  });
}

export function DoneToggle({ task, size = 20 }: { task: Task; size?: number }) {
  const { save } = useHub();
  const done = task.status === 'done';
  return (
    <button aria-label={done ? 'סמן כלא בוצע' : 'סמן כבוצע'}
      onClick={(e) => { e.stopPropagation(); save('tasks', { id: task.id, status: done ? 'todo' : 'done' }); }}
      className={`shrink-0 rounded-full border-2 flex items-center justify-center transition ${done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 hover:border-emerald-400 text-transparent hover:text-emerald-400'}`}
      style={{ width: size, height: size }}>
      <Check size={size * 0.6} strokeWidth={3} />
    </button>
  );
}

export function TaskRow({ task, showProject = true, showAssignee = true, depth = 0, expandable = true, showParent = true }: {
  task: Task; showProject?: boolean; showAssignee?: boolean; depth?: number; expandable?: boolean; showParent?: boolean;
}) {
  const { openTask, subtasks, data } = useHub();
  const subs = subtasks(task.id);
  const [open, setOpen] = useState(false);
  const due = task.status !== 'done' ? dueLabel(task.due_date) : null;
  const parent = task.parent_id ? data.tasks.find((t) => t.id === task.parent_id) : null;
  const doneSubs = subs.filter((s) => s.status === 'done').length;
  return (
    <>
      <div onClick={() => openTask(task.id)}
        className="group flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl hover:bg-stone-50 cursor-pointer"
        style={{ paddingInlineStart: 8 + depth * 22 }}>
        {expandable && subs.length > 0 ? (
          <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="text-stone-400 hover:text-stone-700 -ms-1" aria-label="תתי־משימות">
            <ChevronLeft size={16} className={`transition ${open ? '-rotate-90' : ''}`} />
          </button>
        ) : <span className="w-[12px]" />}
        <DoneToggle task={task} size={depth ? 17 : 20} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm leading-snug ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
            {task.priority === 'high' && task.status !== 'done' && <span className="text-red-500 me-1">!</span>}
            {task.title}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 mt-0.5">
            {task.status === 'in_progress' || task.status === 'blocked' ? <Badge cls={TASK_STATUS[task.status].cls}>{TASK_STATUS[task.status].label}</Badge> : null}
            {subs.length > 0 && <span className="tabular-nums">{doneSubs}/{subs.length} תתי־משימות</span>}
            {showProject && task.project_id && <ProjectLink id={task.project_id} />}
            {parent && depth === 0 && showParent && <span className="text-stone-400">↳ {parent.title}</span>}
            {due && <span className={due.cls}>{due.text}</span>}
          </div>
        </div>
        {showAssignee && <Avatars ids={task.assignee_ids} size={24} />}
      </div>
      {open && sortTasks(subs).map((s) => (
        <TaskRow key={s.id} task={s} depth={depth + 1} showProject={false} showAssignee={showAssignee} />
      ))}
    </>
  );
}

/** Tree of top-level tasks (sub-tasks nested), with quick-add. */
export function TaskTree({ tasks, defaults, showProject = true, emptyText = 'אין משימות', hideDone = false }: {
  tasks: Task[]; defaults?: Partial<Task>; showProject?: boolean; emptyText?: string; hideDone?: boolean;
}) {
  const ids = new Set(tasks.map((t) => t.id));
  // a task is top-level here if its parent is not in this list
  const roots = sortTasks(tasks.filter((t) => !t.parent_id || !ids.has(t.parent_id)));
  const open = roots.filter((t) => t.status !== 'done');
  const done = roots.filter((t) => t.status === 'done');
  const [showDone, setShowDone] = useState(false);
  return (
    <div>
      {defaults && <QuickAdd defaults={defaults} />}
      {open.length === 0 && <p className="text-sm text-stone-400 py-2">{emptyText}</p>}
      <div>{open.map((t) => <TaskRow key={t.id} task={t} showProject={showProject} />)}</div>
      {!hideDone && done.length > 0 && (
        <div className="mt-1">
          <button className="text-xs text-stone-400 hover:text-stone-600 py-1" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'הסתר' : 'הצג'} {done.length} שבוצעו
          </button>
          {showDone && done.map((t) => <TaskRow key={t.id} task={t} showProject={showProject} />)}
        </div>
      )}
    </div>
  );
}

export function QuickAdd({ defaults, placeholder = 'משימה חדשה… (Enter להוספה)' }: { defaults: Partial<Task>; placeholder?: string }) {
  const { save } = useHub();
  const [title, setTitle] = useState('');
  return (
    <form className="flex items-center gap-2 mb-2" onSubmit={async (e) => {
      e.preventDefault(); const t = title.trim(); if (!t) return;
      setTitle(''); await save('tasks', { ...defaults, title: t });
    }}>
      <Plus size={16} className="text-stone-400 shrink-0" />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-transparent text-sm py-1.5 border-b border-transparent focus:border-stone-200 focus:outline-none placeholder:text-stone-400" />
      {title && <CornerDownLeft size={14} className="text-stone-400" />}
    </form>
  );
}

const TASK_FIELDS: Field[] = [
  { key: 'status', label: 'סטטוס', type: 'select', options: opts(TASK_STATUS) },
  { key: 'priority', label: 'עדיפות', type: 'select', options: opts(PRIORITY) },
  { key: 'assignee_ids', label: 'אחראים', type: 'managers' },
  { key: 'due_date', label: 'דדליין', type: 'date' },
  { key: 'project_id', label: 'פרויקט', type: 'project' },
  { key: 'link_url', label: 'קישור (דרייב, טופס…)', type: 'url' },
];

/** Global task modal — opened from anywhere via openTask / openNewTask */
export function TaskModal() {
  const { taskModal, openTask, data, save, remove, subtasks } = useHub();
  const existing = taskModal?.id ? data.tasks.find((t) => t.id === taskModal.id) : null;
  const isNew = Boolean(taskModal && !taskModal.id);
  const [draft, setDraft] = useState<Partial<Task>>({});

  useEffect(() => {
    if (isNew) setDraft({ status: 'todo', priority: 'medium', ...taskModal?.defaults });
  }, [taskModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const t: Partial<Task> = existing ?? draft;
  const set = (k: keyof Task, v: unknown) => {
    if (existing) save('tasks', { id: existing.id, [k]: v });
    else setDraft((d) => ({ ...d, [k]: v }));
  };
  const parent = t.parent_id ? data.tasks.find((x) => x.id === t.parent_id) : null;
  const subs = existing ? subtasks(existing.id) : [];
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => { setTitle(t.title ?? ''); setNotes(t.notes ?? ''); }, [existing?.id, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const parentOptions = useMemo(() => data.tasks.filter((x) => !x.parent_id && x.id !== existing?.id && (!t.project_id || x.project_id === t.project_id)), [data.tasks, existing?.id, t.project_id]);

  if (!taskModal || (!existing && !isNew)) return null;
  const close = () => openTask(null);

  return (
    <Modal open onClose={close} wide title={
      parent ? <button className="text-sm font-normal text-stone-500 hover:underline" onClick={() => openTask(parent.id)}>↰ {parent.title}</button>
        : isNew ? 'משימה חדשה' : <span className="text-sm font-normal text-stone-500">משימה</span>
    }>
      <div className="flex items-start gap-3">
        {existing && <div className="pt-2"><DoneToggle task={existing} size={22} /></div>}
        <textarea value={title} rows={1} autoFocus={isNew}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => existing && title.trim() && title !== existing.title && set('title', title.trim())}
          placeholder="מה צריך לעשות?"
          className="flex-1 text-lg font-semibold text-stone-900 resize-none focus:outline-none py-1 [field-sizing:content]" />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        {TASK_FIELDS.map((f) => (
          <label key={f.key} className={f.key === 'link_url' || f.key === 'assignee_ids' ? 'col-span-2' : ''}>
            <span className="block text-xs font-medium text-stone-500 mb-1">{f.label}</span>
            <FieldInput f={f} value={t[f.key as keyof Task]} onChange={(v) => set(f.key as keyof Task, v)} />
          </label>
        ))}
        <label className="col-span-2">
          <span className="block text-xs font-medium text-stone-500 mb-1">תת־משימה של</span>
          <select className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" value={t.parent_id ?? ''}
            onChange={(e) => set('parent_id', e.target.value || null)} disabled={subs.length > 0}>
            <option value="">— משימה ראשית —</option>
            {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
      </div>

      {existing?.link_url && (
        <a href={existing.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mt-3">
          <ExternalLink size={14} />פתיחת הקישור
        </a>
      )}

      <label className="block mt-3">
        <span className="block text-xs font-medium text-stone-500 mb-1">הערות</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          onBlur={() => existing && notes !== (existing.notes ?? '') && set('notes', notes || null)}
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-200" />
      </label>

      {existing && (
        <div className="mt-4">
          <div className="text-xs font-medium text-stone-500 mb-1">תתי־משימות</div>
          <div className="rounded-xl border border-stone-100 px-2 py-1">
            {sortTasks(subs).map((s) => <TaskRow key={s.id} task={s} showProject={false} expandable={false} showParent={false} />)}
            <QuickAdd placeholder="הוספת תת־משימה…"
              defaults={{ parent_id: existing.id, project_id: existing.project_id, assignee_ids: existing.assignee_ids, due_date: existing.due_date }} />
          </div>
        </div>
      )}

      {existing && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-4">
          <PeopleLinks ids={existing.assignee_ids} />
          {existing.project_id && <ProjectLink id={existing.project_id} />}
        </div>
      )}

      <div className="flex items-center justify-between mt-5">
        {existing ? (
          <Button variant="danger" onClick={async () => {
            if (!confirm(subs.length ? `למחוק את המשימה ו-${subs.length} תתי־המשימות שלה?` : 'למחוק את המשימה?')) return;
            await remove('tasks', existing.id); close();
          }}><Trash2 size={15} />מחיקה</Button>
        ) : <span />}
        {isNew ? (
          <Button variant="primary" disabled={!title.trim()} onClick={async () => {
            await save('tasks', { ...draft, title: title.trim(), notes: notes || null }); close();
          }}>הוספה</Button>
        ) : <Button onClick={close}>סגירה</Button>}
      </div>
    </Modal>
  );
}
