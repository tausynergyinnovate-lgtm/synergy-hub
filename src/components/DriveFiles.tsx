'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, FileSpreadsheet, FileText, Folder, Image as ImageIcon, Presentation } from 'lucide-react';
import { getAccessToken } from '@/lib/hub';

type F = { id: string; name: string; kind: string; modifiedTime?: string; webViewLink?: string };
const ICON: Record<string, typeof FileText> = { 'תיקייה': Folder, 'גיליון': FileSpreadsheet, 'מצגת': Presentation, 'תמונה': ImageIcon };

/** Files of a Drive folder, read through the hub's Drive bot (works for everyone, no Google login needed). */
export function DriveFiles({ folderUrl }: { folderUrl: string }) {
  const [files, setFiles] = useState<F[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let off = false;
    (async () => {
      if (process.env.NEXT_PUBLIC_DEMO === '1') { setFiles([]); return; }
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/drive?folder=' + encodeURIComponent(folderUrl), { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        if (!off) setFiles(j.files);
      } catch (e) { if (!off) setErr(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { off = true; };
  }, [folderUrl]);

  if (err) return <p className="text-sm text-amber-700">{err}</p>;
  if (!files) return <p className="text-sm text-stone-400">טוען קבצים…</p>;
  if (!files.length) return <p className="text-sm text-stone-400">התיקייה ריקה</p>;
  return (
    <ul className="divide-y divide-stone-100">
      {files.map((f) => {
        const Icon = ICON[f.kind] ?? FileText;
        return (
          <li key={f.id}>
            <a href={f.webViewLink} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 py-2 text-sm hover:bg-stone-50 -mx-2 px-2 rounded-lg">
              <Icon size={16} className={f.kind === 'תיקייה' ? 'text-amber-500' : 'text-stone-400'} />
              <span className="flex-1 truncate text-stone-800">{f.name}</span>
              <span className="text-xs text-stone-400">{f.kind}</span>
              {f.modifiedTime && <span className="text-xs text-stone-400 tabular-nums hidden sm:inline">{new Date(f.modifiedTime).toLocaleDateString('he-IL')}</span>}
              <ExternalLink size={12} className="text-stone-300" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
