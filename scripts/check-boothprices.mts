/**
 * The Pro Booth's own tools cost credits, say so on the button, and are
 * charged before the result is handed over. And no price is one credit.
 *
 * The owner, 28 October 2026: *"Funksies wat sinvol is moet altyd 'n paar
 * krediete kos"*, and on the proposal: *"Niks 1 credit nie. Altyd 2."*
 */
import { readFileSync } from 'node:fs';
import { CREDITS } from '../app/lib/credits.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

const ones = Object.entries(CREDITS).filter(([, n]) => n > 0 && n < 2);
ok('no price in the app is under two credits', ones.length === 0, ones.map(([k, n]) => `${k}: ${n}`).join(', '));

ok('the booth tools are priced as she agreed',
  CREDITS.stemsZip === 5 && CREDITS.laneWav === 2 && CREDITS.laneMidi === 2 && CREDITS.humPart === 3
  && CREDITS.findMarks === 2 && CREDITS.smoothJoin === 2 && CREDITS.whatsIn === 2);

const route = withoutComments(readFileSync('app/api/boothtool/route.ts', 'utf8'));
const tools = ['zip', 'wav', 'midi', 'hum', 'marks', 'smooth', 'heard'];
ok('the charge route knows every tool, by the table', tools.every((one) => new RegExp(`\\b${one}: CREDITS\\.`).test(route)) && /charge\(/.test(route));

const booth = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));
const timeline = withoutComments(readFileSync('app/components/BoothTimeline.tsx', 'utf8'));
for (const [tool, before] of [
  ['zip', /payTool\('zip'[^\n]*\n\s*downloadBlob\(zip/],
  ['wav', /payTool\('wav'[\s\S]{0,40}\n\s*downloadBlob\(written\.blob/],
  ['midi', /payTool\('midi'[\s\S]{0,40}\n\s*downloadBlob\(midiBlob/],
  ['marks', /payTool\('marks'[\s\S]{0,200}transitionsIn\(/],
  ['smooth', /payTool\('smooth'[\s\S]{0,500}smoothedCopy\(/],
  ['hum', /payTool\('hum'[\s\S]{0,400}renderHum\(/],
  ['heard', /payTool\('heard'[\s\S]{0,200}whatsIn\(/],
] as const) {
  ok(`${tool}: charged before it is handed over`, before.test(booth));
}
ok('every priced button says its price', ['stemsZip', 'laneWav', 'laneMidi', 'humPart', 'smoothJoin', 'whatsIn'].every((key) => booth.includes(`CREDITS.${key}`))
  && timeline.includes('CREDITS.findMarks'));
ok('the old "No credits" is gone from the two magic actions that now cost',
  !/price: t\('pro\.free', 'No credits'\),\s*run: (regionSmooth|\(\) => regionSend\('hum'\))/.test(booth));

if (bad) {
  console.error(`\ncheck:boothprices — ${bad} problem(s).`);
  process.exit(1);
}
console.log('\ncheck:boothprices — the booth tools are priced, said and charged first; nothing costs one credit.');
