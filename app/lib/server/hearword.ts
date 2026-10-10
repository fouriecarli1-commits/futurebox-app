/**
 * Somebody says a word, and the machine writes down the sounds.
 *
 * ── The question, and the answer I got wrong first ───────────────────────
 *
 * Carli, 10 October 2026: *"But isn't there a way for an AI to listen to the
 * phonetic sounds of someone speaking isiXhosa?"*
 *
 * Yes. I had just written that getting phonetics out of audio means "forced
 * alignment, then transcription, then phoneme extraction — a research
 * pipeline", and that is true of turning a whole audio Bible into a lexicon
 * and false of what she actually asked. For ONE word it is one call to a
 * model that listens. Phone recognition — audio in, phonetic symbols out —
 * has been an ordinary thing for years.
 *
 * ── What it unlocks, which is the part that matters ──────────────────────
 *
 * This app already has every other piece and has never used this one.
 * ElevenLabs applies pronunciation dictionaries per request through
 * `pronunciation_dictionary_locators`; `lib/server/sayit.ts` builds them;
 * `/api/eleven/pronounce` reads a list aloud so she can mark what sounds
 * wrong. All of it writes **alias** rules — a word and a respelling — and
 * `sayit.ts` has never once written a **phoneme** rule, which is the kind
 * that carries actual IPA.
 *
 * Respelling is guesswork by a person who does not speak the language.
 * Phonetics is what a speaker's own mouth did. For isiXhosa that is the
 * whole difference: the clicks have no respelling in any other language's
 * letters, and `x` respelt as anything at all is wrong.
 *
 * So: an isiXhosa speaker says the word once, into the phone. The model
 * writes the IPA. She hears it read back in the voice that will sing it. If
 * it is right, it goes in the dictionary and every read from then on says it
 * properly.
 *
 * ── Why the answer is never trusted on its own ───────────────────────────
 *
 * Because a model's IPA for a language it has heard little of is a guess
 * with symbols in it, and a wrong phoneme rule is worse than none: an alias
 * that is a bit off sounds a bit off, and a phoneme rule that is wrong makes
 * the voice say a different word with total confidence.
 *
 * `heard()` therefore returns what it heard AND how sure it is AND the
 * ordinary spelling it thinks it heard, and nothing here writes to a
 * dictionary. The write is a separate press by a person who has listened to
 * the playback. That is not caution for its own sake — it is the same loop
 * `/api/eleven/pronounce` was built around, which is that Carli can hear it
 * and this desk cannot.
 *
 * ── And phoneme rules do not work everywhere ─────────────────────────────
 *
 * ElevenLabs applies them on some models and refuses them on others, and the
 * refusal is a 400 naming `pronunciation_dictionary_locators` —
 * `refusedTheDictionary` in `eleven.ts` already reads exactly that. So every
 * phoneme rule this makes carries an alias beside it as a fallback: if the
 * phonetic one is refused, the respelling still goes. Better than nothing is
 * the whole point of a fallback, and a dictionary that is rejected wholesale
 * because one rule is of the wrong kind helps nobody.
 */

import { addressOf } from './google';

/**
 * The model asked to listen.
 *
 * A Flash-class Gemini, because this is a short audio clip and a short
 * answer, it is serverless on her Model Garden listing, and it is priced per
 * token at a rate where a word costs a fraction of a cent. The big models
 * are for reasoning over an hour of video; this is one word.
 *
 * In `MODELS` as a candidate rather than hard-wired, for the reason that
 * whole file exists: the probe is what says which names answer on her
 * project, not a guess made here.
 */
export const LISTENER = 'gemini-2.5-flash';

/**
 * What the listening model is told.
 *
 * ── Every line of this is load-bearing ───────────────────────────────────
 *
 * **"Narrow transcription"** — otherwise a model gives the broad phonemic
 * form, which is the dictionary's idea of the word rather than what the
 * speaker actually said, and the whole point is the speaker.
 *
 * **The click consonants, named.** isiXhosa and isiZulu have fifteen of
 * them. A model asked for IPA without being reminded will write `k` or `x`
 * or simply leave them out, because the letters `c`, `q` and `x` mean
 * something else in every language it has seen more of.
 *
 * **"Do not guess at the spelling"** — a model handed audio it cannot place
 * will hand back a plausible word in a language it knows better. Asking it
 * to say so instead is the difference between a dictionary entry and a
 * confident mistake.
 *
 * **The tone line**, because Sesotho, Setswana and Shona are tonal and tone
 * is not optional in them. It is marked where it is heard and left off where
 * it is not, rather than invented.
 */
export const LISTEN_SYSTEM = [
  'You are a phonetician. You will hear one short recording of a person',
  'saying a single word or short phrase, and you will be told which language',
  'it is and how the word is written.',
  '',
  'Write what you ACTUALLY HEAR as a narrow IPA transcription — the sounds',
  'this speaker made, not the dictionary form of the word.',
  '',
  'If the language is isiXhosa, isiZulu or another Nguni language, the click',
  'consonants are phonemes and must be transcribed as clicks: dental |,',
  'lateral ||, and post-alveolar !, with their aspirated, voiced, nasal and',
  'nasalised forms. Never substitute an ordinary consonant for a click.',
  '',
  'If the language is tonal (Sesotho, Setswana, Shona), mark the tone you',
  'hear with the usual accents. Do not mark tone you cannot hear.',
  '',
  'Do not guess. If the recording is unclear, if you cannot tell what was',
  'said, or if what you hear does not match the written word you were given,',
  'say so in `trouble` and give a low `sure`. A confident wrong transcription',
  'makes a voice say a different word.',
].join(' ');

export interface Heard {
  /** Narrow IPA for what the speaker actually said. */
  readonly ipa: string;
  /** What it believes was said, in ordinary spelling. */
  readonly spelt: string;
  /** 0 to 1. Below `SURE_ENOUGH` the room must not offer to save it. */
  readonly sure: number;
  /** Anything wrong with the recording, in words. Empty when there is none. */
  readonly trouble: string;
}

/**
 * How sure it has to be before the room offers to keep it.
 *
 * 0.6 and not 0.9, because this is not the last gate — a person listens to
 * the playback before anything is written. Setting it high would throw away
 * usable transcriptions of a quiet recording; setting it at zero would offer
 * to save the model's shrug. This is the line between "worth listening to"
 * and "record it again".
 */
export const SURE_ENOUGH = 0.6;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? value as Record<string, unknown> : null;

/**
 * The transcription out of whatever shape the answer takes.
 *
 * Exported and driven by a check with no network, for the reason every other
 * Google reader in this app is: a reader guessed at is a paid answer thrown
 * away because the field was called something else.
 */
export function heardIn(body: unknown): Heard | null {
  const top = asRecord(body);
  const candidates = Array.isArray(top?.candidates) ? top!.candidates : [];
  for (const one of candidates) {
    const content = asRecord(asRecord(one)?.content);
    const parts = Array.isArray(content?.parts) ? content!.parts : [];
    for (const part of parts) {
      const said = asRecord(part)?.text;
      if (typeof said !== 'string') continue;
      /* The JSON, out of whatever the model wrapped it in. A fenced block is
         the commonest wrapping and the one that breaks a bare JSON.parse. */
      const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(said);
      const raw = (fenced ? fenced[1] : said).trim();
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { continue; }
      const row = asRecord(parsed);
      const ipa = typeof row?.ipa === 'string' ? row.ipa.trim() : '';
      if (!ipa) continue;
      const sure = typeof row?.sure === 'number' && Number.isFinite(row.sure)
        ? Math.max(0, Math.min(1, row.sure))
        : 0;
      return {
        ipa,
        spelt: typeof row?.spelt === 'string' ? row.spelt.trim() : '',
        sure,
        trouble: typeof row?.trouble === 'string' ? row.trouble.trim() : '',
      };
    }
  }
  return null;
}

/** A rule as ElevenLabs takes it. */
export interface Rule {
  readonly string_to_replace: string;
  readonly type: 'phoneme' | 'alias';
  readonly phoneme?: string;
  readonly alphabet?: 'ipa';
  readonly alias?: string;
}

/**
 * The rules one heard word becomes.
 *
 * TWO of them, always, and in this order: the phonetic one, then a
 * respelling as a fallback.
 *
 * ElevenLabs applies phoneme rules on some models and refuses them on
 * others, with a 400 naming `pronunciation_dictionary_locators` —
 * `refusedTheDictionary` in `eleven.ts` already reads that exact refusal. A
 * dictionary rejected wholesale because one rule is of the wrong kind helps
 * nobody, so the respelling travels beside it and survives.
 *
 * The alias is only included where there is a real one to give. An invented
 * respelling of a click is worse than no rule at all: it would make the
 * voice say a confidently wrong word in the one case this whole file exists
 * for.
 */
export function rulesFor(word: string, heard: Heard, alias = ''): Rule[] {
  const subject = word.trim();
  if (!subject || !heard.ipa) return [];
  const rules: Rule[] = [
    { string_to_replace: subject, type: 'phoneme', phoneme: heard.ipa, alphabet: 'ipa' },
  ];
  if (alias.trim()) {
    rules.push({ string_to_replace: subject, type: 'alias', alias: alias.trim() });
  }
  return rules;
}

/** Whether this is worth offering to keep, or worth recording again. */
export function worthKeeping(heard: Heard | null): boolean {
  return Boolean(heard) && heard!.sure >= SURE_ENOUGH && heard!.ipa.length > 0;
}

/** The body of the listening call: the recording, then the question. */
export function listenBody(
  audio: { data: string; mime: string },
  word: string,
  language: string,
): string {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: LISTEN_SYSTEM }] },
    contents: [{
      role: 'user',
      parts: [
        /* The recording BEFORE the question, for the ordering reason
           `picture.ts` has a note about: a model reads a turn in order. */
        { inlineData: { mimeType: audio.mime, data: audio.data } },
        {
          text: `The language is ${language}. The word is written "${word}".`
            + ' Answer with JSON only: {"ipa": "...", "spelt": "...", "sure":'
            + ' 0.0, "trouble": "..."}',
        },
      ],
    }],
    generationConfig: {
      /* Low, because this is a transcription and not a composition. A model
         inventing variety here is a model inventing phonemes. */
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });
}

export type Listened =
  | { readonly ok: true; readonly heard: Heard }
  | { readonly ok: false; readonly status: number; readonly message: string };

/** Ask the listening model what it heard. */
export async function hearWord(
  audio: { data: string; mime: string },
  word: string,
  language: string,
  model: string = LISTENER,
): Promise<Listened> {
  let answer: Response;
  try {
    answer = await fetch(addressOf(model, 'generateContent'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_VERTEX_KEY ?? '',
      },
      body: listenBody(audio, word, language),
    });
  } catch {
    return { ok: false, status: 502, message: 'The listening engine could not be reached.' };
  }
  const text = await answer.text().catch(() => '');
  if (!answer.ok) {
    return {
      ok: false,
      status: answer.status,
      message: text.slice(0, 300) || `The listening engine answered ${answer.status}.`,
    };
  }
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = null; }
  const got = heardIn(body);
  if (!got) {
    return {
      ok: false,
      status: 502,
      message: 'The engine finished but said nothing this app could read as a'
        + ` transcription. The answer began: ${text.slice(0, 200)}`,
    };
  }
  return { ok: true, heard: got };
}
