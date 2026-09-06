/**
 * A storage path the caller is allowed to claim.
 *
 * ── Why a row needs checking when the bucket already has policies ────────
 *
 * The policies on `avatars` and `cast` stop somebody writing a file into
 * another person's folder. They do not stop somebody *pointing their row* at a
 * file that is already there — and a row is what the app reads. A profile
 * showing a file somebody else uploaded is somebody else's face on a
 * stranger's channel; a cast member pointing at a file from another account is
 * a paid-for clip built from a picture its owner never shared.
 *
 * So: the file is guarded by the bucket, and the claim is guarded here. Two
 * different questions, and only the first one has a policy.
 *
 * ── Shape, not sanitising ────────────────────────────────────────────────
 *
 * The whole path is matched against one pattern rather than having bad parts
 * stripped out of it. Stripping is where traversal bugs live: `..%2f` unescapes
 * later, a stripped `../` leaves another `../` behind it, and every fix is a
 * new pattern to get wrong. A path that is not exactly `<owner>/<digits>.<ext>`
 * is refused, and every path this app writes is exactly that.
 *
 * The owner id goes into the pattern, and it is a uuid from a verified token —
 * hex and dashes, nothing a regex reads as syntax.
 */

/** The path, or null. Null means refuse; it never returns a repaired string. */
export function ownedPath(value: unknown, owner: string, extension: string): string | null {
  if (typeof value !== 'string' || !value || value.length > 200) return null;
  // A uuid and nothing else. If this ever gets a different kind of id, the
  // pattern below stops being safe to build by interpolation.
  if (!/^[0-9a-f-]{36}$/i.test(owner)) return null;
  return new RegExp(`^${owner}/\\d+\\.${extension}$`).test(value) ? value : null;
}

/**
 * The name part of a storage path, on its own.
 *
 * `ownedPath` checks a path somebody handed us whole. This checks a piece that
 * is about to be *built* into one — `${caller.id}/${trackId}.wav` — which is a
 * different job with the same failure at the end of it. The folder in front of
 * it comes from a verified token and is safe; the piece after it does not, and
 * a `..` in there walks straight out of the folder the id in front was meant
 * to pin it to.
 *
 * That matters most where the path is written rather than read. `/api/cover`
 * uploads with the service-role key, which does not consult the bucket
 * policies at all — so the folder in the path is the only thing deciding whose
 * account a file lands in.
 *
 * Whether Supabase resolves `..` inside an object key is not the question. It
 * is somebody else's behaviour, it can change in a patch release, and every
 * version of it is a version this app should not depend on being the strict
 * one.
 *
 * ── Why a character class and not the exact shape ────────────────────────
 *
 * Ids the app mints today are `t-1700000000000` and Kling's job ids. Pinning
 * the pattern to `t-\d+` would refuse anything an older build wrote, and the
 * way that failure shows up is a song quietly reported as "not on your
 * account" — a person losing a file to a guard, which is worse than the guard
 * not being narrow enough. Letters, digits, `-` and `_` cannot form a path:
 * no slash, no backslash, no dot, no percent, so no traversal in any encoding
 * and no second extension either.
 */
export function storageId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value) ? value : null;
}
