import type { Field } from './ui';
import {
  CONTACT_KIND, CONTACT_STATUS, DECISION_STATUS, EVENT_KIND, EXPENSE_CATEGORIES, EXPENSE_STATUS, LINK_KIND, PROJECT_STATUS, opts,
} from '@/lib/labels';

export const PROJECT_FIELDS: Field[] = [
  { key: 'name', label: 'שם הפרויקט', type: 'text', required: true },
  { key: 'description', label: 'מטרה / תיאור', type: 'textarea' },
  { key: 'owner_id', label: 'אחראי/ת', type: 'manager', emptyLabel: 'ללא אחראי' },
  { key: 'status', label: 'סטטוס', type: 'select', options: opts(PROJECT_STATUS) },
  { key: 'start_date', label: 'התחלה', type: 'date' },
  { key: 'end_date', label: 'סיום', type: 'date' },
  { key: 'drive_url', label: 'תיקיית הדרייב של הפרויקט', type: 'url', placeholder: 'https://drive.google.com/drive/folders/…' },
  { key: 'color', label: 'צבע', type: 'color' },
];

export const EVENT_FIELDS: Field[] = [
  { key: 'title', label: 'כותרת', type: 'text', required: true },
  { key: 'kind', label: 'סוג', type: 'select', options: opts(EVENT_KIND) },
  { key: 'start_date', label: 'תאריך / התחלה', type: 'date', required: true },
  { key: 'end_date', label: 'סיום (לשלבים)', type: 'date' },
  { key: 'start_time', label: 'שעה', type: 'time' },
  { key: 'location', label: 'מיקום / קישור זום', type: 'text' },
  { key: 'project_id', label: 'פרויקט', type: 'project' },
  { key: 'owner_id', label: 'אחראי/ת', type: 'manager' },
  { key: 'notes', label: 'הערות', type: 'textarea' },
];

export const EXPENSE_FIELDS: Field[] = [
  { key: 'title', label: 'על מה', type: 'text', required: true },
  { key: 'amount', label: 'סכום (₪)', type: 'number', required: true },
  { key: 'date', label: 'תאריך', type: 'date' },
  { key: 'status', label: 'סטטוס', type: 'select', options: opts(EXPENSE_STATUS) },
  { key: 'category', label: 'קטגוריה', type: 'select', options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })) },
  { key: 'project_id', label: 'פרויקט', type: 'project' },
  { key: 'paid_by', label: 'מי שילם', type: 'text' },
  { key: 'receipt_url', label: 'קישור לקבלה', type: 'url' },
  { key: 'notes', label: 'הערות', type: 'textarea' },
];

export const CONTACT_FIELDS: Field[] = [
  { key: 'name', label: 'שם', type: 'text', required: true },
  { key: 'org', label: 'ארגון', type: 'text' },
  { key: 'title', label: 'תפקיד', type: 'text' },
  { key: 'kind', label: 'סוג', type: 'select', options: opts(CONTACT_KIND) },
  { key: 'status', label: 'סטטוס פנייה', type: 'select', options: opts(CONTACT_STATUS) },
  { key: 'topic', label: 'נושא / הקשר', type: 'text' },
  { key: 'email', label: 'מייל', type: 'email' },
  { key: 'phone', label: 'טלפון', type: 'text' },
  { key: 'project_id', label: 'פרויקט', type: 'project' },
  { key: 'owner_id', label: 'מי בקשר', type: 'manager', emptyLabel: 'לא נקבע' },
  { key: 'notes', label: 'הערות', type: 'textarea' },
];

export const MEETING_FIELDS: Field[] = [
  { key: 'title', label: 'כותרת', type: 'text', required: true },
  { key: 'date', label: 'תאריך', type: 'date', required: true },
  { key: 'notes', label: 'סיכום', type: 'textarea' },
  { key: 'doc_url', label: 'קישור למסמך', type: 'url' },
];

export const DECISION_FIELDS: Field[] = [
  { key: 'title', label: 'החלטה', type: 'text', required: true },
  { key: 'proposal', label: 'הצעה / פירוט', type: 'textarea' },
  { key: 'status', label: 'סטטוס', type: 'select', options: opts(DECISION_STATUS) },
  { key: 'decided_on', label: 'הוחלט בתאריך', type: 'date' },
  { key: 'project_id', label: 'פרויקט', type: 'project' },
  { key: 'notes', label: 'הערות', type: 'textarea' },
];

export const LINK_FIELDS: Field[] = [
  { key: 'title', label: 'שם', type: 'text', required: true },
  { key: 'url', label: 'כתובת', type: 'url', required: true },
  { key: 'kind', label: 'סוג', type: 'select', options: opts(LINK_KIND) },
  { key: 'project_id', label: 'פרויקט', type: 'project' },
  { key: 'pinned', label: 'להציג בקישורים המהירים בדף הבית', type: 'checkbox' },
];

export const MANAGER_FIELDS: Field[] = [
  { key: 'name', label: 'שם', type: 'text', required: true },
  { key: 'email', label: 'מייל Google להתחברות', type: 'email' },
  { key: 'role', label: 'תחומי אחריות', type: 'text' },
  { key: 'color', label: 'צבע', type: 'color' },
  { key: 'active', label: 'פעיל/ה (יכול/ה להתחבר)', type: 'checkbox' },
];

/** strip undefined/'' → null so Postgres gets clean values */
export function clean<T extends Record<string, unknown>>(v: T): T {
  const out: Record<string, unknown> = {};
  Object.entries(v).forEach(([k, x]) => { out[k] = x === '' || x === undefined ? null : x; });
  return out as T;
}

export function driveFolderId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/folders\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/);
  return m ? m[1] : null;
}

export const newSlug = () => 'p-' + Math.random().toString(36).slice(2, 8);
