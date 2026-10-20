-- FutureBox — working together: asking, agreeing, and a room to talk in.
--
-- Run this after schema.sql and radar.sql, in the same project. Safe to run
-- again.
--
-- The radar could tell you who sounded like you and then left you to copy an
-- Instagram link. This is the rest of it: ask somebody, have them say yes, and
-- get a room where the two of you can talk and pass songs back and forth.
--
-- Two rules the shape of this enforces rather than promises:
--
--   · **Nobody can message you until you have said yes.** The room does not
--     exist before that. An unanswered request carries one line of context and
--     nothing else, so a request cannot be used to send somebody a message
--     they did not agree to receive.
--   · **One live thread per pair.** Asking twice does not make two rooms, and
--     somebody who was declined cannot ask again by asking harder — the unique
--     index is on the pair, whichever way round it was asked.
--
-- Reading is by row-level security. Writing is done by the server with the
-- service role after it has checked the token, which is how the rest of this
-- app works: the browser never holds a key that can write somebody else's row.

-- ─────────────────────────────────────────────────────────── the request ────

create table if not exists public.collabs (
  id          uuid primary key default gen_random_uuid(),
  asked_by    uuid not null references auth.users (id) on delete cascade,
  asked_of    uuid not null references auth.users (id) on delete cascade,
  -- asked → accepted, or asked → declined. Nothing else is a state.
  state       text not null default 'asked',
  -- Why the two were put together: the tempo, the key, the shared style words.
  -- Kept because a request with a reason on it is answerable and one without
  -- is a cold call.
  because     text not null default '',
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  constraint collabs_state_check check (state in ('asked', 'accepted', 'declined')),
  -- Asking yourself is not a collaboration.
  constraint collabs_two_people_check check (asked_by <> asked_of)
);

-- One thread per pair, whichever way round it was asked.
create unique index if not exists collabs_pair_idx
  on public.collabs (least(asked_by, asked_of), greatest(asked_by, asked_of));

create index if not exists collabs_asked_of_idx
  on public.collabs (asked_of, state, created_at desc);

create index if not exists collabs_asked_by_idx
  on public.collabs (asked_by, state, created_at desc);

alter table public.collabs enable row level security;

-- Both sides can see it. Nobody else can see that it exists at all.
drop policy if exists "read own collabs" on public.collabs;
create policy "read own collabs" on public.collabs
  for select using (auth.uid() = asked_by or auth.uid() = asked_of);

-- ────────────────────────────────────────────────────────────── the room ────

create table if not exists public.collab_messages (
  id         bigserial primary key,
  collab     uuid not null references public.collabs (id) on delete cascade,
  owner      uuid not null references auth.users (id) on delete cascade,
  body       text not null default '',
  -- A song dropped into the room. The id of a track, so the other person can
  -- see what it is; the audio itself still only travels if its owner shared it.
  track_id   text,
  created_at timestamptz not null default now(),
  constraint collab_messages_something_check check (body <> '' or track_id is not null)
);

create index if not exists collab_messages_thread_idx
  on public.collab_messages (collab, created_at);

alter table public.collab_messages enable row level security;

-- Readable by the two people in an **accepted** thread, and by nobody else.
-- The accepted test is the important half: it is what makes "you cannot
-- message somebody who has not agreed" a property of the database rather than
-- a promise made by a page.
drop policy if exists "read collab messages" on public.collab_messages;
create policy "read collab messages" on public.collab_messages
  for select using (
    exists (
      select 1 from public.collabs c
      where c.id = collab_messages.collab
        and c.state = 'accepted'
        and (auth.uid() = c.asked_by or auth.uid() = c.asked_of)
    )
  );

-- ── Who may reach these tables through the API ────────────────────────────
--
-- Written out rather than left to Supabase. From 30 October 2026 a table
-- created in "public" is no longer opened to the API roles by itself: without
-- these lines every read and write answers "permission denied", on a new
-- project, a preview branch or a fresh run of this file. (Their e-mail to the
-- owner, 20 October 2026.) Row level security still decides WHICH rows each
-- role sees: these lines only let the role ask. A table no member is given
-- rows of is the server's alone, and only the server is named for it.
grant select, insert, update, delete on public.collabs to service_role;
grant select, insert, update, delete on public.collabs to authenticated;
grant select on public.collabs to anon;
grant select, insert, update, delete on public.collab_messages to service_role;
grant select, insert, update, delete on public.collab_messages to authenticated;
grant select on public.collab_messages to anon;
grant usage, select on all sequences in schema public to service_role;
