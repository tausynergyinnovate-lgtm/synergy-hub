'use client';

import { useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { EXPENSE_STATUS, fmtDate, ils, todayISO } from '@/lib/labels';
import { Badge, Button, Card, Empty, PageHeader, ProjectLink, selectCls } from '@/components/ui';
import { EXPENSE_FIELDS } from '@/components/forms';
import { useEditor } from '@/components/useEditor';

export default function BudgetPage() {
  const { data } = useHub();
  const editor = useEditor();
  const [proj, setProj] = useState('');
  const [status, setStatus] = useState('');
  const sum = (xs: typeof data.expenses) => xs.reduce((s, x) => s + Number(x.amount), 0);
  const paid = data.expenses.filter((x) => x.status !== 'planned');
  const planned = data.expenses.filter((x) => x.status === 'planned');
  const toReimburse = data.expenses.filter((x) => x.status === 'paid' && x.paid_by);
  const list = data.expenses
    .filter((x) => (!proj || (proj === 'none' ? !x.project_id : x.project_id === proj)) && (!status || x.status === status))
    .sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1));
  const byProject = [...data.projects.map((p) => ({ id: p.id, rows: data.expenses.filter((x) => x.project_id === p.id) })),
    { id: null as string | null, rows: data.expenses.filter((x) => !x.project_id) }].filter((g) => g.rows.length);

  return (
    <div>
      <PageHeader title="תקציב" subtitle="מעקב הוצאות לפי פרויקט"
        actions={<Button variant="primary" onClick={() => editor.open('expenses', EXPENSE_FIELDS, { status: 'planned', category: 'אחר', date: todayISO() }, 'הוצאה חדשה')}><Plus size={15} />הוצאה</Button>} />

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'שולם', value: ils(sum(paid)) },
          { label: 'מתוכנן', value: ils(sum(planned)) },
          { label: 'ממתין להחזר', value: ils(sum(toReimburse)), sub: toReimburse.length ? `${toReimburse.length} הוצאות` : '' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-stone-200/80 px-4 py-3">
            <div className="text-xl font-bold tabular-nums">{s.value}</div>
            <div className="text-xs text-stone-500">{s.label}{s.sub ? ` · ${s.sub}` : ''}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="לפי פרויקט" className="lg:col-span-1">
          {byProject.length === 0 && <Empty>אין הוצאות עדיין</Empty>}
          <ul className="divide-y divide-stone-100">
            {byProject.map((g) => (
              <li key={g.id ?? 'none'} className="py-2 flex items-center gap-2 text-sm">
                <span className="flex-1">{g.id ? <ProjectLink id={g.id} /> : 'ללא פרויקט'}</span>
                <span className="tabular-nums font-medium">{ils(sum(g.rows.filter((x) => x.status !== 'planned')))}</span>
                {sum(g.rows.filter((x) => x.status === 'planned')) > 0 && <span className="tabular-nums text-xs text-stone-400">+{ils(sum(g.rows.filter((x) => x.status === 'planned')))}</span>}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="כל ההוצאות" className="lg:col-span-2" action={
          <div className="flex gap-2">
            <select className={selectCls + ' !py-1 text-xs'} value={proj} onChange={(e) => setProj(e.target.value)}>
              <option value="">כל הפרויקטים</option><option value="none">ללא פרויקט</option>
              {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className={selectCls + ' !py-1 text-xs'} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">כל הסטטוסים</option>
              {Object.entries(EXPENSE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        }>
          {list.length === 0 && <Empty>אין הוצאות להצגה</Empty>}
          <ul className="divide-y divide-stone-100">
            {list.map((x) => (
              <li key={x.id} onClick={() => editor.open('expenses', EXPENSE_FIELDS, { ...x }, 'עריכת הוצאה')}
                className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 cursor-pointer hover:bg-stone-50 -mx-2 px-2 rounded-lg">
                <span className="w-14 text-xs text-stone-500 tabular-nums">{fmtDate(x.date, true)}</span>
                <span className="flex-1 min-w-[140px] text-sm">{x.title}<span className="block text-xs text-stone-400">{[x.category, x.paid_by && `שילם/ה: ${x.paid_by}`].filter(Boolean).join(' · ')}</span></span>
                <ProjectLink id={x.project_id} plain />
                {x.receipt_url && <a href={x.receipt_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-stone-400 hover:text-indigo-600" title="קבלה"><ExternalLink size={14} /></a>}
                <Badge cls={EXPENSE_STATUS[x.status].cls}>{EXPENSE_STATUS[x.status].label}</Badge>
                <span className="tabular-nums font-semibold w-20 text-start">{ils(Number(x.amount))}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {editor.element}
    </div>
  );
}
