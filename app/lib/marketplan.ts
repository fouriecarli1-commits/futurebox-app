/**
 * The plan, once it has come back — and how it gets out of this app.
 *
 * ── Why a calendar file and not just a list ──────────────────────────────
 *
 * A posting plan on a screen is read once and never again. The same plan in
 * somebody's calendar reminds them on Tuesday at six, which is the only
 * difference between a plan and a document about a plan. It is also the
 * cheapest possible export: every calendar on earth reads `.ics`, no account
 * is connected, no permission is asked for, and it keeps working if this app
 * never builds a single posting integration.
 *
 * ── Floating time, on purpose ────────────────────────────────────────────
 *
 * The times come back as "18:00" with no zone, because the model was asked for
 * the market's local time and knows nothing about the reader's device. Written
 * as UTC they would land an hour or two out for most readers; written with a
 * `TZID` they would need a zone this app has not asked for and would be wrong
 * whenever somebody travels.
 *
 * So they are written as *floating* local times — RFC 5545 allows a
 * `DATE-TIME` with no zone at all, and every calendar reads it as "six in the
 * evening, wherever you are". For a recurring reminder to post something, that
 * is not a compromise, it is the correct meaning.
 */

/** The days as the route returns them, in week order. */
export const DAY_IDS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;

export type DayId = (typeof DAY_IDS)[number];

export interface Slot {
  readonly day: DayId;
  /** "HH:MM" on a 24-hour clock. */
  readonly at: string;
  readonly platform: string;
  readonly what: string;
  readonly why: string;
}

export interface Plan {
  readonly category: string;
  readonly demand: string;
  readonly buyers: readonly { who: string; wants: string; doubt: string }[];
  readonly angles: readonly { angle: string; why: string; against: string }[];
  readonly platforms: readonly {
    platform: string;
    why: string;
    format: string;
    effort: 'low' | 'medium' | 'high';
  }[];
  readonly week: readonly Slot[];
  readonly beyondSocial: readonly { what: string; why: string; effort: 'low' | 'medium' | 'high' }[];
  readonly watch: readonly { number: string; why: string; healthy: string }[];
}

/** Minutes since midnight, or null for anything that is not a clock time. */
export function minutesOf(at: string): number | null {
  const found = /^\s*(\d{1,2})[:.h]?(\d{2})\s*$/.exec(at ?? '');
  if (!found) return null;
  const hour = Number(found[1]);
  const minute = Number(found[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/**
 * The week in week order, and each day in clock order.
 *
 * The model returns the slots in whatever order it thought of them, and a
 * schedule out of order is not a schedule. Slots whose time cannot be read are
 * kept rather than dropped — losing one silently would be worse than showing
 * it last — and sorted to the end of their own day.
 */
export function sortedWeek(week: readonly Slot[]): Slot[] {
  const dayAt = (one: Slot) => {
    const at = DAY_IDS.indexOf(one.day);
    return at === -1 ? DAY_IDS.length : at;
  };
  return [...week].sort((a, b) => {
    if (dayAt(a) !== dayAt(b)) return dayAt(a) - dayAt(b);
    const one = minutesOf(a.at);
    const two = minutesOf(b.at);
    if (one === null && two === null) return 0;
    if (one === null) return 1;
    if (two === null) return -1;
    return one - two;
  });
}

/** How many slots land on each weekday, for a row that shows the shape of it. */
export function loadPerDay(week: readonly Slot[]): number[] {
  const out = new Array(7).fill(0) as number[];
  for (const one of week) {
    const at = DAY_IDS.indexOf(one.day);
    if (at !== -1) out[at] += 1;
  }
  return out;
}

/* ── The calendar file ──────────────────────────────────────────────────── */

const ICS_DAYS: Record<DayId, string> = {
  monday: 'MO', tuesday: 'TU', wednesday: 'WE', thursday: 'TH',
  friday: 'FR', saturday: 'SA', sunday: 'SU',
};

/**
 * Text as `.ics` wants it: four characters are special and a newline is two.
 *
 * Missing this does not produce a broken-looking file — it produces one that
 * imports with half a description, or that one calendar reads and another
 * refuses, which is much harder to notice.
 */
function escaped(text: string): string {
  return (text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Folded to 75 octets, as the specification requires.
 *
 * Counted in bytes rather than characters, because the limit is in octets and
 * this app writes Afrikaans: "’" is three bytes, so a line of 74 characters
 * can be well over the limit and a strict parser will reject the file.
 */
function folded(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const out: string[] = [];
  let room = 75;
  let current = '';
  let used = 0;
  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length;
    if (used + size > room) {
      out.push(current);
      current = '';
      used = 0;
      // A continuation line starts with one space, which counts against it.
      room = 74;
    }
    current += ch;
    used += size;
  }
  if (current) out.push(current);
  return out.join('\r\n ');
}

function twice(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * The first occurrence of a weekday at a time, on or after a given day.
 *
 * Exported because the check needs to state what it expects without repeating
 * the arithmetic it is checking.
 */
export function firstOccurrence(day: DayId, at: string, from: Date): Date | null {
  const minutes = minutesOf(at);
  if (minutes === null) return null;
  const wanted = (DAY_IDS.indexOf(day) + 1) % 7; // Monday is 1 in `getDay`.
  if (DAY_IDS.indexOf(day) === -1) return null;
  const made = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const ahead = (wanted - made.getDay() + 7) % 7;
  made.setDate(made.getDate() + ahead);
  made.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return made;
}

function stamp(at: Date): string {
  return (
    `${at.getFullYear()}${twice(at.getMonth() + 1)}${twice(at.getDate())}` +
    `T${twice(at.getHours())}${twice(at.getMinutes())}00`
  );
}

export interface IcsOptions {
  /** The week starts from here. Passed in so the file is reproducible. */
  readonly from?: Date;
  /** How long a slot is blocked out for, in minutes. */
  readonly minutes?: number;
  /** Prefixed to every event, so the plan is recognisable in a shared diary. */
  readonly label?: string;
}

/**
 * The week as a calendar file: one weekly repeating event per slot.
 *
 * `RRULE:FREQ=WEEKLY` rather than a year of separate events, so somebody who
 * changes their mind about Wednesdays deletes one thing.
 */
export function icsOf(week: readonly Slot[], options: IcsOptions = {}): string {
  const from = options.from ?? new Date();
  const minutes = options.minutes ?? 30;
  const label = options.label ?? 'FutureBox';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FutureBox//Marketing plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  let made = 0;
  for (const slot of sortedWeek(week)) {
    const starts = firstOccurrence(slot.day, slot.at, from);
    // A slot with an unreadable time has no place in a calendar; it is still
    // on the screen, which is where it can be fixed.
    if (!starts) continue;
    const ends = new Date(starts.getTime() + minutes * 60_000);
    made += 1;
    lines.push(
      'BEGIN:VEVENT',
      // Stable across regenerations of the same plan, so re-importing updates
      // rather than duplicates.
      `UID:${slot.day}-${slot.at.replace(/\D/g, '')}-${made}@futurebox`,
      `DTSTAMP:${stamp(from)}`,
      `DTSTART:${stamp(starts)}`,
      `DTEND:${stamp(ends)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${ICS_DAYS[slot.day]}`,
      `SUMMARY:${escaped(`${label}: ${slot.platform} — ${slot.what}`)}`,
      `DESCRIPTION:${escaped(slot.why)}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  // CRLF throughout, which the specification requires and some calendars
  // enforce.
  return lines.map(folded).join('\r\n') + '\r\n';
}
