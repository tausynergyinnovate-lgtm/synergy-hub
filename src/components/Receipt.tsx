'use client';

import { useRef, useState } from 'react';
import { Camera, FileText, Loader2, Paperclip, X } from 'lucide-react';
import { getAccessToken } from '@/lib/hub';

const DEMO = process.env.NEXT_PUBLIC_DEMO === '1';

/** Downscale big phone photos so uploads stay small (max 1800px, JPEG). */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/heic' || file.type === 'image/heif') return file;
  if (file.size < 900 * 1024) return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
}

export async function openReceipt(path: string) {
  // open the tab synchronously so mobile Safari doesn't block it
  const w = window.open('', '_blank');
  try {
    const token = await getAccessToken();
    const res = await fetch('/api/receipt?path=' + encodeURIComponent(path), { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    if (w) w.location.href = json.url; else window.location.href = json.url;
  } catch (e) {
    w?.close();
    alert('לא ניתן לפתוח את הקבלה: ' + (e instanceof Error ? e.message : e));
  }
}

export function ReceiptInput({ value, onChange }: { value: string | null; onChange: (path: string | null) => void }) {
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const upload = async (f: File | undefined) => {
    if (!f) return;
    setErr(''); setBusy(true);
    try {
      if (DEMO) { onChange('demo/' + f.name); return; }
      const file = await shrink(f);
      const fd = new FormData(); fd.append('file', file);
      const token = await getAccessToken();
      const res = await fetch('/api/receipt', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onChange(json.path);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (camRef.current) camRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const btn = 'inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50';
  return (
    <div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => upload(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => upload(e.target.files?.[0])} />
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm">
          <FileText size={16} className="text-emerald-600" />
          <button type="button" className="flex-1 text-start text-emerald-800 hover:underline" onClick={() => !DEMO && openReceipt(value)}>קבלה מצורפת — לצפייה</button>
          <button type="button" aria-label="הסרת הקבלה" className="text-stone-400 hover:text-red-600" onClick={() => onChange(null)}><X size={16} /></button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={busy} onClick={() => camRef.current?.click()}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}צילום קבלה
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
            <Paperclip size={15} />העלאת קובץ
          </button>
        </div>
      )}
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  );
}
