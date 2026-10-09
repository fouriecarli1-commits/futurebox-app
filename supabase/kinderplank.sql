-- ─────────────────────────────────────────────────────────────────────────
-- The kids' shelf, on the account rather than on one phone
--
-- Carli, 9 October 2026: *"Skuif die stories en liedjies na die server
-- toe."*
--
-- ── What was wrong with the device, and what was right about it ─────────
--
-- The shelves shipped the day before in IndexedDB, and that was the right
-- first version: no table, no bucket, no SQL to paste, and it worked the
-- same afternoon. What it could not do is the thing she asked about as soon
-- as she saw it working — a story made on a laptop was not on the phone's
-- shelf, because it was never anywhere but the laptop.
--
-- So the account holds it now. The device keeps nothing of its own; what is
-- already there is carried up once and then let go — see
-- `app/lib/shelfmove.ts`.
--
-- ── Why the bucket is private, unlike avatars ───────────────────────────
--
-- `avatars` is public because a profile picture is shown to whoever looks at
-- a channel, including people not signed in. Nothing on this shelf is. A
-- child's song and a storybook written for them are private to the account
-- that made them, and a public bucket means anybody who knows the path can
-- fetch the file — which for a bucket full of children's material is not a
-- trade worth making for a round trip.
--
-- So: private, read by the owner only, the same way `tracks` is.
--
-- ── Why one table and not two ───────────────────────────────────────────
--
-- A story and a song differ in their body and in nothing else: both belong
-- to one account, both have a title and a time, both are shown on a shelf
-- and taken off it the same way. Two tables would be the same five columns
-- twice and two sets of policies to keep in step.
--
-- `body` is jsonb because the two shapes genuinely differ — a song is one
-- file, a story is a list of pages with two files each — and because what
-- goes in it is written and read by one file on each side. Nothing queries
-- inside it.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.kid_shelf (
  id        text primary key,
  owner     uuid not null references auth.users (id) on delete cascade,
  -- Which shelf it sits on. Checked here rather than trusted, because a
  -- third value would be a row nothing ever lists and nothing ever deletes.
  kind      text not null check (kind in ('story', 'song')),
  title     text not null,
  made_at   timestamptz not null default now(),
  -- A song: {"topic": "dog", "sound": "happy", "audio": "<path>"}
  -- A story: {"pages": [{"text": "…", "picture": "<path>", "audio": "<path>", "seconds": 5.2}]}
  body      jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists kid_shelf_owner_idx
  on public.kid_shelf (owner, kind, made_at desc);

alter table public.kid_shelf enable row level security;

-- Read, written and removed by the person it belongs to, from the browser.
-- No service_role path: nothing on the server ever needs to read a child's
-- songs, and a route that could is a route that one day does.
do $$
begin
  execute 'drop policy if exists "read own shelf" on public.kid_shelf';
  execute $p$create policy "read own shelf" on public.kid_shelf
    for select using (auth.uid() = owner)$p$;

  execute 'drop policy if exists "write own shelf" on public.kid_shelf';
  execute $p$create policy "write own shelf" on public.kid_shelf
    for insert with check (auth.uid() = owner)$p$;

  execute 'drop policy if exists "clear own shelf" on public.kid_shelf';
  execute $p$create policy "clear own shelf" on public.kid_shelf
    for delete using (auth.uid() = owner)$p$;
end
$$;

-- ────────────────────────────────────────────────────────────────── bucket ──

insert into storage.buckets (id, name, public)
values ('kidshelf', 'kidshelf', false)
on conflict (id) do update set public = false;

-- The first path segment is the owner's id, which is what ties a file to a
-- person — the same shape `avatars` and `episodes` use. Unlike those, there
-- is no public read: only the owner, for every verb.
--
-- Wrapped, because on some projects the SQL editor does not own
-- `storage.objects` and every one of these comes back as `42501: must be
-- owner of table objects`. That is a real thing to hit and it is not a
-- mistake in this file, so it says what to do instead of failing the script
-- and leaving the table half-made.
do $$
begin
  execute 'drop policy if exists "read own kidshelf" on storage.objects';
  execute $p$create policy "read own kidshelf" on storage.objects
    for select using (
      bucket_id = 'kidshelf' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "write own kidshelf" on storage.objects';
  execute $p$create policy "write own kidshelf" on storage.objects
    for insert with check (
      bucket_id = 'kidshelf' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "replace own kidshelf" on storage.objects';
  execute $p$create policy "replace own kidshelf" on storage.objects
    for update using (
      bucket_id = 'kidshelf' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "delete own kidshelf" on storage.objects';
  execute $p$create policy "delete own kidshelf" on storage.objects
    for delete using (
      bucket_id = 'kidshelf' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;
exception
  when insufficient_privilege then
    raise warning 'The kidshelf bucket was made, but its policies were refused: %. Add them by hand under Storage → kidshelf → Policies: select, insert, update and delete where (storage.foldername(name))[1] = auth.uid()::text, and no public read.', sqlerrm;
end
$$;
