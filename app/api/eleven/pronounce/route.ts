/**
 * The test read that turns "die Afrikaans klink verkeerd" into a word list.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `app/lib/server/afrikaans.ts` guards fifteen routes against a model sliding
 * into Dutch-flavoured Afrikaans. It works on the TEXT. Nothing guards the
 * SOUND: once the Afrikaans is written correctly we hand it to
 * `/v1/text-to-speech` and take whatever comes back, and the same Dutch pull
 * exists in a speech model's pronunciation.
 *
 * ElevenLabs has the lever — pronunciation dictionaries, applied per request
 * via `pronunciation_dictionary_locators`. Alias rules need no phonetics: a
 * word and a respelling. So the dictionary is easy to build and impossible to
 * build well, because what belongs in it has to come from LISTENING. Carli is
 * the one who can hear it; a list invented at this desk would be a list of
 * words a model probably says fine, and would miss the ones it does not.
 *
 * Asking her to keep a notepad open next to every read she makes is asking for
 * work that never gets done. This is the smaller ask: one read, forty items,
 * she listens once with the list in front of her and marks the wrong ones.
 *
 * ── The one design decision that makes it usable ─────────────────────────
 *
 * It says the numbers out loud. "Een. Gauteng. Twee. Mpumalanga."
 *
 * Without that she is counting items in her head while trying to listen to
 * them, on a phone, and by item nine she has lost her place and the whole
 * exercise is wasted. With it she can stop, rewind, and write "sewe" next to
 * the word — which is the entire difference between a task that gets done and
 * one that gets abandoned halfway.
 *
 * ── What it costs ────────────────────────────────────────────────────────
 *
 * Around 1 300 characters, once. Against a plan measured in hundreds of
 * thousands that is nothing, and the answer is reported in the JSON so it is
 * never a surprise. Nothing is stored: the audio is returned and forgotten, so
 * there is no Supabase cost either.
 *
 * ── Guarded ──────────────────────────────────────────────────────────────
 *
 * It spends money on her plan, so it refuses without `POST_SECRET` rather than
 * defaulting to open, compared in constant time like the other owner pages.
 */

import crypto from 'node:crypto';
import { configured, speak } from '@/app/lib/server/eleven';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* One read of about 1 300 characters. Comfortably inside this; the ceiling is
   here so a slow day upstream is a timeout with a reason rather than a hang. */
export const maxDuration = 120;

/**
 * The forty, and why each group is in it.
 *
 * Every one of these is a place Afrikaans and Dutch actually diverge, or a
 * word this app says constantly. Nothing is here because it looked hard.
 */
const GROUPS: { why: string; words: string[] }[] = [
  {
    why: 'Plekname. A model trained mostly on Dutch and English has no reason to know any of these, and they are the words a South African listener notices first.',
    words: [
      'Gauteng', 'Mpumalanga', 'Oudtshoorn', 'Knysna',
      'Tzaneen', 'Uitenhage', 'Umhlanga', 'Polokwane',
    ],
  },
  {
    why: 'The -tjie ending. Afrikaans has no Dutch equivalent for this sound, so it is the single most likely thing to come out wrong.',
    words: ['bietjie', 'mandjie', 'boekie', 'katjie', 'huisie', 'liedjie'],
  },
  {
    why: 'The hard g. Afrikaans keeps it where Dutch softens it, and a soft g is the clearest single tell that the model has drifted.',
    words: ['goeie', 'gister', 'genoeg', 'sagte', 'gedagte', 'oggend'],
  },
  {
    why: 'The ui and ei sounds, which do not map cleanly from Dutch.',
    words: ['huis', 'buite', 'uitstekend', 'byna', 'kry', 'wyn'],
  },
  {
    why: "This app's own vocabulary. If these are wrong, they are wrong in every room, every day.",
    words: [
      'FutureBox', 'opname', 'oorklanking', 'stemkloning',
      'meesterklas', 'podsending', 'sangstem', 'kollig',
    ],
  },
  {
    why: 'Numbers and money, which every price and every length in the app is made of.',
    words: [
      'twee-en-twintig', 'sewe-en-negentig', 'drie minute',
      'vierhonderd rand', 'tweeduisend ses-en-twintig', 'nege uur',
    ],
  },
];

/** The numbers said out loud, so she can mark an item without counting. */
const SAID = [
  'Een', 'Twee', 'Drie', 'Vier', 'Vyf', 'Ses', 'Sewe', 'Agt', 'Nege', 'Tien',
  'Elf', 'Twaalf', 'Dertien', 'Veertien', 'Vyftien', 'Sestien', 'Sewentien',
  'Agtien', 'Negentien', 'Twintig', 'Een-en-twintig', 'Twee-en-twintig',
  'Drie-en-twintig', 'Vier-en-twintig', 'Vyf-en-twintig', 'Ses-en-twintig',
  'Sewe-en-twintig', 'Agt-en-twintig', 'Nege-en-twintig', 'Dertig',
  'Een-en-dertig', 'Twee-en-dertig', 'Drie-en-dertig', 'Vier-en-dertig',
  'Vyf-en-dertig', 'Ses-en-dertig', 'Sewe-en-dertig', 'Agt-en-dertig',
  'Nege-en-dertig', 'Veertig',
];

/** Every word in order, flattened, with its spoken number. */
function numbered(): { n: number; said: string; word: string; why: string }[] {
  const all: { n: number; said: string; word: string; why: string }[] = [];
  for (const group of GROUPS) {
    for (const word of group.words) {
      const n = all.length + 1;
      all.push({ n, said: SAID[n - 1] ?? String(n), word, why: group.why });
    }
  }
  return all;
}

/**
 * The script itself.
 *
 * A full stop after the number and after the word, because that is what makes
 * the model pause. Without the pauses it reads forty items as one breathless
 * sentence and nothing is markable.
 */
function script(): string {
  const opening =
    'Hierdie is die uitspraaktoets vir FutureBox. ' +
    'Ek lees veertig items. Elkeen kry sy nommer eerste. ' +
    'Skryf die nommer neer van enige woord wat verkeerd klink. ';
  const body = numbered().map((one) => `${one.said}. ${one.word}.`).join(' ');
  return `${opening}${body} Dit is al. Dankie.`;
}

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  // `timingSafeEqual` throws on a length mismatch, which is itself a leak.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  const url = new URL(request.url);
  const given = url.searchParams.get('key') ?? '';
  if (!wanted || !sameSecret(given, wanted)) return new Response('no', { status: 404 });

  const text = script();
  const items = numbered();

  /* The list first, the audio only when asked for.

     Deliberate: opening this by accident should never spend money. The list is
     also the half she needs OPEN while she listens, so it being the default is
     the right way round — read the list, then ask for the sound. */
  if (url.searchParams.get('hoor') !== '1') {
    return Response.json({
      wat: 'Die uitspraaktoets. Hou hierdie lys oop en luister dan na die klank.',
      hoeOm: [
        '1. Hou hierdie bladsy oop, of skryf die veertig woorde af.',
        '2. Maak dieselfde adres oop met &hoor=1 agteraan. Dit speel die opname.',
        '3. Luister een keer deur. Skryf die NOMMER neer van elke woord wat verkeerd klink.',
        '4. Stuur my die nommers, en by elkeen hoe dit moet klink — sommer gespel soos jy dit vir ’n kind sou skryf. Geen fonetiese tekens nodig nie.',
      ],
      klank: `${url.pathname}?key=<POST_SECRET>&hoor=1`,
      watDitKos: {
        karakters: text.length,
        opmerking:
          'Een keer, en niks word gestoor nie. Teen ’n plan wat in honderdduisende getel word, is dit niks.',
      },
      items: items.map((one) => ({ nommer: one.n, gesê: one.said, woord: one.word })),
      hoekomElkeGroep: GROUPS.map((group) => ({ woorde: group.words, hoekom: group.why })),
      teks: text,
    });
  }

  if (!configured()) {
    return Response.json(
      { error: 'no_key', message: 'The ElevenLabs key is not set on this deployment.' },
      { status: 503 },
    );
  }

  /* Multilingual v2 rather than v3. v3 covers more languages, but this read is
     a measurement, and a measurement wants the model the app actually uses for
     a steady Afrikaans read — testing a model nobody ships would produce a
     word list that fixes nothing. */
  const voice = process.env.ELEVEN_TEST_VOICE || url.searchParams.get('stem') || '';
  if (!voice) {
    return Response.json(
      {
        error: 'no_voice',
        message:
          'Give it a voice: add &stem=<voice id> from your ElevenLabs voice list, or set ELEVEN_TEST_VOICE. It must be the voice the app actually reads with, or the list will not match what members hear.',
      },
      { status: 400 },
    );
  }

  const said = await speak(voice, text, 'eleven_multilingual_v2', undefined, text.length);
  if (!said.ok) {
    return Response.json({ error: 'upstream', message: said.message }, { status: said.status });
  }

  return new Response(said.audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      /* Inline, so tapping the link on a phone plays it instead of downloading
         a file she then has to find. */
      'Content-Disposition': 'inline; filename="uitspraaktoets.mp3"',
      'Cache-Control': 'no-store',
    },
  });
}
