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

/* ── One was not enough, and she is the one who noticed ────────────────
 
   Carli, 10 October 2026: *"Copilot se suggestions vir generations moet meer
   wees. Tans is daar net een suggestion waarmee hy voorstel om te help."*
 
   Exactly right, and the shape of the fault is worth writing down: the app
   has had SIX hand-offs between rooms for weeks — a hook to the video desk,
   an advert to the video desk, an advert to the voice room, somebody else's
   song into Make a song — and every one of them carried the VALUES across
   and nothing else. The canvas arrived filled in and the copilot arrived
   knowing nothing, so it opened with the room's generic line about what a
   video desk is for, to somebody who had just walked in with a specific
   job in their hands.
 
   This file was built for exactly that and then used once. */
export const ERRAND_IDS = [
  'podcast_video', 'hook_video', 'advert_video', 'advert_read', 'built_on',
] as const;
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
      {
        en: 'Put the presenter on it, talking to camera',
        af: 'Sit die aanbieder daarop, wat met die kamera praat',
      },
      {
        en: 'What goes in the first three seconds so nobody scrolls past?',
        af: 'Wat kom in die eerste drie sekondes sodat niemand verby blaai nie?',
      },
    ],
  },

  /* ── A hook, carried to the video desk ───────────────────────────────
 
     `videoFromHook` has filled the canvas from the moment since September
     and the copilot has never been told what a hook IS. The difference
     matters: a hook is already the strongest fifteen seconds of something,
     chosen by the app, so the job here is not "find the good bit" — it is
     "do not waste it", which is a different conversation entirely. */
  hook_video: {
    surface: 'canvas',
    brief: [
      'They have just come here from the hooks panel to make a video of a hook.',
      'The hook is "{subject}".',
      'A hook is ALREADY the strongest fifteen seconds of a song — the app found it. So nothing here should go looking for the good part; it is the part they are holding.',
      'Fifteen seconds is two or three shots, not a film. More shots than that and none of them lands.',
      'It is going on social vertically, so the first second has to carry it and the words have to be readable with the sound off.',
    ],
    helps: {
      en: 'You are making a video of a hook. Fifteen seconds is two or three shots — I can write them, set one look across them, and put the words where a thumb will not cover them.',
      af: '’n Video van ’n hook. Vyftien sekondes is twee of drie tonele — ek kan hulle skryf, een voorkoms oor almal stel, en die woorde sit waar ’n duim hulle nie toemaak nie.',
    },
    seeds: [
      {
        en: 'Write three shots for these fifteen seconds',
        af: 'Skryf drie tonele vir hierdie vyftien sekondes',
      },
      {
        en: 'What goes in the first second so nobody scrolls past?',
        af: 'Wat kom in die eerste sekonde sodat niemand verby blaai nie?',
      },
      {
        en: 'One look across all of them, vertical',
        af: 'Een voorkoms oor almal, regop',
      },
      {
        en: 'Put the words on it so it reads with the sound off',
        af: 'Sit die woorde daarop sodat dit sonder klank lees',
      },
      {
        en: 'Make it loop, so the end runs back into the start',
        af: 'Laat dit herhaal, sodat die einde in die begin terugloop',
      },
    ],
  },

  /* ── An advert, carried to the video desk ────────────────────────────
 
     `filmThisAd` in `adhandover.ts` has carried the hook, the scene and the
     call to action across for weeks. What it could not carry is the one
     thing that changes every piece of advice in this room: an advert is not
     a film, it is a film with a JOB, and the job is in the last two
     seconds. */
  advert_video: {
    surface: 'canvas',
    brief: [
      'They have just come here from the adverts desk to film an advert.',
      'The advert is "{subject}".',
      'An advert is a film with a job: somebody has to DO something at the end of it. The call to action is the point and everything before it is getting there.',
      'So the last shot is the one to settle first, and the rest is written backwards from it. That is the opposite of how the board is usually filled and it is worth saying out loud.',
      'The headline and the call to action came across with it. They belong IN the picture, not spoken — a feed plays silent.',
    ],
    helps: {
      en: 'You are filming an advert. The call to action is the point, so I would settle the last shot first and write the rest backwards from it — and keep the words in the picture, because a feed plays silent.',
      af: 'Jy film ’n advertensie. Die oproep tot aksie is die punt, so ek sou die laaste toneel eerste vasstel en die res daarvandaan terugskryf — en die woorde in die prent hou, want ’n stroom speel stil.',
    },
    seeds: [
      {
        en: 'Settle the last shot first, then write backwards to it',
        af: 'Stel die laaste toneel eerste vas, skryf dan daarheen terug',
      },
      {
        en: 'Write the shots around this hook',
        af: 'Skryf die tonele rondom hierdie hook',
      },
      {
        en: 'Where should the call to action sit so it is read?',
        af: 'Waar moet die oproep tot aksie sit sodat dit gelees word?',
      },
      {
        en: 'A look that suits what is being sold',
        af: '’n Voorkoms wat pas by wat verkoop word',
      },
      {
        en: 'Make it work with the sound off',
        af: 'Laat dit werk met die klank af',
      },
    ],
  },

  /* ── An advert, carried to the voice room ────────────────────────────
 
     `readThisAd` carries the WHOLE advert and not the one spoken line, for
     the reason that function already gives: the spoken line is what a clip
     says, and a read is the hook, the reason and the call. The copilot in
     that room has never been told the difference. */
  advert_read: {
    /* `voice_studio` and not `sound`: `readThisAd` sends it to the room that
       reads a script aloud, which is the one whose entire purpose that is.
       Written from the call site rather than from memory — an errand pointed
       at the wrong room is simply ignored by `errandBelongs`, which is the
       quietest possible way for this to do nothing. */
    surface: 'voice_studio',
    brief: [
      'They have just come here from the adverts desk to have an advert read aloud.',
      'The advert is "{subject}".',
      'A read advert is three things in order: the hook, the reason, and the call to action. It is not a conversation and it is not a story.',
      'Thirty seconds is about seventy words. Somebody who hands over a paragraph is handing over a minute, and the usual fix is cutting the reason rather than speeding the voice up.',
      'The call to action is said slower than everything before it. That is the whole craft of reading an advert and it is the thing nobody does by instinct.',
    ],
    helps: {
      en: 'You are having an advert read. Thirty seconds is about seventy words — I can cut it to fit, mark where to slow down, and say which voice suits what is being sold.',
      af: 'Jy laat ’n advertensie lees. Dertig sekondes is omtrent sewentig woorde — ek kan dit afsny om te pas, merk waar om stadiger te gaan, en sê watter stem pas by wat verkoop word.',
    },
    seeds: [
      {
        en: 'Cut this to thirty seconds without losing the call to action',
        af: 'Sny dit tot dertig sekondes sonder om die oproep tot aksie te verloor',
      },
      {
        en: 'Which voice suits what is being sold?',
        af: 'Watter stem pas by wat verkoop word?',
      },
      {
        en: 'Mark where to slow down and where to lift',
        af: 'Merk waar om stadiger te gaan en waar om op te lig',
      },
      {
        en: 'Write it again, warmer',
        af: 'Skryf dit weer, warmer',
      },
      {
        en: 'A fifteen-second version as well',
        af: 'Ook ’n weergawe van vyftien sekondes',
      },
    ],
  },

  /* ── Somebody else's song, carried into Make a song ──────────────────
 
     `onBuildOn` has carried the style and a credited title across since the
     collab room shipped. The thing the copilot cannot see is the one fact
     that changes what help is worth giving — that the words are not theirs
     to reuse, and that the whole point is to end up somewhere else. */
  built_on: {
    surface: 'make',
    brief: [
      'They are building on somebody else\'s song.',
      'The song they started from is "{subject}".',
      'The STYLE came across. The words did not, and must not: the point of building on a song is to end up with a different one.',
      'So the useful help is about getting away from it — a different angle on the same feeling, a different story over the same groove — rather than about getting closer to it.',
      'If they ask for words that sound like the original, say plainly that what comes back has to be theirs to release, and offer the same mood instead.',
    ],
    helps: {
      en: 'You are building on somebody else\'s song. The style came across; the words are yours to write. I can take the same feeling somewhere new, or keep the groove and change the story.',
      af: 'Jy bou op iemand anders se liedjie. Die styl het saamgekom; die woorde is joune om te skryf. Ek kan dieselfde gevoel êrens nuut vat, of die groove hou en die storie verander.',
    },
    seeds: [
      {
        en: 'Same feeling, somewhere completely different',
        af: 'Dieselfde gevoel, heeltemal êrens anders',
      },
      {
        en: 'Keep the groove, change the story',
        af: 'Hou die groove, verander die storie',
      },
      {
        en: 'Write me a first verse that is mine',
        af: 'Skryf vir my ’n eerste vers wat myne is',
      },
      {
        en: 'What makes this style work? Say it without naming anybody',
        af: 'Wat laat hierdie styl werk? Sê dit sonder om iemand te noem',
      },
      {
        en: 'A title that is not theirs',
        af: '’n Titel wat nie hulle s’n is nie',
      },
    ],
  },
};

export function isErrandId(value: unknown): value is ErrandId {
  return typeof value === 'string' && (ERRAND_IDS as readonly string[]).includes(value);
}

/**
 * True when this errand belongs in this room. It is ignored anywhere else.
 *
 * Written through `isErrandId` rather than indexing `ERRANDS` directly. The
 * short version — `ERRANDS[errand.id].surface === surface` — reads fine and
 * throws on anything whose `id` is not one of ours: `ERRANDS[undefined]` is
 * `undefined`, and `.surface` on that is a TypeError.
 *
 * TypeScript makes that unreachable from the studio, which is the only caller
 * today. It is still the wrong shape for a function whose answer is read
 * during render: a throw here does not fail an errand, it takes the screen
 * down. Nothing that only decides whether to show a different sentence should
 * be able to do that.
 */
export function errandBelongs(errand: Errand | null | undefined, surface: SurfaceId): boolean {
  if (!errand || !isErrandId(errand.id)) return false;
  return ERRANDS[errand.id].surface === surface;
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
