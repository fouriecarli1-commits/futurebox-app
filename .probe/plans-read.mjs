/** The price reader, run against the real plans.ts and against a broken one. */
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

// What the real file says, read the way the app itself reads it.
const source = await readFile('app/lib/plans.ts', 'utf8');
const want = {};
for (const tier of ['maker', 'studio', 'label']) {
  const block = new RegExp(`\\b${tier}:\\s*\\{([\\s\\S]*?)\\n  \\},`).exec(source);
  want[tier] = Number(/\brand:\s*([0-9_]+)/.exec(block[1])[1].replace(/_/g, ''));
}
say(want.maker === 149 && want.studio === 349 && want.label === 749,
  `read ${JSON.stringify(want)} instead of 149/349/749`);

// The script must print those same three, and stop before charging anything
// when the key is missing.
const bare = await run('node', ['scripts/paystack-plans.mjs'], {
  env: { ...process.env, PAYSTACK_SECRET_KEY: '' },
}).catch((error) => error);
say(bare.code === 1, 'the script did not stop without a key');
say(/PAYSTACK_SECRET_KEY/.test(bare.stderr ?? ''), 'it did not say which key was missing');

// And with a key but an unreadable plans.ts it must stop, not guess.
const dir = await mkdtemp(join(tmpdir(), 'plans-'));
await mkdir(join(dir, 'app', 'lib'), { recursive: true });
await mkdir(join(dir, 'scripts'), { recursive: true });
await writeFile(join(dir, 'app', 'lib', 'plans.ts'), 'export const TIER_SPECS = {};\n');
await writeFile(join(dir, 'scripts', 'paystack-plans.mjs'), await readFile('scripts/paystack-plans.mjs', 'utf8'));
const broken = await run('node', [join(dir, 'scripts', 'paystack-plans.mjs')], {
  env: { ...process.env, PAYSTACK_SECRET_KEY: 'sk_test_not_a_real_key' },
}).catch((error) => error);
say(broken.code !== 0, 'a plans.ts with no prices did not stop the script');
say(/Could not find/.test(`${broken.stderr ?? ''}${broken.stdout ?? ''}`),
  `it stopped, but not with a reason: ${(broken.stderr ?? '').slice(0, 120)}`);

console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);
