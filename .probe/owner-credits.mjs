// The operator is not metered by their own meter — and nothing else changes.
//
//   node .probe/owner-credits.mjs
//
// The risk in an exemption is that it is wider than intended. So this checks
// what is skipped and, more importantly, what is not.

process.env.OWNER_EMAIL = 'boss@futurebox.app, second@futurebox.app';

// The match itself, which is what account.ts's callerIsOwner is. Imported from
// ./owners rather than from account.ts, which drags in Supabase and a chain of
// aliased modules — the reason that function was pulled out into a file of its
// own.
const { isOwnerEmail, ownerEmails } = await import('../app/lib/server/owners.ts');
const callerIsOwner = (caller) => Boolean(caller && isOwnerEmail(caller.email));

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const owner = { id: 'o', email: 'boss@futurebox.app', tier: 'label' };
const second = { id: 's', email: 'SECOND@FutureBox.app', tier: 'label' };
const member = { id: 'm', email: 'someone@example.com', tier: 'label' };

// ── Who counts as the operator ─────────────────────────────────────────
say(callerIsOwner(owner), 'the owner is not recognised');
say(callerIsOwner(second), 'a second owner, or a different case, is not recognised');
say(!callerIsOwner(member), 'an ordinary member on the same tier reads as the owner');
say(!callerIsOwner(null), 'a signed-out caller reads as the owner');
say(!callerIsOwner({ id: 'x', email: '', tier: 'label' }), 'an empty email reads as the owner');

// A member whose address merely contains an owner's is not an owner. This is
// the substring mistake that turns an allowlist into a hole.
say(
  !callerIsOwner({ id: 'x', email: 'boss@futurebox.app.evil.com', tier: 'free' }),
  'a lookalike address passed the owner check',
);
say(
  !callerIsOwner({ id: 'x', email: 'notboss@futurebox.app', tier: 'free' }),
  'an address ending in an owner address passed the owner check',
);

// ── The list is read when it is asked for, not when the file loaded ────
say(ownerEmails().length === 2, `${ownerEmails().length} owners parsed from a two-entry list`);
say(ownerEmails()[1] === 'second@futurebox.app', 'whitespace around a comma was not trimmed');

// With no OWNER_EMAIL set, nobody is exempt. This is the case that a
// module-level constant gets wrong: it would answer from whenever the
// serverless instance happened to start.
delete process.env.OWNER_EMAIL;
say(!callerIsOwner(owner), 'somebody is exempt on an install with no owner configured');
say(ownerEmails().length === 0, 'an unset list did not read as empty');
process.env.OWNER_EMAIL = 'boss@futurebox.app';
say(callerIsOwner(owner), 'the list did not come back when the variable was set again');

// ── The exemption is one function deep ─────────────────────────────────
//
// Read rather than executed: `charge` needs a live Supabase to run, and the
// claim being checked is about where the early return sits, which is a fact
// about the file.
const source = await (await import('node:fs/promises')).readFile(
  new URL('../app/lib/server/credits.ts', import.meta.url),
  'utf8',
);
const at = source.indexOf('if (callerIsOwner(caller)) return');
say(at > 0, 'the owner exemption is not in charge() at all');
say(
  source.indexOf('const balance = await settle(caller);') > at,
  'the exemption sits after the balance is read, so it is not actually skipping the meter',
);
say(
  source.split('callerIsOwner').length - 1 === 2,
  'callerIsOwner appears more than once in credits.ts — an exemption should be in one place',
);

// And it must not have leaked into the two things that guard real money.
for (const [file, what] of [
  ['../app/lib/server/safety.ts', 'the safety gate'],
  ['../app/api/video/route.ts', 'the provider ceilings'],
]) {
  const other = await (await import('node:fs/promises')).readFile(new URL(file, import.meta.url), 'utf8');
  say(
    !/callerIsOwner\(caller\)\s*\)\s*return\s*\{\s*ok:\s*true/.test(other),
    `${what} has an owner bypass — those guard real money and real exposure`,
  );
}

console.log(
  problems.length
    ? `FAIL\n  ${problems.join('\n  ')}`
    : 'PASS — the operator skips the credit fiction and nothing else',
);
process.exit(problems.length ? 1 : 0);
