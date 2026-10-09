'use client';

/**
 * A shelf on the account: the same shelf, kept where every device can see it.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Skuif die stories en liedjies na die server
 * toe."*
 *
 * The device shelves shipped the day before and were the right first
 * version — no table, no bucket, nothing to paste, working the same
 * afternoon. What they could not do is the thing she asked about as soon as
 * she saw them working: a story made on a laptop was not on the phone's
 * shelf, because it was never anywhere but the laptop.
 *
 * ── Why the shape matches `ondevice.ts` exactly ──────────────────────────
 *
 * Because the rooms should not know which one they are talking to. The
 * `Shelf` interface — keep, all, forget, most — is the same, so moving a
 * shelf from the device to the account changed two lines in `storykeep.ts`
 * and two in `songkeep.ts` and nothing in any component. It is also what
 * lets `shelfmove.ts` read from one and write to the other without a
 * translation layer in between.
 *
 * ── Why the blobs go to storage and the rest to a row ────────────────────
 *
 * A storybook is a few hundred megabytes of pictures and readings. Postgres
 * will hold bytea and should not: a row that large is slow to read, slow to
 * back up, and arrives whole when the shelf only wanted a title. So the
 * files go in the bucket, the row holds their paths, and a shelf listing is
 * one small query with no media in it at all.
 *
 * The first path segment is the owner's id, which is what the bucket's
 * policies key on — see `supabase/kinderplank.sql`. A path that does not
 * start with it is refused by Postgres rather than by this file, which is
 * the right place for that rule.
 *
 * ── What happens when a file is missing ──────────────────────────────────
 *
 * The row is skipped and the shelf shows what it has. A half-uploaded story
 * is not a story, and showing it as one gives somebody a book that opens to
 * a broken picture — which is the exact fault the device shelf shipped with
 * and was caught for. `back` returning null is how a shelf says "not this
 * one" without taking the rest down with it.
 */

import { currentAccount, getClient } from './cloud';
import type { Put, Shelf } from './ondevice';

export const BUCKET = 'kidshelf';

/** What a row holds beside its body. */
interface Row {
  readonly id: string;
  readonly title: string;
  readonly made_at: string;
  readonly body: unknown;
}

export interface Named {
  /** A name for this file inside its own item, e.g. `page-0-picture`. */
  readonly name: string;
  readonly blob: Blob;
}

export function cloudShelfOf<T extends { id: string; made: number; title: string }, Body>({
  kind,
  most,
  files,
  body,
  back,
}: {
  readonly kind: 'story' | 'song';
  readonly most: number;
  /** Every blob in this item, each with a name unique within it. */
  readonly files: (one: T) => readonly Named[];
  /** The row's body, given where each named file ended up. */
  readonly body: (one: T, at: (name: string) => string) => Body;
  /**
   * The item again, given its row and a way to fetch one of its files.
   *
   * `null` when something it needs is not there — a half-uploaded item is
   * skipped rather than shown as a broken one.
   */
  readonly back: (
    row: { id: string; title: string; made: number; body: Body },
    file: (path: string) => Promise<Blob | null>,
  ) => Promise<T | null>;
}): Shelf<T> {
  const pathFor = (owner: string, id: string, name: string): string =>
    `${owner}/${kind}/${id}/${name}`;

  return {
    most,

    async keep(one: T): Promise<Put> {
      const supabase = getClient();
      const account = await currentAccount();
      /* `off` rather than a failure, matching the device shelf's answer when
         there is no IndexedDB: both mean "there is nowhere to put this", and
         the room says the same sentence either way. */
      if (!supabase || !account) return 'off';

      const { count, error: counted } = await supabase
        .from('kid_shelf')
        .select('id', { count: 'exact', head: true })
        .eq('owner', account.id)
        .eq('kind', kind);
      if (counted) return 'off';
      /* Refuses rather than dropping the oldest, the same as the device
         shelf: deleting somebody's work to make room is work that stops
         existing, and it is invisible because the new item saves perfectly. */
      if ((count ?? 0) >= most) return 'shelfFull';

      const where = new Map<string, string>();
      for (const file of files(one)) {
        const path = pathFor(account.id, one.id, file.name);
        const { error } = await supabase.storage.from(BUCKET).upload(path, file.blob, {
          upsert: true,
          contentType: file.blob.type || 'application/octet-stream',
        });
        if (error) {
          /* Anything already up is left there. The row is never written, so
             the shelf never lists it, and a later keep of the same id
             overwrites the same paths rather than accumulating. */
          return /quota|exceeded|payload/i.test(error.message) ? 'full' : 'off';
        }
        where.set(file.name, path);
      }

      const { error } = await supabase.from('kid_shelf').insert({
        id: one.id,
        owner: account.id,
        kind,
        title: one.title,
        made_at: new Date(one.made).toISOString(),
        body: body(one, (name) => where.get(name) ?? ''),
      });
      return error ? 'off' : 'kept';
    },

    async all(): Promise<T[]> {
      const supabase = getClient();
      const account = await currentAccount();
      if (!supabase || !account) return [];

      const { data, error } = await supabase
        .from('kid_shelf')
        .select('id, title, made_at, body')
        .eq('owner', account.id)
        .eq('kind', kind)
        .order('made_at', { ascending: false });
      if (error || !data) return [];

      const file = async (path: string): Promise<Blob | null> => {
        if (!path) return null;
        const got = await supabase.storage.from(BUCKET).download(path);
        return got.error ? null : (got.data ?? null);
      };

      const out: T[] = [];
      for (const row of data as Row[]) {
        const one = await back(
          {
            id: row.id,
            title: row.title,
            made: new Date(row.made_at).getTime(),
            body: row.body as Body,
          },
          file,
        );
        if (one) out.push(one);
      }
      return out;
    },

    async forget(id: string): Promise<void> {
      const supabase = getClient();
      const account = await currentAccount();
      if (!supabase || !account) return;

      /* The files first and the row second. The other order leaves files
         with nothing pointing at them — invisible, unlistable, and still
         counted against her storage bill for ever. */
      const listed = await supabase.storage
        .from(BUCKET)
        .list(`${account.id}/${kind}/${id}`);
      /* ── The error taken, and the row left alone when it comes ─────

         This read `const { data } = await …` and then `(data ?? [])`, which
         is the exact fault the comment above warns about, one line below it:
         the Supabase client does not throw, so a listing that failed arrives
         as `data: null`, becomes an empty list of paths, and the row below
         is deleted anyway — leaving the files with nothing pointing at them,
         invisible, unlistable, and on her storage bill for ever.

         `check:couldnotask` found it. So the listing is taken, and when it
         fails the row stays: the item is still on the shelf, the room still
         shows it, and pressing again retries. A shelf entry that would not
         go away is a thing somebody can see and report. Orphaned files are
         not. */
      if (listed.error) {
        console.error(`shelf: the ${kind}'s files could not be listed, so it was`
          + ` left on the shelf rather than losing them: ${listed.error.message}`);
        return;
      }
      const paths = (listed.data ?? []).map(
        (one: { name: string }) => `${account.id}/${kind}/${id}/${one.name}`,
      );
      if (paths.length) {
        const gone = await supabase.storage.from(BUCKET).remove(paths);
        /* Taken rather than discarded. The Supabase client does not throw, so
           a remove that fails is files nothing points at any more: invisible,
           unlistable, and still on her storage bill for ever. */
        if (gone.error) console.error(`shelf: the ${kind}'s files were not removed: ${gone.error.message}`);
      }

      const { error } = await supabase.from('kid_shelf').delete().eq('id', id).eq('owner', account.id);
      /* And this one for the reason `removeTrack` in `cloud.ts` gives: a
         delete that fails leaves the item on the shelf after the screen has
         already taken it off, so it comes back on the next look and reads as
         a delete button that does not work. */
      if (error) console.error(`shelf: the ${kind} was not removed: ${error.message}`);
    },
  };
}
