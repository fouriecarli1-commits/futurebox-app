/**
 * Who you are buying from — the disclosures section 43 of ECTA requires.
 *
 * ── Why this page exists ─────────────────────────────────────────────────
 *
 * Everywhere else, this app prints no address. `/help` is a form that reaches
 * the one inbox with the sender's own address as reply-to, and
 * `check:security` fails the build if a mailbox or a `mailto:` gets into
 * anything the browser can reach. That is the right default for every screen
 * somebody works in, and it stays.
 *
 * The Electronic Communications and Transactions Act asks for something a form
 * cannot give: a supplier selling to South Africans must make its full name,
 * legal status, registration number, physical address, telephone number and
 * e-mail address available to a consumer *before* they transact. The usual and honest
 * resolution is not to abandon the form — it is one page that carries the
 * particulars, linked from the footer of every page, with the form still doing
 * the actual contacting.
 *
 * ── A server component, deliberately ─────────────────────────────────────
 *
 * The particulars are read from the environment on the server and rendered
 * into HTML. They never enter the client bundle, so the address is here for a
 * reader and a regulator without sitting in a JavaScript file for a scraper to
 * walk — which is what the original decision was actually protecting against.
 *
 * ── Nothing is invented ──────────────────────────────────────────────────
 *
 * The company is not registered yet. Until the variables in
 * `lib/server/entity.ts` are set, this page says so plainly. A blank list
 * would read as broken and a placeholder registration number would be a false
 * statement about a legal person; an honest gap while a company is being
 * registered is neither.
 */

import React from 'react';
import Link from 'next/link';
import { entity } from '../lib/server/entity';
import { SITE_HOST } from '../lib/brand';

/**
 * Rendered per request, not baked in at build time.
 *
 * Next pre-renders a server component with no dynamic data at build time, so
 * the particulars were read while the build ran — with the variables unset —
 * and frozen into the HTML. Setting them afterwards did nothing, silently, on
 * the one page in the app where being out of date is a legal problem rather
 * than a stale screen. Found by a browser probe, which is the only way it
 * would ever have been found.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Who you are buying from — FutureBox',
  description:
    'The supplier details South African law requires: name, legal status, registration number, address, and how to reach a person.',
};

/* Contact is still a page, not an address. The particulars below are what the
   law requires to be available; the form is what anybody should actually use,
   and it reaches the same person faster. */
const CONTACT_PAGE = '/help';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[12rem_1fr] gap-1 sm:gap-4 py-3 border-b border-zinc-800">
      <dt className="text-sm font-semibold text-zinc-400">{label}</dt>
      <dd className="text-base text-zinc-200 leading-relaxed">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
      <div className="space-y-3 text-base text-zinc-300 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Legal(): React.ReactElement {
  const who = entity();

  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <header className="space-y-3">
          <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">← FutureBox</Link>
          <h1 className="text-4xl font-black text-white tracking-tight">Who you are buying from</h1>
          <p className="text-base text-zinc-400 leading-relaxed">
            Section 43 of the Electronic Communications and Transactions Act says a supplier selling
            over the internet has to tell you who it is before you buy. This is that page. It is the
            one place in this app where an address is printed; everywhere else, writing to us goes
            through{' '}
            <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              the form on the help page
            </Link>
            , which reaches the same person and does not put an inbox in front of a crawler.
          </p>
        </header>

        <Section title="The supplier">
          {who ? (
            <dl className="border-t border-zinc-800">
              <Row label="Registered name">{who.name}</Row>
              <Row label="Legal status">{who.status}</Row>
              {/* Only where there is one. A sole proprietor has no registration
                  number, and an empty row under that label reads as something
                  withheld rather than something that does not exist. */}
              {who.registration && (
                <Row label="Registration number">{who.registration}</Row>
              )}
              {/* The address, or an honest sentence where it is not set yet.
 
                  It used to be a condition of printing ANY of this: one unset
                  variable and the whole disclosure vanished behind "the
                  company is being registered", six days after CIPC registered
                  it. Section 43(1)(b) does ask for a physical address and this
                  page is not complete without one — but a row that admits the
                  gap and says how to close it is a reader being told the
                  truth, and a page that says the company does not exist yet is
                  not. */}
              <Row label="Registered address">
                {who.address ? (
                  who.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))
                ) : (
                  <>
                    Not published on this page yet. The company is registered and its
                    registered address is on the CIPC record;{' '}
                    <Link
                      href={CONTACT_PAGE}
                      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
                    >
                      ask on the help page
                    </Link>{' '}
                    and it will be sent to you, before you buy anything.
                  </>
                )}
              </Row>
              {/* The Act asks for a telephone number and an e-mail address —
                  section 43(1)(b) and (c) — so both rows are here, and the one
                  that is not set says so instead of vanishing. A row quietly
                  missing reads as a list that was never that long; a row that
                  admits the gap is a reader being told the truth, and it is
                  also the only version that stays honest when the supplier is
                  one person who has not yet separated her own mobile number
                  from her business. */}
              <Row label="Telephone">
                {who.phone ?? (
                  <span className="text-zinc-400">
                    Not published. This is a small company run by one person, and the only number
                    it has is a private one; a business line is being arranged and will be printed
                    here. Until it is, write to the address below or use{' '}
                    <Link
                      href={CONTACT_PAGE}
                      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
                    >
                      the form on the help page
                    </Link>
                    , which is answered by a person.
                  </span>
                )}
              </Row>
              {who.email && <Row label="Email">{who.email}</Row>}
              {who.vat && <Row label="VAT number">{who.vat}</Row>}
              <Row label="Website">{SITE_HOST}</Row>
              <Row label="Writing to us">
                <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
                  The form on the help page
                </Link>
                . It reaches one person, with your own address as the reply-to.
              </Row>
              {/* The row always shows, named or not.
 
                  POPIA requires a responsible party to appoint an Information
                  Officer and register them WITH THE REGULATOR. It does not
                  require the name on a web page — so a reader needs to know
                  the role exists and how to reach it, which is a different
                  thing from knowing whose name is in the post.
 
                  Carli asked for her name off this row on 11 September. It
                  was never a legal requirement that it be here; it was a
                  variable somebody could set, and setting it was the only way
                  to make the row appear at all. Now the row appears either
                  way and the unnamed version sends people somewhere that
                  answers, which is what a reader actually wanted. */}
              <Row label="Information Officer">
                {who.informationOfficer ? (
                  <>
                    {who.informationOfficer}, for anything under POPIA. Registered with the
                    Information Regulator of South Africa.
                  </>
                ) : (
                  <>
                    Appointed and registered with the Information Regulator of South Africa, as
                    POPIA requires. For anything under POPIA — a copy of what is held about you, a
                    correction, a deletion, or a complaint —{' '}
                    <Link
                      href={CONTACT_PAGE}
                      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
                    >
                      enquire on the help page
                    </Link>{' '}
                    and it reaches them.
                  </>
                )}
              </Row>
            </dl>
          ) : (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 space-y-3">
              <p className="text-base font-bold text-amber-300">
                These details are not published yet, and that is deliberate.
              </p>
              {/* Reworded 11 September 2026. It used to say the company "is
                  being registered", which stopped being true on 5 September
                  and then kept being printed because a single unset variable
                  sent the page down this path. It now says only what is true
                  whatever is set: nothing is being claimed here, and a person
                  who asks is answered. A fallback that guesses at the state of
                  the world is a fallback that will eventually be caught
                  lying. */}
              <p>
                Nothing about the supplier is being stated on this page at the moment. A
                placeholder name or registration number on a legal page would be a false
                statement about a legal person, which is worse than an admitted gap — so
                there is a gap, and it is admitted.
              </p>
              <p>
                Until then:{' '}
                <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
                  the form on the help page
                </Link>{' '}
                reaches a person and is answered. If you need the supplier&apos;s particulars before
                you buy something, ask there and they will be sent to you.
              </p>
            </div>
          )}
        </Section>

        <Section title="What is sold here, and what it costs">
          <p>
            Monthly plans, and credits that can be bought on top of a plan. Every plan&apos;s price
            and what it includes are on the{' '}
            <Link href="/" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              pricing section of the front page
            </Link>
            , and the price shown is the full price in your own currency — there is nothing added at
            checkout.
          </p>
          <p>
            Inside the app, what a generation costs in credits is printed on the button before you
            press it, not discovered afterwards.
          </p>
        </Section>

        <Section title="Paying, and the security of it">
          <p>
            Payments are taken by Paystack, on their page. No card number, expiry date or CVV passes
            through this app or is stored by it — what comes back is a reference and a customer code.
          </p>
          <p>
            A plan renews monthly until it is stopped. You can stop it yourself in the app, on your
            account screen: press your own name in the top corner. It stops at the end of the month
            you have already paid for.
          </p>
        </Section>

        <Section title="Cancelling, and getting money back">
          <p>
            Cancelling is immediate and self-service, and there is no cancellation fee. A plan
            already paid for runs to the end of its month.
          </p>
          <p>
            Where a generation fails, the credits for it are returned automatically — that is in the
            code, in <span className="text-sm text-zinc-400">charge</span>, not a
            discretion somebody exercises.
          </p>
          <p>
            If something has gone wrong with a payment, say so on{' '}
            <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              the help page
            </Link>{' '}
            from the address you signed up with, so it can be matched to your account.
          </p>
        </Section>

        <Section title="If you have a complaint">
          <p>
            Start with{' '}
            <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              the help page
            </Link>
            . It reaches one person and it is answered.
          </p>
          <p>
            If that does not resolve it, a South African consumer can take a complaint to the
            National Consumer Commission, and anything about personal information to the Information
            Regulator of South Africa. Neither of them charges you to complain.
          </p>
        </Section>

        <Section title="The record of your transaction">
          <p>
            Every payment produces an emailed receipt to the address on your account, and your
            current plan and what is left of your credits are shown on your account screen at any
            time.
          </p>
        </Section>

        <footer className="pt-6 border-t border-zinc-800 space-y-3">
          <p className="text-sm text-zinc-500 leading-relaxed">
            This page carries the particulars required by section 43 of the Electronic Communications
            and Transactions Act 25 of 2002. The{' '}
            <Link href="/terms" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              terms
            </Link>{' '}
            and the{' '}
            <Link href="/privacy" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              privacy notice
            </Link>{' '}
            say what you agree to and what is kept.
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Written by the people who built the app rather than by a lawyer, against what the app
            actually does. That is the right starting point and it is not the finishing one.
          </p>
        </footer>
      </div>
    </main>
  );
}
