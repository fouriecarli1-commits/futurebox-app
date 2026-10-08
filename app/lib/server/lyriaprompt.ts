/**
 * The app's own song request, written out as something Lyria can read.
 *
 * ── Why this is a translation and not a mapping ──────────────────────────
 *
 * ElevenLabs Music takes a COMPOSITION PLAN: sections, each with a name, its
 * lines and how many seconds it runs. That is what a songwriter actually
 * has, and it is why `musicplan.ts` was written the way it was.
 *
 * Lyria takes one string.
 *
 * So everything the plan knows has to be said in prose, and some of it
 * cannot be said at all. **This is lossy, and the losses are listed here
 * rather than discovered:**
 *
 *   - **Per-section seconds are gone.** The plan can say the chorus runs
 *     eighteen seconds; a prompt can only say the whole thing is about two
 *     minutes. Lyria decides the shape.
 *   - **A trained sound cannot travel.** `finetuneId` is an ElevenLabs
 *     model on an ElevenLabs account. There is no Lyria equivalent, and
 *     silently dropping it would hand somebody a song in the wrong voice
 *     after they chose theirs — so the caller is told, and refuses.
 *
 * What DOES survive, and is the reason this works at all: Lyria 3 Pro reads
 * section tags. `[Verse 1]`, `[Chorus]`, `[Bridge]` in the lyric are how a
 * structure is asked for, which is the same vocabulary the plan already
 * uses for its section names.
 */

import type { Body, MusicSection } from './musicplan';

/** Section names, as Lyria wants to see them. */
const tagged = (one: MusicSection): string => {
  const name = (one.name ?? '').trim() || 'Verse';
  /* Already bracketed by whoever wrote it — the booth's own names are plain
     words, but a pasted lyric sheet often is not, and `[[Chorus]]` reads as
     a mistake rather than as emphasis. */
  const tag = name.startsWith('[') ? name : `[${name}]`;
  const lines = (one.lines ?? []).map((line) => line.trim()).filter(Boolean);
  return lines.length ? `${tag}\n${lines.join('\n')}` : '';
};

export interface Rendered {
  readonly prompt: string;
  readonly negative: string;
  /** How long the whole thing should be, in seconds, where it was asked for. */
  readonly seconds: number | null;
}

/** Why this request cannot be sent to Lyria, or null when it can. */
export function cannot(body: Body): string | null {
  if (body.finetuneId) {
    return 'That trained sound belongs to the other music engine, so this song'
      + ' cannot be made by Google. Choose a stock sound, or switch the engine back.';
  }
  const words = (body.sections ?? []).some((one) => (one.lines ?? []).some((l) => l.trim()));
  if (!words && !(body.style ?? '').trim() && !(body.prompt ?? '').trim()) {
    return 'Say what the song should be.';
  }
  return null;
}

/**
 * One prompt out of the whole plan.
 *
 * The style first, because it is what the model leans on hardest, then the
 * lyric with its sections tagged. A length is stated in words when the plan
 * asked for one — Lyria will not be held to it, and saying so is better than
 * pretending the number crossed over.
 */
export function promptFor(body: Body): Rendered {
  const style = (body.style ?? '').trim();
  const sections = (body.sections ?? []).map(tagged).filter(Boolean);
  const plain = (body.prompt ?? '').trim();
  const seconds = Number.isFinite(body.seconds) && (body.seconds ?? 0) > 0
    ? Math.round(body.seconds as number)
    : null;

  const parts: string[] = [];
  if (style) parts.push(style);
  if (seconds) {
    /* In words, not as a parameter, because it is not one. Rounded to the
       nearest ten seconds: a prompt saying "about 127 seconds" claims a
       precision that nothing on the other side honours. */
    parts.push(`About ${Math.max(10, Math.round(seconds / 10) * 10)} seconds long.`);
  }
  if (body.instrumental) {
    /* Said in the prompt rather than only in the negative, because Lyria 3
       Pro sings by default and one mention of it is how that is turned off.
       Both, deliberately: this is the setting somebody notices immediately
       if it fails, and belt and braces costs nothing. */
    parts.push('Instrumental only, no vocals.');
  } else if (sections.length) {
    parts.push('Sung, with these words:');
    parts.push(sections.join('\n\n'));
  } else if (plain) {
    parts.push(plain);
  }

  return {
    prompt: parts.join('\n\n').trim(),
    negative: body.instrumental ? 'vocals, singing, voice' : '',
    seconds,
  };
}
