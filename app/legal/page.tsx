/**
 * Who you are buying from — section 43 of ECTA.
 *
 * ── What is printed, and what is not ─────────────────────────────────────
 *
 * The company's registered name and its legal status, and nothing about the
 * people behind it. The owner decided on 18 October 2026 that no person's
 * name, email address, telephone number, registration number or address
 * appears anywhere in the app; the further particulars the Act lists are
 * given on request, through the help page, before anybody buys.
 *
 * ── A server component, deliberately ─────────────────────────────────────
 *
 * The name is read from the environment on the server and rendered into
 * HTML. It never enters the client bundle.
 *
 * ── Nothing is invented ──────────────────────────────────────────────────
 *
 * Until `FUTUREBOX_LEGAL_NAME` is set, this page says so plainly. A
 * placeholder name would be a false statement about a legal person.
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
    'Who the supplier is, its legal status, how to reach a person, and how to ask for the further particulars South African law lists.',
};

/* Contact is a page, not an address: the form reaches a person, and the
   particulars the Act lists are sent from there on request. */
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
            over the internet has to tell you who it is before you buy. This is that page. Writing to
            us goes through{' '}
            <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              the form on the help page
            </Link>
            , which reaches a person and does not put an inbox in front of a crawler.
          </p>
        </header>

        <Section title="The supplier">
          {who ? (
            <dl className="border-t border-zinc-800">
              <Row label="Registered name">{who.name}</Row>
              <Row label="Legal status">{who.status}</Row>
              <Row label="Website">{SITE_HOST}</Row>
              {/* Only the company's name is printed. The owner's decision,
                  18 October 2026: nothing about the people behind it — no
                  person's name, no email address, no telephone number, no
                  registration number, no address — and anything further on
                  request. `lib/server/entity.ts` does not read those values
                  at all, so no later change to this page can print them. */}
              <Row label="Further particulars">
                The registration number, the registered address and a telephone number are given on
                request.{' '}
                <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
                  Ask on the help page
                </Link>{' '}
                and they are sent to you, before you buy anything.
              </Row>
              <Row label="Writing to us">
                <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
                  The form on the help page
                </Link>
                . It reaches a person, with your own address as the reply-to.
              </Row>
              {/* POPIA requires an Information Officer to be appointed and
                  registered WITH THE REGULATOR, not named on a web page. A
                  reader needs to know the role exists and how to reach it. */}
              <Row label="Information Officer">
                Appointed and registered with the Information Regulator of South Africa, as POPIA
                requires. For anything under POPIA — a copy of what is held about you, a correction,
                a deletion, or a complaint —{' '}
                <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
                  enquire on the help page
                </Link>{' '}
                and it reaches them.
              </Row>
            </dl>
          ) : (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 space-y-3">
              <p className="text-base font-bold text-amber-300">
                These details are not published yet, and that is deliberate.
              </p>
              <p>
                Nothing about the supplier is being stated on this page at the moment. A
                placeholder name on a legal page would be a false statement about a legal person,
                which is worse than an admitted gap — so there is a gap, and it is admitted.
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
          <p>
            The kids room is priced on its own, on the same pricing section: Kids Try (R59 once,
            30 kids credits), Kids Monthly (R119 a month, 65 kids credits) and Kids Plus (R229 a
            month, 135 kids credits). Kids credits are spent only in the kids room and need no plan.
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
            A monthly kids pack is stopped the same way, from the parents page in the kids room:
            one press, no fee, and the kids credits already bought stay on the balance.
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
