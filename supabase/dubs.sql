-- FutureBox — an episode being dubbed into another language.
--
-- Run this after schema.sql and credits.sql, in the same project. Safe to run
-- again.
--
-- ── Why a table, when nothing else that costs credits has one ────────────
--
-- Everything else this app buys is a request that answers. You ask, you wait a
-- few seconds, and either audio comes back or a refusal does — and the refusal
-- refunds on the spot, in the same handler that took the money.
--
-- A dub is not that. It takes minutes, it is polled, and the answer arrives
-- long after the request that started it has gone. So the two questions the
-- other routes answer in one breath have to be answered across two:
--
--   **Who does this dub belong to?** Without a row, the id ElevenLabs hands
--   back is a bearer token — anybody who has it can poll it and download the
--   audio, and ids that come back from an upstream are exactly the sort of
--   thing that ends up in a log or a screenshot. The owner is written down
--   here, and every read is checked against it.
--
--   **Has it already been refunded?** A dub that fails should give the credits
--   back, and it can only be discovered failed by a poll — which happens as
--   many times as the screen asks. Refunding on each poll refunds forever;
--   refunding on none of them charges for nothing. `refunded_at` is the mark
--   that makes it happen exactly once.
--
-- ── What is not kept ─────────────────────────────────────────────────────
--
-- Not the audio. The episode is already in storage and the dub is fetched from
-- ElevenLabs when it is asked for, so nothing here is a second copy of
-- somebody's show. Not a transcript either: a dub is translated speech, and
-- the translation is a copy of what was said.
--
-- `owner` cascades on delete rather than being set to null. There is nothing
-- to keep — unlike a refusal, which is evidence, an in-flight dub belonging to
-- a deleted account is just a job nobody will collect.

create table if not exists public.dubs (
  -- ElevenLabs' own `dubbing_id`, not one of ours. There is no second
  -- identifier to keep in step, and a poll needs theirs anyway.
  id           text primary key,
  owner        uuid not null references auth.users (id) on delete cascade,
  -- iso639-1, as sent. Empty source means they were asked to work it out.
  source_lang  text not null default '',
  target_lang  text not null,
  -- What the episode was, so a failure can say which one without the audio.
  title        text,
  seconds      integer not null default 0,
  -- What was taken when it started. The number to give back, not recomputed:
  -- prices change, and a refund must return what was actually charged.
  charged      integer not null default 0,
  -- Theirs, verbatim: 'dubbing', 'dubbed', 'failed'. Not narrowed by a check
  -- constraint — a status we have not seen before must not fail an insert.
  status       text not null default 'dubbing',
  -- Their message when it failed, kept because it is the only sentence that
  -- says what to change.
  error        text,
  refunded_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists dubs_owner_idx on public.dubs (owner, created_at desc);

-- On, with no policy: every read and write goes through the server, which
-- checks the owner itself. A browser holding an anon key gets nothing.
alter table public.dubs enable row level security;

grant select, insert, update on public.dubs to service_role;

-- ── Refund exactly once ──────────────────────────────────────────────────
--
-- Two polls can arrive at the same moment, and both can see a dub that has
-- just failed. Doing the check in the route and the refund after it is the
-- shape that pays twice.
--
-- So the claim is the update, and the update is the check: it only matches a
-- row that has not been refunded, and it returns what it took. A second caller
-- matches nothing and gets nothing back, which is how it should read.
create or replace function public.claim_dub_refund(p_dub text, p_owner uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.dubs
     set refunded_at = now(),
         updated_at  = now()
   where id = p_dub
     and owner = p_owner
     and refunded_at is null
     and status = 'failed'
  returning charged;
$$;

revoke all on function public.claim_dub_refund(text, uuid) from public;
grant execute on function public.claim_dub_refund(text, uuid) to service_role;
