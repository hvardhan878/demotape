-- ============================================================
-- DemoForge — Supabase Schema
-- Run this in the Supabase SQL editor to set up your database.
-- ============================================================

-- Users (extends Clerk auth)
create table if not exists users (
  id text primary key,                    -- Clerk user ID
  email text not null,
  encrypted_claude_key text,             -- AES-256 encrypted Anthropic key
  plan text not null default 'free',     -- 'free' | 'pro'
  stripe_customer_id text unique,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  name text not null,
  description text not null,
  features jsonb not null default '[]'::jsonb,
  brand_colour text not null default '#6366f1',
  target_audience text,
  video_style text not null default 'dark',
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on projects(user_id);

-- Jobs
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  status text not null default 'queued',  -- queued | generating | rendering | uploading | complete | failed
  reprompt text,
  video_path text,                         -- Supabase Storage path e.g. "abc123.webm"
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists jobs_project_id_idx on jobs(project_id);
create index if not exists jobs_user_id_idx on jobs(user_id);
create index if not exists jobs_status_idx on jobs(status);

-- ============================================================
-- Row Level Security
-- (All server-side routes use service role key which bypasses RLS.
--  These policies protect against accidental anon key usage.)
-- ============================================================

alter table users enable row level security;
alter table projects enable row level security;
alter table jobs enable row level security;

-- Deny all by default on anon key (service role bypasses anyway)
create policy "No anon access to users" on users for all using (false);
create policy "No anon access to projects" on projects for all using (false);
create policy "No anon access to jobs" on jobs for all using (false);

-- Pro waitlist
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  willing_to_pay text not null,
  user_id text references users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table waitlist enable row level security;
create policy "No anon access to waitlist" on waitlist for all using (false);

-- ============================================================
-- Storage
-- Run this separately or via the Supabase dashboard:
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('videos', 'videos', false);
