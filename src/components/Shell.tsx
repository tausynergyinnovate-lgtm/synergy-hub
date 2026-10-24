'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CalendarRange, CheckSquare, FolderKanban, Home, LogOut, Menu, Notebook, Plus, Search, Settings, Sparkles, Users, Wallet, X,
} from 'lucide-react';
import { useHub } from '@/lib/hub';
import { Avatar, Button } from './ui';
import { TaskModal } from './tasks';
import { AiPanel } from './AiPanel';
import { SearchDialog } from './SearchDialog';

const NAV = [
  { href: '/', label: 'בית', icon: Home },
  { href: '/tasks', label: 'משימות', icon: CheckSquare },
  { href: '/projects', label: 'פרויקטים', icon: FolderKanban },
  { href: '/timeline', label: 'לוח זמנים', icon: CalendarRange },
  { href: '/budget', label: 'תקציב', icon: Wallet },
  { href: '/contacts', label: 'אנשי קשר', icon: Users },
  { href: '/meetings', label: 'פגישות והחלטות', icon: Notebook },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-sm">S</span>
      <span className="leading-tight">
        <span className="block font-bold text-stone-900 text-[15px]">Synergy Hub</span>
        <span className="block text-[11px] text-stone-400">ניהול הקהילה</span>
      </span>
    </Link>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-6"><div className="max-w-md w-full text-center space-y-4">{children}</div></div>;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const hub = useHub();
  const { phase, email, me, data, signOut, openNewTask, openAi, setSearchOpen } = hub;
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setSearchOpen]);

  if (pathname === '/login' || pathname === '/privacy') return <>{children}</>;
  if (phase === 'unconfigured') return (
    <Center>
      <Logo />
      <p className="text-stone-600">חסרים משתני הסביבה של Supabase. הוסיפו את <code dir="ltr">NEXT_PUBLIC_SUPABASE_URL</code> ו-<code dir="ltr">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (ראו README).</p>
    </Center>
  );
  if (phase === 'loading' || phase === 'signed_out') return (
    <Center><div className="w-8 h-8 mx-auto rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" /></Center>
  );
  if (phase === 'not_manager') return (
    <Center>
      <div className="flex justify-center"><Logo /></div>
      <h1 className="text-xl font-bold">אין לך גישה להאב</h1>
      <p className="text-stone-600 text-sm">התחברת עם <span dir="ltr" className="font-medium">{email}</span>, והמייל הזה לא ברשימת המנהלים. בקשו ממנהל להוסיף אותו במסך ״צוות״.</p>
      <Button onClick={signOut}><LogOut size={15} />התחברות עם חשבון אחר</Button>
    </Center>
  );

  const openCount = (id: string) => data.tasks.filter((t) => t.assignee_ids?.includes(id) && t.status !== 'done').length;
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4"><Logo /></div>
      <div className="px-3">
        <button onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-400 hover:border-stone-300">
          <Search size={15} /><span className="flex-1 text-start">חיפוש…</span><kbd className="text-[10px] font-sans" dir="ltr">⌘K</kbd>
        </button>
      </div>
      <div className="px-3 mt-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${isActive(href) ? 'bg-white shadow-sm text-stone-900 font-medium' : 'text-stone-600 hover:bg-white/60'}`}>
            <Icon size={17} className={isActive(href) ? 'text-indigo-600' : 'text-stone-400'} />{label}
          </Link>
        ))}
      </div>
      <div className="px-6 mt-6 mb-1.5 text-[11px] font-semibold text-stone-400">לוחות אישיים</div>
      <div className="px-3 space-y-0.5">
        {data.managers.filter((m) => m.active).map((m) => (
          <Link key={m.id} href={`/people/${m.id}`}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm ${pathname === `/people/${m.id}` ? 'bg-white shadow-sm font-medium' : 'text-stone-600 hover:bg-white/60'}`}>
            <Avatar id={m.id} size={20} /><span className="flex-1">{m.name}{me?.id === m.id && <span className="text-stone-400"> (אני)</span>}</span>
            <span className="text-xs text-stone-400 tabular-nums">{openCount(m.id) || ''}</span>
          </Link>
        ))}
      </div>
      <div className="mt-auto px-3 pb-4 pt-4 space-y-0.5">
        <Link href="/team" className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${isActive('/team') ? 'bg-white shadow-sm font-medium' : 'text-stone-600 hover:bg-white/60'}`}>
          <Settings size={17} className="text-stone-400" />צוות והגדרות
        </Link>
        <button onClick={signOut} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-stone-500 hover:bg-white/60">
          <LogOut size={17} className="text-stone-400" />התנתקות
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* desktop sidebar (right side in RTL) */}
      <aside className="hidden lg:block w-64 shrink-0 bg-stone-100/70 border-e border-stone-200/70 sticky top-0 h-screen overflow-y-auto">{sidebar}</aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-40 bg-stone-900/30" onClick={() => setDrawer(false)}>
          <aside className="absolute top-0 bottom-0 right-0 w-72 bg-stone-100 overflow-y-auto" onClick={(e) => e.stopPropagation()}>{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-[#fafaf9]/85 backdrop-blur border-b border-stone-200/60">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 h-14 flex items-center gap-2">
            <button className="lg:hidden p-2 -ms-2 rounded-lg hover:bg-stone-100" onClick={() => setDrawer(true)} aria-label="תפריט"><Menu size={20} /></button>
            <div className="lg:hidden"><Logo /></div>
            <div className="flex-1" />
            <button className="lg:hidden p-2 rounded-lg hover:bg-stone-100 text-stone-600" onClick={() => setSearchOpen(true)} aria-label="חיפוש"><Search size={19} /></button>
            <Button className="hidden sm:inline-flex" onClick={() => openNewTask({ assignee_ids: me ? [me.id] : [] })}><Plus size={15} />משימה</Button>
            <Button variant="primary" onClick={() => openAi()}><Sparkles size={15} /><span className="hidden sm:inline">עוזר AI</span></Button>
            {me && <Link href={`/people/${me.id}`} className="ms-1" aria-label="הלוח שלי"><Avatar id={me.id} size={30} /></Link>}
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 lg:px-8 py-6 pb-28 lg:pb-10">{children}</main>
      </div>

      {/* mobile bottom bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-stone-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16 text-[11px]">
          {[
            { href: '/', label: 'בית', icon: Home },
            { href: '/tasks', label: 'משימות', icon: CheckSquare },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex flex-col items-center justify-center gap-1 ${isActive(href) ? 'text-indigo-600' : 'text-stone-500'}`}><Icon size={20} />{label}</Link>
          ))}
          <button onClick={() => openAi()} className="flex items-center justify-center">
            <span className="w-12 h-12 -mt-5 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200"><Sparkles size={22} /></span>
          </button>
          <Link href="/projects" className={`flex flex-col items-center justify-center gap-1 ${isActive('/projects') ? 'text-indigo-600' : 'text-stone-500'}`}><FolderKanban size={20} />פרויקטים</Link>
          <Link href={me ? `/people/${me.id}` : '/team'} className={`flex flex-col items-center justify-center gap-1 ${pathname.startsWith('/people') ? 'text-indigo-600' : 'text-stone-500'}`}>
            {me ? <Avatar id={me.id} size={20} /> : <X size={20} />}שלי
          </Link>
        </div>
      </nav>

      <TaskModal />
      <AiPanel />
      <SearchDialog />
    </div>
  );
}
