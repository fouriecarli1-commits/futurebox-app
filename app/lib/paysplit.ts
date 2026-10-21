/**
 * How a song two people made together is divided between them.
 *
 * The owner, 21 October 2026: *"Ja, verdeel dit half-half, en gee die opsie
 * van 1 persoon wat alles dra."* Pure arithmetic, apart from the charging in
 * `lib/server/credits.ts`, so `check:pairapprove` can hold it.
 *
 * `half` — each pays half, the one who presses Make the odd credit;
 * `caller` — the one who presses Make pays it all;
 * `other` — the other person pays it all, because they chose to.
 */
export type Share = 'half' | 'caller' | 'other';

export function splitOf(amount: number, share: Share): { mine: number; theirs: number } {
  const whole = Math.max(0, Math.round(amount));
  if (share === 'caller') return { mine: whole, theirs: 0 };
  if (share === 'other') return { mine: 0, theirs: whole };
  const mine = Math.ceil(whole / 2);
  return { mine, theirs: whole - mine };
}
