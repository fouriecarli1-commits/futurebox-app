/**
 * Writing down that somebody swore at the assistant. Nothing else.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Carli, 11 October 2026, asking whether fair social usage could be tracked:
 * *"ons moet 'n afsny punte hê."* A cut-off needs a number, and there is no
 * number. This makes one over thirty days, and then she sets the line.
 *
 * ── Everything this deliberately does not do ─────────────────────────────
 *
 * It does not refuse, delay, degrade, warn, or change a single reply. It does
 * not count against the account: the row goes in with `counts: false`, so
 * `moderation_strikes` — which is what stops an account generating at six in
 * thirty days — steps straight over it.
 *
 * It is called with `void` and awaited by nobody. A measurement that can make
 * the copilot slower is a measurement that will be taken out the first time
 * somebody profiles the chat, and rightly.
 *
 * ── Why it writes to the same table as the refusals ──────────────────────
 *
 * Because `moderation_events` already has the shape — owner, ip_hash,
 * surface, rule, excerpt, time — and already has the property that matters:
 * row level security on, no policy granted, so nobody can read back from a
 * browser what they were recorded for. A second table would be a second thing
 * to secure, and the first mistake would be the one that let somebody read
 * their own file.
 *
 * `counts` is the column that keeps the two apart, and it is the only thing
 * standing between a count and a suspension. `check:conduct` holds it.
 */
import { wrote } from './wrote';
import { directedAt } from '@/app/lib/conduct';
import { admin, type Caller } from '@/app/lib/server/account';
import { addressKey } from '@/app/lib/server/identity';

/**
 * Count it if it is there, and never get in the way.
 *
 * Returns nothing on purpose. A caller that cannot learn the answer cannot
 * branch on it, which is the cheapest possible guarantee that this stays a
 * measurement — cheaper than a rule in a document and cheaper than a check,
 * both of which this also has.
 */
export function noteConduct(
  request: Request,
  text: string,
  caller: Caller | null,
  surface: string,
): void {
  const found = directedAt(text ?? '');
  if (!found) return;

  const client = admin();
  if (!client) return;

  const address =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '';

  void (async () => {
    try {
      wrote(await client.from('moderation_events').insert({
        owner: caller?.id ?? null,
        surface,
        rule: 'abuse',
        /* The whole point. With this true it joins the six-in-thirty ladder
           and starts suspending people on the strength of a word list. */
        counts: false,
        decided_by: `conduct:${found.word}/${found.at}`,
        excerpt: (text ?? '').slice(0, 200),
        ip_hash: addressKey(address) || null,
      }), 'the conduct count');
    } catch {
      /* Silent, like the moderation record it sits beside. A count that can
         break a reply is worse than no count. */
    }
  })();
}
