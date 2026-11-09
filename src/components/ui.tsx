'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Users, X } from 'lucide-react';
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
      <span title="כל הצוות" role="img" aria-label="כל הצוות" className="inline-flex items-center justify-center rounded-full bg-stone-200 text-stone-600 shrink-0"
        style={{ width: size, height: size }}><Users size={Math.round(size * 0.58)} strokeWidth={2.2} /></span>
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
  if (!m) return <span className="inline-flex items-center gap-1.5 text-stone-600"><Avatar id={null} size={20} />כל הצוות</span>;
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
        <span key={id} className="rounded-full ring-2 ring-surface" style={{ marginInlineStart: i ? -size * 0.3 : 0 }}><Avatar id={id} size={size} /></span>
      ))}
      {extra > 0 && <span className="rounded-full ring-2 ring-surface bg-stone-200 text-stone-600 font-medium inline-flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.4, marginInlineStart: -size * 0.3 }}>+{extra}</span>}
    </span>
  );
}

export function PeopleLinks({ ids, emptyLabel = 'כל הצוות' }: { ids: string[] | null | undefined; emptyLabel?: string }) {
  const { manager } = useHub();
  const list = (ids ?? []).map((id) => manager(id)).filter(Boolean) as { id: string; name: string }[];
  if (!list.length) return <span className="inline-flex items-center gap-1.5 text-stone-600"><Avatar id={null} size={20} />{emptyLabel}</span>;
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
  if (!p) return plain ? null : <span className="text-stone-500">—</span>;
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
      <div className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color ?? '#4f46e5' }} />
      </div>
      <span className="tabular-nums">{done}/{total}</span>
    </div>
  );
}

export function Card({ title, action, children, className = '' }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-surface rounded-2xl ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-1.5">
          <h2 className="font-semibold text-stone-900 text-[1.0625rem]">{title}</h2>
          {action}
        </header>
      )}
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-stone-500 py-3">{children}</p>;
}

export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-[1.875rem] leading-tight font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Button({ variant = 'secondary', className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  // primary: one per view (the most likely action) · secondary: gray fill · ghost: tinted text · danger: destructive text
  const v = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    secondary: 'bg-stone-200/70 text-stone-900 hover:bg-stone-200',
    ghost: 'text-link hover:bg-stone-200/50',
    danger: 'text-signal hover:bg-red-50',
  }[variant];
  return <button {...p} className={`press inline-flex items-center justify-center gap-1.5 rounded-full px-4 min-h-tap text-[0.9375rem] font-medium disabled:opacity-40 disabled:pointer-events-none ${v} ${className}`} />;
}

/** Sheet: slides up from the bottom on phones (grabber, drag down to dismiss), centered card on wider screens.
 *  leading/trailing follow iOS: Cancel on the leading edge, the confirming action on the trailing edge. */
export function Modal({ open, onClose, title, children, wide, leading, trailing }: {
  open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; wide?: boolean;
  leading?: React.ReactNode; trailing?: React.ReactNode;
}) {
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return;
    setDrag(0);
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const onDown = (e: React.PointerEvent) => { start.current = e.clientY; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current)); };
  const onUp = () => { if (start.current === null) return; start.current = null; if (drag > 110) onClose(); else setDrag(0); };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 animate-fade" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} onMouseDown={(e) => e.stopPropagation()}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        className={`animate-sheet bg-surface w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[94vh] sm:max-h-[88vh] overflow-y-auto overscroll-contain rounded-t-[28px] sm:rounded-3xl shadow-2xl transition-transform`}>
        <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-xl touch-none select-none"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="sm:hidden mx-auto mt-2 w-9 h-[5px] rounded-full bg-stone-300" aria-hidden />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-1.5 sm:pt-3 pb-2">
            <div className="justify-self-start">
              {leading ?? <button onClick={onClose} onPointerDown={(e) => e.stopPropagation()} className="w-tap h-tap rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200/60" aria-label="סגירה"><X size={20} /></button>}
            </div>
            <div className="font-semibold text-stone-900 text-center truncate max-w-[60vw] sm:max-w-sm">{title}</div>
            <div className="justify-self-end" onPointerDown={(e) => e.stopPropagation()}>{trailing}</div>
          </div>
        </div>
        <div className="px-5 pb-[max(env(safe-area-inset-bottom),20px)]">{children}</div>
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

export const inputCls = 'w-full rounded-xl border border-transparent bg-stone-100 px-3 min-h-tap py-2 text-[0.9375rem] text-stone-900 focus:outline-none focus:bg-surface focus:border-link focus:ring-2 focus:ring-indigo-200';

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
                className={`press inline-flex items-center gap-1.5 rounded-full border ps-1 pe-3 min-h-tap text-sm ${on ? 'border-link bg-indigo-50 text-indigo-800 font-medium' : 'border-stone-200 bg-surface text-stone-700 hover:bg-stone-100'}`}>
                <Avatar id={m.id} size={20} />{m.name}
              </button>
            );
          })}
          {!sel.length && <span className="text-xs text-stone-500 self-center">{f.emptyLabel ?? 'לא נבחר — כל הצוות'}</span>}
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
      return <input type="checkbox" className="w-5 h-5 accent-accent" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
    case 'number':
      return <input type="number" step="any" className={inputCls} value={v} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'color':
      return <input type="color" className="h-tap w-16 rounded-lg border border-stone-200 bg-surface" value={v || '#6366f1'} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input type={f.type} dir={f.type === 'url' || f.type === 'email' ? 'ltr' : undefined} className={inputCls} value={v}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)} placeholder={'placeholder' in f ? f.placeholder : undefined} />;
  }
}

const isEmpty = (x: unknown) => x === null || x === undefined || (typeof x === 'string' && !x.trim()) || (Array.isArray(x) && !x.length);

/** Fill every select that has no empty option with its first value, so a NOT NULL column never receives null. */
export function withSelectDefaults<T extends Record<string, unknown>>(fields: Field[], row: T): T {
  const out: Record<string, unknown> = { ...row };
  fields.forEach((f) => {
    if (f.type === 'select' && f.allowEmpty === undefined && isEmpty(out[f.key]) && f.options.length) out[f.key] = f.options[0].value;
  });
  return out as T;
}

export function FormModal<T extends Record<string, unknown>>({
  open, onClose, title, fields, initial, onSubmit, onDelete,
}: {
  open: boolean; onClose: () => void; title: string; fields: Field[]; initial: T;
  onSubmit: (v: T) => Promise<unknown> | void; onDelete?: () => Promise<unknown> | void;
}) {
  const [v, setV] = useState<T>(initial);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (open) { setV(withSelectDefaults(fields, initial)); setTried(false); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = fields.filter((f) => 'required' in f && f.required && isEmpty(v[f.key]));
  const isMissing = (f: Field) => tried && missing.includes(f);
  const formId = useId();
  return (
    <Modal open={open} onClose={onClose} title={title}
      leading={<Button type="button" variant="ghost" className="!px-3" onClick={onClose}>ביטול</Button>}
      trailing={<Button type="submit" form={formId} variant="primary" className="!px-4" disabled={busy}>{busy ? 'שומר…' : 'שמירה'}</Button>}>
      <form id={formId} className="space-y-4 pt-1" noValidate onSubmit={async (e) => {
        e.preventDefault();
        if (missing.length) { setTried(true); return; }
        setBusy(true);
        const res = await onSubmit(v);
        setBusy(false);
        if (res !== null) onClose(); // null = save failed; keep what was typed
      }}>
        {fields.map((f) => (
          <label key={f.key} className={f.type === 'checkbox' ? 'flex items-center gap-2 text-sm' : 'block'}>
            <span className={f.type === 'checkbox' ? 'text-stone-800' : 'block text-[0.8125rem] font-medium text-stone-600 mb-1.5'}>
              {f.label}{'required' in f && f.required && <span className="text-signal"> *</span>}
            </span>
            {f.type === 'checkbox'
              ? <FieldInput f={f} value={v[f.key]} onChange={(x) => setV((s) => ({ ...s, [f.key]: x }))} />
              : <div className={isMissing(f) ? 'rounded-xl ring-2 ring-red-400' : undefined}>
                  <FieldInput f={f} value={v[f.key]} onChange={(x) => setV((s) => ({ ...s, [f.key]: x }))} />
                </div>}
          </label>
        ))}
        {tried && missing.length > 0 && (
          <div role="alert" className="text-sm text-signal">כדי לשמור צריך למלא: {missing.map((f) => f.label).join(', ')}</div>
        )}
        {onDelete && (
          <div className="pt-3 border-t border-stone-200">
            <Button type="button" variant="danger" className="w-full" onClick={async () => {
              if (!confirm('למחוק? אי אפשר לבטל את זה.')) return; await onDelete(); onClose();
            }}>מחיקה</Button>
          </div>
        )}
      </form>
    </Modal>
  );
}

export function Pills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="group" className="inline-flex rounded-[10px] bg-stone-200/70 p-[3px] text-sm">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`px-3.5 min-h-[32px] lg:min-h-[28px] rounded-[8px] transition-colors ${value === o.value ? 'bg-surface shadow-sm text-stone-900 font-semibold' : 'text-stone-600 hover:text-stone-900'}`}>{o.label}</button>
      ))}
    </div>
  );
}

export const selectCls = 'rounded-xl border border-transparent bg-stone-200/60 px-3 min-h-tap text-sm text-stone-900';
