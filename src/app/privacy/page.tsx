export const metadata = { title: 'Privacy · Synergy Hub' };

export default function Privacy() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-12 text-stone-800 leading-relaxed">
      <h1 className="text-2xl font-bold mb-4">מדיניות פרטיות — Synergy Hub</h1>
      <p className="mb-3">Synergy Hub הוא כלי ניהול פנימי של צוות המנהלים של Synergy Innovate, קהילת יזמות רפואית באוניברסיטת תל אביב. הגישה מוגבלת למנהלי הקהילה בלבד.</p>
      <p className="mb-3">בהתחברות עם Google אנחנו מקבלים רק את השם וכתובת המייל שלך, ומשתמשים בהם אך ורק כדי לזהות אותך כמנהל/ת ולשייך אלייך משימות. איננו ניגשים למידע אחר בחשבון Google שלך.</p>
      <p className="mb-3">הנתונים (משימות, פרויקטים, אירועים, אנשי קשר והוצאות) נשמרים ב-Supabase ונגישים רק למנהלים פעילים. איננו מוכרים או משתפים מידע עם צד שלישי. טקסט שנשלח לעוזר ה-AI מעובד דרך Anthropic API לצורך הפקת הצעות בלבד.</p>
      <p className="mb-3">לבקשת מחיקה או לשאלות: <a className="underline" href="mailto:tausynergyinnovate@gmail.com">tausynergyinnovate@gmail.com</a></p>
      <hr className="my-8" />
      <h2 className="text-lg font-semibold mb-2" dir="ltr">Privacy Policy (English)</h2>
      <p dir="ltr" className="text-left">Synergy Hub is an internal management tool for the Synergy Innovate managers team (Tel Aviv University). Google sign-in is used only to read your name and email address to verify you are an authorized manager. Data is stored in Supabase, is accessible only to active managers, and is never sold or shared. Text sent to the AI assistant is processed via the Anthropic API solely to generate suggestions. Contact: tausynergyinnovate@gmail.com</p>
    </main>
  );
}
