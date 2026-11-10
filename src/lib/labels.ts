export const TASK_STATUS: Record<string, { label: string; cls: string }> = {
  todo: { label: 'לביצוע', cls: 'bg-stone-300' },
  in_progress: { label: 'בעבודה', cls: 'bg-blue-500' },
  blocked: { label: 'תקוע', cls: 'bg-orange-500' },
  done: { label: 'בוצע', cls: 'bg-emerald-500' },
};
export const PRIORITY: Record<string, { label: string; cls: string }> = {
  high: { label: 'גבוהה', cls: 'text-orange-700' },
  medium: { label: 'רגילה', cls: 'text-stone-500' },
  low: { label: 'נמוכה', cls: 'text-stone-400' },
};
export const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  planning: { label: 'בתכנון', cls: 'bg-amber-500' },
  active: { label: 'פעיל', cls: 'bg-blue-500' },
  on_hold: { label: 'מושהה', cls: 'bg-stone-300' },
  done: { label: 'הושלם', cls: 'bg-emerald-500' },
};
export const EVENT_KIND: Record<string, { label: string; cls: string }> = {
  phase: { label: 'שלב', cls: 'bg-indigo-500' },
  event: { label: 'אירוע', cls: 'bg-pink-500' },
  webinar: { label: 'וובינר', cls: 'bg-violet-500' },
  meeting: { label: 'פגישה', cls: 'bg-sky-500' },
  deadline: { label: 'דדליין', cls: 'bg-orange-500' },
};
export const EXPENSE_STATUS: Record<string, { label: string; cls: string }> = {
  planned: { label: 'מתוכנן', cls: 'bg-stone-300' },
  paid: { label: 'שולם', cls: 'bg-blue-500' },
  reimbursed: { label: 'הוחזר', cls: 'bg-emerald-500' },
};
export const EXPENSE_CATEGORIES = ['כיבוד', 'מקום', 'הדפסה ומרצ׳נדייז', 'שיווק', 'מתנות לדוברים', 'תוכנה', 'נסיעות', 'אחר'];
export const CONTACT_KIND: Record<string, string> = {
  speaker: 'דובר/ת', lecturer: 'מרצה', mentor: 'מנטור/ית', partner: 'שותף', faculty: 'פקולטה',
  sponsor: 'ספונסר', alumni: 'בוגר/ת', other: 'אחר',
};
export const CONTACT_STATUS: Record<string, { label: string; cls: string }> = {
  not_contacted: { label: 'לא נפנה', cls: 'bg-stone-300' },
  contacted: { label: 'נפנה', cls: 'bg-blue-500' },
  confirmed: { label: 'אישר/ה', cls: 'bg-emerald-500' },
  declined: { label: 'סירב/ה', cls: 'bg-stone-500' },
  done: { label: 'הסתיים', cls: 'bg-stone-300' },
};
export const DECISION_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'ממתין', cls: 'bg-amber-500' },
  approved: { label: 'אושר', cls: 'bg-emerald-500' },
  rejected: { label: 'נדחה', cls: 'bg-stone-500' },
};
export const LINK_KIND: Record<string, string> = {
  drive: 'תיקייה', doc: 'מסמך', sheet: 'גיליון', form: 'טופס', site: 'אתר', other: 'קישור',
};

export const opts = (m: Record<string, { label: string } | string>) =>
  Object.entries(m).map(([value, v]) => ({ value, label: typeof v === 'string' ? v : v.label }));

// ───────── dates (Asia/Jerusalem) ─────────
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
}
export function fmtDate(iso: string | null | undefined, withYear = false): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return withYear ? `${+d}.${+m}.${y.slice(2)}` : `${+d}.${+m}`;
}
export function dueLabel(iso: string | null): { text: string; cls: string } | null {
  if (!iso) return null;
  const n = daysBetween(todayISO(), iso);
  if (n < 0) return { text: `באיחור ${-n} ימים`, cls: 'text-signal font-medium' };
  if (n === 0) return { text: 'היום', cls: 'text-orange-700 font-medium' };
  if (n === 1) return { text: 'מחר', cls: 'text-orange-700' };
  if (n <= 7) return { text: `בעוד ${n} ימים`, cls: 'text-stone-700' };
  return { text: fmtDate(iso, n > 300), cls: 'text-stone-500' };
}
export const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
export const ils = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL');

import type { HubEvent } from './types';
export function gcalLink(e: HubEvent): string {
  const s = e.start_date.replace(/-/g, '');
  const endD = new Date((e.end_date ?? e.start_date) + 'T12:00:00Z'); endD.setUTCDate(endD.getUTCDate() + 1);
  const end = endD.toISOString().slice(0, 10).replace(/-/g, '');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${s}/${end}`, details: e.notes ?? '', location: e.location ?? '', ctz: 'Asia/Jerusalem' });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}

