-- ─────────────────────────── what Supabase gives you, and a bare Postgres does not ──
--
-- Nothing here is ever run against the real project. This is the scaffolding
-- that lets `check:sqlruns` run every file in `supabase/` against a throwaway
-- Postgres, so a statement Postgres would refuse is found here rather than by
-- somebody pasting it into the SQL editor and reading an error.
--
-- ── Why it is minimal on purpose ────────────────────────────────────────
--
-- A stub that does more than the real thing hides faults; a stub that does
-- less invents them. Each of these is the smallest shape our SQL actually
-- leans on, and nothing is here that no file references.
--
-- These stubs are NOT a model of Supabase's security. `auth.uid()` returning
-- a session setting is enough to let a policy compile and be reasoned about;
-- it is not enough to prove the policy keeps anybody out. That is what the
-- routes and `check:security` are for. What this proves is narrower and was
-- worth proving: that the file runs at all.

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

-- The three roles every `grant` in these files names.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

-- Every `owner` column in this app points here.
create table if not exists auth.users (
  id                  uuid primary key,
  email               text,
  raw_user_meta_data  jsonb default '{}'::jsonb,
  created_at          timestamptz default now()
);

/* The four functions policies are written against. Stable rather than
   immutable, exactly as Supabase's are — a policy that would only work
   against an immutable `auth.uid()` is a policy that does not work. */
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create or replace function auth.email() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select '{}'::jsonb $$;

-- Storage, for the buckets the picture and audio policies are written on.
create table if not exists storage.buckets (
  id text primary key, name text, public boolean default false
);
create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner      uuid,
  created_at timestamptz default now(),
  metadata   jsonb
);

/* Supabase's own path helpers, same shape: the object name split on '/'.
   Marked immutable because Supabase's are, and because a storage policy
   that indexes on one would otherwise be refused here and accepted there —
   a difference between the test and the real thing is the one thing a stub
   must not have. */
create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $$ select string_to_array(name, '/') $$;
create or replace function storage.filename(name text) returns text
  language sql immutable as $$
    select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)] $$;
