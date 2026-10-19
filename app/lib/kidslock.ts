/**
 * The grown-up's code, and the room staying a kids room.
 *
 * The owner, 15 October 2026: *"Plus moet daar nie 'n grown up button binne die
 * studio wees nie want kinders gaan dit self stel."* Two "Grown-up" buttons
 * sat in the child's room, and a child presses every button. So there is no
 * button: the grown-up holds the FutureBox Kids logo for three seconds and types
 * a four-number code they chose on their own page. Nothing on the screen
 * says the logo can be held, and a child who finds it by accident meets a
 * code they do not know.
 *
 * The code is kept on this device, hashed — it guards a phone being handed
 * to a child, not an account, and the account itself is still behind the
 * grown-up's own sign-in. Forgotten, it is reset by signing in again, which
 * is the grown-up's door and not the child's.
 *
 * And the room stays the room. While a child is in it the device remembers
 * that, and the studio's front door sends anybody who reaches it — by the
 * back button, or by closing the app and opening it again — straight back
 * to /kids. Only the grown-up's page lets go of it.
 */

const CODE_KEY = 'fb-kids-code';
const CHILD_KEY = 'fb-kids-child-on';

/** How long the name has to be held, in milliseconds. */
export const HOLD_MS = 3000;

/** Four numbers, no more and no fewer. */
export const CODE_LENGTH = 4;

const store = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

async function hashOf(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(`futurebox-kids:${code}`);
  const sum = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(sum), (one) => one.toString(16).padStart(2, '0')).join('');
}

/** Whether a code has been chosen on this device. */
export function hasCode(): boolean {
  return Boolean(store()?.getItem(CODE_KEY));
}

/** A code is four digits; anything else is refused before it is kept. */
export function codeIsValid(code: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);
}

export async function setCode(code: string): Promise<boolean> {
  if (!codeIsValid(code)) return false;
  const kept = store();
  if (!kept) return false;
  kept.setItem(CODE_KEY, await hashOf(code));
  return true;
}

/** True when the code is right — or when none was ever chosen, so a grown-up is never locked out of their own page. */
export async function codeMatches(code: string): Promise<boolean> {
  const kept = store()?.getItem(CODE_KEY);
  if (!kept) return true;
  return (await hashOf(code)) === kept;
}

/** Forgets the code. Only after a fresh sign-in, which only the grown-up can do. */
export function forgetCode(): void {
  store()?.removeItem(CODE_KEY);
}

/** The child's room is on the screen: the front door sends anybody back to it. */
export function childIn(on: boolean): void {
  const kept = store();
  if (!kept) return;
  if (on) kept.setItem(CHILD_KEY, '1');
  else kept.removeItem(CHILD_KEY);
}

export function childIsIn(): boolean {
  return store()?.getItem(CHILD_KEY) === '1';
}

/**
 * Back to the kids room, for the studio's front door — only while a child is
 * in it. Not a door: nothing is pressed, nothing is shown, and a grown-up who
 * has let go of the room on their own page never meets it.
 * `check:bereikbaar` holds that the studio has no door to /kids and that this
 * is the one way back, behind `childIsIn`.
 */
export function sendChildBack(): boolean {
  if (typeof window === 'undefined' || !childIsIn()) return false;
  window.location.replace('/kids');
  return true;
}
