/**
 * What a video engine has to be, for this app to use it.
 *
 * There is more than one because they differ by more than thirteen times in
 * price — measured, from real invoices — and because the cheapest one that can
 * do the job is the right one nearly always. That is a routing decision, and a
 * routing decision needs every engine to answer the same questions.
 *
 * ── Capabilities are declared, never inferred ────────────────────────────
 *
 * `can` is the whole point of this file. A request for ten seconds, in a
 * square frame, with a line that has to be spoken, is only offered to engines
 * that say they do all three. The alternative is finding out four minutes and
 * one charge later, which is how a member learns not to trust the button.
 *
 * ── Cost is in the engine's own units, and it is a guess ─────────────────
 *
 * `cost()` answers in whatever the provider counts — Kling credits, ElevenLabs
 * credits — because those are the units its monthly package is sold in and the
 * only ones its ceiling can be counted against. They are not comparable across
 * providers and nothing here pretends they are.
 *
 * It is also, honestly, an estimate read off a pricing page, and pricing pages
 * have been wrong every single time in this project: a figure that was per
 * year read as a total, an image row read as video, an "up to" maximum read as
 * a rate. So every generation records what the provider *actually* said it
 * cost, and the estimates below exist only to keep the ceiling roughly honest
 * until enough real numbers have accumulated to replace them.
 */

export type Aspect = '16:9' | '9:16' | '1:1';

/** Which rung the member paid for. The desk shows these words, not engine names. */
export type Grade = 'standard' | 'better' | 'premium';

export interface StartRequest {
  /**
   * What the member was charged, in FutureBox credits.
   *
   * Carried only so the provider can file it beside what the supplier
   * charged. `eleven_price_check` — the view the pricing page reads — drops
   * every row where either number is missing, on the ground that an average
   * treating an absent figure as nought lies in the expensive direction. So a
   * cost noted without this is written to the table and then invisible on the
   * one page anybody looks at, which is worse than not noting it: it reads as
   * "video was never used".
   *
   * Optional because the ceiling and the routing do not need it, and a
   * provider that does not reach ElevenLabs has nothing to file it against.
   */
  readonly credits?: number;
  readonly prompt: string;
  readonly aspect: Aspect;
  readonly seconds: number;
  /**
   * Whether a quoted line in the prompt should come back as speech.
   *
   * Asked for rather than assumed: silent footage with the voice added
   * afterwards is both cheaper and the only way this app gets Afrikaans, since
   * the video models are English-first and ElevenLabs is not.
   */
  readonly speak: boolean;
  /**
   * A picture for the clip to start from. Optional, and the point of it is
   * money.
   *
   * Text alone is the expensive way to get a specific look: you describe the
   * thing, the engine draws something adjacent, you describe it again, and
   * every attempt is charged. A start frame settles the subject, the palette
   * and the framing in one go, so the prompt only has to say what *moves* —
   * which is the part a video model is actually good at.
   *
   * Base64 without the `data:` preamble, because that is what the engines
   * take. The mime travels beside it rather than being parsed back out of a
   * data URL: the route has to know what it is before anything leaves this
   * machine, and a check that re-reads a string the browser wrote is a check
   * waiting to be fooled.
   */
  readonly image?: { readonly data: string; readonly mime: string };
  /**
   * A picture for the clip to END on. Optional, and it needs the first one.
   *
   * ── What it buys, which is not "a bit more control" ───────────────────
   *
   * Carli sent a Gemini conversation on 9 October 2026 listing what Google's
   * models can do, and this was in it — *"eerste/laaste raam-instellings"*.
   * The Veo call here had sent the first frame since it was written and
   * never the last, so the field was unused: a capability that had been
   * paid for in the subscription and never offered.
   *
   * Two frames turns a clip from a guess into a MOVE. With one frame the
   * engine decides where the shot is going; with two it has to arrive, so
   * the camera push, the door opening, the face turning are all the engine
   * filling in between two pictures somebody chose rather than inventing an
   * ending. And it is the one thing that makes two clips JOIN: end clip one
   * on the frame clip two begins with, and the cut disappears.
   *
   * ── Why it may not travel alone ───────────────────────────────────────
   *
   * An end frame with no start frame is a request to interpolate from
   * nothing, which Veo does not do — it reads `lastFrame` only beside an
   * `image`. Sent alone it is silently dropped, which is a member paying
   * for a clip that ignores the picture they chose, with nothing anywhere
   * saying why. `suits()` below refuses it rather than letting that happen.
   */
  readonly endImage?: { readonly data: string; readonly mime: string };
}

export type Started =
  | { readonly ok: true; readonly taskId: string }
  | { readonly ok: false; readonly status: number; readonly message: string };

export type Progress =
  | { readonly state: 'running' }
  | { readonly state: 'done'; readonly url: string; readonly units?: number }
  | { readonly state: 'failed'; readonly message: string }
  /** Could not be reached. Never treated as a failure — see the route. */
  | { readonly state: 'unknown'; readonly message: string };

export interface Capabilities {
  /** Lengths the engine will actually make. A request is rounded to one of these. */
  readonly seconds: readonly number[];
  readonly aspects: readonly Aspect[];
  /** True where a quoted line comes back as audio. */
  readonly speaks: boolean;
  /**
   * True where the engine will start from a picture it is given.
   *
   * Declared per engine, and false is the honest default: an image field an
   * endpoint does not read is silently dropped, so the member pays for a clip
   * that has nothing to do with the picture they attached and nothing anywhere
   * says why.
   */
  readonly startFrame: boolean;
  /**
   * True where the engine will also END on a picture it is given.
   *
   * Separate from `startFrame` and false by default, for the reason that
   * field already gives: a `lastFrame` an endpoint does not read is dropped
   * in silence, and the member pays for a clip that ends wherever the engine
   * felt like ending it. Only Veo declares it true, because only Veo's own
   * request shape documents the field.
   */
  readonly endFrame: boolean;
  readonly maxPromptChars: number;
}

export interface Provider {
  readonly id: string;
  /** Shown to the operator, never to a member. */
  readonly name: string;
  readonly grade: Grade;
  /** The engine's own name for what it runs, recorded against each generation. */
  readonly model: string;

  configured(): boolean;
  readonly can: Capabilities;

  /**
   * Which purse this engine draws on, where more than one draws on the same.
   *
   * Spend is counted per provider id, and the ceiling is asked of the
   * provider. That is right while every engine has its own account. It stops
   * being right the moment two engines bill the SAME account: two Google
   * rungs, each counted on its own id against the one `GOOGLE_CAP_VIDEO`,
   * would between them spend twice the ceiling she set — and the ceiling is
   * the whole reason that account is safe to use.
   *
   * So engines that share a bill name the same purse, the route sums their
   * spend together, and the ceiling binds once. Left unset it is the id,
   * which is what every engine with its own account already wanted.
   */
  readonly purse?: string;

  /** The month's allowance, in this provider's units. */
  ceiling(): number;
  /** What one generation is expected to cost, in this provider's units. */
  cost(seconds: number): number;

  start(request: StartRequest): Promise<Started>;
  check(taskId: string): Promise<Progress>;
}

/** The nearest length this engine will actually make. */
export function nearestLength(can: Capabilities, wanted: number): number {
  return can.seconds.reduce((best, one) =>
    Math.abs(one - wanted) < Math.abs(best - wanted) ? one : best,
  );
}

/** The purse an engine draws on — its own account unless it says otherwise. */
export const purseOf = (provider: Provider): string => provider.purse ?? provider.id;

/** Whether an engine can do this request at all. */
export function suits(provider: Provider, request: StartRequest): boolean {
  if (!provider.configured()) return false;
  if (!provider.can.aspects.includes(request.aspect)) return false;
  if (request.speak && !provider.can.speaks) return false;
  if (request.image && !provider.can.startFrame) return false;
  if (request.endImage && !provider.can.endFrame) return false;
  /* An end frame with no start frame is a request to interpolate from
     nothing. Veo reads `lastFrame` only beside an `image`, so the pair is
     refused here rather than being dropped by the engine in silence — the
     fault the `image` line above exists to prevent, one field along. */
  if (request.endImage && !request.image) return false;
  return true;
}
