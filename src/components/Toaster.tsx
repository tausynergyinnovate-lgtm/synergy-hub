'use client';

import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useHub, type Toast } from '@/lib/hub';

// Toasts: top edge on phones, bottom corner (end side) on desktop. Max 3, icon + accent edge per type,
// a draining bar shows how long an undo stays available.
const KIND = {
  info: { icon: Info, edge: 'border-s-stone-400', iconCls: 'text-stone-500' },
  success: { icon: CheckCircle2, edge: 'border-s-emerald-600', iconCls: 'text-emerald-600' },
  error: { icon: AlertTriangle, edge: 'border-s-signal', iconCls: 'text-signal' },
} as const;

function ToastCard({ t }: { t: Toast }) {
  const { dismissToast } = useHub();
  const k = KIND[t.kind];
  const ms = t.ms ?? (t.kind === 'error' ? 7000 : 4000);
  return (
    <div role={t.kind === 'error' ? 'alert' : 'status'}
      className={`animate-toast pointer-events-auto relative overflow-hidden flex items-center gap-3 rounded-xl border-s-4 ${k.edge} bg-raised ps-3 pe-1 min-h-[52px] shadow-raised`}>
      <k.icon size={18} className={`shrink-0 ${k.iconCls}`} aria-hidden />
      <p className="flex-1 text-sm text-stone-900 py-3">{t.text}</p>
      {t.action && (
        <button className="shrink-0 rounded-lg px-3 min-h-tap text-sm font-semibold text-link hover:bg-stone-100"
          onClick={() => { t.action!.run(); dismissToast(t.id); }}>{t.action.label}</button>
      )}
      <button className="shrink-0 w-tap h-tap rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100" aria-label="סגירת ההודעה" onClick={() => dismissToast(t.id)}><X size={16} /></button>
      {t.action && <span aria-hidden className="absolute bottom-0 inset-x-0 h-[3px] bg-stone-300 origin-right animate-drain" style={{ animationDuration: `${ms}ms` }} />}
    </div>
  );
}

export function Toaster() {
  const { toasts } = useHub();
  return (
    <div aria-live="polite" className="fixed z-[60] pointer-events-none flex flex-col gap-2
      inset-x-3 top-[max(env(safe-area-inset-top),12px)]
      lg:inset-x-auto lg:top-auto lg:end-6 lg:bottom-24 lg:w-[380px]">
      {toasts.map((t) => <ToastCard key={t.id} t={t} />)}
    </div>
  );
}
