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
}

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

  const fetchTable = useCallback(async (t: TableName) => {
    const { data: rows, error } = await sb().from(t).select('*').order(ORDER[t] || 'created_at', { ascending: true });
    if (error) { console.error(t, error); return; }
    setData((d) => ({ ...d, [t]: rows ?? [] }));
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
      if (error) { alert('שמירה נכשלה: ' + error.message); fetchTable(table); return null; }
      setData((d) => ({ ...d, [table]: (d[table] as unknown as AnyRow[]).map((r) => (r.id === id ? out : r)) }));
      return out as AnyRow;
    }
    const { data: out, error } = await sb().from(table).insert(rest).select().single();
    if (error) { alert('שמירה נכשלה: ' + error.message); return null; }
    setData((d) => ({ ...d, [table]: [...(d[table] as unknown as AnyRow[]), out] }));
    return out as AnyRow;
  }, [fetchTable]);

  const saveMany: HubCtx['saveMany'] = useCallback(async (table, rows) => {
    if (!rows.length) return [];
    if (DEMO) {
      const out = rows.map((r) => ({ status: table === 'tasks' ? 'todo' : undefined, created_at: new Date().toISOString(), ...r, id: crypto.randomUUID() })) as AnyRow[];
      setData((d) => ({ ...d, [table]: [...(d[table] as unknown as AnyRow[]), ...out] }));
      return out;
    }
    const { data: out, error } = await sb().from(table).insert(rows).select();
    if (error) { alert('שמירה נכשלה: ' + error.message); return []; }
    setData((d) => ({ ...d, [table]: [...(d[table] as unknown as AnyRow[]), ...(out ?? [])] }));
    return (out ?? []) as AnyRow[];
  }, []);

  const remove: HubCtx['remove'] = useCallback(async (table, id) => {
    setData((d) => ({ ...d, [table]: (d[table] as unknown as AnyRow[]).filter((r) => r.id !== id && !(table === 'tasks' && r.parent_id === id)) }));
    if (DEMO) return;
    const { error } = await sb().from(table).delete().eq('id', id);
    if (error) { alert('מחיקה נכשלה: ' + error.message); fetchTable(table); }
    if (table === 'tasks') fetchTable('tasks'); // cascade of sub-tasks
  }, [fetchTable]);

  const setSetting = useCallback(async (key: string, value: string) => {
    setData((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));
    if (DEMO) return;
    const { error } = await sb().from('settings').upsert({ key, value });
    if (error) alert('שמירה נכשלה: ' + error.message);
  }, []);

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
    };
  }, [phase, email, data, save, saveMany, remove, setSetting, signOut, taskModal, aiOpen, aiContext, searchOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await sb().auth.getSession();
  return session?.access_token ?? null;
}
