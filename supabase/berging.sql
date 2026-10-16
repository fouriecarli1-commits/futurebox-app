-- ─────────────────────────────────────────────────────────────────────────
-- Cloud space per plan
--
-- Carli, 16 October 2026: *"Please impliment the storage plan as you
-- suggested."* — 1 GB on Free, 10 GB on Maker, 50 GB on Studio, 200 GB on
-- Label, for what a member keeps in the cloud.
--
-- ── What counts ─────────────────────────────────────────────────────────
--
-- Everything under the member's own folder in the six buckets that hold a
-- member's files: tracks, episodes, videos, avatars, cast and kidshelf —
-- the same six `app/api/account/route.ts` deletes when an account goes.
-- `art` is not counted: what is in it belongs to an artist's shop, sold to
-- other people, and a seller's stock is not their personal space. Nor is
-- `tracks/<owner>/work/`: `lib/workfile.ts` puts a long recording there for
-- a moment so the server can fetch it, and takes it out again. Refusing that
-- would stop a member mixing or splitting a song they already keep.
--
-- ── Where the limit is held, and why here ───────────────────────────────
--
-- Most of these files go up from the browser, straight to storage, with the
-- member's own session. A limit checked in the app would be a limit any
-- browser could skip, so it is a policy on `storage.objects`: RESTRICTIVE,
-- so it is ANDed with every bucket's own "write own file" policy and
-- cannot be outvoted by one of them.
--
-- It asks whether there is room BEFORE the new file, so the file that
-- crosses the line is let in and the next is refused. Measuring the
-- incoming file is not possible here — its size is written after the row —
-- and refusing a file half-way through the last gigabyte would be meaner
-- than letting it land.
--
-- Files the server writes with its own key (a generated video, an episode,
-- a cover) are not held by it: those were paid for, and refusing to keep
-- what somebody has just bought would be the wrong way round. They still
-- count towards the total, so the next upload of her own is refused.
--
-- `app/lib/plans.ts` holds the same four numbers for the cards and the
-- gauge; `check:berging` holds the two in step.
-- ─────────────────────────────────────────────────────────────────────────

-- What this member keeps, in bytes.
create or replace function public.storage_used(p_owner uuid)
returns bigint
language sql
stable
security definer
set search_path = public, storage
as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects o
  where o.bucket_id in ('tracks', 'episodes', 'videos', 'avatars', 'cast', 'kidshelf')
    and (storage.foldername(o.name))[1] = p_owner::text
    and not (o.bucket_id = 'tracks' and (storage.foldername(o.name))[2] = 'work');
$$;

-- What this member's plan allows, in bytes. A lapsed membership is a free
-- one, as `tierOf` in `app/lib/server/account.ts` reads it.
create or replace function public.storage_cap(p_owner uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case coalesce((
      select m.tier from public.memberships m
      where m.owner = p_owner and (m.renews_at is null or m.renews_at > now())
    ), 'free')
    when 'label'  then 200::bigint * 1073741824
    when 'studio' then  50::bigint * 1073741824
    when 'maker'  then  10::bigint * 1073741824
    else                 1::bigint * 1073741824
  end;
$$;

-- Whether there is room for one more file.
create or replace function public.storage_room(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.storage_used(p_owner) < public.storage_cap(p_owner);
$$;

grant execute on function public.storage_used(uuid) to authenticated, service_role;
grant execute on function public.storage_cap(uuid) to authenticated, service_role;
grant execute on function public.storage_room(uuid) to authenticated, service_role;

-- The limit itself. Same pattern as `avatars.sql`: a project where the SQL
-- editor may not own `storage.objects` gets a warning that says what to add
-- by hand, rather than a script that stops half-way.
do $$
begin
  execute 'drop policy if exists "space left" on storage.objects';
  execute $p$create policy "space left" on storage.objects
    as restrictive
    for insert to authenticated
    with check (
      bucket_id not in ('tracks', 'episodes', 'videos', 'avatars', 'cast', 'kidshelf')
      or (bucket_id = 'tracks' and (storage.foldername(name))[2] = 'work')
      or public.storage_room(auth.uid())
    )$p$;
exception
  when insufficient_privilege then
    raise warning 'The space functions were made, but the policy was refused: %. Add it by hand under Storage → Policies → storage.objects: a RESTRICTIVE insert policy for authenticated with check (bucket_id not in (''tracks'',''episodes'',''videos'',''avatars'',''cast'',''kidshelf'') or (bucket_id = ''tracks'' and (storage.foldername(name))[2] = ''work'') or public.storage_room(auth.uid())).', sqlerrm;
end
$$;
