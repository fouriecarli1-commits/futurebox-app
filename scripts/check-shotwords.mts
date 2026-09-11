/**
 * What the copilot is told about a shot has to be what the desk implements.
 *
 * ── The convention, and the four things hanging off it ───────────────────
 *
 * The video desk treats a line in quotation marks as the thing being said.
 * That one convention carries four behaviours:
 *
 *   · `spokenLines` pulls the line out of the prompt;
 *   · the switch that has the engine speak it only draws when there is one;
 *   · `looksUnquoted` warns when a prompt reads as speech with no quotes;
 *   · Storyboard's subtitle defaults to the quoted line, which is why
 *     turning captions on is usually one switch and no typing.
 *
 * Nothing ever told the copilot. So it wrote adverts with people talking in
 * them, in prose, and all four stayed switched off — the engine drew someone
 * mouthing nothing and the subtitle came out empty. Carli found it within an
 * hour of the hand-off shipping: "daar is nie aanhalings vir spoken words nie."
 *
 * ── What this checks, and why that is a real constraint ──────────────────
 *
 * Not that the description mentions quotes — that is prose about prose. It
 * takes the example sentence out of the description and runs the desk's own
 * `spokenLines` and `looksUnquoted` over it. If the two ever disagree about
 * what a quoted line looks like — someone types straight quotes into a file
 * that uses curly ones, or rewrites the example without any — the instruction
 * stops matching the implementation and this fails.
 *
 *   npm run check:shotwords
 */
import { SURFACES } from '../app/lib/surfaces';
import { looksUnquoted, spokenLines } from '../app/lib/videoscenes';

const problems: string[] = [];
const check = (what: string, ok: boolean, saw = '') => {
  if (!ok) problems.push(`  ${what}${saw ? `\n      got: ${saw}` : ''}`);
};

const shot = SURFACES.canvas.ops?.set_prompt ?? '';
check('the video desk still describes set_prompt at all', shot.length > 0);

/* The example, read by the same function the room reads prompts with. */
const lines = spokenLines(shot);
check(
  'the copilot is shown a quoted line the desk can actually find',
  lines.length === 1,
  lines.length === 0
    ? 'no quoted line in the description — the copilot is not being shown the convention'
    : `${lines.length} quoted lines, so the example is ambiguous: ${lines.join(' | ')}`,
);

check(
  'and that example does not trip the desk\'s own "you forgot the quotes" warning',
  !looksUnquoted(shot),
  'the instruction demonstrates the mistake it is warning against',
);

/* A shot description that is one clause is the fault she reported. Measured
   as a floor rather than by reading the words: the point is that it asks for
   a shot rather than a summary of one, and nothing shorter than this can. */
check(
  'the description asks for a whole shot rather than a line about one',
  shot.length > 320,
  `${shot.length} characters`,
);

/* ── The rule that still has to say no ──────────────────────────────────
 
   This one is prose matched against prose, which is usually the wrong tool,
   and it is here on purpose. The system prompt used to carry a flat "never
   invent a value to fill a box". That rule was suppressing the shape and
   length of a video — craft decisions the copilot should make — so it was
   split into "never invent a FACT about them" and "do make the craft
   decisions". The refusal that matters most, an offer nobody made, now
   lives in exactly one place: this op's own description. A check that can
   only see the words is better than no check over a line that, if it goes
   quiet, puts a promise in somebody's advert that they never made. */
const offer = SURFACES.campaign.ops?.set_offer ?? '';
check(
  'the advert brief still refuses to invent an offer',
  /invent/i.test(offer),
  offer || 'set_offer has no description at all',
);

if (problems.length > 0) {
  console.error(`check:shotwords — the copilot is told something the desk does not do:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `check:shotwords — the shot the copilot is asked for carries a quoted line the desk finds (${lines[0]}), ` +
    'does not trip its own unquoted warning, and the advert brief still refuses to invent an offer.',
);
