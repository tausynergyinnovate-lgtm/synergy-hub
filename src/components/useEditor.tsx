'use client';

import { useState } from 'react';
import { useHub } from '@/lib/hub';
import type { TableName } from '@/lib/types';
import { FormModal, type Field } from './ui';
import { clean } from './forms';

type Row = Record<string, unknown> & { id?: string };

/** One reusable add/edit dialog for any table. */
export function useEditor() {
  const { save, remove, removeWithUndo } = useHub();
  const [state, setState] = useState<{ table: TableName; row: Row; fields: Field[]; title: string; transform?: (r: Row) => Row } | null>(null);

  const open = (table: TableName, fields: Field[], row: Row, title: string, transform?: (r: Row) => Row) =>
    setState({ table, fields, row, title, transform });

  const element = (
    <FormModal
      open={!!state}
      onClose={() => setState(null)}
      title={state?.title ?? ''}
      fields={state?.fields ?? []}
      initial={state?.row ?? {}}
      onSubmit={async (v: Row) => {
        if (!state) return;
        const r = clean(state.transform ? state.transform(v) : v);
        // amount is optional in the form but NOT NULL in the DB — an empty amount is stored as 0 and filled in later
        if (state.table === 'expenses' && r.amount == null) r.amount = 0;
        // a link only needs its URL — the name defaults to the site's address
        if (state.table === 'links' && !r.title && typeof r.url === 'string') {
          try { r.title = new URL(r.url).hostname.replace(/^www\./, ''); } catch { r.title = r.url; }
        }
        return save(state.table, r);
      }}
      onDelete={state?.row.id ? async () => {
        if (!state?.row.id) return;
        // removing a manager is rare and hard to undo for someone mid-session: keep explicit friction
        if (state.table === 'managers') {
          const name = String(state.row.name ?? '');
          if (prompt(`כדי למחוק לצמיתות, הקלידו את השם: ${name}\n(עדיף לסמן ״לא פעיל/ה״ — המשימות נשמרות)`) !== name) return false;
          await remove(state.table, state.row.id); return;
        }
        const name = String(state.row.title ?? state.row.name ?? '');
        removeWithUndo(state.table, state.row.id, name ? `״${name}״ נמחק` : 'נמחק');
      } : undefined}
    />
  );
  return { open, element };
}
