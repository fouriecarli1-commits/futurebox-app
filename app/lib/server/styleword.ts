/**
 * Turning "klink soos Beat It" into something the engine can actually use.
 *
 * ── Where this came from ─────────────────────────────────────────────────
 *
 * Carli, 9 October 2026, after testing Google's own app: *"'n mens kan vir
 * gemini vra dat jy 'n liedjie soek wat baie klink soos michael jackson se
 * liedjie beat it, en dit kry dit regtig reg om dit 'n moontlikheid te
 * maak."*
 *
 * And then, when the problem was put to her: *"ek verstaan, en google is ook
 * nie bereid om copy write wette te oortree nie, dit kry dit net mooi reg om
 * die 80's se styl in baie nader aan daardie formaat te genereer."*
 *
 * That second sentence is the whole design. What she wants is not the song
 * and not the artist — it is **the era and the format**, hit accurately. A
 * style is not copyrightable and never has been; a NAME is a claim on a
 * person, and this app already refuses those in `moderation.ts`:
 *
 *   "Prompts that name X are refused, because a request in a named artist's
 *   style is a request for that artist. Say what you actually want — the
 *   tempo, the instruments, the era, the mood — and the result will be yours
 *   to release."
 *
 * That refusal tells somebody to do a translation by hand. This does it for
 * them. The wall becomes a door, and the song that comes out the other side
 * is theirs to release — which the one they asked for would not have been.
 *
 * ── What it is told it may not do ────────────────────────────────────────
 *
 * Three things, and they are the whole of the risk:
 *
 *   1. **No name reaches the engine.** Not the artist, not the song, not the
 *      album, not the band. The returned style is checked for every name
 *      that went in — see `clean()` — and a style still carrying one is
 *      thrown away rather than sent.
 *   2. **No melody and no words.** A style is tempo, instrumentation,
 *      production and feel. A returned "style" containing a lyric or a
 *      described hook is the one output that would actually be a copy.
 *   3. **Nothing about the person.** Not their voice, not their life, not
 *      their look. A voice is the thing `moderation.ts` protects hardest
 *      and this must not become a side door to it.
 *
 * ── Why the model, and why this one ──────────────────────────────────────
 *
 * It needs to know what a decade sounded like and how a record was made,
 * which is exactly what a static table of eras cannot carry — and the app
 * already has a copilot for work of that kind.
 *
 * `claude-opus-5-5` rather than the `claude-opus-5` the two older call sites
 * use: it is newer AND cheaper per token, so there is no trade being made
 * here. The other two are worth moving for the same reason, and that is a
 * separate change rather than something to do quietly inside this one —
 * see `docs/OPEN-QUESTIONS.md`.
 */

import { z } from 'zod';

export const SaidSchema = z.object({
  /**
   * What to send the engine instead. No names, no lyrics, no melody.
   *
   * Written as a style line rather than a sentence, because that is what
   * `musicplan.ts` turns into `positive_styles` and what the engine reads.
   */
  style: z.string().describe(
    'The sound, as a comma-separated style line an English-first music model'
    + ' can read: era, tempo, key instruments, how it was produced, the'
    + ' rhythmic feel, the vocal delivery. Never a name. Never a lyric.'
    + ' Never a melody. 12 to 30 words.',
  ),
  /** Roughly where it sits, so the room can show it. */
  tempo: z.string().describe('A bpm or a narrow range, e.g. "138 bpm" or "96–102 bpm".'),
  /**
   * Every name that was taken out, so the member sees the swap rather than
   * being quietly corrected.
   */
  dropped: z.array(z.string()).describe(
    'Every proper name that appeared in what they typed — artists, songs,'
    + ' albums, bands. Empty if there were none.',
  ),
  /** One sentence for the member, in their own language. */
  says: z.string().describe(
    'One short sentence telling them what was swapped for what, in the same'
    + ' language they typed in. Plain, not apologetic.',
  ),
});

export type Said = z.infer<typeof SaidSchema>;

export const SYSTEM = [
  'You turn a reference into a describable musical style for a music model.',
  '',
  'Somebody has asked for a song by naming an artist, a song or a band. You',
  'write what that actually SOUNDS like, so a model that has never heard of',
  'them can make something in the same territory.',
  '',
  'Three rules, and they are absolute.',
  '',
  '1. No names. Not the artist, the song, the album, the band, the producer,',
  '   the label. Not even obliquely ("the Gloved One", "the Liverpool four").',
  '   If you cannot describe it without a name, describe the decade instead.',
  '2. No melody and no words. Never a lyric, never a described hook, never a',
  '   chord sequence lifted from the record. Style is tempo, instruments,',
  '   production and feel.',
  '3. Nothing about the person. Not their voice, their life, their look or',
  '   their story. Describe a DELIVERY ("clipped, percussive, high in the',
  '   chest") and never a performer.',
  '',
  'Be specific and technical. "80s pop" is useless. "Early-80s funk-rock:',
  'hard syncopated electric bass, gated reverb on a tight snare, clean',
  'single-coil guitar stabs, a four-on-the-floor kick around 138 bpm,',
  'clipped percussive lead vocal high in the chest" is the job.',
  '',
  'Reach for the production as much as the instruments. What made a record',
  'sound like its year is usually how it was recorded: the room, the',
  'compression, the reverb, the tape, the drum machine of the day.',
  '',
  'If what they typed contains no name at all, it needs no translation:',
  'return their own words tidied into a style line, and an empty dropped',
  'list.',
].join('\n');

/**
 * Whether a style line is safe to send.
 *
 * ── Why the model's own word is not enough ───────────────────────────────
 *
 * Because the instruction above is a prompt, and a prompt is a request. The
 * check is cheap, it is deterministic, and the thing it prevents is the one
 * failure that matters: a name reaching the engine inside a field called
 * `style`, which is the exact request `moderation.ts` refuses at the front
 * door.
 *
 * ── What it matches, and the bug that set the threshold ─────────────────
 *
 * Two things: the whole name as a phrase, and any single word of it long
 * enough to be distinctive.
 *
 * The threshold was four letters, and `check:anderwoorde` caught that on the
 * first run — against the very example this feature is named for. "Beat It"
 * splits to "beat", which is four letters, so a perfectly clean style line
 * containing *"a four-on-the-floor beat"* was thrown away. A guard that
 * rejects good work is not a safe guard; it is one somebody turns off.
 *
 * Five catches the names that matter — michael, jackson, prince, madonna,
 * beyonce — and leaves the drums alone. What five does NOT catch is a
 * one-word act whose name is an ordinary English word: Yes, Rush, Live,
 * Beat. Said plainly rather than papered over, because the answer is not in
 * this function: the route runs `screen()` over the returned style as well,
 * and the known-names list is what catches those. One net for the general
 * case, a second for the exact one.
 */
export function clean(style: string, dropped: readonly string[]): boolean {
  const lower = style.toLowerCase();
  const has = (word: string): boolean =>
    new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'u').test(lower);

  return !dropped.some((name) => {
    const whole = name.trim().toLowerCase();
    /* The whole name, which catches "beat it" without catching "beat". */
    if (whole && has(whole)) return true;
    /* And any single word distinctive enough to be one on its own. */
    return whole
      .split(/[^\p{L}\p{N}']+/u)
      .filter((word) => word.length >= 5)
      .some(has);
  });
}
