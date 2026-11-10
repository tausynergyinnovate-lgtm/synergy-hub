'use client';

import Link from 'next/link';
import { ChevronLeft, LogOut, Notebook, Settings, Users, Wallet } from 'lucide-react';
import { useHub } from '@/lib/hub';
import { ils } from '@/lib/labels';
import { Avatar, PageHeader } from '@/components/ui';

// Phone/tablet "ניהול" tab: everything that doesn't get its own tab, as an inset grouped list.
function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section>
      {title && <h2 className="px-4 mb-1.5 text-xs font-semibold text-stone-500 font-[inherit]">{title}</h2>}
      <ul className="bg-surface rounded-card overflow-hidden divide-y divide-stone-200">{children}</ul>
    </section>
  );
}
function Row({ href, icon, label, detail, onClick, tone }: { href?: string; icon: React.ReactNode; label: string; detail?: React.ReactNode; onClick?: () => void; tone?: 'signal' }) {
  const inner = (
    <>
      <span className="shrink-0">{icon}</span>
      <span className={`flex-1 ${tone === 'signal' ? 'text-signal' : 'text-stone-900'}`}>{label}</span>
      {detail !== undefined && <span className="text-stone-500 text-sm tabular-nums">{detail}</span>}
      {href && <ChevronLeft size={18} className="text-stone-400" aria-hidden />}
    </>
  );
  const cls = 'flex items-center gap-3 px-4 min-h-[48px] w-full text-start active:bg-stone-100';
  return <li>{href ? <Link href={href} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>}</li>;
}
const Tile = ({ bg, children }: { bg: string; children: React.ReactNode }) => (
  <span aria-hidden className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: bg }}>{children}</span>
);

export default function ManagePage() {
  const { data, me, signOut } = useHub();
  const open = (id: string) => data.tasks.filter((t) => t.assignee_ids?.includes(id) && t.status !== 'done').length;
  const spent = data.expenses.filter((x) => x.status !== 'planned').reduce((s, x) => s + Number(x.amount), 0);
  const pending = data.decisions.filter((d) => d.status === 'pending').length;
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="ניהול" />
      <Group>
        <Row href="/budget" icon={<Tile bg="#2f9e5f"><Wallet size={17} /></Tile>} label="תקציב" detail={ils(spent)} />
        <Row href="/contacts" icon={<Tile bg="#0a7cff"><Users size={17} /></Tile>} label="אנשי קשר" detail={data.contacts.length} />
        <Row href="/meetings" icon={<Tile bg="#8a5cf0"><Notebook size={17} /></Tile>} label="פגישות והחלטות" detail={pending ? `${pending} ממתינות` : undefined} />
      </Group>
      <Group title="לוחות אישיים">
        {data.managers.filter((m) => m.active).map((m) => (
          <Row key={m.id} href={`/people/${m.id}`} icon={<Avatar id={m.id} size={32} />} label={m.name + (me?.id === m.id ? ' (אני)' : '')} detail={open(m.id) ? `${open(m.id)} פתוחות` : undefined} />
        ))}
      </Group>
      <Group>
        <Row href="/team" icon={<Tile bg="#8e8e93"><Settings size={17} /></Tile>} label="צוות והגדרות" />
        <Row onClick={signOut} icon={<Tile bg="#aeaeb2"><LogOut size={17} /></Tile>} label="התנתקות" tone="signal" />
      </Group>
    </div>
  );
}
