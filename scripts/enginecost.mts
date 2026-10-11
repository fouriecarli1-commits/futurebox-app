/**
 * What each engine bills us, and what each press is priced at.
 *
 * ── Why this is its own file ─────────────────────────────────────────────
 *
 * It was inside `check-kredietkoste.mts`, which is the right place for the
 * RULES about these numbers — supplier plus one credit, a product clears
 * six times, nothing below cost — and the wrong place for the numbers
 * themselves, because something else needs them now.
 *
 * Carli, 11 October 2026: *"Ek moet in 'n tabel sien wat kos die engines wat
 * ons gebruik, vs die krediete wat ons vra vir daardie funksie."*
 *
 * A table typed out by hand beside a check that computes the same figures is
 * two answers to one question, and the one in the document is the one that
 * goes stale — quietly, because nothing reads it. So `kredietkaart.mts`
 * writes the table FROM this, `check-kredietkoste.mts` asserts the rules
 * AGAINST this, and the two cannot disagree.
 *
 * Every rate here is derived from a published page or an invoice, and each
 * says which in its own comment. Where a rate is a guess it is marked and
 * nothing is asserted on it.
 */

import { CREDITS, readCost } from '../app/lib/credits.ts';
import { TIER_SPECS, RAND_PER_USD } from '../app/lib/plans.ts';
import { PER_PICTURE } from '../app/lib/server/picture.ts';
import { paid } from '../app/data/aiprices.ts';

/** What ElevenLabs Business costs a month, VAT in. `docs/MAANDELIKSE-KOSTE.md`. */
export const BUSINESS_RAND = 18216;

/* Their own equivalences at $990. Each is "how much of this thing the whole
   plan buys", so the plan's rand over that number is the rand per unit. */
export const MUSIC_PER_MIN = BUSINESS_RAND / 6_600;
export const STEMS_PER_MIN = BUSINESS_RAND / 8_250;
export const SPEECH_PER_MIN = BUSINESS_RAND / (4_500 * 60);
export const CHAR = BUSINESS_RAND / 9_900_000;
export const DUB_PER_MIN = BUSINESS_RAND / 450;
/** Kits is a flat R640 a month against a 400-minute ceiling. */
export const SING_PER_MIN = 640 / 400;

/* ── The model calls, costed by the app's own money model ────────────────
   `paid()` takes the four token counts and returns rand, and it is what the
   `ai_costs` rows are priced with — so the check and the ledger cannot
   disagree about what a call costs. Both are worked at their route's
   `max_tokens` ceiling rather than at an average, because the ceiling is the
   only figure that stays true whatever the model sends back. */
export const PLAN_CALL = paid({ input: 500, output: 12_000, cacheRead: 0, cacheWrite: 0 });
export const ADS_CALL = paid({ input: 500, output: 8_000, cacheRead: 0, cacheWrite: 0 });

/* fal.ai VEED video background removal, standard grade: $0.0225 per thirty
   frames, which at 30fps is one second. The dearest grade that may be picked,
   for the reason `CREDITS.video` gives.

   Per FIVE SECONDS, because that is the unit `filterCost` charges in and a
   check must measure the unit the till uses. Held per minute here first, it
   made a five-second background removal look twelve times better value than
   it is. */
export const CUTOUT_PER_5S = 0.0225 * 5 * RAND_PER_USD;

/**
 * Music.ai reading a song — chords, key, tempo — per minute of audio.
 *
 * $0.07, and for once that is a MEASURED number rather than a published
 * one. Carli opened the Chords and Beat Mapping workflow on 5 October 2026
 * and their own editor printed `Estimated (per minute) $0.07` beside a run
 * that finished in 7.44 seconds and came back with `Eb major` and `bpm 76`.
 *
 * It matters that it is measured. `docs/DIENSTE-EN-KOSTE.md` said of
 * `CREDITS.read`: *"Die presiese koers kon nie hiervandaan nagegaan word nie
 * — music.ai is ook geblokkeer"* — the host is refused from the build
 * environment, so this number could not be looked up, only guessed at and
 * set deliberately high. This row is the guess finally meeting a rate.
 *
 * Only `read`. The stem workflow's own estimate was not on that screen and
 * is not inferred from this one: a different workflow is a different set of
 * modules and a different price, and a cost check built on an inferred rate
 * is the adjacent measurement this file exists to prevent. `CREDITS.parts`
 * stays unheld until somebody reads its estimate off the same editor.
 */
export const SONGREAD_PER_MIN = 0.07 * RAND_PER_USD;


export const priced: {
  what: string;
  credits: number;
  cost: number;
  product?: boolean;
  decided?: string;
  /**
   * A rate rather than a press.
   *
   * Carli's supplier-plus-one rule is about what somebody is CHARGED for one
   * action. A row that prices an internal unit — 150 characters of reading —
   * is not an action: nobody is ever billed for 150 characters on its own,
   * because `readCost` has a floor of two credits. Held against the smallest
   * real charge instead, which is its own row below.
   *
   * Marked rather than left out, because the multiple it prints is still the
   * thing to look at when the supplier's rate moves.
   */
  rate?: boolean;
}[] = [
  { product: true, decided: 'Carli, 24 Sept: the plan is prepaid capacity, so a dearer song adds nothing to margin. See credits.ts',
    what: 'a two-minute song', credits: CREDITS.song, cost: 2 * MUSIC_PER_MIN },
  { product: true, decided: 'half of the song, same decision',
    what: 'a one-minute half song', credits: CREDITS.halfSong, cost: MUSIC_PER_MIN },
  { what: 'splitting stems, per minute', credits: CREDITS.stems, cost: STEMS_PER_MIN },
  { what: 'transcribing, per minute', credits: CREDITS.transcribe, cost: SPEECH_PER_MIN },
  { what: 'cleaning a take, per minute', credits: CREDITS.clean, cost: STEMS_PER_MIN },
  { what: 'a voice change, per minute', credits: CREDITS.voiceChange, cost: STEMS_PER_MIN },
  { what: 'singing it, per minute (Kits)', credits: CREDITS.sing, cost: SING_PER_MIN },
  { product: true,
    decided: 'Carli, 11 Oct, having asked what to do about it and been shown what a 10- and 30-minute job comes to: "110 krediete, maak dit so"',
    what: 'dubbing, per minute', credits: CREDITS.dub, cost: DUB_PER_MIN },
  /* `readCost` is one credit per 150 characters with a floor of two, so one
     credit is what 150 characters must cover. */
  { rate: true, what: 'reading 150 characters (a rate, not a press)', credits: 1, cost: 150 * CHAR },
  /* And the smallest thing anybody is actually charged for a read, which is
     what Carli's rule governs: `readCost` is `Math.max(2, ...)`, so two
     credits buys up to 300 characters and nothing smaller can be billed. */
  { what: 'the smallest read anybody is charged (300 characters)', credits: readCost(300), cost: 300 * CHAR },
  /* Not the line above. That one is a voice reading text aloud; this one is
     Music.ai reading a song for its chords, key and tempo. Two different
     suppliers and two different bills under one English word, which is
     worth the sentence.

     Printed here for the multiple, and held by the rule below rather than by
     this row. A minute costs R1.12, so even ONE credit at R1.49 clears the
     floor: this row cannot fail at any price the app can charge, and a row
     that cannot fail is a row that reassures without asserting. Breaking
     `read` to 1 credit and watching it still say `ok` is how that was
     found. */
  { what: 'reading a song, per minute (Music.ai)', credits: CREDITS.read, cost: SONGREAD_PER_MIN },
  /* The three rooms that used to be sold separately, or not at all. Entering
     them is included in every paid plan; generating in them is these. */
  { product: true, what: 'a marketing plan', credits: CREDITS.marketPlan, cost: PLAN_CALL },
  { product: true, what: 'eight advert lines', credits: CREDITS.adLines, cost: ADS_CALL },
  { product: true,
    decided: 'Carli, 11 Oct, with the engine cost and the profit in rand in front of her: "a background out of video R6.50"',
    what: 'a background taken out, per five seconds', credits: CREDITS.cutout, cost: CUTOUT_PER_5S },
  /* Estimated at the dearest thing in the same family — see `CREDITS.erase`.
     Held against that same rate so it can never quietly fall under it. */
  { product: true,
    decided: 'Carli, 11 Oct, same table, same minute: "An item taken out of a video moet ook verander word. R7.00"',
    what: 'an item taken out, per five seconds', credits: CREDITS.erase, cost: CUTOUT_PER_5S },
  /* A still picture changed by saying what to change — Nano Banana on her
     own Google project. `PER_PICTURE` is micro-dollars and is itself the
     expensive end of an unread price, so this asserts the margin against a
     figure deliberately set too high. If it passes here it passes on the
     real invoice. */
  { product: true, what: 'a still picture changed by saying what to change', credits: CREDITS.repaint, cost: (PER_PICTURE / 1_000_000) * RAND_PER_USD },
];
