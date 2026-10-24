'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, Phone, Plus } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { CONTACT_KIND, CONTACT_STATUS } from '@/lib/labels';
import { Avatars, Badge, Button, Card, Empty, PageHeader, ProjectLink, selectCls } from '@/components/ui';
import { CONTACT_FIELDS } from '@/components/forms';
import { useEditor } from '@/components/useEditor';

function ContactsInner() {
  const { data } = useHub();
  const editor = useEditor();
  const params = useSearchParams();
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [proj, setProj] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const id = params.get('id');
    const c = id && data.contacts.find((x) => x.id === id);
    if (c) editor.open('contacts', CONTACT_FIELDS, { ...c }, c.name);
  }, [params, data.contacts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = data.contacts.filter((c) =>
    (!kind || c.kind === kind) && (!status || c.status === status) && (!proj || c.project_id === proj) &&
    (!q || [c.name, c.org, c.topic, c.notes].some((x) => x?.toLowerCase().includes(q.toLowerCase()))));

  return (
    <div>
      <PageHeader title="אנשי קשר" subtitle="דוברים, מרצים, שותפים ופקולטה — ומי מטפל בכל אחד"
        actions={<Button variant="primary" onClick={() => editor.open('contacts', CONTACT_FIELDS, { kind: 'speaker', status: 'not_contacted' }, 'איש קשר חדש')}><Plus size={15} />איש קשר</Button>} />
      <div className="flex flex-wrap gap-2 mb-4">
        <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">כל הסוגים</option>{Object.entries(CONTACT_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">כל הסטטוסים</option>{Object.entries(CONTACT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={selectCls} value={proj} onChange={(e) => setProj(e.target.value)}>
          <option value="">כל הפרויקטים</option>{data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className={selectCls + ' flex-1 min-w-[140px]'} placeholder="חיפוש…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card>
        {list.length === 0 && <Empty>אין אנשי קשר להצגה</Empty>}
        <ul className="divide-y divide-stone-100">
          {list.map((c) => (
            <li key={c.id} onClick={() => editor.open('contacts', CONTACT_FIELDS, { ...c }, c.name)}
              className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 cursor-pointer hover:bg-stone-50 -mx-2 px-2 rounded-lg">
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm font-medium text-stone-800">{c.name}{c.org && <span className="font-normal text-stone-500"> · {c.org}</span>}</div>
                <div className="text-xs text-stone-500 mt-0.5">{CONTACT_KIND[c.kind]}{c.title && ` · ${c.title}`}{c.topic && ` · ${c.topic}`}</div>
              </div>
              <ProjectLink id={c.project_id} plain />
              {c.email && <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="text-stone-400 hover:text-indigo-600" title={c.email}><Mail size={15} /></a>}
              {c.phone && <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="text-stone-400 hover:text-indigo-600" title={c.phone}><Phone size={15} /></a>}
              <Badge cls={CONTACT_STATUS[c.status]?.cls}>{CONTACT_STATUS[c.status]?.label}</Badge>
              <Avatars ids={c.owner_ids} size={22} team={false} />
            </li>
          ))}
        </ul>
      </Card>
      {editor.element}
    </div>
  );
}

export default function ContactsPage() { return <Suspense><ContactsInner /></Suspense>; }
