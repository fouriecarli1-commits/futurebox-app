/**
 * What a child can make, and the two calls that make it.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026, on what the kids room is for: *"Ek dink die child
 * funksie is net om met liedjie maak te speel - en dalk om die liedjie 'n
 * video te maak."* Then, the same day: *"Gaan aan met die kids kamer."*
 *
 * So: a song, and a video of it. Nothing else, and that is the design rather
 * than a first version of a bigger one — `check:kidsafe` measured in October
 * that the free rooms are not the safe rooms (the collab room costs nothing
 * and puts a child in a conversation with strangers; the art market costs
 * nothing and is a shop), which is why this room has no way out of itself.
 *
 * ── Why the choices are a closed list ───────────────────────────────────
 *
 * A text box is a child typing anything into a prompt that reaches an image
 * and a music model. The moderation gate would catch the worst of it, and
 * "the gate caught it" is not a thing to design a child's room around. Six
 * things to sing about and four kinds of music is a room where every
 * possible press is one somebody chose on purpose.
 *
 * It is also simply better for a six-year-old. A blank box is a room with
 * nothing in it; six pictures is a room with six things in it.
 *
 * ── Why the plain-prompt path, which `engines.ts` does not use ──────────
 *
 * `engines.ts` sends `instrumental: sections.length === 0` — no words means
 * no singing — which is right for the studio, where the words are the
 * member's own and an empty lyric sheet means they wanted a backing track.
 *
 * A child has not written any words and still wants somebody to sing. That
 * is what `/api/music`'s plain-prompt path is: a prompt, `force_instrumental`
 * false, and the engine writes and sings its own. See `buildRequest` in
 * `lib/server/musicplan.ts`, which has both paths.
 *
 * So this is a second call site to the same route on purpose, not a copy
 * that drifted. `check:kinderkamer` holds that it asks for singing, because
 * a child's song that comes back as instrumental is the whole thing failing
 * quietly.
 */

import { accessToken } from './cloud';

/** A minute. Long enough to be a song, short enough to be one credit's worth. */
export const KID_SECONDS = 60;

export interface Choice {
  readonly id: string;
  /** The i18n key and the English, as `t` takes them. */
  readonly says: readonly [string, string];
  /** What it puts in the prompt. English, because the models are. */
  readonly words: string;
}

/** Six things to sing about. */
export const KID_TOPICS: readonly Choice[] = [
  { id: 'dog', says: ['kids.topicDog', 'My dog'], words: 'a happy song about a dog who is somebody\'s best friend' },
  { id: 'space', says: ['kids.topicSpace', 'Space'], words: 'a song about flying a rocket past the planets and the stars' },
  { id: 'birthday', says: ['kids.topicBirthday', 'A birthday'], words: 'a cheerful birthday song about cake and candles and friends' },
  { id: 'sea', says: ['kids.topicSea', 'The sea'], words: 'a song about the sea, the waves, and the fish under them' },
  { id: 'rain', says: ['kids.topicRain', 'Rain'], words: 'a gentle song about rain on the roof and puddles to jump in' },
  { id: 'brave', says: ['kids.topicBrave', 'Being brave'], words: 'an encouraging song about being brave when something is scary' },
];

/** Four kinds of music. */
export const KID_SOUNDS: readonly Choice[] = [
  { id: 'happy', says: ['kids.soundHappy', 'Happy'], words: 'bright upbeat pop, major key, clear friendly vocal' },
  { id: 'quiet', says: ['kids.soundQuiet', 'Quiet'], words: 'gentle acoustic lullaby, soft vocal, slow' },
  { id: 'rock', says: ['kids.soundRock', 'Loud'], words: 'simple cheerful rock with drums and guitar, big chorus' },
  { id: 'dance', says: ['kids.soundDance', 'Dancey'], words: 'simple four-on-the-floor dance beat, playful, fun to jump to' },
];

const choice = (list: readonly Choice[], id: string): Choice | undefined =>
  list.find((one) => one.id === id);

/**
 * Make the song.
 *
 * Returns the audio, or a message written for a grown-up to read over a
 * child's shoulder. The one message that matters is the allowance running
 * out, and `charge()` writes that one itself — it comes back as the route's
 * own 402 and is passed through rather than replaced, because "ask a
 * grown-up" is better said once in one place.
 */
export async function makeKidSong(
  topic: string,
  sound: string,
): Promise<{ audio: Blob } | { says: string }> {
  const what = choice(KID_TOPICS, topic);
  const how = choice(KID_SOUNDS, sound);
  if (!what || !how) return { says: 'Pick something to sing about, and how it should sound.' };

  const token = await accessToken();
  if (!token) return { says: 'Sign in first.' };

  /* Five minutes and a bit, the same ceiling `engines.ts` uses, for the same
     reason: without one a stalled connection leaves a child looking at a
     spinner with nothing to press. */
  const abort = new AbortController();
  const bell = setTimeout(() => abort.abort(), 310_000);
  try {
    const answer = await fetch('/api/music', {
      signal: abort.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        prompt: what.words,
        style: how.words,
        seconds: KID_SECONDS,
        /* Explicit, and the point of this file. A child wrote no words and
           still wants somebody to sing. */
        instrumental: false,
      }),
    });
    if (!answer.ok) {
      const detail = (await answer.json().catch(() => ({}))) as { message?: string };
      return { says: detail.message ?? 'That song could not be made. Try another one.' };
    }
    return { audio: await answer.blob() };
  } catch {
    return { says: 'That could not be sent. Check the connection and try again.' };
  } finally {
    clearTimeout(bell);
  }
}

/**
 * Start a video for the song, and hand back the job to ask about.
 *
 * Ten seconds at the plain grade, which is the price the parent was shown on
 * the opening page — `kidsallowance.ts` derives that row from `videoCost` at
 * this length and this grade, so the two cannot disagree.
 */
export async function startKidVideo(
  topic: string,
): Promise<{ job: string } | { says: string }> {
  const what = choice(KID_TOPICS, topic);
  if (!what) return { says: 'Pick something first.' };

  const token = await accessToken();
  if (!token) return { says: 'Sign in first.' };

  try {
    const answer = await fetch('/api/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        prompt: `A bright, friendly, child-safe animation: ${what.words}. No people's faces, no text.`,
        aspect: '16:9',
        seconds: 10,
        grade: 'standard',
        speak: false,
      }),
    });
    const said = (await answer.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!answer.ok || !said.id) {
      return { says: said.message ?? 'That video could not be started. Try again.' };
    }
    return { job: said.id };
  } catch {
    return { says: 'That could not be sent. Check the connection and try again.' };
  }
}

/** Ask how a video is going. `null` while it is still being made. */
export async function askKidVideo(
  job: string,
): Promise<{ url: string } | { says: string } | null> {
  const token = await accessToken();
  if (!token) return null;
  try {
    const answer = await fetch(`/api/video?id=${encodeURIComponent(job)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const said = (await answer.json().catch(() => ({}))) as
      { state?: string; url?: string; message?: string };
    if (said.state === 'done' && said.url) return { url: said.url };
    if (said.state === 'failed') {
      return { says: said.message ?? 'That one did not work. The credits have come back.' };
    }
    return null;
  } catch {
    /* A blip is not a failure — the route refunds a real one itself. */
    return null;
  }
}
