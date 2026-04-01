-- ================================================================
-- demotape schema  (cookie-session auth, no Clerk)
-- Run this in the Supabase SQL Editor to set up / reset the DB.
-- ================================================================

-- Sessions (replaces users — identified by httpOnly UUID cookie)
create table if not exists sessions (
  id           text primary key,              -- UUID from dt_session cookie
  encrypted_claude_key text,                  -- AES-256 encrypted
  created_at   timestamptz not null default now()
);

alter table sessions enable row level security;
drop policy if exists "No anon access to sessions" on sessions;
create policy "No anon access to sessions" on sessions for all using (false);

-- Projects
create table if not exists projects (
  id             uuid primary key default gen_random_uuid(),
  session_id     text references sessions(id) on delete cascade,
  ip_address     text,                         -- for IP rate limiting
  name           text not null,
  description    text not null,
  features       jsonb not null default '[]',
  brand_colour   text not null default '#6366f1',
  target_audience text,
  video_style    text not null default 'dark',
  created_at     timestamptz not null default now()
);

-- Existing DBs: CREATE TABLE IF NOT EXISTS skips new columns — add them here.
alter table projects add column if not exists session_id text references sessions(id) on delete cascade;
alter table projects add column if not exists ip_address text;

-- Clerk → session auth: old rows may still have `user_id NOT NULL`. New inserts only use `session_id`.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'user_id'
  ) then
    alter table projects alter column user_id drop not null;
  end if;
end $$;

alter table projects enable row level security;
drop policy if exists "No anon access to projects" on projects;
create policy "No anon access to projects" on projects for all using (false);

create index if not exists projects_session_id_idx on projects(session_id);
create index if not exists projects_ip_address_idx on projects(ip_address);

-- Jobs
create table if not exists jobs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade,
  session_id   text references sessions(id) on delete cascade,
  status       text not null default 'queued',  -- queued | running | complete | failed
  error        text,
  video_path   text,                             -- Supabase storage path
  reprompt     text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

alter table jobs add column if not exists session_id text references sessions(id) on delete cascade;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'user_id'
  ) then
    alter table jobs alter column user_id drop not null;
  end if;
end $$;

alter table jobs enable row level security;
drop policy if exists "No anon access to jobs" on jobs;
create policy "No anon access to jobs" on jobs for all using (false);

create index if not exists jobs_project_id_idx on jobs(project_id);
create index if not exists jobs_session_id_idx on jobs(session_id);

-- Pro waitlist
create table if not exists waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  willing_to_pay text not null,
  session_id    text references sessions(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table waitlist add column if not exists session_id text references sessions(id) on delete set null;

alter table waitlist enable row level security;
drop policy if exists "No anon access to waitlist" on waitlist;
create policy "No anon access to waitlist" on waitlist for all using (false);
