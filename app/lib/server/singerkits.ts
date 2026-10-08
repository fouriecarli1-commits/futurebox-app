/**
 * Kits, behind the seam.
 *
 * ── Why this file is thin and `kits.ts` is not touched ───────────────────
 *
 * `lib/server/kits.ts` is sixteen hundred lines that know Kits' wire format,
 * their five real addresses, the three shapes a validation complaint can take
 * and the tuned defaults for a take recorded on a phone. All of it was
 * measured against the live account and all of it still earns its place.
 *
 * None of it is the seam's business. So this is an adapter and nothing else:
 * it answers `Singer` by calling what is already there. The seam gains a
 * supplier, `kits.ts` loses nothing, and the behaviour the room has today is
 * the behaviour it has tomorrow.
 *
 * ── Where Kits' own knobs went ───────────────────────────────────────────
 *
 * `pitch` and `strength` are on the seam because they are true of singing
 * voice conversion itself — every system that does this has them under some
 * name. `Cleanup` and `Polish` are not: they are Kits' effects chain with
 * Kits' field names, so they travel as an opaque `tuning` that only this file
 * unwraps, and only when it is tagged as ours.
 *
 * The default stays where it was. `PHONE_CLEANUP` is applied when no tuning
 * is given, because an empty object means "no cleaning at all" — a different
 * thing, and worse for the recordings this app actually gets.
 */

import {
  PHONE_CLEANUP, type Cleanup, type Dials, type Polish,
  configured as kitsConfigured, convert, listModels, safeModelId,
} from './kits';
import { downloadSeconds, enough, leftSeconds, note as noteMinutes } from './kitsminutes';
import { mineOnly, type Ask, type Room, type Singer, type Sung, type Voice } from './singer';

/** What a Kits tuning carries. Kits' own names, deliberately. */
export interface KitsTuning {
  readonly cleanup?: Cleanup | null;
  readonly polish?: Polish | null;
  readonly dials?: Dials;
}

const asTuning = (it: unknown): KitsTuning => (
  it && typeof it === 'object' ? it as KitsTuning : {}
);

export const kitsSinger: Singer = {
  id: 'kits',
  name: 'Kits',

  configured: kitsConfigured,

  async voices(): Promise<readonly Voice[]> {
    const models = await listModels();
    return models.map((one): Voice => ({ id: one.id, name: one.name }));
  },

  /**
   * §1.3, asked rather than assumed.
   *
   * Their catalogue is the only list there is, so "still there" is "still in
   * the list". A list that could not be fetched answers **true**: an outage
   * is not a withdrawal, and refusing a member's saved voice because Kits was
   * briefly unreachable would be this check doing more harm than the thing it
   * guards against.
   */
  async stillThere(voice: string): Promise<boolean> {
    try {
      const models = await listModels();
      if (!models.length) return true;
      return models.some((one) => one.id === voice);
    } catch {
      return true;
    }
  },

  /**
   * The month's download-minutes, which is Kits' ceiling and nobody else's.
   *
   * `enough` already refuses BEFORE credits are taken — a member who runs
   * into a ceiling he cannot see must not also have paid for the turn.
   */
  async room(seconds: number, owner?: string | null): Promise<Room> {
    const refusal = await enough(downloadSeconds(seconds, 1), owner ?? null);
    const left = await leftSeconds().catch(() => null);
    if (refusal) {
      return {
        ok: false, message: refusal.message, code: refusal.code, left: refusal.left, leftSeconds: left,
      };
    }
    return { ok: true, leftSeconds: left };
  },

  async note(seconds: number, owner?: string | null): Promise<void> {
    await noteMinutes(downloadSeconds(seconds, 1), 'sing', owner ?? null);
  },

  async sing(ask: Ask): Promise<Sung> {
    /* What a usable voice id is, is Kits' answer and not the seam's — theirs
       are digits and go back out in a form field. Checked here rather than in
       the route, so the route does not have to know the shape of any one
       supplier's ids, and so a supplier whose ids are words is not refused by
       a rule written for a supplier whose ids are numbers. */
    const id = safeModelId(ask.voice);
    if (!id) {
      return {
        ok: false,
        status: 400,
        message: 'That is not a voice number Kits would recognise.',
      };
    }
    const mine = asTuning(mineOnly(kitsSinger, ask.tuning));
    /* The two the seam carries win over anything in the tuning: they are what
       the room asked for in its own words, and a tuning is the leftovers. */
    const dials: Dials = {
      ...mine.dials,
      ...(ask.pitch === undefined ? {} : { pitchShift: ask.pitch }),
      ...(ask.strength === undefined ? {} : { conversionStrength: ask.strength }),
    };
    return convert(
      id,
      ask.audio,
      ask.filename,
      ask.deadline,
      ask.want,
      dials,
      /* Undefined means nothing was said, so the phone default applies. Null
         inside a tuning means somebody said "no cleaning", which is a real
         answer and is passed through as itself. */
      mine.cleanup === undefined ? PHONE_CLEANUP : mine.cleanup,
      mine.polish ?? null,
    );
  },
};
