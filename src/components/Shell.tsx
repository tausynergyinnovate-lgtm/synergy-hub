'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  CalendarRange, CheckSquare, FolderKanban, Home, LayoutGrid, LogOut, Notebook, Plus, Search, Settings, Sparkles, Users, Wallet,
} from 'lucide-react';
import { useHub } from '@/lib/hub';
import { Avatar, Button } from './ui';
import { TaskModal } from './tasks';
import { AiPanel } from './AiPanel';
import { SearchDialog } from './SearchDialog';

// Sidebar (desktop): every section. Tab bar (phone/tablet): five tabs, the rest live under "ניהול".
const NAV = [
  { href: '/', label: 'בית', icon: Home },
  { href: '/tasks', label: 'משימות', icon: CheckSquare },
  { href: '/projects', label: 'פרויקטים', icon: FolderKanban },
  { href: '/timeline', label: 'לוח זמנים', icon: CalendarRange },
  { href: '/budget', label: 'תקציב', icon: Wallet },
  { href: '/contacts', label: 'אנשי קשר', icon: Users },
  { href: '/meetings', label: 'פגישות והחלטות', icon: Notebook },
];
const MANAGE_PATHS = ['/manage', '/budget', '/contacts', '/meetings', '/people', '/team'];
const TABS = [
  { href: '/', label: 'בית', icon: Home },
  { href: '/tasks', label: 'משימות', icon: CheckSquare },
  { href: '/projects', label: 'פרויקטים', icon: FolderKanban },
  { href: '/timeline', label: 'זמנים', icon: CalendarRange },
  { href: '/manage', label: 'ניהול', icon: LayoutGrid },
];

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <span aria-hidden className="rounded-[30%] bg-accent text-white flex items-center justify-center font-display font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.5 }}>S</span>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-xl" aria-label="Synergy Hub — דף הבית">
      <LogoMark />
      <span className="leading-tight">
        <span className="block font-display font-semibold text-stone-900 text-[0.9375rem]">Synergy Hub</span>
        <span className="block text-xs text-stone-500">ניהול הקהילה</span>
      </span>
    </Link>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-6"><div className="max-w-md w-full text-center space-y-4">{children}</div></div>;
}

/** The hub's signature: a composer that is always waiting at the bottom. Type what's happening, the AI turns it into work. */
function Composer({ onOpen }: { onOpen: () => void }) {
  return (
    <button onClick={onOpen} aria-label="עוזר AI — על מה עובדים?"
      className="glass press w-full flex items-center gap-3 rounded-full ps-2 pe-4 h-12 text-start">
      <span className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shrink-0"><Sparkles size={18} /></span>
      <span className="flex-1 truncate text-stone-500">על מה עובדים?</span>
    </button>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const hub = useHub();
  const { phase, email, me, data, signOut, openNewTask, openAi, setSearchOpen } = hub;
  const pathname = usePathname();

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
      <div className="flex justify-center"><Logo /></div>
      <p className="text-stone-600">חסרים משתני הסביבה של Supabase. הוסיפו את <code dir="ltr">NEXT_PUBLIC_SUPABASE_URL</code> ו-<code dir="ltr">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (ראו README).</p>
    </Center>
  );
  if (phase === 'loading' || phase === 'signed_out') return (
    <Center><div role="status" aria-label="טוען" className="w-8 h-8 mx-auto rounded-full border-2 border-stone-200 border-t-link animate-spin" /></Center>
  );
  if (phase === 'not_manager') return (
    <Center>
      <div className="flex justify-center"><Logo /></div>
      <h1 className="text-xl font-semibold">אין לך גישה להאב</h1>
      <p className="text-stone-600 text-sm">התחברת עם <span dir="ltr" className="font-medium">{email}</span>, והמייל הזה לא ברשימת המנהלים. בקשו ממנהל להוסיף אותו במסך ״צוות״.</p>
      <Button onClick={signOut}><LogOut size={16} />התחברות עם חשבון אחר</Button>
    </Center>
  );

  const openCount = (id: string) => data.tasks.filter((t) => t.assignee_ids?.includes(id) && t.status !== 'done').length;
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const tabActive = (href: string) => (href === '/manage' ? MANAGE_PATHS.some((p) => pathname.startsWith(p)) : isActive(href));
  const row = (on: boolean) => `flex items-center gap-2.5 rounded-lg px-2.5 min-h-tap text-sm transition-colors ${on ? 'bg-stone-200/70 text-stone-900 font-medium' : 'text-stone-700 hover:bg-stone-200/40'}`;

  return (
    <div className="min-h-screen lg:flex">
      {/* ───── Desktop sidebar (leading edge = right in RTL) ───── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen overflow-y-auto bg-stone-100/80 border-e border-stone-200">
        <div className="px-4 pt-5 pb-4"><Logo /></div>
        <div className="px-3">
          <button onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 rounded-lg bg-stone-200/60 px-2.5 min-h-tap text-sm text-stone-500 hover:bg-stone-200">
            <Search size={16} /><span className="flex-1 text-start">חיפוש</span><kbd className="text-xs font-sans text-stone-400" dir="ltr">⌘K</kbd>
          </button>
        </div>
        <nav aria-label="ניווט ראשי" className="px-3 mt-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={row(isActive(href))}>
              <Icon size={18} className={isActive(href) ? 'text-link' : 'text-stone-500'} strokeWidth={isActive(href) ? 2.3 : 1.9} />{label}
            </Link>
          ))}
        </nav>
        <div className="px-5 mt-6 mb-1.5 text-xs font-semibold text-stone-500">לוחות אישיים</div>
        <nav aria-label="לוחות אישיים" className="px-3 space-y-0.5">
          {data.managers.filter((m) => m.active).map((m) => {
            const on = pathname === `/people/${m.id}`;
            return (
              <Link key={m.id} href={`/people/${m.id}`} aria-current={on ? 'page' : undefined} className={row(on)}>
                <Avatar id={m.id} size={22} /><span className="flex-1">{m.name}{me?.id === m.id && <span className="text-stone-500"> (אני)</span>}</span>
                {openCount(m.id) > 0 && <span className="text-xs text-stone-500 tabular-nums" aria-label={`${openCount(m.id)} משימות פתוחות`}>{openCount(m.id)}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 mt-4 space-y-0.5">
          <Link href="/team" aria-current={isActive('/team') ? 'page' : undefined} className={row(isActive('/team'))}>
            <Settings size={18} className="text-stone-500" />צוות והגדרות
          </Link>
          <button onClick={signOut} className={row(false) + ' w-full'}>
            <LogOut size={18} className="text-stone-500" />התנתקות
          </button>
        </div>
        <div className="h-6 shrink-0" />
      </aside>

      <div className="flex-1 min-w-0">
        {/* ───── Top bar: floats over content with a scroll-edge fade ───── */}
        <header className="sticky top-0 z-30 scroll-edge-top">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 h-14 flex items-center gap-1">
            <div className="lg:hidden"><Logo /></div>
            <div className="flex-1" />
            <button className="lg:hidden w-tap h-tap flex items-center justify-center rounded-full text-stone-700 hover:bg-stone-200/60" onClick={() => setSearchOpen(true)} aria-label="חיפוש"><Search size={21} /></button>
            <button className="lg:hidden w-tap h-tap flex items-center justify-center rounded-full text-stone-700 hover:bg-stone-200/60" onClick={() => openNewTask({ assignee_ids: me ? [me.id] : [] })} aria-label="משימה חדשה"><Plus size={23} /></button>
            <Button className="hidden lg:inline-flex" onClick={() => openNewTask({ assignee_ids: me ? [me.id] : [] })}><Plus size={16} />משימה חדשה</Button>
            {me && <Link href={`/people/${me.id}`} className="w-tap h-tap flex items-center justify-center rounded-full lg:ms-1" aria-label="הלוח שלי"><Avatar id={me.id} size={30} /></Link>}
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 lg:px-8 pt-2 pb-44 lg:pb-28">{children}</main>
      </div>

      {/* ───── Desktop: composer floats at the bottom of the content column ───── */}
      <div className="hidden lg:block fixed bottom-6 z-30 start-64 end-0 pointer-events-none">
        <div className="max-w-xl mx-auto px-8 pointer-events-auto"><Composer onOpen={() => openAi()} /></div>
      </div>

      {/* ───── Phone/tablet: composer + floating tab bar ───── */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 pointer-events-none">
        <div className="scroll-edge-bottom absolute inset-0 -top-6" aria-hidden />
        <div className="relative max-w-lg mx-auto px-3 space-y-2 pb-[max(env(safe-area-inset-bottom),10px)] pointer-events-auto">
          <Composer onOpen={() => openAi()} />
          <nav aria-label="ניווט ראשי" className="glass rounded-[28px] grid grid-cols-5 h-[60px] px-1">
            {TABS.map(({ href, label, icon: Icon }) => {
              const on = tabActive(href);
              return (
                <Link key={href} href={href} aria-current={on ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-[22px] my-1 text-[0.6875rem] ${on ? 'text-link font-semibold bg-stone-200/50' : 'text-stone-600'}`}>
                  <Icon size={22} strokeWidth={on ? 2.4 : 1.9} />{label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <TaskModal />
      <AiPanel />
      <SearchDialog />
    </div>
  );
}
