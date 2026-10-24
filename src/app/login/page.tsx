'use client';

import { useState } from 'react';
import { isConfigured, sb } from '@/lib/supabase';

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const login = async () => {
    setBusy(true); setErr('');
    const { error } = await sb().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/', queryParams: { prompt: 'select_account' } },
    });
    if (error) { setErr(error.message); setBusy(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_#e0e7ff_0%,_#fafaf9_55%)]">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-stone-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white flex items-center justify-center font-bold text-2xl shadow">S</div>
        <h1 className="mt-4 text-2xl font-bold">Synergy Hub</h1>
        <p className="text-sm text-stone-500 mt-1">מרכז הניהול של צוות Synergy Innovate</p>
        <button onClick={login} disabled={busy || !isConfigured}
          className="mt-7 w-full flex items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white py-3 font-medium hover:bg-stone-50 disabled:opacity-50">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          {busy ? 'מתחבר…' : 'התחברות עם Google'}
        </button>
        {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
        {!isConfigured && <p className="text-xs text-stone-400 mt-3">חסרים משתני סביבה של Supabase</p>}
        <p className="text-xs text-stone-400 mt-6">הכניסה למנהלי הקהילה בלבד · <a href="/privacy" className="underline">פרטיות</a></p>
      </div>
    </div>
  );
}
