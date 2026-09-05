/**
 * A value safe to write into a PostgREST filter string.
 *
 * ── Why this exists when nothing is currently wrong ──────────────────────
 *
 * `or()` takes one string and there is no parameterised form of it, so any
 * filter using it is built by interpolation. Today every value that reaches
 * one is a UUID this app produced — `caller.id` from a verified token, or an
 * `owner` column read back through a parameterised `.eq()`. Nothing injectable
 * reaches either.
 *
 * That is true, and it is true two lookups away from where it is used. Safety
 * that depends on tracing a value back through a file is safety that lasts
 * until somebody adds a third caller and does not trace it. So the shape is
 * asserted next to the interpolation, where it is checkable at a glance, and
 * `check:security` fails a route that interpolates without it.
 *
 * A UUID cannot contain a comma, a dot, a bracket or a quote, so a value that
 * passes this cannot change the meaning of the filter it lands in.
 *
 * ── One definition ───────────────────────────────────────────────────────
 *
 * It was a private helper in `api/collab/route.ts`, and the second route that
 * needed it copied the rule rather than the code — which is how two guards
 * drift into one guard and one that used to be. This is the guard; the routes
 * import it.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function filterSafe(id: string): boolean {
  return UUID.test(id);
}
