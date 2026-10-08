/**
 * One shape in front of "this recording, in this voice".
 *
 * ── The clause this exists for ───────────────────────────────────────────
 *
 * Kits' terms, §1.3: Arpeggi may remove or replace any model, and remove
 * functionality, if they have *"any reason to believe"* it may infringe.
 * `docs/KITS-TERME.md` draws the conclusion — **the catalogue is not a stable
 * dependency and the app should not present it as one.**
 *
 * Until now it was presented as exactly that. `app/api/voice/sing` imported
 * `convert` from `lib/server/kits.ts` and called it, so the room's one way to
 * sing in another voice went through one supplier's function with that
 * supplier's arguments. Replacing them meant rewriting the route, and losing
 * them meant the feature stopped.
 *
 * So this is the seam: the app asks for a recording in a voice, and does not
 * know who answers. Kits answers today.
 *
 * Carli, 8 October 2026: *"gaan aan met die seam."*
 *
 * ── What is in the shape, and why so little ──────────────────────────────
 *
 * A seam that carries every supplier's knobs is not a seam, it is one
 * supplier wearing a new name. So the spine below is only what is true of
 * singing voice conversion itself, whoever does it:
 *
 *   the recording · which voice · whether the music comes back with it ·
 *   how far to move the pitch · how hard to push the model ·
 *   how long we are prepared to wait
 *
 * Everything past that is supplier-specific — Kits' noise gate has Kits'
 * field names and nobody else's — and it travels in `tuning`, which is
 * **opaque and tagged with who issued it**. A supplier handed a tuning from
 * another supplier ignores it.
 *
 * That tag is the whole point. The failure this prevents is the quiet one: a
 * second supplier reading a Kits settings object, finding field names it
 * half-recognises, and applying something that is nearly right. Dropping a
 * tuning is visible — the voice comes back unpolished and somebody says so.
 * Mistranslating one is not.
 *
 * ── The meter belongs here too ───────────────────────────────────────────
 *
 * A seam that only moves audio is cosmetic, because the thing that actually
 * differs between suppliers is **what their work costs and against which
 * ceiling**. Kits bills download-minutes against a monthly 400. Anything we
 * ran ourselves would bill GPU-seconds. A route that asks the supplier
 * "is there room for this?" and "write down that it was used" works for
 * both; a route that imports `kitsminutes` works for one.
 *
 * ── What this is NOT ─────────────────────────────────────────────────────
 *
 * Not a second supplier. There is one, and it is Kits. What this buys is that
 * the second one is a file rather than a rewrite — and `check:singer` proves
 * that by writing one: a complete stand-in implemented against this interface
 * and nothing else, which the check then drives. If the interface were
 * secretly Kits-shaped, that stand-in could not be written.
 *
 * Not voice *training* either. Kits cannot create a voice over its API —
 * measured 9 September 2026, `POST /voice-models` answers 404 — so cloning
 * happens on their site and this seam is about conversion only.
 */

/** A voice somebody can be sung in. */
export interface Voice {
  readonly id: string;
  readonly name: string;
  /** A picture for the picker, where the supplier has one. */
  readonly faceUrl?: string | null;
}

/**
 * Settings only the supplier that issued them understands.
 *
 * `by` is that supplier's `id`. Anyone else drops it. See the note above on
 * why dropping is the safe failure and translating is not.
 */
export interface Tuning {
  readonly by: string;
  readonly it: unknown;
}

export interface Ask {
  /** The voice's id, as this supplier's own catalogue gives it. */
  readonly voice: string;
  readonly audio: Blob;
  readonly filename: string;
  /** Whether the backing comes back with the voice, or the voice alone. */
  readonly want: 'voice' | 'mix';
  /** Semitones, -24 to 24. Twelve is an octave. */
  readonly pitch?: number;
  /** 0 to 1. More of the model's own accent, and more of its mistakes. */
  readonly strength?: number;
  /** Epoch milliseconds past which the caller has stopped waiting. */
  readonly deadline: number;
  readonly tuning?: Tuning | null;
}

export type Sung =
  | { readonly ok: true; readonly audio: ArrayBuffer; readonly type: string }
  /** Their own words where there are any, ours where there are not. */
  | { readonly ok: false; readonly status: number; readonly message: string };

/** Whether there is room to do this work, and why not when there is not. */
export interface Room {
  readonly ok: boolean;
  readonly message?: string;
  /**
   * Which refusal this is, so it can be said in Afrikaans.
   *
   * `lib/apierror.ts` turns a code into a sentence in her language, and "you
   * are out" and "everybody is out" have to stay different answers on the
   * screen as well as in here. A seam that flattened both into one English
   * message would be a seam that quietly removed a translation — which is the
   * sort of loss nobody reports, because the screen still says something.
   */
  readonly code?: string;
  /** How much is left, in the units the refusal is about. */
  readonly left?: number;
  /** For the screen that shows how much of the month is left. */
  readonly leftSeconds?: number | null;
}

export interface Singer {
  /** Short, stable, and what a `Tuning.by` is matched against. */
  readonly id: string;
  /** For a screen that has to name who did the work. */
  readonly name: string;
  /** Whether this app has what it needs to call them at all. */
  configured(): boolean;
  /** The voices on offer. Empty is a real answer, not a failure. */
  voices(): Promise<readonly Voice[]>;
  /**
   * Whether a voice id still exists.
   *
   * This is §1.3 in one method. A voice saved against a member's work can be
   * withdrawn between one session and the next, and a screen that discovers
   * that by failing a conversion is a screen that took the credits first.
   */
  stillThere(voice: string): Promise<boolean>;
  /** Is there room for this much work, against whatever ceiling they have? */
  room(seconds: number, owner?: string | null): Promise<Room>;
  /** Write down that it was used, once it has been. */
  note(seconds: number, owner?: string | null): Promise<void>;
  sing(ask: Ask): Promise<Sung>;
}

/**
 * The tuning this supplier may act on, or nothing.
 *
 * One function rather than the same two-line check in every supplier,
 * because it is the same check and the one place it can be got wrong is
 * worth having only once.
 */
export const mineOnly = (who: Singer, tuning: Tuning | null | undefined): unknown =>
  (tuning && tuning.by === who.id ? tuning.it : undefined);

/* The register is NOT here. `lib/server/singers.ts` holds it, and the note at
   the top of that file says why a module-level list that suppliers add
   themselves to was the wrong answer — it was the first answer, and
   `check:singer` caught it before it shipped. */
