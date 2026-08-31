/**
 * The terms, written against what the app actually does.
 *
 * Same rule as the privacy policy: every claim here is checkable in the code.
 * The credit expiry is `budgetFor` in `app/lib/credits.ts`, the watermark on a
 * free song is `markBlob`, the refund on a failed generation is `charge` in
 * `app/lib/server/credits.ts`. A term describing behaviour the app does not
 * have is a promise you lose an argument over.
 *
 * One thing this is not: legal advice, or a document a lawyer has read. It is
 * an honest description of the arrangement, written by the people who built
 * the thing. That is the right starting point and it is not the finishing one
 * — the note at the foot says so rather than leaving it implied.
 *
 * A server component, so a reviewer or a crawler gets the whole text from one
 * request without running any JavaScript.
 */

import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms — FutureBox',
  description: 'What you agree to when you use FutureBox, and what it agrees to.',
};

const UPDATED = '31 August 2026';
const CONTACT = 'admin@futurebox.app';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
      <div className="space-y-3 text-base text-zinc-300 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Terms(): React.ReactElement {
  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <header className="space-y-3">
          <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">← FutureBox</Link>
          <h1 className="text-4xl font-black text-white tracking-tight">Terms</h1>
          <p className="text-base text-zinc-400 leading-relaxed">
            What you agree to by using FutureBox, and what FutureBox agrees to. Last updated {UPDATED}.
          </p>
        </header>

        <Section title="What this is">
          <p>FutureBox is a studio: you write songs with AI, sing on them yourself, clone your voice to read a podcast, and put a video to them. An account is free to open and you can use a real part of it without paying.</p>
          <p>You need to be 13 or older. If you are under 18, an adult responsible for you should read this first.</p>
        </Section>

        <Section title="What you make is yours">
          <p>The songs, recordings, videos and shows you make here belong to you. FutureBox does not take ownership of them and does not license them to anybody else.</p>
          <p>Two limits worth knowing, because they are real and not fine print:</p>
          <ul className="space-y-1.5 pl-5 list-disc marker:text-emerald-500">
            <li><strong className="text-white">A free song carries a watermark</strong> — an audible mark in the file. It is yours to keep and share; it is not a clean master. A plan removes it.</li>
            <li><strong className="text-white">Generated music is not guaranteed to be unique.</strong> An AI model can produce something close to what it produced for somebody else. FutureBox cannot promise originality and does not warrant that anything generated here is free of somebody else&apos;s rights.</li>
          </ul>
          <p>Before releasing anything commercially, satisfy yourself that you are entitled to. That is your call to make and it is not one this app can make for you.</p>
        </Section>

        <Section title="What you may not do here">
          <p>These are the rules that get an account closed, and each exists because the harm is real rather than theoretical:</p>
          <ul className="space-y-1.5 pl-5 list-disc marker:text-red-500">
            <li><strong className="text-white">Clone a voice that is not yours.</strong> A voice identifies a person. Cloning one without them is impersonation whatever it was meant for. You confirm the voice is your own before a clone is made, and that confirmation is kept.</li>
            <li><strong className="text-white">Train a sound on music you do not own.</strong> Same reason, same confirmation.</li>
            <li><strong className="text-white">Upload recordings you have no right to.</strong></li>
            <li>Impersonate anybody, or present a generated recording as a real person having said or sung something.</li>
            <li>Use the app to make material that is illegal, or that sexualises children, or that harasses somebody.</li>
            <li>Resell access, share one account among several people, or run the app through your own service without an agreement.</li>
          </ul>
          <p>Break these and the account is suspended or closed. Where the law requires it, the matter is reported.</p>
        </Section>

        <Section title="Credits, plans and what expires">
          <p>Generating costs credits. A plan includes an allowance every month; a top-up pack is bought separately.</p>
          <ul className="space-y-1.5 pl-5 list-disc marker:text-emerald-500">
            <li><strong className="text-white">A month&apos;s allowance is for that month.</strong> It does not roll over, and it is granted on your first visit of the month rather than by a clock.</li>
            <li><strong className="text-white">Bought credits do not expire</strong> while your account exists, and are used before the month&apos;s allowance.</li>
            <li><strong className="text-white">A failed generation is refunded.</strong> Credits are taken before the work is asked for and given back if it does not happen. If you believe something was charged and not delivered, write and it will be put right.</li>
            <li>A top-up pack costs more per credit than a plan does. That is stated where the packs are shown; the plan is the cheaper way to get credits every month.</li>
          </ul>
        </Section>

        <Section title="Paying, and stopping">
          <p>Plans are monthly and renew until you cancel. Payments are taken by Paystack; no card details pass through FutureBox.</p>
          <p><strong className="text-white">Cancel any time, from inside the app.</strong> A month you have already paid for runs to its end — it is not refunded and it is not cut short. Nothing more is charged after that.</p>
          <p>If a price changes, anybody on a plan is told by email before it applies to them, and can cancel first.</p>
          <p>South African consumer law gives you rights that this document cannot take away, including in respect of goods and services that are not as described. Nothing here limits them.</p>
        </Section>

        <Section title="Deleting your account">
          <p>You can delete your account from inside the app. It removes your songs and their audio, any cloned voice — from the voice service as well as from here — any trained sound, your credits, your collaborations and your profile.</p>
          <p>It cannot be undone. There is no grace period on purpose: keeping recordings of your voice for a month after you asked us to stop would be the opposite of what you asked for. If you are on a plan it is cancelled first, and if that cancellation fails nothing is deleted.</p>
        </Section>

        <Section title="What FutureBox does not promise">
          <p>The app is provided as it is. It is not promised to be available without interruption, and a generation is not promised to be good, unique, or fit for any particular purpose.</p>
          <p>Parts of it depend on services run by other people — ElevenLabs for music and voices, Anthropic for the copilot, Supabase, Vercel, Paystack. If one of them is down or changes what it offers, the part of FutureBox that uses it is affected, and that is outside anyone&apos;s control here.</p>
          <p>Where the law allows a limit, FutureBox&apos;s liability to you is limited to what you have paid it in the twelve months before whatever went wrong. Nothing here limits liability for death, personal injury, fraud, or anything else the law does not permit to be limited.</p>
        </Section>

        <Section title="Suspending an account">
          <p>An account can be suspended or closed for breaking the rules above, for using the app in a way that costs money to serve and was obviously not intended, or where the law requires it. Where it is fair to do so you are told why and given a chance to answer.</p>
        </Section>

        <Section title="Changes to these terms">
          <p>If these change in a way that affects you, the date at the top changes and anybody with an account is told by email before it takes effect. Carrying on using the app after that is how you accept them; if you would rather not, delete the account.</p>
        </Section>

        <Section title="Law, and getting hold of us">
          <p>South African law applies, and the courts of South Africa have jurisdiction.</p>
          <p>
            Write to{' '}
            <a href={`mailto:${CONTACT}`} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              {CONTACT}
            </a>{' '}
            about anything in this document. See also the{' '}
            <Link href="/privacy" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              privacy policy
            </Link>
            , which covers what is kept and who sees it.
          </p>
        </Section>

        <p className="text-sm text-zinc-600 leading-relaxed border-t border-zinc-800 pt-6">
          Written by the people who built FutureBox, describing what it actually does. It has not been
          reviewed by a lawyer. Before taking payments at scale, have someone qualified read it —
          particularly the liability and consumer-law sections, which are the ones that matter when
          something goes wrong.
        </p>

        <footer className="pt-2">
          <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">← Back to FutureBox</Link>
        </footer>
      </div>
    </main>
  );
}
