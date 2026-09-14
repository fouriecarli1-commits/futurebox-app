/**
 * What somebody came into a room to do.
 *
 * ── The gap this fills ───────────────────────────────────────────────────
 *
 * `surfaces.ts` says what a room is *for*. That is the right thing and it is
 * fixed: the video desk is the video desk whoever walks in. But a room can be
 * entered for more than one reason, and the copilot's opening line is written
 * for the commonest one — on the video desk, "I can write the whole shot list
 * onto the board, set the look they all share, and set the length and the
 * shape."
 *
 * Arrive there from the podcast room, having just published an episode, and
 * that line is not wrong so much as useless. The job is not "a video"; it is
 * "a video of this episode", and the first thing worth saying is that the
 * whole episode is not the video.
 *
 * Carli, 14 September 2026: "Podcast na aanbieder deur moet mens na long shot
 * toe vat en copilot se assistence dadelik verander na dit wat die kamer vir
 * die podcast moet doen."
 *
 * ── Why it is not just another surface ───────────────────────────────────
 *
 * Because the room really is the same room. A `podcast_video` surface would
 * need its own `can`, its own ops and its own entry in the directory the
 * copilot is shown, and every one of those would be a copy of the video
 * desk's that drifts from it. An errand adds a sentence and replaces the
 * starters. Nothing else about the room changes, which is the truth.
 *
 * ── Why it does not survive the room ─────────────────────────────────────
 *
 * It is cleared the moment the surface changes. An errand is why you walked
 * in, not a mode you are in — somebody who leaves the video desk and comes
 * back a day later is not still on the podcast's errand, and a copilot that
 * thinks they are would be answering yesterday's question. The studio clears
 * it on every room change and nothing persists it.
 */

import type { SurfaceId } from './surfaces';

export const ERRAND_IDS = ['podcast_video'] as const;
export type ErrandId = (typeof ERRAND_IDS)[number];

export interface Errand {
  readonly id: ErrandId;
  /** What they are working on, if the door knew. An episode title, here. */
  readonly subject?: string;
}

interface ErrandKind {
  /** The room this errand is carried into. Anywhere else, it is ignored. */
  readonly surface: SurfaceId;
  /**
   * One or two sentences for the model, added after the room's purpose.
   * `{subject}` is replaced with what the door knew, or dropped with its
   * sentence when the door knew nothing.
   */
  readonly brief: readonly string[];
  /** The line above the starters, read by a person in their own language. */
  readonly helps: { readonly en: string; readonly af: string };
  /** The starters. Replaces the room's own while the errand stands. */
  readonly seeds: readonly { readonly en: string; readonly af: string }[];
}

export const ERRANDS: Readonly<Record<ErrandId, ErrandKind>> = {
  podcast_video: {
    surface: 'canvas',
    brief: [
      'They have just come here from the podcast room to make a video of an episode.',
      'The episode is called "{subject}".',
      /* The one thing that has to be said before anything is spent. An
         episode runs twenty minutes and a generated shot runs five seconds;
         somebody who has not been told that will ask for the episode. */
      'The whole episode is not the video. What gets made is either one short talking clip for social, or a film built shot by shot on the board below — so the first useful thing is to find the strongest minute of the episode and build from that.',
      'The presenter panel animates a still picture of a cast member to a reading, which is how the same face appears on every episode. That is the one to suggest when they want somebody talking; the board is for a film with cutaways.',
    ],
    helps: {
      en: 'You are making a video of your episode. I can pick the strongest minute, write the shot list around it, and set the look — say which episode if it is not the last one.',
      af: 'Jy maak ’n video van jou episode. Ek kan die sterkste minuut kies, die toneellys daaromheen skryf, en die voorkoms stel — sê net watter episode as dit nie die laaste een is nie.',
    },
    seeds: [
      {
        en: 'Pick the strongest minute and write the shots for it',
        af: 'Kies die sterkste minuut en skryf die tonele daarvoor',
      },
      {
        en: 'A one-minute clip for social from this episode',
        af: '’n Een-minuut snit vir sosiale media uit hierdie episode',
      },
      {
        en: 'What should the look be for a show like this?',
        af: 'Wat moet die voorkoms wees vir ’n program soos hierdie?',
      },
    ],
  },
};

export function isErrandId(value: unknown): value is ErrandId {
  return typeof value === 'string' && (ERRAND_IDS as readonly string[]).includes(value);
}

/** True when this errand belongs in this room. It is ignored anywhere else. */
export function errandBelongs(errand: Errand | null, surface: SurfaceId): boolean {
  return Boolean(errand && ERRANDS[errand.id].surface === surface);
}

/**
 * The brief, for the model.
 *
 * A line carrying `{subject}` is dropped whole when there is no subject,
 * rather than printed with an empty quotation in it — `The episode is called
 * ""` is worse than saying nothing, because it reads as a fact about a
 * nameless episode.
 */
export function briefFor(errand: Errand): string[] {
  return ERRANDS[errand.id].brief
    .filter((line) => !line.includes('{subject}') || Boolean(errand.subject))
    .map((line) => line.replace('{subject}', errand.subject ?? ''));
}

export function errandHelps(errand: Errand, lang: 'en' | 'af'): string {
  return ERRANDS[errand.id].helps[lang];
}

export function errandSeeds(errand: Errand, lang: 'en' | 'af'): string[] {
  return ERRANDS[errand.id].seeds.map((seed) => seed[lang]);
}
