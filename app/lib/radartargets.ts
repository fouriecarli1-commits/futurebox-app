/**
 * The shows she found herself, kept between visits.
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * Carli's list, 7 October 2026: *"Kyk nog mooi na colab radar."* Looked at
 * properly, the Radar's own "Add a show you found yourself" had two faults,
 * and both are the kind that read as working.
 *
 * **It kept nothing.** The list she typed lived in `useState`, so every show
 * she found, looked up and entered was gone the next time the page loaded.
 * The panel's own note says the best targets are shows nobody has pitched
 * yet and that FutureBox does not scrape directories — which makes that
 * typed list the single most valuable thing on the screen, and it was the
 * one thing not saved.
 *
 * **It invented her topics.** A show she added came in with
 * `['ai music', 'ai', 'creators']` hard-coded, whatever the show was about,
 * and the matcher then scored it against those three and drew a percentage
 * next to it. A number computed from topics the app made up, shown in the
 * place where a measurement goes. An Afrikaans theatre podcast scored on
 * "ai music" is not a weak match; it is not a match at all, and the screen
 * said 34%.
 *
 * So: the topics are hers, typed with the show, and a show with none gets
 * NO score rather than a made-up one. `matchPodcasts` returns `null` for it
 * and the row draws a dash. A blank where a number cannot honestly go is
 * the same rule the rest of this app follows — the cutting room shows no
 * recommended shape when no clip has been measured, for exactly this
 * reason.
 *
 * ── Why this is a module and not six lines in the component ──────────────
 *
 * Because what is in storage is not ours. It is a string somebody's browser
 * handed back, which may be from an older version of this app, from a hand
 * edit, or truncated by a tab that closed mid-write. Parsed carelessly, the
 * Radar is a panel that throws on load for one person and nobody can
 * reproduce it. `loadOwn` is total: anything it cannot read as a list of
 * targets is no targets, and `check:radar` feeds it rubbish on purpose.
 */

import type { PodcastTarget } from '../data/studio';

const STORE = 'futurebox.radar.targets.v1';

/** How many of her own shows are kept. Beyond this is a directory, not a list. */
export const MOST = 60;

/** How many topics one show carries, and how long each may be. */
const MOST_TOPICS = 12;
const LONGEST_TOPIC = 40;

/**
 * The topics for one show, out of what she typed.
 *
 * Commas, because that is what somebody types in a one-line box, and
 * newlines too, because a paste off a podcast page arrives with them.
 * Lower-cased and de-duplicated: `tagOverlap` lower-cases both sides
 * anyway, so two spellings of one topic would otherwise count twice in the
 * union and quietly lower her own score.
 */
export function topicsFrom(typed: string): readonly string[] {
  const seen = new Set<string>();
  for (const part of typed.split(/[,\n;]+/)) {
    const one = part.trim().toLowerCase().slice(0, LONGEST_TOPIC);
    if (one) seen.add(one);
    if (seen.size >= MOST_TOPICS) break;
  }
  return [...seen];
}

/** Whether this target can honestly be scored: it has topics of its own. */
export const scorable = (target: PodcastTarget): boolean => target.topics.length > 0;

/**
 * One of her own shows, as a target.
 *
 * The id carries a timestamp as well as the name, because two shows with the
 * same name added a month apart used to collide on `own-<index>-<name>` the
 * moment one in between was removed — and React keyed the rows off it.
 */
export function ownTarget(
  fields: {
    readonly name: string;
    readonly host?: string;
    readonly topics?: readonly string[];
    readonly format?: string;
    readonly audience?: string;
    readonly url?: string;
    readonly angle?: string;
    readonly reach?: PodcastTarget['reach'];
  },
  now = Date.now(),
): PodcastTarget | null {
  const name = fields.name.trim().slice(0, 120);
  if (!name) return null;
  return {
    id: `own-${now.toString(36)}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    name,
    host: (fields.host ?? '').trim().slice(0, 120),
    topics: fields.topics ?? [],
    format: (fields.format ?? '').trim().slice(0, 120),
    audience: (fields.audience ?? '').trim().slice(0, 60),
    reach: fields.reach ?? 'reachable',
    url: (fields.url ?? '').trim().slice(0, 300),
    angle: (fields.angle ?? '').trim().slice(0, 400),
  };
}

/**
 * Is this thing out of storage a target?
 *
 * Checked field by field rather than cast. A `JSON.parse` followed by
 * `as PodcastTarget[]` is a type assertion about a string somebody else's
 * browser handed back, and the first row missing `topics` is a panel that
 * throws inside `tagOverlap` on load.
 */
function isTarget(what: unknown): what is PodcastTarget {
  if (!what || typeof what !== 'object') return false;
  const one = what as Record<string, unknown>;
  return typeof one.id === 'string' && one.id.length > 0
    && typeof one.name === 'string' && one.name.length > 0
    && typeof one.host === 'string'
    && Array.isArray(one.topics) && one.topics.every((t) => typeof t === 'string')
    && typeof one.format === 'string'
    && typeof one.audience === 'string'
    && typeof one.url === 'string'
    && typeof one.angle === 'string'
    && (one.reach === 'peer' || one.reach === 'reachable' || one.reach === 'aspirational');
}

/** Whatever of that list is really a list of targets. Never throws. */
export function readOwn(raw: string | null): readonly PodcastTarget[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    /* The rows that survive, rather than none of them: one row written by an
       older version of this app should not take the other fifty-nine with
       it. She typed every one of these by hand. */
    return parsed.filter(isTarget).slice(0, MOST);
  } catch {
    return [];
  }
}

export function loadOwn(): readonly PodcastTarget[] {
  if (typeof window === 'undefined') return [];
  try {
    return readOwn(window.localStorage.getItem(STORE));
  } catch {
    return [];
  }
}

export function saveOwn(targets: readonly PodcastTarget[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORE, JSON.stringify(targets.slice(0, MOST)));
  } catch {
    /* Storage blocked or full. The list still works for this visit, and
       losing it quietly is better than a panel that cannot open. */
  }
}
