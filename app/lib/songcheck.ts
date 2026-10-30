/**
 * Whether a brought-in song is somebody else's record (`app/api/songcheck`).
 *
 * Twenty seconds from inside the song, made into one small channel on the
 * phone, is all that is sent. The answer is kept on the device by the song's
 * id, so a song is listened to once, not every time it is opened.
 */
import { accessToken } from './cloud';
import { encodeWav } from './wav';

export type SongCheck =
  | { readonly state: 'clear'; readonly at: number }
  | { readonly state: 'matched'; readonly at: number; readonly title: string; readonly artist: string; readonly link?: string }
  | { readonly state: 'unchecked'; readonly at: number; readonly why: string };

const KEY = 'fb.songcheck.v1';
const PIECE_SECONDS = 20;
const RATE = 16000;

function kept(): Record<string, SongCheck> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const got = raw ? (JSON.parse(raw) as unknown) : {};
    return got && typeof got === 'object' ? (got as Record<string, SongCheck>) : {};
  } catch {
    return {};
  }
}

/** What is known about this song already, if anything. */
export function songCheckOf(id: string): SongCheck | null {
  if (typeof window === 'undefined') return null;
  return kept()[id] ?? null;
}

function keep(id: string, check: SongCheck): void {
  try {
    const all = kept();
    all[id] = check;
    const ids = Object.keys(all);
    for (const old of ids.slice(0, Math.max(0, ids.length - 60))) delete all[old];
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* A private window: checked again next time, which is the safe side. */
  }
}

/** Twenty seconds from a third of the way in, one channel, 16 kHz, as a WAV. */
export async function pieceOf(song: Blob): Promise<Blob | null> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  try {
    const whole = await ctx.decodeAudioData(await song.arrayBuffer());
    const long = Math.min(PIECE_SECONDS, whole.duration);
    const from = whole.duration > long ? Math.min(whole.duration - long, whole.duration / 3) : 0;
    const out = new OfflineAudioContext(1, Math.ceil(long * RATE), RATE);
    const source = out.createBufferSource();
    source.buffer = whole;
    source.connect(out.destination);
    source.start(0, from, long);
    const small = await out.startRendering();
    return encodeWav(small, 'mono', 16);
  } catch {
    return null;
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

/**
 * Listen to a song once. A known answer is returned without asking again;
 * "unchecked" is not kept, so the next time the song is opened it is tried
 * again.
 */
export async function checkSong(id: string, song: Blob): Promise<SongCheck> {
  const known = songCheckOf(id);
  if (known && known.state !== 'unchecked') return known;
  const piece = await pieceOf(song);
  if (!piece) return { state: 'unchecked', at: Date.now(), why: 'unreadable' };
  const form = new FormData();
  form.set('piece', piece, 'piece.wav');
  try {
    const token = await accessToken();
    const answer = await fetch('/api/songcheck', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const got = (await answer.json().catch(() => ({}))) as {
      state?: string;
      why?: string;
      match?: { title: string; artist: string; link?: string };
    };
    const at = Date.now();
    if (got.state === 'matched' && got.match) {
      const check: SongCheck = { state: 'matched', at, ...got.match };
      keep(id, check);
      return check;
    }
    if (got.state === 'clear') {
      const check: SongCheck = { state: 'clear', at };
      keep(id, check);
      return check;
    }
    return { state: 'unchecked', at, why: got.why ?? `status ${answer.status}` };
  } catch {
    return { state: 'unchecked', at: Date.now(), why: 'offline' };
  }
}
