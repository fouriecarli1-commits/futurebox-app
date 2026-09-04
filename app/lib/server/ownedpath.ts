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
