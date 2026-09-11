/**
 * The adviser's reply shape has to be one the model API will accept.
 *
 * ── Why this is not paranoia ─────────────────────────────────────────────
 *
 * `/api/adformats` builds its schema from `FORMAT_IDS`, at module load:
 *
 *     id: z.enum(FORMAT_IDS as [string, ...string[]])
 *
 * That cast is load-bearing and it is a lie in one case — an empty
 * catalogue. `z.enum([])` throws, and it throws while the module is being
 * imported, which in a route means the first person to press the button
 * gets a 500 and a screen saying the adviser could not be reached. Nothing
 * in a typecheck sees it, because the cast tells TypeScript the array is
 * non-empty and TypeScript believes it.
 *
 * And the same file was written this morning, tested only against a stubbed
 * reply. The screen was proved and the route's schema was never once
 * constructed — which is exactly how the marketing plan shipped broken: one
 * side exercised, the other assumed. So this builds the real shape, with the
 * real helper the route uses, and looks at what comes out.
 *
 * ── What building it actually showed ─────────────────────────────────────
 *
 * `z.enum` does NOT survive as an enum. `zodOutputFormat` cannot express one
 * in the schema subset the API takes, so it degrades it into the field's
 * description:
 *
 *     "id": { "type": "string",
 *             "description": "One of the formats.\n\n{enum: [\"short_vertical\", …]}" }
 *
 * The ids reach the model. They are not enforced. A `z.enum` in a route
 * reads like a guarantee and is a strongly worded request, which means the
 * server-side `formatById` filter in `/api/adformats` is not a belt beside
 * braces — it is the only thing between an invented id and a card on screen
 * offering to open a room that does not exist.
 *
 * Worth knowing for every other route in this app that uses `z.enum` with
 * this helper, which is several.
 *
 *   npm run check:adschema
 */
import { readFileSync } from 'node:fs';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { AD_FORMATS, FORMAT_IDS } from '../app/lib/adformats';

const problems: string[] = [];
const check = (what: string, ok: boolean, saw = '') => {
  if (!ok) problems.push(`  ${what}${saw ? `\n      ${saw}` : ''}`);
};

check(
  'the catalogue is not empty, or z.enum throws as the route is imported',
  FORMAT_IDS.length > 0,
  'an empty catalogue is a 500 on the first press, not a validation error',
);

let built: unknown = null;
try {
  /* The same shape the route declares. Written out rather than imported,
     because importing the route pulls in the Anthropic client and the
     moderation gate and would be testing those instead. `check:adformats`
     is what holds this copy against the route's own. */
  const PickSchema = z.object({
    picks: z
      .array(
        z.object({
          id: z.enum(FORMAT_IDS as [string, ...string[]]).describe('One of the formats.'),
          why: z.string().describe('Why this one for this business.'),
          first: z.string().describe('The first thing to make.'),
          watchOut: z.string().describe('How it goes wrong for them.'),
        }),
      )
      .describe('Two or three formats, best first.'),
    instead: z.string().describe('One that looks obvious and is wrong.'),
    moves: z.string().describe('What may have moved since training.'),
  });
  built = zodOutputFormat(PickSchema);
} catch (error) {
  problems.push(`  the reply shape could not be built at all\n      ${String(error).slice(0, 200)}`);
}

if (built) {
  const json = JSON.stringify(built);
  check('and it produces a schema with something in it', json.length > 200, `${json.length} bytes`);

  /* Every id reaches the model. Matched on the id anywhere in the
     serialised schema rather than as a quoted JSON string, because the
     helper writes them into a description with the quotes escaped — which
     is what the first version of this assertion got wrong, reporting all
     eight as missing when all eight were there. */
  const missing = FORMAT_IDS.filter((one) => !json.includes(one));
  check(
    'every format in the catalogue is offered to the model',
    missing.length === 0,
    `missing: ${missing.join(', ')}`,
  );

  /* And because it is a description rather than an enum, the filter is
     load-bearing. Asserted here, next to the evidence, rather than only in
     check:adformats where it reads as a nicety. */
  const route = readFileSync('app/api/adformats/route.ts', 'utf8');
  check(
    'the route drops an id the catalogue does not have — the API will not do it for us',
    /formatById\(one\.id\) !== null/.test(route),
    'the enum is advisory; without this filter an invented id becomes a card that opens nothing',
  );

  /* And nothing else is. An id in the schema that is not in the catalogue
     would pass the route's own filter check and then fail `formatById`,
     which drops it — a recommendation the model made and nobody sees. */
  const listed = [...json.matchAll(/\{enum:\s*\[([^\]]*)\]\}/g)]
    .flatMap((one) => [...one[1].matchAll(/\\?"([^"\\]+)\\?"/g)].map((two) => two[1]));
  check('the ids are listed for the model, not merely described', listed.length > 0, json.slice(0, 160));
  const strangers = listed.filter((one) => !FORMAT_IDS.includes(one));
  check('and nothing the catalogue does not have', strangers.length === 0, strangers.join(', '));

  /* The API rejects an unknown or malformed shape rather than ignoring it,
     so a reply format that is not the one the helper produces fails on the
     first real call rather than here. */
  check(
    'the helper produced a json_schema reply format',
    /"type"\s*:\s*"json_schema"/.test(json),
    json.slice(0, 120),
  );
  check(
    'and it refuses fields nobody declared',
    /"additionalProperties"\s*:\s*false/.test(json),
    'a reply carrying an extra field would be accepted and silently ignored',
  );
}

/* Room ids are strings the studio resolves. A format naming a room with a
   space or a capital in it would build fine and navigate nowhere. */
for (const one of AD_FORMATS) {
  check(
    `"${one.id}" names its room in the studio's own spelling`,
    /^[a-z_]+$/.test(one.room),
    one.room,
  );
  check(`"${one.id}" is spelled as an id, not a sentence`, /^[a-z0-9_]+$/.test(one.id), one.id);
}

if (problems.length > 0) {
  console.error(`check:adschema — the adviser's reply shape is not one the API will take:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `check:adschema — the reply shape builds, lists all ${FORMAT_IDS.length} formats and nothing else, ` +
    'the route filters because the list is advisory, and every room id is one the studio can resolve.',
);
