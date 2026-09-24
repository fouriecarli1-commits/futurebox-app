-- ─────────────────────────────────────────────────────────────────────────
-- The room says which links are bad
--
-- Carli, 24 September 2026, about the live room's message box: *"Dit moet
-- gescreen word om general bad videos teen te werk."*
--
-- The box now takes only a TikTok live address, and the handle is screened
-- as words before anybody reads it. What nothing in this app can do is watch
-- the stream on the far end. So the people in the room are the screen, and
-- this is where they say so: two reports and the link stops being read out.
--
-- One row per person per link. The primary key is what makes that true —
-- a second report cannot be inserted whatever the route does, which is a
-- better place for the rule than a check in code that could later move.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.live_flags (
  said        uuid not null references public.live_says (id) on delete cascade,
  owner       uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (said, owner)
);

create index if not exists live_flags_said_idx on public.live_flags (said);

-- Read and written only by the route, which knows who is calling. Nothing in
-- the browser ever touches this table, so no policy grants anon or
-- authenticated anything: row level security on with no policy is a closed
-- door, and that is the intent rather than an omission.
alter table public.live_flags enable row level security;

revoke all on public.live_flags from public, anon, authenticated;
grant select, insert, delete on public.live_flags to service_role;
