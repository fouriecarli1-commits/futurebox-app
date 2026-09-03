import { enter } from './enter.mjs';
const { browser, page, problems } = await enter();
console.log('URL:', page.url());
const body = (await page.locator('body').innerText()).replace(/\n+/g, ' | ');
console.log('SIGNED IN?', /Landing|Start free/i.test(body) ? 'NO — still on landing' : 'yes');
console.log('TEXT:', body.slice(0, 800));
console.log('PROBLEMS:', problems.length ? problems : 'none');
await browser.close();
