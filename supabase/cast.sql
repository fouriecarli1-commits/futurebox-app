-- ──────────────────────────────────────────────────────────────── the cast ──
--
-- The people, places and products a set of clips is supposed to be about.
--
-- ── What this fixes ──────────────────────────────────────────────────────
--
-- A start frame is the only way to get the same face into two clips that are
-- meant to cut together — two prompts, however carefully written, give two
-- strangers. That already worked. What did not is that the picture lived in
-- one browser: `app/lib/assets.ts` keeps a shelf of twenty in IndexedDB, on
-- the device that uploaded them. Open the studio on a phone and the presenter
-- your last three adverts were built around is not there.
--
-- So a cast member is a row and a file on the account. Named, because "the
-- picture I used last Tuesday" is not how anybody thinks about a presenter,
-- and because a name is what makes it choosable in one press in any room.
--
-- ── Private, unlike avatars ──────────────────────────────────────────────
--
-- The avatars bucket is public: a profile picture is shown to people who are
-- not signed in, so it has to be. This one is the opposite. A cast member is
-- an *input* — somebody's face, an unreleased product, a location — and
-- nothing here ever publishes it. It is read by its owner, sent to the engine
-- with a generation, and that is the whole of its life.
--
-- That means the browser downloads it with the owner's own session rather than
-- building a URL, and the policies below are what make that safe.
--
-- ── Order ────────────────────────────────────────────────────────────────
--
-- Needs schema.sql only, for auth.users. Safe to run again.

do $$
begin
  if to_regclass('auth.users') is null then
    raise exception 'auth.users does not exist — this is not a Supabase project, or schema.sql has not been run.';
  end if;
end
$$;

create table if not exists public.cast_members (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  -- What they are called on the desk: "Sarel, the presenter", "the blue tin".
  name        text not null default '',
  -- Anything the picture cannot say: "always shot from his left", "the label
  -- must face camera". Written into the prompt by whoever is making the clip,
  -- not automatically — a note that silently edits a prompt is a note nobody
  -- can debug.
  note        text not null default '',
  -- Where the picture sits in the private `cast` bucket: <owner>/<stamp>.webp.
  -- Stamped rather than fixed, for the same reason as an avatar: a replaced
  -- picture behind a cached URL is the "I changed it and nothing happened"
  -- bug, and here it would be worse — the wrong face in a paid-for clip.
  path        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists cast_members_owner_idx
  on public.cast_members (owner, created_at desc);

alter table public.cast_members enable row level security;

-- Yours alone, in every direction. Nothing about a cast member is public, and
-- there is no shared or discoverable case to carve out — unlike `creators`,
-- which exists to be found.
drop policy if exists "read own cast" on public.cast_members;
create policy "read own cast" on public.cast_members
  for select using (auth.uid() = owner);

drop policy if exists "write own cast" on public.cast_members;
create policy "write own cast" on public.cast_members
  for insert with check (auth.uid() = owner);

drop policy if exists "change own cast" on public.cast_members;
create policy "change own cast" on public.cast_members
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "remove own cast" on public.cast_members;
create policy "remove own cast" on public.cast_members
  for delete using (auth.uid() = owner);

-- ────────────────────────────────────────────────────────────────── bucket ──

-- Private. `public => false` is the difference between a reference picture and
-- a published one, and it is the whole reason this is a separate bucket rather
-- than a folder in `avatars`.
insert into storage.buckets (id, name, public)
values ('cast', 'cast', false)
on conflict (id) do update set public = false;

-- Wrapped, because on some projects the SQL editor does not own
-- `storage.objects` and every one of these comes back as `42501: must be owner
-- of table objects`. Failing the whole script there would leave the table made
-- and the bucket unusable with no explanation.
do $$
begin
  execute 'drop policy if exists "read own cast picture" on storage.objects';
  execute $p$create policy "read own cast picture" on storage.objects
    for select using (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "write own cast picture" on storage.objects';
  execute $p$create policy "write own cast picture" on storage.objects
    for insert with check (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "replace own cast picture" on storage.objects';
  execute $p$create policy "replace own cast picture" on storage.objects
    for update using (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "delete own cast picture" on storage.objects';
  execute $p$create policy "delete own cast picture" on storage.objects
    for delete using (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;
exception
  when insufficient_privilege then
    raise warning 'The cast bucket was made, but its policies were refused: %. Add them by hand under Storage → cast → Policies: select, insert, update and delete, each where (storage.foldername(name))[1] = auth.uid()::text. Do NOT add a public read policy — this bucket is deliberately private.', sqlerrm;
end
$$;
