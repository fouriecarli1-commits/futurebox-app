-- ─────────────────────────────────────────────────────── a face on a channel ──
--
-- A picture for a creator, and the bucket it lives in.
--
-- ── Why a column and not a convention ────────────────────────────────────
--
-- The path could have been derived — "avatars/<owner>/photo.webp" — and then
-- nothing would need storing. That falls down twice. A derived path cannot be
-- cache-busted, so replacing a photo leaves the old one on screen until the
-- browser feels like asking again; and there is no way to tell "no photo yet"
-- from "photo that failed to load", which is the difference between showing
-- initials and showing a broken image.
--
-- So the row holds the path, the path carries a stamp, and an empty column
-- means exactly one thing.
--
-- ── Public, and what that costs ──────────────────────────────────────────
--
-- The bucket is public, like `episodes` and unlike `tracks`. A profile picture
-- is shown to whoever is looking at the channel, including people not signed
-- in, and a signed URL that expires would mean every avatar in a list needing
-- a round trip and then breaking an hour later.
--
-- What that means honestly: anybody who knows the path can fetch the file, and
-- deleting the row does not delete the object. So replacing a photo overwrites
-- the same name rather than accumulating, and removing one deletes the object
-- as well as clearing the column — see `app/lib/avatar.ts`, which does both.

alter table public.creators
  add column if not exists avatar_path text;

-- ────────────────────────────────────────────────────────────────── bucket ──

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Anyone may look; only the owner may put, replace or remove. The first path
-- segment is the owner's id, which is what ties a file to a person — the same
-- shape the episodes bucket uses.
drop policy if exists "read avatars" on storage.objects;
create policy "read avatars" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "write own avatar" on storage.objects;
create policy "write own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "replace own avatar" on storage.objects;
create policy "replace own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "delete own avatar" on storage.objects;
create policy "delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
