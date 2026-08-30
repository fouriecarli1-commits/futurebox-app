'use client';

/**
 * The words the record actually sings.
 *
 * Everything else in the booth times the *written* words — the lyric sheet
 * that was sent to the engine. That is the right thing to do when the engine
 * sings what it was given, and it does not always: it repeats a line, swaps a
 * word, bends a phrase to fit a melody. When that happens no amount of timing
 * helps, because the word on the screen is not the word in the song.
 *
 * So this asks. The transcript comes back with a start and an end on every
 * word, which means the words on the stave can be the ones that were sung, at
 * the moment they were sung, with nothing estimated at all.
 *
 * It is kept next to the song rather than written over the lyric sheet.
 * Somebody wrote those words, they are what the song is *meant* to say, and a
 * transcriber mishears — especially over a band. What was written and what was
 * sung are two different things and the booth lets you switch between them.
 */

import { accessToken } from './cloud';
import type { TimedLine } from './timeline';

export interface Heard {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

const KEY = 'futurebox.heard.v1';

/** A gap longer than this ends a line. A breath, in other words. */
const LINE_GAP_S = 0.7;
/** Nobody reads a line longer than this off a screen while singing. */
const MOST_WORDS = 9;

function store(): Record<string, Heard[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Heard[]>;
  } catch {
    return {};
  }
}

export function loadHeard(id: string): Heard[] | null {
  const found = store()[id];
  return found && found.length ? found : null;
}

export function forgetHeard(id: string): void {
  const all = store();
  delete all[id];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Out of room. The words are still usable for this sitting.
  }
}

export interface Failed {
  readonly message: string;
}

export async function transcribe(id: string, audio: Blob, seconds: number): Promise<Heard[] | Failed> {
  const form = new FormData();
  form.append('file', audio, 'song.mp3');
  form.append('seconds', String(Math.round(seconds)));
  form.append('trackId', id);

  const token = await accessToken();
  let response: Response;
  try {
    response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  } catch {
    return { message: 'Could not reach the app’s server. Check your connection and try again.' };
  }

  let body: { words?: Heard[]; message?: string };
  try {
    body = (await response.json()) as { words?: Heard[]; message?: string };
  } catch {
    return { message: `The words could not be read (${response.status}).` };
  }
  if (!response.ok || !body.words?.length) {
    return { message: body.message ?? `The words could not be read (${response.status}).` };
  }

  const all = store();
  all[id] = body.words;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Not worth failing the whole thing over.
  }
  return body.words;
}

export function failed(result: Heard[] | Failed): result is Failed {
  return !Array.isArray(result);
}

/**
 * Heard words grouped into lines somebody can read while singing.
 *
 * Broken on the breaths, because that is where a singer breaks: a gap of more
 * than about two thirds of a second is the end of a phrase. A very long phrase
 * is split anyway, since a line nobody can take in at a glance is no better
 * than no line.
 */
export function linesFrom(words: readonly Heard[]): TimedLine[] {
  const out: TimedLine[] = [];
  let held: Heard[] = [];

  const close = (): void => {
    if (!held.length) return;
    out.push({
      text: held.map((word) => word.text).join(' '),
      section: 'Sung',
      opensSection: out.length === 0,
      start: held[0].start,
      end: held[held.length - 1].end,
    });
    held = [];
  };

  words.forEach((word, index) => {
    const previous = words[index - 1];
    if (previous && (word.start - previous.end > LINE_GAP_S || held.length >= MOST_WORDS)) close();
    held.push(word);
  });
  close();
  return out;
}
