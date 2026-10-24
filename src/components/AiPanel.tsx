'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, FileText, Sparkles, X } from 'lucide-react';
import { getAccessToken, useHub } from '@/lib/hub';
import type { AiPlan, PlanTask } from '@/lib/aiPlan';
import { CONTACT_KIND, CONTACT_STATUS, EVENT_KIND, fmtDate, ils } from '@/lib/labels';
import { Badge, Button } from './ui';

type Source = { name: string; url?: string; kind: string };

type Msg =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; plan?: AiPlan; applied?: string; sources?: Source[] }
  | { role: 'error'; text: string };

const EXAMPLES = [
  'מתחילים לארגן את וובינר דצמבר עם ארז נעמן — תפרק לי את כל מה שצריך',
  'סיימתי לסדר את הדרייב',
  'מה פתוח אצל גל השבוע?',
  'מה כתוב במסמך התכנון השנתי על מחזור 4?',
  'הנה סיכום הפגישה של היום: …',
];

function hasChanges(p: AiPlan) {
  return Boolean(p.new_project || p.tasks?.length || p.task_updates?.length || p.events?.length || p.contacts?.length
    || p.contact_updates?.length || p.expenses?.length || p.decisions?.length);
}

export function AiPanel() {
  const { aiOpen, setAiOpen, aiContext, project, me, data: hubData } = useHub();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  if (!aiOpen) return null;
  const focus = project(aiContext.projectId);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const history = msgs.filter((m) => m.role !== 'error').map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.role === 'assistant' ? m.text + (m.plan && hasChanges(m.plan) ? `\n[הוצעו שינויים${m.applied ? ' ואושרו' : ''}]` : '') : m.text,
    }));
    setMsgs((m) => [...m, { role: 'user', text }]);
    setInput(''); setBusy(true);
    try {
      if (process.env.NEXT_PUBLIC_DEMO === '1') {
        await new Promise((r) => setTimeout(r, 600));
        setMsgs((m) => [...m, { role: 'assistant', text: 'מצב הדגמה — כך נראית הצעה של העוזר. בגרסה המחוברת Claude בונה אותה מהטקסט שלכם.', plan: demoPlan(hubData) }]);
        return;
      }
      const token = await getAccessToken();
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, projectId: aiContext.projectId, history, me: me?.id }),
      });
      const raw = await res.text();
      let json: { plan?: AiPlan; error?: string; sources?: Source[] } = {};
      try { json = JSON.parse(raw); } catch { /* server/platform returned non-JSON (e.g. timeout page) */ }
      if (!res.ok || !json.plan) throw new Error(json.error || (res.status === 504 ? 'העוזר לקח יותר מדי זמן — נסו שוב.' : 'משהו השתבש מול העוזר — נסו שוב.'));
      const plan = json.plan;
      setMsgs((m) => [...m, { role: 'assistant', text: plan.reply, plan, sources: json.sources }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'error', text: e instanceof Error ? e.message : String(e) }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end lg:justify-start bg-stone-900/20" onMouseDown={() => setAiOpen(false)}>
      <aside onMouseDown={(e) => e.stopPropagation()} className="w-full sm:w-[480px] h-full bg-[#fafaf9] shadow-2xl flex flex-col">
        <header className="flex items-center gap-2 px-4 h-14 border-b border-stone-200 bg-white">
          <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><Sparkles size={16} /></span>
          <div className="flex-1 leading-tight">
            <div className="font-semibold text-sm">עוזר AI</div>
            <div className="text-[11px] text-stone-400">{focus ? `בהקשר: ${focus.name}` : 'כותבים מה עושים — הוא מפרק ומשבץ'}</div>
          </div>
          {msgs.length > 0 && <Button variant="ghost" className="text-xs" onClick={() => setMsgs([])}>שיחה חדשה</Button>}
          <button onClick={() => setAiOpen(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500" aria-label="סגור"><X size={18} /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {msgs.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-stone-500 mb-3">כתבו בשפה חופשית. העוזר יציע משימות, תתי־משימות, אירועים ואנשי קשר — ושום דבר לא נשמר עד שתאשרו. הוא גם מחפש וקורא קבצים בדרייב של סינרגי, ואפשר להדביק קישור לקובץ.</p>
              {EXAMPLES.map((e) => (
                <button key={e} onClick={() => setInput(e)} className="block w-full text-start text-sm rounded-xl border border-stone-200 bg-white px-3 py-2 hover:border-indigo-300">{e}</button>
              ))}
            </div>
          )}
          {msgs.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-start"><div className="max-w-[85%] rounded-2xl rounded-ss-md bg-indigo-600 text-white text-sm px-3.5 py-2 whitespace-pre-wrap">{m.text}</div></div>
            ) : m.role === 'error' ? (
              <div key={i} className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{m.text}</div>
            ) : (
              <div key={i} className="space-y-2">
                <div className="max-w-[92%] rounded-2xl rounded-se-md bg-white border border-stone-200 text-sm px-3.5 py-2 whitespace-pre-wrap text-stone-800">{m.text}</div>
                {!!m.sources?.length && (
                  <div className="max-w-[92%] flex flex-wrap gap-1.5">
                    {m.sources.slice(0, 6).map((src) => (
                      <a key={src.name} href={src.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 hover:border-indigo-300 hover:text-indigo-700">
                        <FileText size={12} />{src.name}
                      </a>
                    ))}
                  </div>
                )}
                {m.plan && hasChanges(m.plan) && (
                  <PlanPreview plan={m.plan} applied={m.applied}
                    onApplied={(summary) => setMsgs((all) => all.map((x, j) => (j === i ? { ...x, applied: summary } as Msg : x)))} />
                )}
              </div>
            ),
          )}
          {busy && <div className="flex gap-1 px-2 py-3">{[0, 1, 2].map((d) => <span key={d} className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce" style={{ animationDelay: `${d * 120}ms` }} />)}</div>}
          <div ref={endRef} />
        </div>

        <form className="p-3 border-t border-stone-200 bg-white" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <div className="flex items-end gap-2 rounded-2xl border border-stone-200 px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="על מה עובדים?"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              className="flex-1 resize-none text-sm focus:outline-none max-h-40 bg-transparent [field-sizing:content]" />
            <button type="submit" disabled={!input.trim() || busy} className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40" aria-label="שליחה"><ArrowUp size={16} /></button>
          </div>
        </form>
      </aside>
    </div>
  );
}

// ───────── preview + apply ─────────
function PlanPreview({ plan: original, applied, onApplied }: { plan: AiPlan; applied?: string; onApplied: (s: string) => void }) {
  const hub = useHub();
  const { data, manager, project, save, saveMany } = hub;
  const [plan, setPlan] = useState<AiPlan>(original);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const on = (k: string) => !off.has(k);
  const toggle = (k: string) => setOff((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const setTask = (ref: string, patch: Partial<PlanTask>) => setPlan((p) => ({ ...p, tasks: p.tasks?.map((t) => (t.ref === ref ? { ...t, ...patch } : t)) }));

  const projName = (id?: string | null) => (id === 'new_project' ? plan.new_project?.name : project(id)?.name);
  const tasks = plan.tasks ?? [];
  const refs = new Set(tasks.map((t) => t.ref));
  const roots = tasks.filter((t) => !t.parent_ref || !refs.has(t.parent_ref));
  const kids = (ref: string) => tasks.filter((t) => t.parent_ref === ref);

  const apply = async () => {
    setBusy(true);
    const validM = (ids?: string[] | null) => (ids ?? []).filter((id) => data.managers.some((m) => m.id === id));
    let newPid: string | null = null;
    if (plan.new_project && on('np')) {
      const np = plan.new_project;
      const row = await save('projects', {
        slug: 'p-' + Math.random().toString(36).slice(2, 8), name: np.name, description: np.description ?? null,
        owner_ids: validM(np.owner_ids), start_date: np.start_date ?? null, end_date: np.end_date ?? null, status: 'planning',
        sort: data.projects.length + 1,
      });
      newPid = (row?.id as string) ?? null;
    }
    const validP = (id?: string | null) => (id === 'new_project' ? newPid : id && data.projects.some((p) => p.id === id) ? id : null);

    // tasks: create parents before children
    const refToId: Record<string, string> = {};
    const chosen = tasks.filter((t) => on('t:' + t.ref));
    let pending = [...chosen];
    let counted = 0;
    for (let round = 0; round < 5 && pending.length; round++) {
      const ready = pending.filter((t) => !t.parent_ref || !refs.has(t.parent_ref) || refToId[t.parent_ref] || !chosen.some((c) => c.ref === t.parent_ref));
      if (!ready.length) break;
      const rows = ready.map((t, i) => {
        const parent = t.parent_ref ? (refToId[t.parent_ref] ?? (data.tasks.some((x) => x.id === t.parent_ref) ? t.parent_ref : null)) : null;
        const parentTask = parent ? data.tasks.find((x) => x.id === parent) : null;
        return {
          title: t.title, notes: t.notes ?? null, assignee_ids: validM(t.assignee_ids),
          project_id: validP(t.project_id) ?? parentTask?.project_id ?? null,
          parent_id: parent, due_date: t.due_date || null, priority: t.priority ?? 'medium', sort: i,
        };
      });
      const out = await saveMany('tasks', rows);
      out.forEach((r, i) => { refToId[ready[i].ref] = r.id; });
      counted += out.length;
      pending = pending.filter((t) => !ready.includes(t));
    }
    const n = { upd: 0, ev: 0, ct: 0, ex: 0, dc: 0 };
    for (const [i, u] of (plan.task_updates ?? []).entries()) {
      if (!on('u:' + i) || !data.tasks.some((t) => t.id === u.id)) continue;
      const { id, ...patch } = u; if (patch.assignee_ids) patch.assignee_ids = validM(patch.assignee_ids); await save('tasks', { id, ...patch }); n.upd++;
    }
    const evs = (plan.events ?? []).filter((_, i) => on('e:' + i)).map((e) => ({ ...e, project_id: validP(e.project_id), owner_ids: validM(e.owner_ids), end_date: e.end_date || null }));
    n.ev = (await saveMany('events', evs)).length;
    const cts = (plan.contacts ?? []).filter((_, i) => on('c:' + i)).map((c) => ({ ...c, status: c.status ?? 'not_contacted', project_id: validP(c.project_id), owner_ids: validM(c.owner_ids) }));
    n.ct = (await saveMany('contacts', cts)).length;
    for (const [i, u] of (plan.contact_updates ?? []).entries()) {
      if (!on('cu:' + i) || !data.contacts.some((c) => c.id === u.id)) continue;
      await save('contacts', { id: u.id, status: u.status }); n.upd++;
    }
    const exs = (plan.expenses ?? []).filter((_, i) => on('x:' + i)).map((x) => ({ ...x, status: x.status ?? 'planned', project_id: validP(x.project_id) }));
    n.ex = (await saveMany('expenses', exs)).length;
    const dcs = (plan.decisions ?? []).filter((_, i) => on('d:' + i)).map((d) => ({ ...d, status: d.status ?? 'pending', project_id: validP(d.project_id) }));
    n.dc = (await saveMany('decisions', dcs)).length;

    const parts = [
      newPid && 'פרויקט חדש', counted && `${counted} משימות`, n.upd && `${n.upd} עדכונים`, n.ev && `${n.ev} אירועים`,
      n.ct && `${n.ct} אנשי קשר`, n.ex && `${n.ex} הוצאות`, n.dc && `${n.dc} החלטות`,
    ].filter(Boolean);
    onApplied('נוסף: ' + (parts.join(' · ') || 'כלום'));
    setBusy(false);
  };

  const sel = 'text-xs rounded-lg border border-stone-200 bg-white px-1.5 py-0.5';

  const renderTask = (t: PlanTask, depth: number): React.ReactNode => (
    <div key={t.ref} style={{ marginInlineStart: depth * 18 }}>
      <Row active={on('t:' + t.ref)} applied={!!applied} onToggle={() => toggle('t:' + t.ref)}>
        <div className="text-stone-800">{t.priority === 'high' && <span className="text-red-500">! </span>}{t.title}</div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-stone-500">
          {applied ? (
            <>{(t.assignee_ids ?? []).map((id) => manager(id)?.name).filter(Boolean).join(', ') || 'כל הצוות'}{t.due_date && <span>· {fmtDate(t.due_date)}</span>}</>
          ) : (
            <>
              <span className="inline-flex flex-wrap gap-1">
                {data.managers.filter((m) => m.active).map((m) => {
                  const on = (t.assignee_ids ?? []).includes(m.id);
                  return (
                    <button type="button" key={m.id} aria-pressed={on}
                      onClick={() => setTask(t.ref, { assignee_ids: on ? (t.assignee_ids ?? []).filter((x) => x !== m.id) : [...(t.assignee_ids ?? []), m.id] })}
                      className={`rounded-full border px-2 py-0.5 text-xs ${on ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-stone-200 bg-white text-stone-400'}`}>{m.name}</button>
                  );
                })}
              </span>
              <input type="date" className={sel} value={t.due_date ?? ''} onChange={(e) => setTask(t.ref, { due_date: e.target.value || null })} />
            </>
          )}
          {depth === 0 && projName(t.project_id) && <span>· {projName(t.project_id)}</span>}
        </div>
      </Row>
      {kids(t.ref).map((c) => renderTask(c, depth + 1))}
    </div>
  );

  return (
    <div className={`rounded-2xl border ${applied ? 'border-emerald-200 bg-emerald-50/40' : 'border-indigo-200 bg-white'} p-3`}>
      {plan.new_project && <Section title="פרויקט חדש"><Row active={on('np')} applied={!!applied} onToggle={() => toggle('np')}><span className="font-medium">{plan.new_project.name}</span>{plan.new_project.description && <div className="text-xs text-stone-500">{plan.new_project.description}</div>}</Row></Section>}
      {tasks.length > 0 && <Section title="משימות">{roots.map((t) => renderTask(t, 0))}</Section>}
      {!!plan.task_updates?.length && <Section title="עדכוני משימות">{plan.task_updates.map((u, i) => {
        const t = data.tasks.find((x) => x.id === u.id);
        return <Row key={i} active={on('u:' + i)} applied={!!applied} onToggle={() => toggle('u:' + i)}>{t?.title ?? 'משימה'} → {u.status === 'done' ? 'בוצע' : [u.status, u.due_date && fmtDate(u.due_date), u.assignee_ids?.length && u.assignee_ids.map((id) => manager(id)?.name).join(', '), u.title].filter(Boolean).join(' · ')}</Row>;
      })}</Section>}
      {!!plan.events?.length && <Section title="לוח זמנים">{plan.events.map((e, i) => (
        <Row key={i} active={on('e:' + i)} applied={!!applied} onToggle={() => toggle('e:' + i)}><Badge cls={EVENT_KIND[e.kind]?.cls}>{EVENT_KIND[e.kind]?.label}</Badge> {e.title} <span className="text-xs text-stone-500">· {fmtDate(e.start_date, true)}{e.end_date ? `–${fmtDate(e.end_date, true)}` : ''}</span></Row>
      ))}</Section>}
      {!!plan.contacts?.length && <Section title="אנשי קשר">{plan.contacts.map((c, i) => (
        <Row key={i} active={on('c:' + i)} applied={!!applied} onToggle={() => toggle('c:' + i)}>{c.name}{c.org && <span className="text-stone-500"> · {c.org}</span>} <span className="text-xs text-stone-500">({CONTACT_KIND[c.kind] ?? c.kind})</span></Row>
      ))}</Section>}
      {!!plan.contact_updates?.length && <Section title="עדכוני אנשי קשר">{plan.contact_updates.map((u, i) => (
        <Row key={i} active={on('cu:' + i)} applied={!!applied} onToggle={() => toggle('cu:' + i)}>{data.contacts.find((c) => c.id === u.id)?.name} → {CONTACT_STATUS[u.status]?.label}</Row>
      ))}</Section>}
      {!!plan.expenses?.length && <Section title="הוצאות">{plan.expenses.map((x, i) => (
        <Row key={i} active={on('x:' + i)} applied={!!applied} onToggle={() => toggle('x:' + i)}>{x.title} · <span className="tabular-nums">{ils(x.amount)}</span></Row>
      ))}</Section>}
      {!!plan.decisions?.length && <Section title="החלטות">{plan.decisions.map((d, i) => (
        <Row key={i} active={on('d:' + i)} applied={!!applied} onToggle={() => toggle('d:' + i)}>{d.title}{d.proposal && <span className="text-stone-500"> — {d.proposal}</span>}</Row>
      ))}</Section>}

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
        {applied ? (
          <span className="flex items-center gap-1.5 text-sm text-emerald-700"><Check size={16} />{applied}</span>
        ) : (
          <>
            <span className="text-xs text-stone-400">אפשר לבטל סימון ולשנות אחראי/תאריך</span>
            <Button variant="primary" disabled={busy} onClick={apply}><Check size={15} />{busy ? 'מוסיף…' : 'אישור והוספה'}</Button>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ active, applied, onToggle, children }: { active: boolean; applied: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={`flex items-start gap-2 py-1.5 ${active ? '' : 'opacity-40'}`}>
      {!applied && <input type="checkbox" className="mt-1 accent-indigo-600 cursor-pointer" checked={active} onChange={onToggle} aria-label="לכלול" />}
      <div className="flex-1 min-w-0 text-sm">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="pt-2 first:pt-0"><div className="text-[11px] font-semibold text-stone-400 mb-0.5">{title}</div>{children}</div>;
}

function demoPlan(d: { managers: { id: string; name: string }[]; projects: { id: string; slug: string }[]; tasks: { id: string; title: string }[]; contacts: { id: string; name: string }[] }): AiPlan {
  const m = (n: string) => d.managers.find((x) => x.name === n)?.id ?? null;
  const web = d.projects.find((p) => p.slug === 'webinars')?.id ?? null;
  const erez = d.contacts.find((c) => c.name.includes('ארז'))?.id;
  return {
    reply: 'פירקתי את וובינר דצמבר למשימת אב עם 6 תתי־משימות, שובצו לפי תחומי האחריות. חסר תאריך סופי — הנחתי 15.12, אפשר לשנות לפני האישור.',
    tasks: [
      { ref: 't1', title: 'וובינר דצמבר — AI ודאטה רפואי (ארז נעמן)', project_id: web, assignee_ids: [m('ניתאי')].filter(Boolean) as string[], due_date: '2026-12-15', priority: 'high' },
      { ref: 't2', parent_ref: 't1', title: 'לשלוח לארז נעמן מייל הזמנה עם 3 תאריכים אפשריים', project_id: web, assignee_ids: [m('ניתאי')].filter(Boolean) as string[], due_date: '2026-11-03' },
      { ref: 't3', parent_ref: 't1', title: 'לפתוח קישור זום ולהגדיר הקלטה', project_id: web, assignee_ids: [m('ניתאי')].filter(Boolean) as string[], due_date: '2026-12-01' },
      { ref: 't4', parent_ref: 't1', title: 'פוסט + סטורי באינסטגרם', project_id: web, assignee_ids: [m('גאיה')].filter(Boolean) as string[], due_date: '2026-12-08' },
      { ref: 't5', parent_ref: 't1', title: 'טופס הרשמה ותזכורת יום לפני', project_id: web, assignee_ids: [m('רעות')].filter(Boolean) as string[], due_date: '2026-12-14' },
      { ref: 't6', parent_ref: 't1', title: 'שליחת טופס משוב למשתתפים', project_id: web, assignee_ids: [m('רעות')].filter(Boolean) as string[], due_date: '2026-12-17' },
      { ref: 't7', parent_ref: 't1', title: 'מתנת תודה לדובר', project_id: web, assignee_ids: [m('גל')].filter(Boolean) as string[], due_date: '2026-12-15', priority: 'low' },
    ],
    events: [{ title: 'וובינר: AI ודאטה רפואי — ארז נעמן', kind: 'webinar', start_date: '2026-12-15', project_id: web, owner_ids: [m('ניתאי')].filter(Boolean) as string[] }],
    contact_updates: erez ? [{ id: erez, status: 'contacted' }] : [],
    expenses: [{ title: 'מתנת תודה לדובר', amount: 150, project_id: web, status: 'planned', category: 'מתנות לדוברים' }],
  };
}
