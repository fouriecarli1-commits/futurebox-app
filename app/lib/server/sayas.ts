/**
 * A song read aloud, written down the way it was said.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 22 October 2026: *"Die Afrikaans wat gegenerate word is baie
 * baie baie bad… Dit klink heeltemal nederlands en engels vermeng. Is daar
 * nie 'n manier dat iemand hulle liedjie se woorde vooraf kan rekord, dit
 * submit en dan word die phoeneties van die liedjie saam na die musiek
 * engine gestuur, om die uitspraak reg te kry nie?"*
 *
 * The music engine takes text and nothing else — no recording, no phonemes
 * (its composition plan is lines of words per section). So the recording
 * cannot go to it. What the recording CAN do is decide the text: a model
 * that listens writes every line as this person said it, spelled for a
 * singer who reads English — her own technique from 9 October ("Eck iss
 * buy-a leef fir yo"), done for the whole line from her own mouth instead of
 * from a word list.
 *
 * The word list (`singit.ts`) is why it sounded mixed: it respells the
 * Afrikaans words it knows and leaves the rest in Afrikaans spelling, so the
 * engine got half a line in English sounds and half in Dutch-looking
 * letters. A line spelled whole, from a reading, has neither problem.
 *
 * ── What is kept ─────────────────────────────────────────────────────────
 *
 * The lines, not the recording: it is read once and dropped, as in
 * `hearword.ts`. The member's own lyrics are never changed — this is the
 * copy that goes to the engine, beside the words the room shows.
 */
import { addressOf, flashCall } from './google';

export const LISTENER = 'gemini-2.5-flash';

/** The most lines one reading is matched against: a long song, not a book. */
export const MOST_LINES = 80;
/** The longest respelled line kept; the engine cuts at 200 anyway. */
const MOST_LINE = 200;

export const SAYAS_SYSTEM = [
  'You listen to a person reading the words of their song aloud, in Afrikaans (sometimes with English lines or words in it).',
  'You are given the written lines, in order. For EVERY line, write how that line sounds as THIS person said it,',
  'spelled so that an English-speaking singer reading it cold would pronounce it the same way.',
  'The singer has never seen Afrikaans. Every Afrikaans word must be rewritten in English sound-spelling: NOT ONE Afrikaans letter group may be left.',
  'Use these spellings (Afrikaans -> write):',
  '"aa" -> "ah" (daar -> dahr, staan -> stahn, maar -> mahr, saam -> sahm, jaar -> yahr, laag -> lahkh);',
  '"aai" -> the English "eye" sound (haai -> high, baai -> buy, swaai -> swy, Mosselbaai -> Moss-ul-buy);',
  'short "a" -> "u" as in cup (mal -> mul, kat -> kut); "e" in short words as in bed (net, en);',
  '"ê" -> "eh" (wêreld -> veh-relt); "ee" -> "ee-uh" (een -> ee-un, see -> see-uh);',
  '"ie" -> "ee" (die -> dee); "i" in "is", "dis" -> "iss", "diss";',
  '"oo" -> "oo-uh" (brood -> broo-ut); "oe" -> "oo" (boek -> book); "ou" -> "oh" (koud -> koht, oud -> oht);',
  '"ui" -> "ay" (huis -> hays); "y" and "ei" -> "ay" (bly -> blay, my -> may, kyk -> kayk, klein -> klayn);',
  '"eu" -> "ur" (neus -> nurs); "eeu" -> "ee-oo" (sneeu -> snee-oo); "ooi" -> "oy" (rooi -> roy); "oei" -> "ooey" (koei -> kooey);',
  '"w" -> "v" (was -> vus, wat -> vut); "v" -> "f" (vir -> fir, vra -> frah); "g" -> "kh" (nog -> nokh, lag -> lukh);',
  '"j" -> "y" (jaar -> yahr, jy -> yay); a "d" or "b" at the end of a word -> "t" or "p" (koud -> koht, wêreld -> veh-relt);',
  '"\'n" -> "uh"; "tjie" -> "kee"; "sj" -> "sh".',
  'Example: "Daar was \'n haai in Mosselbaai" -> "Dahr vus uh high in Moss-ul-buy".',
  'Follow what THIS person actually said where it differs from the table: their reading decides, the table is how to spell it.',
  'Keep English words exactly as they are written. Keep the rhythm: one written line, one spelled line, same order.',
  'Do not translate, do not add or drop lines, do not fix the words - only respell them as heard.',
  'If a line was not read in the recording, respell it from how a native Afrikaans speaker would say it.',
  'Answer with JSON only: {"lines": ["...", "..."]} with exactly as many lines as you were given.',
].join(' ');

/**
 * Afrikaans letter groups an English reader cannot say, left in a line the
 * model was asked to respell. The owner, 28 October 2026, with a reading
 * that came back "Daar vas uh haai in Mos-sel-baai": half respelled, and
 * every "aa" and "aai" left was sung the English way. Only groups English
 * spelling almost never uses, so an English word in a mixed line is not
 * flagged.
 */
const NOT_ENGLISH = /aa|ui|eu|ê|ë|ô|û|î|ooi|oei|eeu|ieu|ij/i;

/** Words still in Afrikaans spelling in a respelled line, if any. */
export function leftovers(lines: readonly string[]): string[] {
  const words = lines.flatMap((line) => line.split(/[\s,.;:!?"()\[\]]+/)).filter(Boolean);
  return [...new Set(words.filter((word) => NOT_ENGLISH.test(word)))];
}

/** The body of the listening call: the reading, then the lines, and any words to do again. */
export function sayAsBody(audio: { data: string; mime: string }, lines: readonly string[], again: readonly string[] = []): string {
  const ask = `The ${lines.length} written lines, in order:\n${lines.map((line, i) => `${i + 1}. ${line}`).join('\n')}`;
  const redo = again.length
    ? `\n\nA first try left these words in Afrikaans spelling, which an English singer will say wrong: ${again.join(', ')}. Respell every one of them by the rules.`
    : '';
  return JSON.stringify({
    systemInstruction: { parts: [{ text: SAYAS_SYSTEM }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: audio.mime, data: audio.data } },
        { text: ask + redo },
      ],
    }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  });
}

/** The lines out of the model's answer, only when there is one for every line asked. */
export function linesIn(body: unknown, count: number): string[] | null {
  const text = (body as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null)
    ?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return null; }
  const lines = (parsed as { lines?: unknown } | null)?.lines;
  if (!Array.isArray(lines) || lines.length !== count) return null;
  const out = lines.map((one) => (typeof one === 'string' ? one.replace(/\s+/g, ' ').trim().slice(0, MOST_LINE) : ''));
  return out.every(Boolean) ? out : null;
}

export type Heard =
  | { readonly ok: true; readonly lines: string[] }
  | { readonly ok: false; readonly status: number; readonly message: string };

/** One listening call: the lines it heard, or why not. */
async function listen(audio: { data: string; mime: string }, lines: readonly string[], again: readonly string[] = []): Promise<Heard> {
  let answer: Response;
  try {
    ({ response: answer } = await flashCall((one) => fetch(addressOf(one, 'generateContent'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_VERTEX_KEY ?? '' },
      body: sayAsBody(audio, lines, again),
    }), LISTENER));
  } catch {
    return { ok: false, status: 502, message: 'The listening engine could not be reached. Try again in a moment.' };
  }
  const text = await answer.text().catch(() => '');
  if (!answer.ok) return { ok: false, status: 502, message: 'The listening engine did not answer this time. Try again in a moment.' };
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = null; }
  const got = linesIn(body, lines.length);
  if (!got) {
    return { ok: false, status: 502, message: 'It listened but could not match every line to what it heard. Read every line once, in order, and try again.' };
  }
  return { ok: true, lines: got };
}

/**
 * Ask the listening model how each line was said. When words come back
 * still in Afrikaans spelling, it is asked once more, naming them, and the
 * answer with fewer of them is kept.
 */
export async function hearLines(audio: { data: string; mime: string }, lines: readonly string[]): Promise<Heard> {
  const first = await listen(audio, lines);
  if (!first.ok) return first;
  const left = leftovers(first.lines);
  if (!left.length) return first;
  const second = await listen(audio, lines, left);
  return second.ok && leftovers(second.lines).length < left.length ? second : first;
}

/**
 * A song's say-as map as it arrives from a browser, cleaned: written line to
 * spoken spelling, strings only, bounded, and only for lines that are in the
 * song — a map cannot put words into a song that were not written in it.
 */
export function cleanSayAs(raw: unknown, sung: readonly string[]): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const wanted = new Set(sung.map((line) => line.trim()));
  const out: Record<string, string> = {};
  for (const [line, as] of Object.entries(raw as Record<string, unknown>).slice(0, MOST_LINES * 2)) {
    const key = line.trim();
    if (!wanted.has(key) || typeof as !== 'string') continue;
    const value = as.replace(/\s+/g, ' ').trim().slice(0, MOST_LINE);
    if (value) out[key] = value;
  }
  return out;
}
