/**
 * Every tool on the All tools page opens something that exists.
 *
 * The owner, 16 October 2026: another app's All tools page, built here as
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
import { PDF_TOOLS } from '../app/lib/pdftools';
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
const noRoom = TOOLS.filter((one) => (one.room ? !rooms.has(one.room) : !one.pdf)).map((one) => `${one.id} → ${one.room}`);
ok('every tool opens a room the studio has, or the document room', noRoom.length === 0, noRoom.join(', '));
/* A document tool opens the document room on one of its own tools — 17
   October 2026 — and the page that holds the All tools sheet sends it there. */
const pdfIds = new Set<string>(['home', ...PDF_TOOLS.map((one) => one.id)]);
const badPdf = TOOLS.filter((one) => one.pdf && (!pdfIds.has(one.pdf) || one.room)).map((one) => one.id);
ok('  every document tool names a tool the document room has, and no room besides', badPdf.length === 0, badPdf.join(', '));
ok('  and a press on one opens the document room', /if \(tool\.pdf\) \{\s*askPdf\(/.test(readFileSync('app/page.tsx', 'utf8')));
/* Rooms that open over a room instead of on its bar, and the line in that
   room which opens them when asked. The darkroom, 17 October 2026. */
const OVER: Record<string, { readonly file: string; readonly opens: RegExp }> = {
  darkroom: { file: 'app/components/PostStudio.tsx', opens: /panel === 'darkroom'\) setDarkroom\(true\)/ },
  vector: { file: 'app/components/PostStudio.tsx', opens: /panel === 'vector'\) setVector\(/ },
  poster: { file: 'app/components/PostStudio.tsx', opens: /panel === 'poster'\) setPoster\(true\)/ },
  product: { file: 'app/components/PostStudio.tsx', opens: /panel === 'product'\) setProduct\(true\)/ },
  tryon: { file: 'app/components/PostStudio.tsx', opens: /panel === 'tryon'\) setTryOn\(true\)/ },
};
const noPanel = TOOLS.filter((one) => one.panel && !panels.includes(one.panel) && !OVER[one.panel]).map((one) => `${one.id} → ${one.panel}`);
ok('every panel a tool opens is a panel the room’s bar carries', noPanel.length === 0, noPanel.join(', '));
for (const [panel, { file, opens }] of Object.entries(OVER)) {
  ok(`  or a room over the room that opens when asked (${panel})`, opens.test(readFileSync(file, 'utf8')));
}
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
