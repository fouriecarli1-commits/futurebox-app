/**
 * Every tool on the All tools page opens something that exists.
 *
 * Carli, 16 October 2026: another app's All tools page, built here as
 * `components/AllTools.tsx`. A tool names a room and, inside it, a panel.
 * A panel name nobody has is a button that opens the room and then nothing,
 * which reads as the tool being broken. So every panel named in
 * `lib/alltools.ts` must be one of the panels the bars carry (`CutDock.tsx`),
 * and every room one the studio has.
 *
 *   npm run check:toolpanels
 */
import { readFileSync } from 'node:fs';
import { TOOLS, TOOL_GROUPS } from '../app/lib/alltools';
import { STAGES, standaloneSurfaces, surfacesInStage } from '../app/lib/surfaces';

let bad = 0;
const ok = (label: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${label}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) bad += 1;
};

const dock = readFileSync('app/components/CutDock.tsx', 'utf8');
const union = dock.slice(dock.indexOf('export type Bench ='), dock.indexOf('| null;', dock.indexOf('export type Bench =')));
const panels = [...union.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
const rooms = new Set([...STAGES.flatMap((stage) => surfacesInStage(stage.id)), ...standaloneSurfaces()]);

ok(`every tool is in a group (${TOOLS.length} tools)`, TOOLS.every((one) => TOOL_GROUPS.some((g) => g.id === one.group)));
ok('  every id once', new Set(TOOLS.map((one) => one.id)).size === TOOLS.length);
const noRoom = TOOLS.filter((one) => !rooms.has(one.room)).map((one) => `${one.id} → ${one.room}`);
ok('every tool opens a room the studio has', noRoom.length === 0, noRoom.join(', '));
const noPanel = TOOLS.filter((one) => one.panel && !panels.includes(one.panel)).map((one) => `${one.id} → ${one.panel}`);
ok('every panel a tool opens is a panel the room’s bar carries', noPanel.length === 0, noPanel.join(', '));
const wrongRoom = TOOLS.filter((one) => one.panel && one.room !== 'photo' && one.room !== 'videoedit').map((one) => one.id);
ok('  and only in the two rooms that know how to be asked', wrongRoom.length === 0, wrongRoom.join(', '));
for (const [file, room] of [['app/components/PostStudio.tsx', 'photo'], ['app/components/VideoEditor.tsx', 'videoedit']] as const) {
  ok(`  ${room} takes the panel it is asked for, on arriving and while open`,
    new RegExp(`takePanel\\('${room}'\\)`).test(readFileSync(file, 'utf8')) && /addEventListener\(OPEN_PANEL_EVENT/.test(readFileSync(file, 'utf8')));
}

if (bad) {
  console.error(`\ncheck:toolpanels — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:toolpanels — every tool on the All tools page opens a room that exists, on a panel that exists.');
