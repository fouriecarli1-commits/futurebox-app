/**
 * Reporting something offensive, and blocking somebody — from inside the app.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Found 19 October 2026, getting the Play listing ready for 1 November: the
 * app makes songs, pictures, videos, voices and stories with AI, and shows
 * members each other's work in Spotlight. Google Play's policies on both say
 * the same thing — a person who meets something offensive must be able to
 * report it without leaving the app, and must be able to block the member who
 * posted it. FutureBox had the help page's enquiry form and nothing else, which
 * is "leave what you were doing and write us a letter". A listing can be
 * refused, or taken down later, over exactly that.
 *
 * So: a flag on what other people posted and on what the AI made, a short
 * list of reasons a person can pick without typing, an optional note, and a
 * block that hides that member's work from the person who blocked them.
 *
 * Pure, so the route, the sheet and the check all hold the same list.
 */

/** What is being reported. */
export const REPORT_KINDS = ['ai', 'post', 'user'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** Why, in the words a person picks. `[key, English]`. */
export const REPORT_REASONS = [
  { id: 'sexual', says: ['flag.sexual', 'Sexual or nude'] },
  { id: 'hate', says: ['flag.hate', 'Hate or bullying'] },
  { id: 'violence', says: ['flag.violence', 'Violent or scary'] },
  { id: 'selfharm', says: ['flag.selfharm', 'Self-harm'] },
  { id: 'child', says: ['flag.child', 'Not safe for children'] },
  { id: 'person', says: ['flag.person', 'Uses a real person’s face or voice'] },
  { id: 'copyright', says: ['flag.copyright', 'Somebody else’s work'] },
  { id: 'scam', says: ['flag.scam', 'Scam or spam'] },
  { id: 'other', says: ['flag.other', 'Something else'] },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]['id'];

/** The longest note. A paragraph, not an essay. */
export const NOTE_MOST = 1000;

export interface Report {
  readonly kind: ReportKind;
  readonly reason: ReportReason;
  /** What it is: a track id, a post id, a room name for something the AI made. */
  readonly ref: string;
  /** Whose it is, when it is somebody's. Never the reporter. */
  readonly about: string | null;
  /** Where in the app it was seen. */
  readonly where: string;
  readonly note: string;
}

/**
 * A report as sent, made into one the route can store.
 *
 * Null when it is not one: an unknown kind or reason, or a report about a
 * member that does not say which member. Everything else is cut to length
 * rather than refused — a report somebody took the trouble to send should
 * arrive, even if their note ran long.
 */
export function cleanReport(raw: unknown): Report | null {
  const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
  if (!row) return null;
  const kind = (REPORT_KINDS as readonly string[]).includes(String(row.kind)) ? row.kind as ReportKind : null;
  const reason = REPORT_REASONS.some((one) => one.id === row.reason) ? row.reason as ReportReason : null;
  if (!kind || !reason) return null;
  const text = (value: unknown, most: number): string => String(value ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, most);
  const about = text(row.about, 64);
  if (kind === 'user' && !about) return null;
  return {
    kind,
    reason,
    ref: text(row.ref, 160),
    about: about || null,
    where: text(row.where, 60),
    note: text(row.note, NOTE_MOST),
  };
}

/** The reasons that are about a child's safety, read first and acted on first. */
export function urgent(report: Pick<Report, 'reason'>): boolean {
  return report.reason === 'child' || report.reason === 'selfharm' || report.reason === 'sexual';
}

/* ── Blocking ─────────────────────────────────────────────────────────── */

/** On this device, so a block works before the account answers, and signed out. */
export const BLOCKED_KEY = 'futurebox.blocked.v1';

/** The most members one person can block. Plenty, and a ceiling on the row. */
export const MOST_BLOCKED = 500;

/** A blocked list as read back from anywhere: owner ids, unique, bounded. */
export function blockedList(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  for (const one of list) {
    const id = String(one ?? '').trim().slice(0, 64);
    if (id && !out.includes(id)) out.push(id);
    if (out.length >= MOST_BLOCKED) break;
  }
  return out;
}

/** The items whose owner is not blocked. */
export function withoutBlocked<T>(items: readonly T[], ownerOf: (item: T) => string | null | undefined, blocked: readonly string[]): T[] {
  if (!blocked.length) return [...items];
  const hidden = new Set(blocked);
  return items.filter((item) => {
    const owner = ownerOf(item);
    return !owner || !hidden.has(owner);
  });
}
