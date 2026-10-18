/**
 * The owner's business documents, which are not in this repository.
 *
 * ── Why ──────────────────────────────────────────────────────────────────
 *
 * The owner, 18 October 2026: the documents about costs and profit, the
 * artist and singer agreements, supplier prices and the letters to suppliers
 * came out of `docs/`. The repository is public; they are kept with her.
 *
 * Some checks held those documents against the code — a profit sum against
 * the prices, a signed split table against the arithmetic. They still do,
 * wherever the documents are: put them in `private/` (which git ignores) and
 * the checks read them. Without them, the part of each check that needs them
 * says SKIPPED, which the source sweep reports as a skip and never as a pass,
 * and the generators that wrote them (`npm run kaart`, `npm run
 * costs:eleven`) write into `private/` instead.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PRIVATE_DIR = 'private';

/** Where a generator writes a private document, making the folder if needed. */
export function privatePath(name: string): string {
  mkdirSync(PRIVATE_DIR, { recursive: true });
  return join(PRIVATE_DIR, name);
}

/** One of her documents, or null when it is not in this checkout. */
export function privateDoc(name: string): string | null {
  const path = join(PRIVATE_DIR, name);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** The line a check prints for the part it could not run. */
export function skipped(check: string, names: readonly string[]): string {
  return `${check} — SKIPPED: ${names.join(', ')} is kept outside the repository; put it in ${PRIVATE_DIR}/ to check it.`;
}
