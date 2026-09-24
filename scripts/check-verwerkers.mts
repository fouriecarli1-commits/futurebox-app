/**
 * Everyone who sees a member's data has to be named on the page that says so.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The legal audit of 24 September 2026. `app/privacy/page.tsx` has a list
 * headed "Who else sees it", and it named six companies:
 *
 *     Supabase · Vercel · ElevenLabs · Anthropic · Paystack · Google
 *
 * The server sends personal information to at least three more:
 *
 *     Kits.AI    a recording of the member SINGING, for voice conversion
 *     Resend     their e-mail address, to send them anything at all
 *     Music.ai   their audio, to read the chords and the key out of it
 *
 * A voice is special personal information under POPIA, and this page says so
 * itself, two sections above the list it is missing from.
 *
 * ── And the same for what is kept ────────────────────────────────────────
 *
 * The page describes about a dozen kinds of record. The database holds 39
 * tables that tie rows to a person. Most of the gap is ordinary — a
 * subscription row is covered by "what you have made and spent" — but some
 * of it is not, and the sharpest is `cast_members`: **photographs of people's
 * faces**, uploaded by a member, kept in a bucket, and sent to ElevenLabs to
 * be animated into a presenter. The word "photograph" did not appear on the
 * page. Neither did "face".
 *
 * ── Why a check and not a proofread ──────────────────────────────────────
 *
 * Because this gap was not written, it ACCUMULATED. Every one of those
 * features was built after the page was, and each one was a small honest
 * piece of work that nobody thought to run past a privacy policy. That is
 * not a thing a person catches by re-reading; it is a thing a list catches.
 *
 * The same shape as `check:koste` rule 1 — every host the server calls
 * appears on the bill — pointed at a different page.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

const policy = readFileSync('app/privacy/page.tsx', 'utf8');

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

/* ── 1. Every processor that receives personal data ─────────────────────── */

/**
 * Each outbound host, what it is called, and what of the member's it gets.
 *
 * `gets: null` means the call carries nothing personal — a public catalogue
 * lookup. That is a claim about the code and it is written down rather than
 * assumed, because "this one does not count" is how a list stays short.
 */
interface Processor {
  readonly name: string;
  /** What of the member's it receives. `null` means nothing personal. */
  readonly gets: string | null;
  /**
   * True where it receives SPECIAL personal information under POPIA — a
   * voice, a face, anything that identifies a person the way a fingerprint
   * does. The privacy page itself makes this distinction and it carries a
   * stricter duty, so it is recorded rather than left to be noticed.
   */
  readonly special?: boolean;
  /**
   * The lawful basis for it leaving South Africa, or `null` where there is
   * none on file yet. `null` is allowed — a gap can be true — but only where
   * the page tells the member about it, which is the rule below.
   */
  readonly basis: string | null;
}

const SENDS: Record<string, Processor> = {
  'api.elevenlabs.io': {
    name: 'ElevenLabs',
    gets: 'lyrics, voice recordings, photographs, audio',
    special: true,
    basis: 'signed DPA, European standard contractual clauses — see docs/ELEVENLABS-TERME.md',
  },
  'api.music.ai': { name: 'Music.ai', gets: 'their audio, to read chords and key out of it', basis: null },
  'api.paystack.co': { name: 'Paystack', gets: 'their e-mail, so a receipt reaches them', basis: 'South African, so no transfer' },
  'api.resend.com': { name: 'Resend', gets: 'their e-mail address and the letter itself', basis: null },
  /* The second place a recording of a member's voice goes, and the reason
     this field exists. No agreement on file as of 24 September 2026. */
  'arpeggi.io': { name: 'Kits.AI', gets: 'a recording of them singing', special: true, basis: null },
  'api-singapore.klingai.com': { name: 'Kling', gets: 'the prompt they typed for a video', basis: null },
  /* ── Registered before it is wired, on purpose ─────────────────────────
     The video editor's filters are priced in `credits.ts` and named on every
     plan card, and the engine behind them is fal.ai. Nothing dials it yet.
     Putting it here now costs nothing — the scan below only counts hosts the
     server actually calls — and means the day somebody writes that fetch,
     this check fails until the privacy page has a line for it.
     That is the whole lesson of this audit: the gap was never written, it
     accumulated, one honest feature at a time. Video of a person's face is
     as personal as it gets, so it is marked special from the start. */
  'fal.run': { name: 'fal.ai', gets: 'the clip they are editing, which may be video of a person', special: true, basis: null },
  'queue.fal.run': { name: 'fal.ai', gets: 'the clip they are editing, which may be video of a person', special: true, basis: null },
  /* The catalogue only. Nothing of the member's is sent — the search term is
     a track title they are looking up, not a fact about them. */
  'api.spotify.com': { name: 'Spotify', gets: null, basis: 'nothing personal is sent' },
  'accounts.spotify.com': { name: 'Spotify', gets: null, basis: 'nothing personal is sent' },
};

const files: string[] = [];
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.ts$/.test(entry)) files.push(full);
  }
};
walk('app/api');
walk('app/lib/server');

const dialled = new Set<string>();
for (const path of files) {
  const source = withoutComments(readFileSync(path, 'utf8'));
  for (const [, host] of source.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/g)) {
    if (SENDS[host]) dialled.add(SENDS[host].name);
  }
  /* The SDK never writes its own URL down. Everything typed into the copilot
     goes to it, which is as personal as anything here. */
  if (/@anthropic-ai\/sdk/.test(source)) dialled.add('Anthropic');
}
/* These two are not dialled over https from server code — they are the
   platform itself — and both hold everything. */
dialled.add('Supabase');
dialled.add('Vercel');

const carries = new Set(
  [...dialled].filter((name) =>
    name === 'Supabase' || name === 'Vercel' || name === 'Anthropic'
      ? true
      : Object.values(SENDS).some((one) => one.name === name && one.gets !== null),
  ),
);

const unnamed = [...carries].filter((name) => !policy.includes(`>${name}</strong>`));
ok(`every processor that receives personal data is named on the privacy page (${carries.size} of them)`,
  unnamed.length === 0,
  `${unnamed.join(', ')} — POPIA asks who processes a person's information, and a list that is short is a list that is wrong`);

/* ── 1b. And a transfer with no basis has to be admitted, not hidden ─────

   POPIA section 72 wants a lawful basis for personal information leaving
   South Africa. ElevenLabs has one — a signed DPA with standard contractual
   clauses, written up in `docs/ELEVENLABS-TERME.md`.

   The four processors added on 24 September have none on file. That is not
   something a check can fix and not something it should hide: a gap can be
   true. What it must not be is silent, because a member deciding whether to
   put their voice through something is entitled to know which engine they
   are dealing with.

   So the rule is: where there is no basis, the page has to say so about that
   supplier BY NAME. It goes green by getting an agreement, or by telling the
   member the truth — and not by removing the supplier from the map, because
   rule 1 above would then fail instead. */
{
  /* Only what the server ACTUALLY dials. The first version read the whole
     map, so pre-registering fal.ai — a host nothing calls yet — turned the
     build red over a transfer that has never happened. A check must measure
     the running app, not the list of things somebody thought about; that is
     the same mistake this file exists to catch, one level up. */
  const noBasis = [...new Set(
    Object.values(SENDS).filter((one) => one.gets && !one.basis && carries.has(one.name)),
  )].filter((one, i, all) => all.findIndex((two) => two.name === one.name) === i);
  const special = noBasis.filter((one) => one.special);

  /* The strict one first. Special personal information — a voice, a face —
     leaving the country with no recorded basis is the sharpest thing in this
     file, so the page has to name the supplier AND say there is no agreement,
     rather than only listing it among the processors. */
  const quiet = special.filter(
    (one) => !(policy.includes(one.name) && /do not have those on file|no agreement/i.test(policy)),
  );
  ok('a supplier receiving a voice or a face with no agreement on file is named as such',
    quiet.length === 0,
    `${quiet.map((one) => one.name).join(', ')} — POPIA calls this special personal information; the page must say which engine has an agreement and which does not`);

  /* The rest are reported rather than asserted. A prompt typed for a video is
     not a voice, and turning the build red over it would train somebody to
     switch this off before the voice rule ever mattered. */
  if (noBasis.length > 0) {
    console.log(
      `  --  ${noBasis.length} processor(s) with no cross-border basis on file: ` +
        `${noBasis.map((one) => one.name).join(', ')}. POPIA 72 wants one for each.`,
    );
  }
}

/* ── 2. Every kind of record the app keeps ──────────────────────────────── */

/**
 * Tables that tie rows to a person, and the word the page must use about
 * each. Grouped where one sentence honestly covers several.
 *
 * A table absent from this map is a table nobody has decided about. That is
 * the point: adding one to `supabase/` and not to here leaves this check
 * silent, so the map is checked against the schema below as well.
 */
const KEPT: Record<string, string> = {
  cast_members: 'photograph',
  pairs: 'work together',
  pair_links: 'work together',
  live_flags: 'report',
  live_says: 'live room',
  live_posts: 'live room',
  live_hearts: 'live room',
  art_bids: 'bid',
  art_bidders: 'bid',
  scheduled_posts: 'queue',
  afrikaans_reports: 'pronunciation',
  moderation_events: 'refused',
  taste: 'tally',
  collab_messages: 'Collaboration',
  collab_invites: 'Collaboration',
  creators: 'public profile',
  voices: 'clone your voice',
  finetunes: 'train a sound',
  tracks: 'Your songs',
  videos: 'Your songs',
  episodes: 'Your songs',
  shows: 'Your songs',
  dubs: 'Your songs',
  generations: 'generated',
  credit_entries: 'credits',
  purchases: 'purchases',
  memberships: 'credits',
  subscriptions: 'Paystack',
  mail_log: 'Resend',
  entries: 'competition',
  winners: 'competition',
  speech_runs: 'generated',
  kits_minutes: 'generated',
  art_artists: 'public profile',
  events: 'tally',
  live_here: 'live visitor count',
  addon_customers: 'purchases',
  addon_grants: 'purchases',
  addons: 'purchases',
};

const undescribed = Object.entries(KEPT).filter(([, word]) => !policy.toLowerCase().includes(word.toLowerCase()));
ok(`every kind of record the app keeps is described on the page (${Object.keys(KEPT).length} tables)`,
  undescribed.length === 0,
  `${undescribed.map(([t, w]) => `${t} (no "${w}")`).join(', ')}`);

/* ── 3. And the map cannot fall behind the schema ───────────────────────── */

const schema = readdirSync('supabase')
  .filter((one) => one.endsWith('.sql') && one !== 'ALMAL.sql')
  .map((one) => readFileSync(join('supabase', one), 'utf8'))
  .join('\n');

const owned = new Set<string>();
for (const hit of schema.matchAll(/create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
  if (/^\s*(owner|email|to_email|bidder|handle)\s/m.test(hit[2])) owned.add(hit[1]);
}
const undecided = [...owned].filter((one) => !(one in KEPT));
ok('and no table ties rows to a person without a decision about it',
  undecided.length === 0,
  `${undecided.join(', ')} — add each to KEPT in this file with the word the page uses, or the page grows a gap nobody wrote`);

if (failures > 0) {
  console.log(`\ncheck:verwerkers — ${failures} gap(s) between what the app does with a person's data and what the page says it does.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:verwerkers — everyone who sees a member’s data is named, and every record kept is described.');
}
