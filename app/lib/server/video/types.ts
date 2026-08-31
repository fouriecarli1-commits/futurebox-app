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

/** Whether an engine can do this request at all. */
export function suits(provider: Provider, request: StartRequest): boolean {
  if (!provider.configured()) return false;
  if (!provider.can.aspects.includes(request.aspect)) return false;
  if (request.speak && !provider.can.speaks) return false;
  return true;
}
