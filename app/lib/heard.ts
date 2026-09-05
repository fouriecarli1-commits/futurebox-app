/**
 * Which songs have been listened to on this device.
 *
 * ── Why it exists ────────────────────────────────────────────────────────
 *
 * A channel of thirty songs all look the same, and the one you have not heard
 * yet is the one you are looking for — a song generated while you were doing
 * something else, or made on a phone and synced here. Without a mark the only
 * way to find it is to remember its name, which is the thing somebody who has
 * made thirty songs cannot do.
 *
 * ── Why this device and not the account ──────────────────────────────────
 *
 * Because "have I heard this" is a fact about a person at a screen, not about
 * a row in a table, and because putting it on the account means a write per
 * play — thirty songs and a night of listening is thirty round trips to say
 * something nobody else will ever read.
 *
 * The honest cost of that: a new device shows everything as unheard. That is
 * the right way round. A mark that says "unheard" about something you have
 * heard is a small annoyance; one that hides a song you have never heard is
 * the whole feature failing silently.
 *
 * ── Why a cap ────────────────────────────────────────────────────────────
 *
 * Storage is finite and shared with everything else this app keeps here. Four
 * hundred is more songs than anybody in this app has, and the oldest marks are
 * the ones whose songs have long since been heard.
 */

const KEY = 'futurebox.heard.v1';
const MOST = 400;

/** Everything heard on this device, newest last. */
export function heardHere(): string[] {
  try {
    const kept = window.localStorage.getItem(KEY);
    if (!kept) return [];
    const said = JSON.parse(kept) as unknown;
    return Array.isArray(said) ? said.filter((one): one is string => typeof one === 'string') : [];
  } catch {
    /* Storage off, or something else wrote nonsense here. Everything is
       unheard, which is the safe answer — see above. */
    return [];
  }
}

/**
 * Mark one as heard. Returns the new list, so a caller can hold it in state
 * rather than reading storage again on every render.
 */
export function markHeard(id: string): string[] {
  const was = heardHere();
  if (!id || was.indexOf(id) !== -1) return was;
  const now = was.concat(id).slice(-MOST);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(now));
  } catch {
    // Then it is remembered for this page and forgotten on the next one.
  }
  return now;
}
