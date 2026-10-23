# Synergy Hub

מרכז הניהול של צוות המנהלים של Synergy Innovate: משימות ותתי־משימות, פרויקטים רוחביים, לוח זמנים, תקציב, אנשי קשר, פגישות והחלטות, לוח אישי לכל מנהל — ועוזר AI שמפרק עבודה למשימות ומשבץ אותן.

**Stack:** Next.js 14 (Vercel) · Supabase (Postgres + Google login + Realtime) · Claude API

---

## הקמה (פעם אחת, ~30 דקות)

כל החשבונות על **tausynergyinnovate@gmail.com** — ההאב שייך לסינרגי, לא למנהל מסוים.

### 1. Supabase
1. נכנסים ל-supabase.com → New project (אזור: `eu-central-1` / Frankfurt). שומרים את סיסמת ה-DB.
2. **SQL Editor** → מדביקים ומריצים את `supabase/schema.sql`, ואז את `supabase/seed.sql`.
3. **Project Settings → API**: מעתיקים `Project URL`, `anon public` ו-`service_role`.

### 2. Google login
1. console.cloud.google.com → פרויקט חדש "Synergy Hub".
2. **APIs & Services → OAuth consent screen**: External, שם האפליקציה Synergy Hub, מייל התמיכה של סינרגי. Publish app.
3. **Credentials → Create credentials → OAuth client ID** → Web application.
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. מעתיקים Client ID + Client Secret.
5. ב-Supabase: **Authentication → Providers → Google** → מדביקים ומפעילים.
6. ב-Supabase: **Authentication → URL Configuration** → Site URL = כתובת ה-Vercel (שלב 4), וגם ב-Redirect URLs.

### 3. Anthropic
console.anthropic.com → API Keys → Create. מומלץ להגדיר תקרת הוצאה חודשית ב-Billing → Limits.

### 4. GitHub + Vercel
1. מעלים את התיקייה ל-repo פרטי ב-GitHub.
2. vercel.com → Add New Project → בוחרים את ה-repo.
3. Environment Variables (לפי `.env.example`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`
4. Deploy → מעדכנים את ה-Site URL ב-Supabase (שלב 2.6).

### 5. בתוך ההאב
1. נכנסים עם `nitai.dob@gmail.com` (המנהל הראשון ב-seed).
2. **צוות והגדרות**: מוסיפים את המיילים של גאיה, יאנה, גל ורעות. מרגע זה הם יכולים להיכנס.
3. מגדירים את מזהה לוח השנה ואת תיקיית השורש בדרייב.
4. מעתיקים את קישור פיד הלוח → בחשבון Google של סינרגי: Calendar → Other calendars → + → From URL.

---

## איך זה עובד

| | |
|---|---|
| **הרשאות** | Row Level Security על כל טבלה: רק מייל שמופיע בטבלת `managers` ומסומן `active` רואה משהו. ניהול ממסך "צוות". |
| **עוזר AI** | `/api/ai` מקבל טקסט + תמונת מצב של ההאב, Claude מחזיר תוכנית מובנית (tool use), והמנהל מאשר בתצוגה מקדימה לפני שמירה. העוזר לא מוחק. |
| **לוח שנה** | `/api/ics?token=…` — פיד iCal של אירועים ודדליינים. Google מתעדכן ממנו אוטומטית. הלוח של סינרגי מוטמע במסך "לוח זמנים". |
| **דרייב** | קישור תיקייה לכל פרויקט + הטמעת התיקייה בעמוד הפרויקט. |
| **עדכונים חיים** | Supabase Realtime — שינוי של מנהל אחד מופיע אצל כולם. |

## פיתוח מקומי

```bash
npm install
cp .env.example .env.local   # ממלאים
npm run dev
```

תצוגה מקדימה עם נתוני הדוגמה, בלי חשבונות: `NEXT_PUBLIC_DEMO=1 npm run dev` (השינויים לא נשמרים).

## מבנה

```
supabase/schema.sql      טבלאות, הרשאות, טריגרים
supabase/seed.sql        נתוני פתיחה מהתכנון השנתי 2026–27
src/lib/hub.tsx          שכבת הנתונים, התחברות, realtime
src/app/api/ai           עוזר ה-AI
src/app/api/ics          פיד לוח השנה
src/app/*                המסכים
src/components/*         רכיבים משותפים (משימות, עוזר, חיפוש, טפסים)
```
