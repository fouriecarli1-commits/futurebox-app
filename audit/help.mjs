/** The help page: both halves, both languages, and the form that reaches a person. */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

const PORT = process.argv[2] || '3005';
const af = process.argv[3] === 'af';

// A phone, because that is where somebody stuck actually asks.
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

// The language is remembered in localStorage, so it is set before the page runs.
await p.addInitScript((lang) => {
  try { window.localStorage.setItem('futurebox.lang.v1', lang); } catch {}
}, af ? 'af' : 'en');

let sent = null;
await p.route('**/api/enquiry', async (route) => {
  sent = JSON.parse(route.request().postData() || '{}');
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sent: true }) });
});
await p.route('**/api/help', async (route) => {
  if (route.request().method() === 'GET') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true, enquiries: 'futureboxapp@gmail.com' }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: af ? "'n Musiekvideo kos 15 krediete per vyf sekondes." : 'A music video costs 15 credits per five seconds.' }) });
});

await p.goto(`http://localhost:${PORT}/help`, { waitUntil: 'networkidle' });
const text = await p.locator('body').innerText();

check('the enquiries address is printed', /futureboxapp@gmail\.com/.test(text));
check('the assistant half is there', af ? /Vra oor enigiets/.test(text) : /Ask about anything/.test(text), text.slice(0, 200));
check('the person half is there', af ? /skryf aan .n mens/i.test(text) : /write to a person/i.test(text));
check('the policy pages are linked', (await p.locator('a[href="/terms"]').count()) > 0 && (await p.locator('a[href="/privacy"]').count()) > 0);

// Ask something.
await p.locator('#help-question').fill(af ? 'Wat kos n musiekvideo?' : 'What does a music video cost?');
await p.locator('button[aria-label]').filter({ hasText: /Vra|Ask/ }).first().click();
await p.waitForTimeout(900);
const after = await p.locator('body').innerText();
check('the answer comes back', /15/.test(after));

// Every word on it, against the colour actually behind it. Same measurement
// as audit/contrast.mjs, which only walks the studio's rooms.
const contrast = await p.evaluate(() => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const opaque = (el) => {
    let node = el;
    while (node) {
      const parts = (getComputedStyle(node).backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
      if (parts.length >= 3 && (parts.length < 4 || parts[3] > 0.85)) return parts.slice(0, 3);
      node = node.parentElement;
    }
    return [255, 255, 255];
  };
  const out = [];
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim()).join(' ');
    if (!text) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || Number(style.opacity) < 0.5) continue;
    const fg = parse(style.color);
    if (fg.length < 3) continue;
    const a = lum(fg), b = lum(opaque(el));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(style.fontSize);
    const need = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
    out.push({ ratio: Math.round(ratio * 100) / 100, need, text: text.slice(0, 40) });
  }
  return out;
});
const dim = contrast.filter((one) => one.ratio < one.need);
check(
  `every one of ${contrast.length} text nodes clears AA`,
  dim.length === 0,
  dim.slice(0, 4).map((one) => `${one.ratio}:1 "${one.text}"`).join(' | '),
);

// Write to a person.
await p.locator('#help-email').fill('toets@voorbeeld.co.za');
await p.locator('#help-note').fill(af ? 'My rekening werk nie en ek kan nie inteken nie.' : 'My account will not let me sign in.');
await p.locator('button').filter({ hasText: af ? /^Stuur dit/ : /^Send it/ }).first().click();
await p.waitForTimeout(900);
const done = await p.locator('body').innerText();
check('it confirms it was sent', af ? /Gestuur/.test(done) : /Sent\./.test(done));
check('the answer already given is carried into the enquiry', Boolean(sent?.tried && /15/.test(sent.tried)));
check('the address typed is the one sent', sent?.email === 'toets@voorbeeld.co.za');

// The house rules the rest of the app is held to.
const small = await p.evaluate(() => {
  /* A link inside a sentence is not a tap target to size — it is a word, and
     padding it to 44px would break the line it is set in. The rule is for
     controls standing on their own: buttons, fields, and links that are not
     part of running prose. `closest('p')` is what separates them. */
  const bad = [];
  for (const el of document.querySelectorAll('button, a, input, textarea')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (el.tagName === 'A' && el.closest('p')) continue;
    // The footer is the site's, not this page's, and is audited with the app.
    if (el.closest('footer')) continue;
    if (r.width < 44 || r.height < 44) bad.push(`${el.tagName}:${(el.textContent || el.id || '').trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return bad;
});
check('no tap target under 44px', small.length === 0, small.join(' | '));

const unboxed = await p.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('button')) {
    const s = getComputedStyle(el);
    const boxed = s.borderStyle !== 'none' || s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.backgroundImage !== 'none';
    if (!boxed) bad.push((el.textContent || '').trim().slice(0, 24));
  }
  return bad;
});
check('every button has a box', unboxed.length === 0, unboxed.join(' | '));

const wide = await p.evaluate(() => document.documentElement.scrollWidth);
check('nothing pushes the page wider than the phone', wide <= 390, `${wide}px`);

const unnamed = await p.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('button, input, textarea')) {
    const named = (el.textContent || '').trim() || el.getAttribute('aria-label') || (el.id && document.querySelector(`label[for="${el.id}"]`));
    if (!named) bad.push(el.tagName + (el.id ? `#${el.id}` : ''));
  }
  return bad;
});
check('every control is named', unnamed.length === 0, unnamed.join(' | '));

await p.screenshot({ path: `audit/help-${af ? 'af' : 'en'}.png`, fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
