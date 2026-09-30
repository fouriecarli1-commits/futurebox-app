'use client';

/**
 * The room she was in, kept across the browser throwing the page away.
 *
 * ── What happened, twice ─────────────────────────────────────────────────
 *
 * Carli, 9 September 2026, about the Pro Booth: *"toe ek terug swipe of back
 * druk, dan gooi hy mens heeltemal uit na die home screen toe en jy verloor
 * jou hele projek."* That became `lib/keepsession.ts`, and the booth's takes
 * have survived leaving the room ever since.
 *
 * Carli, 30 September 2026, about the app: *"wanneer ek die app minimize en
 * weer terug gaan … Hy gooi jou heeltemal uit en vergeet waarmee hy besig
 * was."*
 *
 * The same sentence, a year of lessons apart, because only half the lesson was
 * learnt. The booth's WORK was made to survive. **Which room she was in** was
 * not: `app/page.tsx` held it as
 *
 *     const [studioTab, setStudioTab] = useState<SurfaceId>('make');
 *
 * and nothing else. React state is memory. Android takes the memory of a
 * backgrounded tab whenever something else wants it — a camera, a file picker,
 * another app — and hands back a fresh page. Fresh means `'make'`. She had not
 * been signed out and had lost nothing saved; she had been put back at the
 * front of a room she was not in.
 *
 * `Watchdog.tsx` has recorded exactly this since it was written, as
 * `document.wasDiscarded`, and said in its own comment: *"There is nothing to
 * fix in this app if it is; what changes is what we do about it, and that
 * cannot be decided while it is a guess."* It is not a guess any more. This is
 * what we do about it.
 *
 * ── Why sessionStorage, and it is the whole design ───────────────────────
 *
 * Not localStorage. The two differ in precisely the way this problem needs:
 *
 *   - it survives a reload, and it survives Android discarding the tab and
 *     putting it back — which is the case being fixed;
 *   - it dies when the tab is genuinely closed.
 *
 * So coming back to a tab she never left lands where she was, and opening the
 * app fresh next week lands at the front. localStorage cannot tell those two
 * apart, and would answer the second with "here is where you were on Tuesday",
 * which is a different and worse kind of surprise.
 *
 * ── Never in the way ─────────────────────────────────────────────────────
 *
 * Every path swallows its own failure. Storage throws in a private window and
 * where site data is blocked, and a room that will not open because a
 * bookmark could not be read is a worse failure than the one being fixed.
 * Unreadable is treated as "no room remembered", which is where this started.
 */

/** One key, versioned, so a change of shape cannot be read as the old shape. */
const KEY = 'futurebox.where.v1';

export interface Where {
  /**
   * Whether the studio was open at all.
   *
   * The one this was missing on the first attempt, and the probe caught it:
   * the room was restored correctly and the screen still came back to the
   * feed, because which room is chosen and whether the studio is open are two
   * different pieces of state. `page.tsx` derives the bottom tab from
   * `uploadModalOpen` first and only reads `studioTab` inside it — so a
   * remembered room with the studio shut is a room nobody is looking at.
   */
  readonly inStudio: boolean;
  /** A `SurfaceId`, held as a string: this module must not know the catalogue. */
  readonly room: string;
  /** Whether she was at the door rather than inside a room. */
  readonly atDoor: boolean;
}

/** Writes where she is. Fire and forget: nothing waits for it. */
export function noteWhere(where: Where): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(where));
  } catch {
    /* A tab that cannot remember is the behaviour we had before. */
  }
}

/**
 * Where she was, or null.
 *
 * Read in an effect and never during render: `sessionStorage` does not exist
 * on the server, and a value read during render disagrees with the
 * server-rendered HTML — the same reason the theme is read after mount.
 */
export function whereIWas(): Where | null {
  try {
    const kept = window.sessionStorage.getItem(KEY);
    if (!kept) return null;
    const parsed = JSON.parse(kept) as Partial<Where>;
    /* Shape-checked rather than trusted. A half-written value, or one left by
       an older version of this app, must read as "nowhere" and not as a room
       id that resolves to nothing and draws a blank screen. */
    if (typeof parsed?.room !== 'string' || !parsed.room) return null;
    return {
      inStudio: parsed.inStudio === true,
      room: parsed.room,
      atDoor: parsed.atDoor === true,
    };
  } catch {
    return null;
  }
}

/** Forgets it — on signing out, where the next person must not land inside. */
export function forgetWhere(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* Nothing to do, and nothing that should fail because of it. */
  }
}
