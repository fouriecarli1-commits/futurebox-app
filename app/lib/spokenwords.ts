/**
 * Words out of the character alignment a read comes back with.
 *
 * ── Why this is free, and what it replaces ───────────────────────────────
 *
 * `/v1/text-to-speech/{voice}/with-timestamps` returns the same audio as the
 * ordinary read and, alongside it, the time every single character starts and
 * ends. It is the same call at the same price: the timings are not an extra
 * product, they are a field on the answer that this app had never asked for.
 *
 * What that saves is `/api/transcribe` — paying a second time to work out
 * where the words fell in speech **this app generated from words it already
 * had**. That is the whole of #112: the read knows exactly where it put every
 * syllable, and there is no reason to buy that knowledge back.
 *
 * ── Said exactly, because the loose version is not true ──────────────────
 *
 * Nothing in this app transcribes generated speech *today*. The three callers
 * of `/api/transcribe` all send something else: `PromptCards` and `Transcript`
 * send a recording somebody made, and `lyrictime` sends a song. None of them
 * is replaced by this and none of them should be.
 *
 * So this is not a saving already being made — it is a saving locked in
 * before the screen that would need it exists. The moment a read has to show
 * its words as they are spoken, the timings are there for nothing, rather than
 * a transcription being added because that was the only way anybody knew.
 *
 * ── Characters, not words, and why that is the right shape to be given ───
 *
 * Their alignment is per character, which looks like more work than a list of
 * words and is in fact the more honest thing to be handed. A word's timing is
 * a decision — where does the comma belong, is "don't" one word — and a
 * service that made that decision for us would be making it in English. The
 * characters are a measurement. The decision is here, in one function, in the
 * open, where it can be argued with.
 *
 * ── The refusal ──────────────────────────────────────────────────────────
 *
 * This returns **null** when the three arrays do not agree, and null means
 * "the alignment could not be read" — not "the read had no words in it". The
 * difference matters enough that this codebase has a check for it
 * (`check:couldnotask`): a screen that shows no highlighted words because the
 * shape changed must not look identical to a screen showing a silent file.
 *
 * The shape below is from ElevenLabs' documentation and **has never been seen
 * from the live API from this machine**, which cannot reach it. So it is read
 * defensively and it refuses rather than guesses: if a field is renamed or
 * nested differently, the answer is null, the caller drops a rung, and nobody
 * is shown confident timings built out of nothing.
 */

export interface SpokenWord {
  readonly text: string;
  /** Seconds from the start of the audio. */
  readonly start: number;
  readonly end: number;
}

/** Their field names, as documented. Read by name, never by position. */
export interface Alignment {
  readonly characters?: unknown;
  readonly character_start_times_seconds?: unknown;
  readonly character_end_times_seconds?: unknown;
}

/** Every entry a finite number, and the three lists the same length. */
function numbers(value: unknown, many: number): number[] | null {
  if (!Array.isArray(value) || value.length !== many) return null;
  const out: number[] = [];
  for (const one of value) {
    if (typeof one !== 'number' || !Number.isFinite(one)) return null;
    out.push(one);
  }
  return out;
}

/**
 * The characters, grouped into words.
 *
 * A word ends at whitespace. Everything else — punctuation, an apostrophe, a
 * hyphen — stays attached to the word it was typed against, because that is
 * what somebody reading along sees on the screen: "don't" is one thing to
 * light up and "don" followed by "t" is not.
 *
 * Null on anything it cannot read. See the note above.
 */
export function wordsFromAlignment(alignment: unknown): SpokenWord[] | null {
  if (!alignment || typeof alignment !== 'object') return null;
  const said = alignment as Alignment;

  const characters = said.characters;
  if (!Array.isArray(characters) || characters.length === 0) return null;
  for (const one of characters) if (typeof one !== 'string') return null;

  const starts = numbers(said.character_start_times_seconds, characters.length);
  const ends = numbers(said.character_end_times_seconds, characters.length);
  if (!starts || !ends) return null;

  const words: SpokenWord[] = [];
  let text = '';
  let start = 0;
  let end = 0;

  const close = (): void => {
    if (!text) return;
    /* `end` can land before `start` on a single character whose end time is
       equal to its start — a zero-length word is not wrong, a backwards one
       is. Clamped rather than dropped: the word was said. */
    words.push({ text, start, end: Math.max(start, end) });
    text = '';
  };

  for (let i = 0; i < characters.length; i += 1) {
    const character = characters[i] as string;
    if (/\s/.test(character)) {
      close();
      continue;
    }
    if (!text) start = starts[i];
    text += character;
    end = ends[i];
  }
  close();

  /* An alignment that read cleanly and holds no words at all is a real
     answer — an empty script, a read of nothing but spaces — and it is
     returned as an empty list rather than as null, because null here means
     something else entirely. */
  return words;
}

/**
 * Words into lines, on the punctuation somebody would break at.
 *
 * For a caption under a talking head, one word at a time is unreadable and the
 * whole script at once is a wall. This groups on sentence ends, and on a
 * length ceiling so a sentence without a full stop in it does not become one
 * line thirty words long.
 */
export function linesFromWords(words: readonly SpokenWord[], most = 42): SpokenWord[] {
  const lines: SpokenWord[] = [];
  let text = '';
  let start = 0;
  let end = 0;

  const close = (): void => {
    if (!text) return;
    lines.push({ text, start, end: Math.max(start, end) });
    text = '';
  };

  for (const word of words) {
    if (!text) start = word.start;
    text = text ? `${text} ${word.text}` : word.text;
    end = word.end;
    if (/[.!?…]$/.test(word.text) || text.length >= most) close();
  }
  close();
  return lines;
}
