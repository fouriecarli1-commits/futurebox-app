'use client';

/**
 * The song she was singing on, kept across the page being thrown away.
 *
 * ── The half of `whereiwas` that was never finished ──────────────────────
 *
 * Carli, 30 September 2026: *"wanneer ek die app minimize en weer terug gaan
 * … Hy gooi jou heeltemal uit en vergeet waarmee hy besig was."*
 *
 * `lib/whereiwas.ts` answered that with the ROOM: a tab Android discarded
 * comes back in the booth rather than on the feed. It does not come back on
 * the song. `Booth` holds the open song as
 *
 *     const [open, setOpen] = useState<{ track; music; take } | null>(null);
 *
 * and React state is memory, which is the exact sentence `whereiwas` was
 * written under. So the room is restored and she is standing at the song
 * picker — which is most of the way back and still "it forgot what I was
 * doing", because the booth with no song chosen is a booth that does nothing.
 *
 * ── And it is why the TONE3000 return never worked ───────────────────────
 *
 * Their callback sends her to `/?t3k=…&room=booth`. That is a full page load:
 * the room opens from `whereiwas`, no song is chosen, so `VocalBooth` never
 * mounts, so the Pro screen behind it never mounts, so nothing reads the
 * address and the amp she just chose is silently dropped.
 *
 * Two commits called that a broken door and pulled the Browse TONE3000 button
 * over it. The door is fine. The room could not be got back into with work in
 * it, by a person or by a probe, and that is one fault with two faces.
 *
 * ── sessionStorage, for the reasons `whereiwas` gives ────────────────────
 *
 * It survives a reload and a discarded tab, and dies when the tab is closed.
 * A song remembered in `localStorage` would open the booth on Tuesday's song
 * next week, which is a worse surprise than the one being fixed. Every path
 * swallows its own failure: a booth that will not open because storage threw
 * in a private window is a bigger fault than forgetting.
 *
 * Only the id is kept. The audio is already in IndexedDB and the row is
 * already in `futurebox.tracks.v1`; a copy here would be a second answer to
 * the question of what that song is.
 */

/** One key, versioned, so a change of shape cannot be read as the old shape. */
const KEY = 'futurebox.singingon.v1';

/** Writes the song she is in the booth on. Fire and forget. */
export function noteSong(id: string): void {
  try {
    if (id) window.sessionStorage.setItem(KEY, id);
  } catch {
    /* A tab that cannot remember is the behaviour we had before. */
  }
}

/**
 * The song she was on, or null.
 *
 * Read in an effect and never during render, for `whereiwas`'s reason:
 * `sessionStorage` does not exist on the server and a value read during
 * render disagrees with the server-rendered HTML.
 */
export function songIWasOn(): string | null {
  try {
    const kept = window.sessionStorage.getItem(KEY);
    return typeof kept === 'string' && kept ? kept : null;
  } catch {
    return null;
  }
}

/**
 * Forgets it.
 *
 * Called when she closes the booth and when a take is kept — both are her
 * saying she is done with that song. Without this, backing out of the booth
 * and having the tab discarded would put her straight back into a room she
 * had just left, which is the same disrespect as forgetting, pointed the
 * other way.
 */
export function forgetSong(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* Nothing to do, and nothing that should fail because of it. */
  }
}
