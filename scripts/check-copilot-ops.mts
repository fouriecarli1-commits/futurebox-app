/**
 * Every operation a room registers has to be described in the registry.
 *
 * The copilot is only ever offered an operation that is both *registered* by a
 * mounted room and *described* in `app/lib/surfaces.ts` — `describeOps` drops
 * anything it has no description for, because a model cannot use an operation
 * whose value it has not been told the meaning of.
 *
 * That is the right behaviour and it fails invisibly. Wire `set_notes` into the
 * podcast room, forget the one line in the registry, and nothing breaks: the
 * build passes, the room renders, and the copilot simply never offers to write
 * your notes. Nobody finds that except by wondering why it will not.
 *
 * So: read what the components register, read what the registry describes, and
 * fail when they disagree.
 *
 *   npm run check:ops
 *
 * The scan is a regex over the source rather than a real parse. It only has to
 * cope with how we write these calls — `useCopilotOps('room', { op: ... })`
 * with the handlers inline — and a call it cannot read is reported rather than
 * skipped, so the check cannot quietly stop checking.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SURFACES, isSurfaceId } from '../app/lib/surfaces';

const DIR = 'app/components';
const CALL = /useCopilotOps\(\s*'([a-z_]+)'\s*,\s*\{/g;

const problems: string[] = [];
let found = 0;

for (const file of readdirSync(DIR).filter((name) => name.endsWith('.tsx'))) {
  const path = join(DIR, file);
  const source = readFileSync(path, 'utf8');

  for (const call of source.matchAll(CALL)) {
    found += 1;
    const room = call[1];
    if (!isSurfaceId(room)) {
      problems.push(`  ${file}: registers ops for "${room}", which is not a room in the registry`);
      continue;
    }

    // Walk from the opening brace to its match, so a handler body containing
    // braces does not end the block early.
    const start = call.index + call[0].length - 1;
    let depth = 0;
    let end = -1;
    for (let i = start; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) {
      problems.push(`  ${file}: could not read the useCopilotOps block for "${room}"`);
      continue;
    }

    const block = source.slice(start + 1, end);
    // Handler keys are at the top level of the block: `name:` at depth zero.
    const names: string[] = [];
    let level = 0;
    for (const match of block.matchAll(/([{}()[\]])|(\b[a-z_][a-z0-9_]*)\s*:/g)) {
      if (match[1]) level += '{(['.includes(match[1]) ? 1 : -1;
      else if (level === 0 && match[2]) names.push(match[2]);
    }
    if (names.length === 0) {
      problems.push(`  ${file}: the useCopilotOps block for "${room}" has no operations in it`);
      continue;
    }

    const described = SURFACES[room].ops ?? {};
    for (const name of names) {
      if (!described[name]) {
        problems.push(
          `  ${file}: "${room}" registers ${name}, which has no description in surfaces.ts — ` +
            'it will never be offered to the copilot',
        );
      }
    }
  }
}

if (found === 0) {
  console.error('check:ops — found no useCopilotOps calls at all. The scan is probably broken.');
  process.exit(1);
}

if (problems.length > 0) {
  console.error(`check:ops — rooms and the registry disagree:\n${problems.join('\n')}`);
  process.exit(1);
}

const wired = Object.values(SURFACES).filter((surface) => surface.ops).length;
console.log(`check:ops — ${found} rooms register operations, all described (${wired} rooms in the registry have ops).`);
