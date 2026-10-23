-- Synergy Hub — opening data from "Synergy Innovate — תכנון שנתי 2026–27 ומשימות"
-- Run after schema.sql. Update manager emails in the Team screen (or here) before inviting people.

-- ───────── Managers ─────────
insert into public.managers (name, email, role, color, sort) values
  ('ניתאי', 'nitai.dob@gmail.com', 'דאטה, דרייב ותפעול · קשרי פקולטה ומרכז היזמות', '#6366f1', 1),
  ('גאיה',  null, 'סושיאל, אתר, מרצ׳נדייז ושיווק',                    '#ec4899', 2),
  ('יאנה',  null, 'המחזור · קשרי פקולטה ומרכז היזמות',                  '#10b981', 3),
  ('גל',    null, 'קהילת בוגרים ואירועי חוץ · גיוס, הרשמה ומשוב',      '#f59e0b', 4),
  ('רעות',  null, 'גיוס, הרשמה ומשוב',                                  '#0ea5e9', 5)
on conflict do nothing;

-- helper: manager id by name
create or replace function pg_temp.m(n text) returns uuid language sql as $$ select id from public.managers where name = n limit 1 $$;

-- ───────── Projects ─────────
insert into public.projects (slug, name, description, owner_id, status, start_date, end_date, color, sort) values
  ('cohort-4',        'מחזור 4',                      '8 מפגשים: מרצה אחד + סדנה מעשית של שעה+ בכל מפגש. מוצע: יום שני 17:00.', pg_temp.m('יאנה'), 'planning', '2026-12-01', '2027-05-31', '#10b981', 1),
  ('webinars',        'סדרת וובינרים',                '6 מפגשי זום של 45–60 דקות, פתוחים לכל האוניברסיטה ומוקלטים.',            null,              'planning', '2026-11-15', '2027-07-15', '#8b5cf6', 2),
  ('community-event', 'אירוע קהילה — סמסטר א׳',       'אירוע קהילה אחד בסמסטר א׳.',                                               pg_temp.m('גל'),   'planning', '2027-02-14', '2027-02-14', '#f59e0b', 3),
  ('registration',    'הרשמה ומיון',                  'הרשמה נפתחת רק אחרי שתאריכי המפגשים סגורים.',                            pg_temp.m('רעות'), 'planning', '2027-01-24', '2027-02-28', '#0ea5e9', 4),
  ('pitch-night',     'ערב הפיצ׳',                    'אירוע סיום מחזור 4.',                                                       null,              'planning', '2027-06-07', '2027-06-07', '#ef4444', 5),
  ('team-recruitment','גיוס אנשי צוות',               null,                                                                         null,              'active',   '2026-11-01', '2026-12-01', '#64748b', 6),
  ('marketing',       'אתר, סושיאל ושיווק',           null,                                                                         pg_temp.m('גאיה'), 'active',   null,         null,         '#ec4899', 7),
  ('drive-data',      'דרייב ודאטה',                  'סידור הדרייב מהחשבון המשותף וצמצום שיתופים.',                            pg_temp.m('ניתאי'),'active',   '2026-10-18', '2026-10-31', '#6366f1', 8),
  ('alumni',          'קהילת בוגרים ואירועי חוץ',     null,                                                                         pg_temp.m('גל'),   'active',   null,         null,         '#d97706', 9),
  ('faculty',         'קשרי פקולטה ומרכז היזמות',     null,                                                                         pg_temp.m('ניתאי'),'active',   null,         null,         '#4f46e5', 10),
  ('feedback',        'משוב',                         'משוב נאסף לאורך כל השנה, אחרי כל מפגש ווובינר.',                         pg_temp.m('רעות'), 'active',   null,         null,         '#0284c7', 11)
on conflict (slug) do nothing;

create or replace function pg_temp.p(s text) returns uuid language sql as $$ select id from public.projects where slug = s limit 1 $$;

-- ───────── Timeline (annual Gantt) ─────────
insert into public.events (title, kind, start_date, end_date, project_id, owner_id, notes) values
  ('סידור דרייב',                                   'phase', '2026-10-18', '2026-10-31', pg_temp.p('drive-data'),       pg_temp.m('ניתאי'), null),
  ('גיוס אנשי צוות',                                'phase', '2026-11-01', '2026-12-01', pg_temp.p('team-recruitment'), null, 'כולם'),
  ('וובינרים — סבב ראשון (4 מפגשים)',              'phase', '2026-11-15', '2027-02-15', pg_temp.p('webinars'),         null, null),
  ('תכנון מחזור 4: מרצים, מיקומים, תאריכים סגורים', 'phase', '2026-12-01', '2027-02-15', pg_temp.p('cohort-4'),         null, null),
  ('הרשמה ומיון',                                   'phase', '2027-01-24', '2027-02-28', pg_temp.p('registration'),     null, 'כולם'),
  ('אירוע קהילה — סמסטר א׳',                        'event', '2027-02-14', null,         pg_temp.p('community-event'),  pg_temp.m('גל'), 'בגאנט רשום 14.02.2026 — הוזן כ-2027, לאמת. גל + ניתאי (אסף רפפורט) + יאנה (רדיקל/מאזה)'),
  ('מחזור 4 — 8 מפגשים',                            'phase', '2027-03-20', '2027-05-31', pg_temp.p('cohort-4'),         null, 'פסח ויום הזיכרון/העצמאות באמצע המחזור — לאמת מול לוח תשפ״ז'),
  ('ערב הפיצ׳',                                     'event', '2027-06-07', null,         pg_temp.p('pitch-night'),      null, null),
  ('וובינרים — סבב שני (2 מפגשים)',                'phase', '2027-06-15', '2027-07-15', pg_temp.p('webinars'),         null, null),
  ('סיכום שנה',                                     'phase', '2027-07-15', '2027-07-29', null,                          null, null),
  ('הוספת תמונות וזוכים לאתר',                      'deadline','2026-10-31', null,       pg_temp.p('marketing'),        pg_temp.m('גאיה'), null);

-- ───────── Tasks ─────────
insert into public.tasks (title, assignee_id, project_id, due_date, priority) values
  ('סיכום החלטות + גאנט מעודכן לצוות',                                pg_temp.m('ניתאי'), null,                          '2026-10-17', 'high'),
  ('לסמן בגאנט מבחנים, פסח וימי זיכרון/עצמאות מלוח תשפ״ז',           pg_temp.m('ניתאי'), pg_temp.p('cohort-4'),        '2026-10-22', 'medium'),
  ('פגישת המשך לאישור הגאנט הסופי',                                    null,               null,                          '2026-10-21', 'high'),
  ('לסדר את הדרייב מהחשבון המשותף ולצמצם שיתוף של טופס ההרשמה',      pg_temp.m('ניתאי'), pg_temp.p('drive-data'),      '2026-10-31', 'high'),
  ('לאתר משובי מחזורים 2–3 ולשמור בדרייב',                            pg_temp.m('ניתאי'), pg_temp.p('feedback'),        '2026-10-31', 'medium'),
  ('הוספת תמונות וזוכים לאתר',                                         pg_temp.m('גאיה'),  pg_temp.p('marketing'),       '2026-10-31', 'medium'),
  ('חלוקת תעודות סיום לכל מי שלא קיבל',                               null,               pg_temp.p('alumni'),          null,         'medium'),
  ('לפנות לדוברי הוובינרים של נובמבר–דצמבר ולקבוע תאריכים',          null,               pg_temp.p('webinars'),        '2026-11-01', 'high'),
  ('לתאם מועד לאירוע הקהילה בסמסטר א׳',                               pg_temp.m('גל'),    pg_temp.p('community-event'), '2026-11-15', 'medium'),
  ('לשריין מרצים מובילים למחזור 4',                                   null,               pg_temp.p('cohort-4'),        '2027-01-15', 'medium'),
  ('לתקן טופס משוב (סולם 1–5) ולעדכן טופס הרשמה ל-2027',              pg_temp.m('ניתאי'), pg_temp.p('registration'),    '2027-01-15', 'medium');

-- sub-tasks for the webinar outreach task
insert into public.tasks (title, parent_id, project_id, due_date, sort)
select x.title, t.id, t.project_id, '2026-11-01', x.sort
from public.tasks t,
  (values ('פנייה לד״ר יונה וייסבוך — וובינר נובמבר', 1),
          ('פנייה לארז נעמן (Scopio Labs) — וובינר דצמבר', 2),
          ('לסגור תאריכים ולפתוח קישורי זום', 3)) as x(title, sort)
where t.title = 'לפנות לדוברי הוובינרים של נובמבר–דצמבר ולקבוע תאריכים';

-- ───────── Contacts ─────────
insert into public.contacts (name, org, kind, status, topic, project_id, notes) values
  ('ד״ר יונה וייסבוך',     null,                'speaker', 'not_contacted', 'נובמבר · מהקליניקה לרעיון: איך מזהים צורך אמיתי', pg_temp.p('webinars'), null),
  ('ארז נעמן',             'Scopio Labs',       'speaker', 'not_contacted', 'דצמבר · AI ודאטה רפואי — מה עובד בפועל',            pg_temp.p('webinars'), null),
  ('פרופ׳ נועם שומרון',     null,                'speaker', 'not_contacted', 'ינואר · גנומיקה וביג דאטה ברפואה',                  pg_temp.p('webinars'), 'צמוד לפתיחת ההרשמה'),
  ('עו״ד אופיר גולדשטיין', null,                'speaker', 'not_contacted', 'פברואר · קניין רוחני ומשפט לסטודנטים וחוקרים',     pg_temp.p('webinars'), null),
  ('אירית יניב',           'Almeda Ventures',   'speaker', 'not_contacted', 'יוני · גיוס הון לסטארטאפ רפואי',                     pg_temp.p('webinars'), null),
  ('איימי מייטוס',         'Scopio Labs',       'speaker', 'not_contacted', 'יולי · ניהול מוצר רפואי: מאב-טיפוס לשוק',           pg_temp.p('webinars'), null),
  ('שומרת שורץ',           'איי נקסט דאטא',     'speaker', 'not_contacted', 'חלופה',                                              pg_temp.p('webinars'), null),
  ('ד״ר עמית בנדי',        'מרכז לוין',         'speaker', 'not_contacted', 'חלופה',                                              pg_temp.p('webinars'), null),
  ('ד״ר מיכל שבח',         'I-Medata',          'speaker', 'not_contacted', 'חלופה',                                              pg_temp.p('webinars'), null),
  ('מיכל צוקמן כץ',        null,                'speaker', 'not_contacted', 'חלופה · AI בבריאות',                                 pg_temp.p('webinars'), null),
  ('פרופ׳ קרן אברהם',      'הפקולטה לרפואה ומדעי הבריאות ע״ש גריי', 'faculty', 'contacted', 'דיקנית הפקולטה', pg_temp.p('faculty'), null);

-- ───────── Decisions ─────────
insert into public.decisions (title, proposal, status) values
  ('פורמט מחזור 4',  '8 מפגשים: מרצה אחד + סדנה מעשית של שעה+ בכל מפגש', 'approved'),
  ('יום ושעה',       'יום קבוע אחד לכל המחזור (מוצע: שני, 17:00)',         'pending'),
  ('סדרת וובינרים',  '6 מפגשי זום (נובמבר–פברואר + יוני–יולי), אחראי/ת אחד/ת', 'pending'),
  ('פעילות עד מרץ',  'אירוע קהילה אחד בסמסטר א׳',                           'pending'),
  ('תפקידים',        'אחראי/ת אחד/ת לכל מסלול: מחזור, וובינרים, תוכן ושיווק, דרייב', 'pending');

-- ───────── Links ─────────
insert into public.links (title, url, kind, project_id, pinned) values
  ('תכנון שנתי 2026–27 ומשימות', 'https://docs.google.com/document/d/1J_mw-_qv1u1AUHrJlDONLtfx70luC08hogtDVhDxcsQ/edit', 'doc', null, true),
  ('טופס הרשמה 2026 — תגובות', 'https://docs.google.com/spreadsheets/d/1pYEOzGg1get3uHl7b0tVFYZwP-3b-6mNhB8o0cA75eo/edit', 'sheet', pg_temp.p('registration'), true),
  ('האתר', 'https://www.synergy-innovate.com', 'site', pg_temp.p('marketing'), true);

-- ───────── Settings ─────────
insert into public.settings (key, value) values
  ('calendar_id', ''),
  ('drive_root_url', ''),
  ('ics_token', md5(random()::text || clock_timestamp()::text))
on conflict (key) do nothing;
