/**
 * Which engine makes this one.
 *
 * The member never chooses. They choose a **grade** — standard, better,
 * premium — and the app decides what serves it, because that decision is worth
 * thirteen times the money and they have no way to know that.
 *
 * The order inside a grade is cheapest first, and the list falls through: an
 * engine that is not configured, or whose month is spent, or that refuses the
 * request, hands on to the next one. A member sees one price and one wait
 * however many engines were tried behind it.
 *
 * ── Why standard is not simply the cheapest of everything ────────────────
 *
 * Because grades are a promise about the result, not about the bill. Somebody
 * who paid for premium and quietly got the cheap engine has been sold
 * something. So falling *down* a grade never happens: if every engine in the
 * grade is unavailable, the request is refused and nothing is charged. Falling
 * sideways within a grade is invisible and fine.
 */

import { kling } from './kling.ts';
import { seedance, veo } from './eleven.ts';
import { suits, type Grade, type Provider, type StartRequest } from './types.ts';

export * from './types.ts';
export { scheme } from './kling.ts';

/**
 * Every engine, cheapest first inside each grade.
 *
 * Costs, per clip, from this project's own invoices rather than from anybody's
 * marketing page: Seedance R2.62, Veo R10.72, Kling R33.48.
 */
export const PROVIDERS: readonly Provider[] = [seedance, veo, kling];

export function providerById(id: string): Provider | undefined {
  return PROVIDERS.find((one) => one.id === id);
}

/** Grades that have at least one engine behind them right now. */
export function gradesAvailable(): Grade[] {
  const found = new Set<Grade>();
  for (const one of PROVIDERS) if (one.configured()) found.add(one.grade);
  return (['standard', 'better', 'premium'] as const).filter((grade) => found.has(grade));
}

/**
 * The engines that could serve this request, in the order to try them.
 *
 * `spent` answers what a provider has already used this month, so a full one
 * is skipped before it is asked rather than after it refuses.
 */
export function candidates(
  grade: Grade,
  request: StartRequest,
  spent: (provider: Provider) => number,
): Provider[] {
  return PROVIDERS.filter(
    (one) => one.grade === grade && suits(one, request) && spent(one) + one.cost(request.seconds) <= one.ceiling(),
  );
}

export function configured(): boolean {
  return PROVIDERS.some((one) => one.configured());
}
