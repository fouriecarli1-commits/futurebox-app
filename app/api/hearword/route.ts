/**
 * A word said once, written down as sounds.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"But isn't there a way for an AI to listen to the
 * phonetic sounds of someone speaking isiXhosa?"* — and then: *"Does that
 * mean that I can use the booth to record phonetic sounds?"*
 *
 * Yes. Somebody who speaks the language says the word into the phone, this
 * route hands the recording to a listening model, and what comes back is
 * narrow IPA for the sounds that speaker actually made.
 *
 * `lib/server/hearword.ts` carries the prompt, the reader and the reasoning
 * — chiefly why the clicks have to be named in the instruction and why an
 * unsure answer is never offered for keeping.
 *
 * ── Why it is behind POST_SECRET and not open to members ─────────────────
 *
 * Because there is ONE dictionary. `lib/server/sayit.ts` applies it to every
 * read in the app through `ELEVEN_DICT_ID` and `ELEVEN_DICT_VERSION` — one
 * id, one version, shared by everybody. So a rule contributed by a member
 * would change how the app speaks for every other member, and one bad rule
 * would break every read in the app at once.
 *
 * A member-facing version needs a dictionary per member, which is a
 * different and larger thing. This is the owner's tool, the same as
 * `/api/eleven/pronounce` beside it, guarded the same way and compared in
 * constant time for the same reason.
 *
 * ── It writes nothing ────────────────────────────────────────────────────
 *
 * Deliberately, and `check:hoorwoord` holds it. The model's IPA for a
 * language it has heard little of is a guess with symbols in it, and a wrong
 * phoneme rule makes the voice say a DIFFERENT WORD with total confidence.
 * So this hands back the transcription and the rules it WOULD make, and the
 * saving is a separate press by somebody who has heard the playback.
 *
 * ── The recording is small, and that is checked here ─────────────────────
 *
 * One word is under a second. The limit below is generous for that and
 * nowhere near the platform's wall, because the wall is the thing this app
 * cannot catch: past about four and a half megabytes the request is refused
 * before any route runs, as a bare 413 with no sentence in it.
 */

import crypto from 'node:crypto';
import { configured as googleOn } from '@/app/lib/server/google';
import { SURE_ENOUGH, hearWord, rulesFor, worthKeeping } from '@/app/lib/server/hearword';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { admin } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** One word, one short answer. Nowhere near a video's minute. */
export const maxDuration = 30;

/**
 * The biggest recording, as base64 characters.
 *
 * One megabyte, which is about 750 kilobytes of audio — roughly a minute of
 * compressed speech and far more than one word needs. Small on purpose: a
 * ceiling that would let a whole song through is a way to post a song to a
 * listening model on her key.
 *
 * Measured on the STRING, because the string is what has already arrived and
 * decoding it to find out it is too big does the expensive part first.
 */
const MOST_BYTES = 1024 * 1024;

const MIMES = new Set([
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav',
]);

/** Long enough for a phrase, short enough not to be a verse. */
const MOST_WORD = 80;
/** A language name, not an essay. */
const MOST_LANGUAGE = 40;

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  /* `timingSafeEqual` throws on a length mismatch, which is itself a leak. */
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  const url = new URL(request.url);
  const given = url.searchParams.get('key') ?? '';
  /* 404 and not 403: a 403 confirms the address is real. */
  if (!wanted || !sameSecret(given, wanted)) return new Response('no', { status: 404 });

  const flood = refuseIfTooMany('hearword', request, GENERATION);
  if (flood) return flood;

  if (!googleOn()) {
    return Response.json(
      { message: 'The listening engine is not switched on yet.' },
      { status: 503 },
    );
  }

  let said: { audio?: unknown; mime?: unknown; word?: unknown; language?: unknown };
  try {
    said = await request.json() as typeof said;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  const audio = String(said.audio ?? '');
  const mime = String(said.mime ?? '');
  const word = String(said.word ?? '').trim().slice(0, MOST_WORD);
  const language = String(said.language ?? '').trim().slice(0, MOST_LANGUAGE);

  if (!word) {
    return Response.json(
      { message: 'Say which word was recorded. The model needs it to tell you when what it heard does not match.' },
      { status: 400 },
    );
  }
  if (!language) {
    return Response.json(
      { message: 'Say which language it is. Without it the model guesses one, and the clicks go.' },
      { status: 400 },
    );
  }
  if (!audio || !MIMES.has(mime)) {
    return Response.json(
      { message: 'That recording is not a kind this can read.' },
      { status: 400 },
    );
  }
  if (audio.length > MOST_BYTES) {
    return Response.json(
      { message: 'That recording is too long. One word is under a second.' },
      { status: 413 },
    );
  }

  const listened = await hearWord({ data: audio, mime }, word, language);
  if (!listened.ok) {
    return Response.json({ message: listened.message }, { status: listened.status });
  }

  const heard = listened.heard;
  return Response.json({
    ipa: heard.ipa,
    spelt: heard.spelt,
    sure: heard.sure,
    trouble: heard.trouble,
    /* Whether the room should offer to keep it, decided in the library so
       the room and the check agree about where the line is. */
    keepable: worthKeeping(heard),
    /* What the rules WOULD be. Handed back to be looked at, not written:
       the saving is a separate press by somebody who has heard it. */
    rules: rulesFor(word, heard),
  });
}

/**
 * Keep what was heard.
 *
 * ── Why this is a second verb and not part of the first ──────────────────
 *
 * Because hearing a word and keeping it are different decisions, and the
 * thing that happens between them is a person listening. A route that
 * transcribed and saved in one call would make the playback decorative: the
 * rule would already be on the account by the time she heard it was wrong.
 *
 * The POST above still writes nothing, and `check:hoorwoord` holds that.
 *
 * ── The word is the key, deliberately ────────────────────────────────────
 *
 * One pronunciation per word. Saying it again replaces the old row rather
 * than adding a second rule for the same word — two rules that disagree
 * about one word is a dictionary where the answer depends on the order
 * ElevenLabs happens to apply them in, which is not something anybody can
 * reason about afterwards.
 *
 * ── What is NOT stored ───────────────────────────────────────────────────
 *
 * The recording. It has done its job the moment the IPA is read off it, and
 * a voice is personal information in a way that a word and its sounds are
 * not. There is nothing in this table that ties a row to a human, which is
 * also why it is not on the privacy page.
 */
export async function PUT(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  const url = new URL(request.url);
  const given = url.searchParams.get('key') ?? '';
  if (!wanted || !sameSecret(given, wanted)) return new Response('no', { status: 404 });

  const db = admin();
  if (!db) {
    return Response.json(
      { message: 'The database is not switched on, so there is nowhere to keep it.' },
      { status: 503 },
    );
  }

  let said: {
    word?: unknown; language?: unknown; ipa?: unknown;
    alias?: unknown; sure?: unknown; trouble?: unknown;
  };
  try {
    said = await request.json() as typeof said;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  const word = String(said.word ?? '').trim().slice(0, MOST_WORD);
  const language = String(said.language ?? '').trim().slice(0, MOST_LANGUAGE);
  /* Generous, and bounded: IPA for a phrase is longer than the phrase, and
     an unbounded string from a model is a row nobody meant to write. */
  const ipa = String(said.ipa ?? '').trim().slice(0, 400);
  const alias = String(said.alias ?? '').trim().slice(0, MOST_WORD);
  const trouble = String(said.trouble ?? '').trim().slice(0, 300);
  const asked = Number(said.sure);
  const sure = Number.isFinite(asked) ? Math.max(0, Math.min(1, asked)) : 0;

  if (!word || !ipa || !language) {
    return Response.json(
      { message: 'A word, a language and its sounds — all three, or there is nothing to keep.' },
      { status: 400 },
    );
  }

  /* The same line the booth draws, drawn again here. A room can be changed
     and a route cannot be bypassed: an unsure transcription kept by a
     request made by hand would be in the dictionary for every member with
     nobody having heard it. */
  if (sure < SURE_ENOUGH) {
    return Response.json(
      {
        message: 'That was not sure enough to keep. Record it again, closer to'
          + ' the microphone. A phonetic rule that is wrong makes the voice say'
          + ' a different word with total confidence.',
      },
      { status: 400 },
    );
  }

  const put = await db
    .from('said_words')
    .upsert({ word, language, ipa, alias, sure, trouble }, { onConflict: 'word' });
  /* Taken rather than discarded. A failed write reported as success is a
     word she believes is in the dictionary and is not, which she will next
     notice as the app still saying it wrong. */
  if (put.error) {
    return Response.json(
      { message: `It could not be kept: ${put.error.message}` },
      { status: 502 },
    );
  }

  const counted = await db
    .from('said_words')
    .select('word', { count: 'exact', head: true });

  return Response.json({
    kept: word,
    /* How many are in the table now, so the next sentence can be true. A
       count that failed is reported as unknown rather than as zero. */
    words: counted.error ? null : counted.count ?? null,
    /* The rule is in the table and NOT yet on her ElevenLabs account. Said
       plainly, because the gap between the two is exactly where somebody
       would otherwise assume the job was done. */
    live: false,
  });
}
