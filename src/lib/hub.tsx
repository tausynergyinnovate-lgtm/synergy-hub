'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isConfigured, sb } from './supabase';
import type { HubData, Manager, Project, TableName, Task } from './types';

const DEMO = process.env.NEXT_PUBLIC_DEMO === '1';

type Phase = 'loading' | 'unconfigured' | 'signed_out' | 'not_manager' | 'ready';

const EMPTY: HubData = {
  managers: [], projects: [], tasks: [], events: [], expenses: [], contacts: [],
  meetings: [], decisions: [], links: [], settings: {},
};
const TABLES: TableName[] = ['managers', 'projects', 'tasks', 'events', 'expenses', 'contacts', 'meetings', 'decisions', 'links'];
const ORDER: Partial<Record<TableName, string>> = {
  managers: 'sort', projects: 'sort', tasks: 'created_at', events: 'start_date', expenses: 'date',
  contacts: 'name', meetings: 'date', decisions: 'created_at', links: 'created_at',
};

type AnyRow = { id: string } & Record<string, unknown>;

interface HubCtx {
  phase: Phase;
  email: string | null;
  me: Manager | null;
  data: HubData;
  save: <R extends Record<string, unknown>>(table: TableName, row: R & { id?: string }) => Promise<AnyRow | null>;
  saveMany: (table: TableName, rows: Record<string, unknown>[]) => Promise<AnyRow[]>;
  remove: (table: TableName, id: string) => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  signOut: () => Promise<void>;
  // lookups
  manager: (id: string | null | undefined) => Manager | undefined;
  project: (id: string | null | undefined) => Project | undefined;
  subtasks: (taskId: string) => Task[];
  // global UI
  openTask: (id: string | null) => void;
  openNewTask: (defaults: Partial<Task>) => void;
  taskModal: { id: string | null; defaults?: Partial<Task> } | null;
  aiOpen: boolean; setAiOpen: (v: boolean) => void; aiContext: { projectId?: string } ;
  openAi: (ctx?: { projectId?: string }) => void;
  searchOpen: boolean; setSearchOpen: (v: boolean) => void;
  // feedback
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  /** Delete now from the user's point of view, with an undo window; the server delete runs when the window closes. */
  removeWithUndo: (table: TableName, id: string, label: string) => void;
}

export interface Toast {
  id: string;
  kind: 'info' | 'success' | 'error';
  text: string;
  action?: { label: string; run: () => void };
  ms?: number;            // auto-dismiss after; errors default 7s, others 4s
}
const UNDO_MS = 7000;

const Ctx = createContext<HubCtx | null>(null);
export const useHub = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useHub outside provider');
  return c;
};

export function HubProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [data, setData] = useState<HubData>(EMPTY);
  const [taskModal, setTaskModal] = useState<HubCtx['taskModal']>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiContext, setAiContext] = useState<{ projectId?: string }>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dataRef = useRef(data); dataRef.current = data;
  // rows hidden by an undo-able delete that hasn't reached the server yet
  const pending = useRef<Map<string, { table: TableName; rows: AnyRow[]; timer: ReturnType<typeof setTimeout>; commit: () => void }>>(new Map());

  const dismissToast = useCallback((id: string) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((all) => [...all, { ...t, id }].slice(-3)); // max 3 visible
    setTimeout(() => dismissToast(id), t.ms ?? (t.kind === 'error' ? 7000 : 4000));
  }, [dismissToast]);

  const hidePending = (t: TableName, rows: AnyRow[]) => {
    const gone = new Set(Array.from(pending.current.values()).filter((p) => p.table === t).flatMap((p) => p.rows.map((r) => r.id)));
    return gone.size ? rows.filter((r) => !gone.has(r.id)) : rows;
  };

  const fetchTable = useCallback(async (t: TableName) => {
    const { data: rows, error } = await sb().from(t).select('*').order(ORDER[t] || 'created_at', { ascending: true });
    if (error) { console.error(t, error); return; }
    setData((d) => ({ ...d, [t]: hidePending(t, (rows ?? []) as AnyRow[]) }));
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data: rows } = await sb().from('settings').select('*');
    const s: Record<string, string> = {};
    (rows ?? []).forEach((r: { key: string; value: string | null }) => { s[r.key] = r.value ?? ''; });
    setData((d) => ({ ...d, settings: s }));
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([...TABLES.map(fetchTable), fetchSettings()]);
  }, [fetchTable, fetchSettings]);

  // ── auth gate ──
  useEffect(() => {
    if (DEMO) {
      import('./demoData.json').then((m) => {
        const d = m.default as unknown as HubData;
        setData({ ...EMPTY, ...d, expenses: d.expenses ?? [], meetings: d.meetings ?? [] });
        setEmail(d.managers[0]?.email ?? null); setPhase('ready');
      });
      return;
    }
    if (!isConfigured) { setPhase('unconfigured'); return; }
    const client = sb();
    let cancelled = false;

    const check = async () => {
      const { data: { session } } = await client.auth.getSession();
      if (cancelled) return;
      if (!session) { setEmail(null); setPhase('signed_out'); return; }
      setEmail(session.user.email ?? null);
      const { data: ok } = await client.rpc('is_manager');
      if (cancelled) return;
      if (!ok) { setPhase('not_manager'); return; }
      await loadAll();
      if (!cancelled) setPhase('ready');
    };
    check();
    const { data: sub } = client.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') check();
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [loadAll]);

  useEffect(() => {
    if (phase === 'signed_out' && pathname !== '/login' && pathname !== '/privacy') router.replace('/login');
    if (phase === 'ready' && pathname === '/login') router.replace('/');
  }, [phase, pathname, router]);

  // ── live updates from other managers ──
  useEffect(() => {
    if (phase !== 'ready' || DEMO) return;
    const ch = sb()
      .channel('hub-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const t = payload.table as TableName | 'settings';
        clearTimeout(timers.current[t]);
        timers.current[t] = setTimeout(() => (t === 'settings' ? fetchSettings() : fetchTable(t)), 300);
      })
      .subscribe();
    return () => { sb().removeChannel(ch); };
  }, [phase, fetchTable, fetchSettings]);

  // ── mutations ──
  const save: HubCtx['save'] = useCallback(async (table, row) => {
    const { id, ...rest } = row as Record<string, unknown> & { id?: string };
    if (DEMO) {
      const now = new Date().toISOString();
      const fix = (r: Record<string, unknown>) => (table === 'tasks' && 'status' in rest ? { ...r, completed_at: rest.status === 'done' ? now : null } : r);
      if (id) {
        let out: AnyRow | null = null;
        setData((d) => ({ ...d, [table]: (d[table] as unknown as AnyRow[]).map((r) => (r.id === id ? (out = fix({ ...r, ...rest }) as AnyRow) : r)) }));
        return out;
      }
      const created = fix({ status: table === 'tasks' ? 'todo' : undefined, priority: 'medium', created_at: now, ...rest, id: crypto.randomUUID() }) as AnyRow;
      setData((d) => ({ ...d, [table]: [...(d[table] as unknown as AnyRow[]), created] }));
      return created;
    }
    if (id) {
      setData((d) => ({ ...d, [table]: (d[table] as unknown as AnyRow[]).map((r) => (r.id === id ? { ...r, ...rest } : r)) }));
      const { data: out, error } = await sb().from(table).update(rest).eq('id', id).select().single();
      if (error) { toast({ kind: 'error', text: 'השינוי לא נשמר — ' + humanError(error.message), action: { label: 'רענון', run: () => loadAll() } }); fetchTable(table); return null; }
      setData((d) => ({ ...d, [table]: (d[table] as unknown as AnyRow[]).map((r) => (r.id === id ? out : r)) }));
      return out as AnyRow;
    }
    const { data: out, error } = await sb().from(table).insert(rest).select().single();
    if (error) { toast({ kind: 'error', text: 'לא הצלחנו להוסיף — ' + humanError(error.message), action: { label: 'רענון', run: () => loadAll() } }); return null; }
    setData((d) => ({ ...d, [table]: [...(d[table] as unknown as AnyRow[]), out] }));
    return out as AnyRow;
  }, [fetchTable, toast, loadAll]);

  const saveMany: HubCtx['saveMany'] = useCallback(async (table, rows) => {
    if (!rows.length) return [];
    if (DEMO) {
      const out = rows.map((r) => ({ status: table === 'tasks' ? 'todo' : undefined, created_at: new Date().toISOString(), ...r, id: crypto.randomUUID() })) as AnyRow[];
      setData((d) => ({ ...d, [table]: [...(d[table] as unknown as AnyRow[]), ...out] }));
      return out;
    }
    const { data: out, error } = await sb().from(table).insert(rows).select();
    if (error) { toast({ kind: 'error', text: 'לא הצלחנו להוסיף — ' + humanError(error.message), action: { label: 'רענון', run: () => loadAll() } }); return []; }
    setData((d) => ({ ...d, [table]: [...(d[table] as unknown as AnyRow[]), ...(out ?? [])] }));
    return (out ?? []) as AnyRow[];
  }, [toast, loadAll]);

  const remove: HubCtx['remove'] = useCallback(async (table, id) => {
    setData((d) => ({ ...d, [table]: (d[table] as unknown as AnyRow[]).filter((r) => r.id !== id && !(table === 'tasks' && r.parent_id === id)) }));
    if (DEMO) return;
    const { error } = await sb().from(table).delete().eq('id', id);
    if (error) { toast({ kind: 'error', text: 'המחיקה לא בוצעה — ' + humanError(error.message), action: { label: 'רענון', run: () => loadAll() } }); fetchTable(table); }
    if (table === 'tasks') fetchTable('tasks'); // cascade of sub-tasks
  }, [fetchTable, toast, loadAll]);

  const removeWithUndo = useCallback((table: TableName, id: string, label: string) => {
    const hidden = (dataRef.current[table] as unknown as AnyRow[]).filter((r) => r.id === id || (table === 'tasks' && r.parent_id === id));
    const ids = new Set(hidden.map((r) => r.id));
    setData((d) => ({ ...d, [table]: (d[table] as unknown as AnyRow[]).filter((r) => !ids.has(r.id)) }));
    const commit = () => { pending.current.delete(id); remove(table, id); };
    const timer = setTimeout(commit, UNDO_MS);
    pending.current.set(id, { table, rows: hidden, timer, commit });
    toast({
      kind: 'info', text: label, ms: UNDO_MS,
      action: {
        label: 'ביטול', run: () => {
          const p = pending.current.get(id); if (!p) return;
          clearTimeout(p.timer); pending.current.delete(id);
          setData((d) => ({ ...d, [table]: [...(d[table] as unknown as AnyRow[]), ...p.rows] }));
        },
      },
    });
  }, [remove, toast]);

  // leaving the page closes every undo window
  useEffect(() => {
    const flush = () => pending.current.forEach((p) => { clearTimeout(p.timer); p.commit(); });
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const setSetting = useCallback(async (key: string, value: string) => {
    setData((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));
    if (DEMO) return;
    const { error } = await sb().from('settings').upsert({ key, value });
    if (error) toast({ kind: 'error', text: 'ההגדרה לא נשמרה — ' + humanError(error.message), action: { label: 'רענון', run: () => loadAll() } });
  }, [toast, loadAll]);

  const signOut = useCallback(async () => { if (DEMO) return; await sb().auth.signOut(); router.replace('/login'); }, [router]);

  const value = useMemo<HubCtx>(() => {
    const mById = new Map(data.managers.map((m) => [m.id, m]));
    const pById = new Map(data.projects.map((p) => [p.id, p]));
    const me = data.managers.find((m) => m.email && email && m.email.toLowerCase() === email.toLowerCase()) ?? null;
    return {
      phase, email, me, data, save, saveMany, remove, setSetting, signOut,
      manager: (id) => (id ? mById.get(id) : undefined),
      project: (id) => (id ? pById.get(id) : undefined),
      subtasks: (taskId) => data.tasks.filter((t) => t.parent_id === taskId).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
      openTask: (id) => setTaskModal(id ? { id } : null),
      openNewTask: (defaults) => setTaskModal({ id: null, defaults }),
      taskModal,
      aiOpen, setAiOpen, aiContext,
      openAi: (ctx) => { setAiContext(ctx ?? {}); setAiOpen(true); },
      searchOpen, setSearchOpen,
      toasts, toast, dismissToast, removeWithUndo,
    };
  }, [phase, email, data, save, saveMany, remove, setSetting, signOut, taskModal, aiOpen, aiContext, searchOpen, toasts, toast, dismissToast, removeWithUndo]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Turn database errors into something a manager can act on. */
function humanError(msg: string) {
  if (/row-level security|permission denied/i.test(msg)) return 'אין הרשאה. ייתכן שההתחברות פגה, התחברו מחדש.';
  if (/fetch|network|Failed to/i.test(msg)) return 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.';
  if (/duplicate key/i.test(msg)) return 'הפריט כבר קיים.';
  return msg;
}

export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await sb().auth.getSession();
  return session?.access_token ?? null;
}
