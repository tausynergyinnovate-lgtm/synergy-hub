'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { ReceiptInput } from './Receipt';

export function Badge({ cls, children }: { cls?: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls ?? 'bg-stone-100 text-stone-700'}`}>{children}</span>;
}

export function Avatar({ id, size = 24, team = true }: { id: string | null | undefined; size?: number; team?: boolean }) {
  const { manager } = useHub();
  const m = manager(id);
  if (!m) {
    if (!team) return null;
    return (
      <span title="כל הצוות" className="inline-flex items-center justify-center rounded-full bg-stone-200 text-stone-600 font-medium shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.42 }}>צוות</span>
    );
  }
  return (
    <span title={m.name} className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.5, background: m.color ?? '#6366f1' }}>{m.name.slice(0, 1)}</span>
  );
}

export function PersonLink({ id }: { id: string | null | undefined }) {
  const { manager } = useHub();
  const m = manager(id);
  if (!m) return <span className="inline-flex items-center gap-1.5 text-stone-500"><Avatar id={null} size={20} />כל הצוות</span>;
  return (
    <Link href={`/people/${m.id}`} className="inline-flex items-center gap-1.5 hover:underline" onClick={(e) => e.stopPropagation()}>
      <Avatar id={m.id} size={20} />{m.name}
    </Link>
  );
}

/** Overlapping avatars for several people; empty = whole team. */
export function Avatars({ ids, size = 24, team = true, max = 3 }: { ids: string[] | null | undefined; size?: number; team?: boolean; max?: number }) {
  const { manager } = useHub();
  const list = (ids ?? []).filter((id) => manager(id));
  if (!list.length) return team ? <Avatar id={null} size={size} /> : null;
  const shown = list.slice(0, max), extra = list.length - shown.length;
  return (
    <span className="inline-flex items-center shrink-0" title={list.map((id) => manager(id)?.name).join(', ')}>
      {shown.map((id, i) => (
        <span key={id} className="rounded-full ring-2 ring-white" style={{ marginInlineStart: i ? -size * 0.3 : 0 }}><Avatar id={id} size={size} /></span>
      ))}
      {extra > 0 && <span className="rounded-full ring-2 ring-white bg-stone-200 text-stone-600 font-medium inline-flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.4, marginInlineStart: -size * 0.3 }}>+{extra}</span>}
    </span>
  );
}

export function PeopleLinks({ ids, emptyLabel = 'כל הצוות' }: { ids: string[] | null | undefined; emptyLabel?: string }) {
  const { manager } = useHub();
  const list = (ids ?? []).map((id) => manager(id)).filter(Boolean) as { id: string; name: string }[];
  if (!list.length) return <span className="inline-flex items-center gap-1.5 text-stone-500"><Avatar id={null} size={20} />{emptyLabel}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {list.map((m) => (
        <Link key={m.id} href={`/people/${m.id}`} className="inline-flex items-center gap-1.5 hover:underline" onClick={(e) => e.stopPropagation()}>
          <Avatar id={m.id} size={20} />{m.name}
        </Link>
      ))}
    </span>
  );
}

export function ProjectLink({ id, plain }: { id: string | null | undefined; plain?: boolean }) {
  const { project } = useHub();
  const p = project(id);
  if (!p) return plain ? null : <span className="text-stone-400">—</span>;
  return (
    <Link href={`/projects/${p.slug}`} onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 hover:underline text-stone-700">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color ?? '#0ea5e9' }} />{p.name}
    </Link>
  );
}

export function Progress({ done, total, color }: { done: number; total: number; color?: string | null }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-stone-500">
      <div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color ?? '#4f46e5' }} />
      </div>
      <span className="tabular-nums">{done}/{total}</span>
    </div>
  );
}

export function Card({ title, action, children, className = '' }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-2">
          <h2 className="font-semibold text-stone-800 text-[15px]">{title}</h2>
          {action}
        </header>
      )}
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-stone-400 py-3">{children}</p>;
}

export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Button({ variant = 'secondary', className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const v = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50',
    ghost: 'text-stone-600 hover:bg-stone-100',
    danger: 'text-red-600 hover:bg-red-50',
  }[variant];
  return <button {...p} className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${v} ${className}`} />;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/30 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}
        className={`bg-white w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-xl`}>
        <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between px-5 pt-4 pb-2 z-10">
          <div className="font-semibold text-stone-900">{title}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500" aria-label="סגור"><X size={18} /></button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

// ───────── generic form ─────────
export type Field =
  | { key: string; label: string; type: 'text' | 'textarea' | 'date' | 'time' | 'url' | 'email' | 'number' | 'color'; required?: boolean; placeholder?: string }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; required?: boolean; allowEmpty?: string }
  | { key: string; label: string; type: 'manager'; emptyLabel?: string }
  | { key: string; label: string; type: 'managers'; emptyLabel?: string }
  | { key: string; label: string; type: 'project' }
  | { key: string; label: string; type: 'checkbox' }
  | { key: string; label: string; type: 'receipt' };

const inputCls = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400';

export function FieldInput({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
  const { data } = useHub();
  const v = (value ?? '') as string;
  switch (f.type) {
    case 'textarea':
      return <textarea className={inputCls + ' min-h-[90px]'} value={v} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />;
    case 'select':
      return (
        <select className={inputCls} value={v} onChange={(e) => onChange(e.target.value)}>
          {f.allowEmpty !== undefined && <option value="">{f.allowEmpty}</option>}
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'manager':
      return (
        <select className={inputCls} value={v} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">{f.emptyLabel ?? 'כל הצוות'}</option>
          {data.managers.filter((m) => m.active || m.id === v).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      );
    case 'managers': {
      const sel = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (id: string) => onChange(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
      return (
        <div className="flex flex-wrap gap-1.5">
          {data.managers.filter((m) => m.active || sel.includes(m.id)).map((m) => {
            const on = sel.includes(m.id);
            return (
              <button type="button" key={m.id} onClick={() => toggle(m.id)} aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-full border ps-1 pe-3 py-1 text-sm transition ${on ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}>
                <Avatar id={m.id} size={20} />{m.name}
              </button>
            );
          })}
          {!sel.length && <span className="text-xs text-stone-400 self-center">{f.emptyLabel ?? 'לא נבחר — כל הצוות'}</span>}
        </div>
      );
    }
    case 'project':
      return (
        <select className={inputCls} value={v} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">ללא פרויקט</option>
          {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      );
    case 'receipt':
      return <ReceiptInput value={(value as string) || null} onChange={onChange} />;
    case 'checkbox':
      return <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
    case 'number':
      return <input type="number" step="any" className={inputCls} value={v} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'color':
      return <input type="color" className="h-9 w-16 rounded-lg border border-stone-200" value={v || '#6366f1'} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input type={f.type} dir={f.type === 'url' || f.type === 'email' ? 'ltr' : undefined} className={inputCls} value={v}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)} placeholder={'placeholder' in f ? f.placeholder : undefined} />;
  }
}

export function FormModal<T extends Record<string, unknown>>({
  open, onClose, title, fields, initial, onSubmit, onDelete,
}: {
  open: boolean; onClose: () => void; title: string; fields: Field[]; initial: T;
  onSubmit: (v: T) => Promise<unknown> | void; onDelete?: () => Promise<unknown> | void;
}) {
  const [v, setV] = useState<T>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setV(initial); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = fields.some((f) => 'required' in f && f.required && !v[f.key]);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault(); if (missing) return;
        setBusy(true); await onSubmit(v); setBusy(false); onClose();
      }}>
        {fields.map((f) => (
          <label key={f.key} className={f.type === 'checkbox' ? 'flex items-center gap-2 text-sm' : 'block'}>
            <span className={f.type === 'checkbox' ? 'text-stone-700' : 'block text-xs font-medium text-stone-500 mb-1'}>{f.label}</span>
            <FieldInput f={f} value={v[f.key]} onChange={(x) => setV((s) => ({ ...s, [f.key]: x }))} />
          </label>
        ))}
        <div className="flex items-center justify-between pt-2">
          {onDelete ? (
            <Button type="button" variant="danger" onClick={async () => {
              if (!confirm('למחוק?')) return; await onDelete(); onClose();
            }}>מחיקה</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" onClick={onClose}>ביטול</Button>
            <Button type="submit" variant="primary" disabled={busy || missing}>שמירה</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function Pills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-stone-100 p-0.5 text-sm">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-[10px] transition ${value === o.value ? 'bg-white shadow-sm text-stone-900 font-medium' : 'text-stone-500'}`}>{o.label}</button>
      ))}
    </div>
  );
}

export const selectCls = 'rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm';
