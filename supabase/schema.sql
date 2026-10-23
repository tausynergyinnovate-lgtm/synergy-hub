-- Synergy Hub — schema
-- Run this once in Supabase → SQL Editor, then run seed.sql.

create extension if not exists "pgcrypto";

-- ───────── Managers (the only people who can log in) ─────────
create table if not exists public.managers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text unique,              -- Google account used to log in
  role        text,                     -- תחומי אחריות
  color       text default '#6366f1',
  active      boolean not null default true,
  sort        int default 0,
  created_at  timestamptz default now()
);

-- Access check used by every policy: logged-in email must belong to an active manager
create or replace function public.is_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.managers m
    where m.active and lower(m.email) = lower(auth.jwt() ->> 'email')
  );
$$;
grant execute on function public.is_manager() to authenticated, anon;

-- ───────── Projects (cross-functional) ─────────
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  owner_id    uuid references public.managers(id) on delete set null,
  status      text not null default 'planning' check (status in ('planning','active','on_hold','done')),
  start_date  date,
  end_date    date,
  drive_url   text,
  color       text default '#0ea5e9',
  sort        int default 0,
  created_at  timestamptz default now()
);

-- ───────── Tasks ─────────
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  notes        text,
  status       text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  priority     text not null default 'medium' check (priority in ('low','medium','high')),
  due_date     date,
  assignee_id  uuid references public.managers(id) on delete set null,  -- null = כל הצוות
  project_id   uuid references public.projects(id) on delete set null,
  parent_id    uuid references public.tasks(id) on delete cascade,     -- תת־משימה
  link_url     text,
  sort         int default 0,
  completed_at timestamptz,
  created_at   timestamptz default now()
);

-- ───────── Timeline / events ─────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'event' check (kind in ('phase','event','webinar','meeting','deadline')),
  start_date  date not null,
  end_date    date,
  start_time  time,
  location    text,
  project_id  uuid references public.projects(id) on delete set null,
  owner_id    uuid references public.managers(id) on delete set null,
  notes       text,
  created_at  timestamptz default now()
);

-- ───────── Expenses (basic tracking) ─────────
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  amount      numeric(10,2) not null default 0,
  date        date default current_date,
  category    text default 'אחר',
  status      text not null default 'planned' check (status in ('planned','paid','reimbursed')),
  paid_by     text,
  receipt_url text,
  project_id  uuid references public.projects(id) on delete set null,
  notes       text,
  created_at  timestamptz default now()
);

-- ───────── Contacts (speakers, lecturers, partners, faculty) ─────────
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  org         text,
  title       text,
  email       text,
  phone       text,
  kind        text not null default 'other' check (kind in ('speaker','lecturer','mentor','partner','faculty','sponsor','alumni','other')),
  status      text not null default 'not_contacted' check (status in ('not_contacted','contacted','confirmed','declined','done')),
  topic       text,
  project_id  uuid references public.projects(id) on delete set null,
  owner_id    uuid references public.managers(id) on delete set null,
  notes       text,
  created_at  timestamptz default now()
);

-- ───────── Meetings & decisions ─────────
create table if not exists public.meetings (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null default current_date,
  notes       text,
  doc_url     text,
  created_at  timestamptz default now()
);

create table if not exists public.decisions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  proposal    text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_on  date,
  meeting_id  uuid references public.meetings(id) on delete set null,
  project_id  uuid references public.projects(id) on delete set null,
  notes       text,
  created_at  timestamptz default now()
);

-- ───────── Links (Drive folders, forms, sheets) ─────────
create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  url         text not null,
  kind        text default 'drive' check (kind in ('drive','doc','sheet','form','site','other')),
  project_id  uuid references public.projects(id) on delete cascade,
  pinned      boolean default false,
  created_at  timestamptz default now()
);

-- ───────── Settings (calendar id, drive root …) ─────────
create table if not exists public.settings (
  key   text primary key,
  value text
);

-- ───────── Row Level Security: managers only ─────────
do $$
declare t text;
begin
  foreach t in array array['managers','projects','tasks','events','expenses','contacts','meetings','decisions','links','settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists managers_all on public.%I', t);
    execute format('create policy managers_all on public.%I for all to authenticated using (public.is_manager()) with check (public.is_manager())', t);
  end loop;
end $$;

-- completed_at bookkeeping
create or replace function public.tasks_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (old is null or old.status <> 'done') then new.completed_at = now(); end if;
  if new.status <> 'done' then new.completed_at = null; end if;
  return new;
end $$;
drop trigger if exists trg_tasks_completed on public.tasks;
create trigger trg_tasks_completed before insert or update on public.tasks
  for each row execute function public.tasks_completed_at();

-- Live updates between managers
do $$
declare t text;
begin
  foreach t in array array['managers','projects','tasks','events','expenses','contacts','meetings','decisions','links','settings']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
