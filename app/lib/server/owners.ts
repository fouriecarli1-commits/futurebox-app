/**
 * Who runs the place.
 *
 * One function, no imports, so it can be tested on its own — which matters
 * more here than in most files, because this is an allowlist that grants
 * exemptions and an allowlist nobody can test is an allowlist nobody should
 * trust.
 *
 * OWNER_EMAIL is a comma-separated list and must never carry a NEXT_PUBLIC_
 * prefix: the list never reaches a browser, so nobody can read off who is
 * privileged.
 *
 * Read at call time rather than captured when the module loads. Module-level
 * capture is the quieter of the two and the worse one: it makes the value
 * depend on when a serverless instance happened to start, and it makes this
 * untestable without tricks.
 */
export function ownerEmails(): string[] {
  return (process.env.OWNER_EMAIL ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Whether this address is one of them.
 *
 * Exact match on the whole address, never `includes`. A substring test would
 * let `boss@futurebox.app.evil.com` through, and that is the standard way an
 * allowlist becomes a hole.
 */
export function isOwnerEmail(email: string): boolean {
  const value = (email ?? '').trim().toLowerCase();
  if (!value) return false;
  return ownerEmails().indexOf(value) !== -1;
}
