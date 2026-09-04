/**
 * A real export dropped on the screen, and the numbers it produces.
 *
 * `check:adreport` proves the reading as arithmetic. This proves it reaches
 * somebody: that the file goes in through the control they actually use, that
 * the money renders as money rather than as cents, that a campaign is joined
 * to the run that sent it out — which is what the UTM tagging was for — and
 * that a file with no money in it is refused rather than half-shown.
 */
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3031';
const af = process.argv[3] === 'af';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');

/* A run already planned, so the join can be tested. Its campaign is typed one
   way and the export writes it another, which is exactly the case the slug
   exists for. */
await p.addInitScript(() => {
  try {
    window.localStorage.setItem('futurebox.adruns.v1', JSON.stringify([{
      id: 'run-1', campaign: 'Winter Sale', headline: 'Winter Sale',
      link: 'https://shop.example.co.za/boots', when: '',
      createdAt: new Date().toISOString(),
      steps: [{ platform: 'tiktok', done: false }],
    }]));
  } catch {}
});

async function intoTheDesk() {
  const cta = p.locator('button, a').filter({ hasText: af ? /begin|gratis|teken/i : /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 40000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('toets@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('toets-wagwoord-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2500);
  await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
  await p.waitForTimeout(1800);
  const room = p.locator('div.fixed.inset-0.z-50').first();
  await room.locator('button').filter({ hasText: af ? /^Advertensies/ : /^Adverts/ }).first().click();
  await p.waitForTimeout(1800);
  return room;
}

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
const room = await intoTheDesk();

const words = await room.innerText();
check('the report panel is in the advert desk',
  af ? /Wat die geld gedoen het/.test(words) : /What the money did/.test(words));
check('it says why it takes a file rather than a connection',
  af ? /app-hersiening en 'n geverifieerde maatskappy/.test(words) : /app review and a verified company/.test(words));

/* A Meta-shaped export: a title block above the header, a quoted campaign
   name with a comma in it, South African money, and a totals row at the foot
   with no name — every one of which has broken a report reader somewhere. */
const CSV = [
  'Ad performance report',
  '1 Aug 2026 - 31 Aug 2026',
  '',
  'Campaign name,Amount spent (ZAR),Impressions,Link clicks,Results,Cost per result',
  '"winter sale","R 1 200,00","24,310","412","18","R 66,67"',
  'Spring teaser,"R 800,00","15,004","210","6","R 133,33"',
  ',"R 2 000,00","39,314","622","24",',
].join('\n');

await room.locator('#report-file').setInputFiles({
  name: 'meta-export.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV, 'utf8'),
});
await p.waitForTimeout(900);

const after = await room.innerText();
check('the money renders as rands, not cents', /R\s?1\s?200/.test(after), (after.match(/R\s?[\d\s.,]+/g) || []).slice(0, 4).join(' | '));
check('the totals row was not counted twice', /R\s?2\s?000/.test(after) && !/R\s?4\s?000/.test(after),
  (after.match(/R\s?4[\s.,]?000/) || ['no double'])[0]);
check('the campaign with a comma in it survived',
  af ? /winter sale/i.test(after) : /winter sale/i.test(after));
check('the sentence a client reads is there',
  af ? /het gekoop/.test(after) : /bought/.test(after));
check('cost per result is worked out', /66|111|83/.test(after), (after.match(/R\s?\d+[,.]\d\d/g) || []).join(' | '));

/* The join. The run was typed "Winter Sale"; the export says "winter sale".
   Without slugging they are two things nobody connects — which is the whole
   reason the links were tagged. */
check('a campaign is matched to the run that sent it out',
  af ? /1 hiervan pas by 'n lopie/.test(after) : /1 of these match a run/.test(after),
  (after.match(/\d+ (of these|hiervan)[^.]*/) || ['none'])[0]);

// A file with no money in it is not a report.
await room.locator('#report-file').setInputFiles({
  name: 'no-money.csv', mimeType: 'text/csv',
  buffer: Buffer.from('Campaign,Impressions,Clicks\nWinter,100,10', 'utf8'),
});
await p.waitForTimeout(700);
check('a file with no spend column is refused, and says why',
  af ? /Geen bestedingskolom/.test(await room.innerText()) : /No spend column/.test(await room.innerText()));

await p.screenshot({ path: shot(`adreport-${af ? 'af' : 'en'}.png`), fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
