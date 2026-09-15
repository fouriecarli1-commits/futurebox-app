/**
 * The terms, written against what the app actually does.
 *
 * Same rule as the privacy policy: every claim here is checkable in the code.
 * The credit expiry is `budgetFor` in `app/lib/credits.ts`, the refund on a
 * failed generation is `charge` in `app/lib/server/credits.ts`, and what a
 * plan actually gates is `TIER_SPECS` in `app/lib/plans.ts`. A term describing behaviour the app does not
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

/* Moved on 9 September 2026, when ElevenLabs confirmed in writing that film,
   television, radio and studio games sit outside the commercial licence this
   app's plan carries.

   Moved again on 10 September, and this one is a correction rather than an
   addition. On 9 September this page was rewritten to say "You may sell what
   you make", on the strength of ElevenLabs' answer about the ACCOUNT HOLDER's
   commercial use. Their second answer, the same day, was about members:

     "the scenario you're describing — where your end users receive and
      commercially sell AI-generated output produced under your API key — is
      a platform/B2B2C arrangement that is not explicitly covered by
      ElevenLabs' self-serve plan terms."

   So the sentence promised members a licence the supplier has said in writing
   is not theirs to rely on. Nobody has relied on it — there are no paying
   members, confirmed by Carli on 10 September — and that is exactly why it is
   fixed now rather than after launch, when changing it would owe everybody
   notice.

   What replaced it is neither "you may sell" nor "you may not". It is what is
   actually settled, which is less than the first and more than the second.
   The Enterprise agreement that would settle it properly is being asked for;
   docs/ELEVENLABS-SALES.md is that letter.

   Moved a third time on 15 September 2026, after reading the whole ElevenLabs
   terms stack -- fourteen documents, written up in docs/ELEVENLABS-TERME.md.
   Two things came out of it and both are on this page.

   The first is the OEM Terms, which nobody had read because the public site
   is unreachable from the machine this app is built on. They are the document
   that governs "bundling, making available and sublicensing" the Services,
   and their 2(B)(f) draws the line along the plan: Free, Starter, Creator and
   Pro are expressly prohibited from it, and 1(D) puts Business on the
   permitted side. FutureBox moved to Business. So the licence probably does
   reach a member after all.

   PROBABLY is the operative word, and it is why the paragraph below still
   does not say "you may sell". That reading is ours, not ElevenLabs'. Their
   support said in writing that this shape is "not explicitly covered", and a
   terms page is the wrong place to bet on our own reading of somebody else's
   contract. The letter asking them to confirm it is sent; this page changes
   the day it comes back. Under-promising costs nothing. The other way round
   is what had to be corrected on 10 September.

   The second is that the OEM Terms require four specific things to be in this
   document -- their 3(A) -- and none of them was. They are in the section
   called "The engines behind this, and what they require of you". A member
   does not need to enjoy reading it, but it has to be here and it has to be
   plain, because the alternative is a clause somebody agreed to without being
   told. */
const UPDATED = '15 September 2026';

/* Contact is a page, not an address.

   An address printed on a public page is an address that is scraped, and the
   one mailbox behind this app is the one that must not drown. /help puts the
   same message in the same inbox — with a reply-to that works — without the
   address ever being rendered anywhere a crawler can read it. That is also
   why there is no `mailto:` left in this file. */
const CONTACT_PAGE = '/help';

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
          {/* One age, not two.

              This said 13 while "Who may use this" further down said 18 with a
              parent holding the account. A legal document that contradicts
              itself about who may use the service is read against whoever
              wrote it, and 18 is the position POPIA points at: it treats
              anybody under 18 as a child, and processing a child's personal
              information generally needs a parent's consent rather than the
              child's own. */}
          <p>You need to be 18 or older to hold an account. If you are younger than that, a parent or guardian holds the account, agrees to this, and is responsible for what is made on it.</p>
        </Section>

        <Section title="What you make is yours">
          <p>The songs, recordings, videos and shows you make here belong to you. FutureBox does not take ownership of them and does not license them to anybody else.</p>
          <p>A song made with your free credits is a finished song. It is not marked, not degraded and not on loan; it is yours the same way a song made on a plan is. What a plan adds is more of them, the video engine, voice cloning and the rest — not the removal of something done to the free one.</p>
          {/* Rewritten 10 September 2026. This paragraph used to open "You may
              sell what you make", which was true of FutureBox's own account and
              not of yours. Saying less here is the correction, not caution. */}
          <p><strong className="text-white">Selling what you make: where this actually stands.</strong> The music engine behind FutureBox runs on FutureBox&apos;s own paid plan, and that plan carries a commercial licence over what is generated on it, with <strong className="text-white">no credit to the engine required</strong>. What is <em>not</em> settled is whether that licence reaches through to you. The engine&apos;s owner told us in writing on 9 September 2026 that a member of a platform selling what they made under the platform&apos;s account is &ldquo;not explicitly covered&rdquo; by the terms of the plan we are on.</p>
          <p><strong className="text-white">Where that stands as of {UPDATED}:</strong> better than it did. The engine&apos;s owner publishes a separate agreement covering exactly this &mdash; a platform bundling their service into its own and passing it on to its members &mdash; and that agreement permits it from the plan FutureBox is now on, and forbids it on the plans below. We read that as covering you. We have asked them to confirm it in writing and they have not yet answered.</p>
          <p>So we are still not going to put it flatly, because that would be us betting on our own reading of somebody else&apos;s contract and you would be the one carrying the bet. We are negotiating the written confirmation now. What we will tell you meanwhile is this: <strong className="text-white">what you make is yours, nobody else takes ownership of it</strong>, we believe the commercial licence does reach you, and the day that is in writing this page says so plainly. If you intend to release something commercially before then, ask us and we will tell you exactly where it stands rather than guess.</p>
          <p>Two further limits worth knowing, because they are real and not fine print:</p>
          <ul className="space-y-1.5 pl-5 list-disc marker:text-emerald-500">
            <li><strong className="text-white">Generated music is not guaranteed to be unique.</strong> An AI model can produce something close to what it produced for somebody else. FutureBox cannot promise originality and does not warrant that anything generated here is free of somebody else&apos;s rights.</li>
            {/* Confirmed by ElevenLabs support on 9 September 2026, in writing,
                in answer to a direct question. It is stated here rather than
                left to "satisfy yourself that you are entitled to", because a
                general warning to check does not tell somebody the one thing
                that is actually carved out. See elevenlabs.io/music-terms. */}
            <li><strong className="text-white">Film, television, radio and studio games are outside that licence.</strong> Selling the song, streaming it, and putting it in your own videos are all covered. Placing generated music in a film, a television or radio broadcast, or a studio-published game is not, and needs a separate agreement with the engine&apos;s owner. If that is where a song of yours is going, tell us before you sign anything and we will point you at the right licence.<br />
            {/* Added 15 September 2026, from the Dubbing v2 model terms, which
                carve the creator platforms out of the same restriction by
                name. It is worth saying out loud because the bullet above it
                reads more frighteningly than it is: the places a member
                actually publishes are the places that are fine. */}
            <span className="text-zinc-400">YouTube, TikTok, Instagram and the platforms like them are <strong className="text-white">not</strong> caught by this. They are named as being outside the restriction. It is the broadcast and cinema end that needs the separate licence, not your channel.</span></li>
          </ul>
          <p>Beyond those, satisfy yourself before you release anything commercially. That is your call to make and it is not one this app can make for you.</p>
        </Section>

        <Section title="What you may not do here">
          <p>These are the rules that get an account closed, and each exists because the harm is real rather than theoretical:</p>
          <ul className="space-y-1.5 pl-5 list-disc marker:text-red-500">
            <li><strong className="text-white">Clone a voice that is not yours.</strong> A voice identifies a person. Cloning one without them is impersonation whatever it was meant for. You confirm the voice is your own before a clone is made, and that confirmation is kept.</li>
            <li><strong className="text-white">Train a sound on music you do not own.</strong> Same reason, same confirmation.</li>
            <li><strong className="text-white">Upload recordings you have no right to.</strong></li>
            <li><strong className="text-white">Ask for a named person&apos;s voice or style.</strong> Prompts that name a real artist &mdash; &ldquo;in the voice of&rdquo;, &ldquo;in the style of&rdquo;, &ldquo;sounds like&rdquo; followed by somebody&apos;s name &mdash; are refused. Describe the sound instead: the tempo, the instruments, the era, the delivery. That is also how you get a result you are entitled to release.</li>
            <li>Impersonate anybody, or present a generated recording as a real person having said or sung something, or make anything built to be taken as a real recording of a real event.</li>
            <li>Use the app to make material that is illegal, that sexualises children, that incites violence against anybody, that harasses somebody, or that is a script for defrauding somebody &mdash; including anything read in the name of a bank, an insurer or an authority.</li>
            <li>Resell access, share one account among several people, or run the app through your own service without an agreement.</li>
          </ul>
          <p>Break these and the account is suspended or closed. Where the law requires it, the matter is reported.</p>
        </Section>

        <Section title="How those rules are actually enforced">
          <p>They are not only a document. Every prompt is checked on the server before it reaches an engine, by a fixed set of rules and then by a model that reads the sentence. A refused prompt costs you nothing: it is refused before any credit is taken and before anything is generated.</p>
          <ul className="space-y-1.5 pl-5 list-disc marker:text-zinc-600">
            <li><strong className="text-white">A refusal says what it refused</strong> and, where there is one, what would work instead. It is not a wall.</li>
            <li><strong className="text-white">Refusals are recorded</strong> &mdash; the rule, where it happened, the time, and the first 200 characters of what was typed. Prompts that are allowed are not recorded this way.</li>
            <li><strong className="text-white">Six refusals in thirty days stops the account generating.</strong> A prompt that merely strayed near a famous name does not count towards that; the serious categories do. Nothing is deleted, and you can write and say why it is wrong.</li>
            <li>For video, for cloning a voice, and for training a sound, a request does not go ahead at all while the check cannot be run. Those three are refused rather than waved through.</li>
          </ul>
          <p>No screen catches everything. This one will sometimes refuse something ordinary and will sometimes miss something it should have caught. When it refuses something it should not have, write and say so &mdash; that is how the rules get better rather than merely stricter.</p>
        </Section>

        {/* Added 15 September 2026. Required, not optional.

            The OEM Terms 3(A) -- the agreement that lets a platform pass an
            ElevenLabs service through to its own members -- says every End
            User "must have executed an End User Agreement that includes the
            following terms", and then lists four. This section is those four.
            Their prohibited use policy 9(n) says the same thing from the
            other side: we may not offer the service "on terms that are less
            restrictive or more permissive" than theirs.

            The temptation is to bury this in a paragraph of defined terms,
            which is what every other platform does. It is written plainly
            instead, because the whole point of a clause somebody has to agree
            to is that they could have understood it. The fourth one in
            particular -- a licence to a company the member has never heard of
            -- is the sort of thing that belongs in daylight. */}
        <Section title="The engines behind this, and what they require of you">
          <p>FutureBox does not make music or voices itself. It is built on other people&apos;s engines &mdash; <strong className="text-white">ElevenLabs</strong> for music, voices, cloning and transcription, <strong className="text-white">Anthropic</strong> for the copilot. When you generate something, what you typed or recorded goes to them, and their rules travel with it.</p>
          <p>Four things follow. They are not fine print: they are conditions of FutureBox being allowed to offer any of this, and they are written here because we are required to put them in front of you rather than merely comply with them ourselves.</p>
          <ul className="space-y-2.5 pl-5 list-decimal marker:text-emerald-500">
            <li><strong className="text-white">Their rules bind you the way they bind us.</strong> ElevenLabs&apos; terms of service and prohibited use policy govern what may be made here, and nothing on this page may be more permissive than they are. Where the list above and their policy differ, the stricter one is what is in force. Their policy is published at <span className="text-zinc-400">elevenlabs.io/use-policy</span> and it changes from time to time; the version in force is the current one.</li>
            <li><strong className="text-white">Nobody here is anybody&apos;s partner.</strong> FutureBox is not ElevenLabs&apos; agent, partner, reseller or joint venturer, and neither are you. Do not describe yourself as working with them, endorsed by them, or acting for them.</li>
            <li><strong className="text-white">ElevenLabs can enforce this agreement directly.</strong> They are a third-party beneficiary of the agreement between you and FutureBox. In plain terms: the parts of this document that protect them, they may act on themselves, without going through us.</li>
            <li><strong className="text-white">They may process what you send them.</strong> By using the parts of FutureBox that reach an engine, you grant ElevenLabs, its affiliates and its subcontractors a non-exclusive right to process and use what you send, in order to provide and support the service. What that means in practice &mdash; including that a person may listen to a recording of you, and that the licence over a cloned voice outlives our copy of it &mdash; is set out in the <Link href="/privacy" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">privacy policy</Link>. Read it before you clone your voice, not after.</li>
          </ul>
          {/* Privacy Policy section 11, 20 May 2026: "all users are strictly
              prohibited from uploading, transmitting, emailing, or otherwise
              making Voice Data from children under the age of 18 available to
              us or other users or using them for any of our Services."

              Three documents from the same company give three different ages
              -- their use policy says 13 with a parent, their reading app says
              16, this says 18 with no carve-out at all. The strictest is the
              one to build to, and for a singing app it is not a footnote: a
              child singing into the booth is exactly the case it catches. */}
          <p><strong className="text-white">Nobody under 18&apos;s voice, at all.</strong> The voice engine&apos;s own rules prohibit sending it a recording of anybody under 18 &mdash; outright, with no parental-permission exception. So on an account a parent holds for somebody younger, <strong className="text-white">the voice features are switched off</strong>: no cloning, no singing conversion, no reading in your own voice. The rest of the studio &mdash; writing, generating music, videos, the channel &mdash; works normally. This is not us being careful; it is a rule we are not allowed to waive.</p>
        </Section>

        <Section title="If somebody has used your voice, your face or your name">
          <p>You do not need an account here, and you do not need a lawyer, to have something taken down.</p>
          <p>
            Tell us on the{' '}
            <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">help page</Link>,{' '}
            with a link to what you have found and enough to show it is you. Anything that is a voice clone, a likeness or a recording of somebody who did not agree to it is taken down while it is looked at, rather than after. If it turns out to have been made from a cloned voice, that voice is deleted from the voice service as well as from here, and the account that made it is dealt with under the rules above.
          </p>
          <p>The same page takes a copyright complaint, from a rights holder or from somebody acting for one.</p>
        </Section>

        <Section title="Who may use this">
          <p>You need to be 18 or older to hold an account and to pay for a plan. If you are younger than that, a parent or guardian holds the account and is responsible for what is made on it.</p>
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
          <p>You can delete your account from inside the app. It removes your songs, videos and episodes and every file behind them, any cloned voice — from the voice service as well as from here — any trained sound, your credits, your collaborations and your profile.</p>
          <p>It cannot be undone. There is no grace period on purpose: keeping recordings of your voice for a month after you asked us to stop would be the opposite of what you asked for. If you are on a plan it is cancelled first, and if that cancellation fails nothing is deleted.</p>
          {/* Added 15 September 2026, and this is the correction that could
              embarrass us if somebody else found it first.

              Everything above is true of the voice MODEL and of OUR copies,
              and it is what the delete button actually does -- the clone is
              deleted from ElevenLabs, not merely hidden here. What it is not
              true of is the licence ElevenLabs already holds over the
              recordings that made it. Terms of service 4(d): "perpetual and
              irrevocable ... sub-licensable, through multiple tiers", over a
              member's voice by name. 4(i): a training opt-out "does not
              affect any uses of ... your Content prior to that date". DPA
              9.2.2: for a self-serve customer they reserve a right, "but
              [have] no obligation", to delete content after 180 days of
              inactivity -- the 30-day deletion commitment is enterprise-only.
              Privacy Policy 6: voice data kept up to three years after the
              last interaction.

              A member reading the two paragraphs above would reasonably
              conclude deletion is complete. It is not, and saying so costs us
              nothing we were entitled to keep. */}
          <p><strong className="text-white">What deletion does not reach.</strong> The clone is deleted, and that is real. What outlives it is a licence the voice engine already holds over the recordings you gave it: by their terms it is perpetual and cannot be withdrawn, and their own retention limit for data generated about a voice is three years after your last contact with them, not the moment you press the button. We can delete what is ours and we can tell them to delete the model, and we do both. We cannot unwind a licence somebody else already has, and we are not going to imply otherwise on this page. If that is not acceptable to you, the answer is to not clone your voice &mdash; everything else here works without it.</p>
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
          <p>This document is written in English, and the English version is the one that governs. Parts of the app are shown in Afrikaans; where a translation and this document disagree, this document is what was agreed to.</p>
          <p>
            Ask about anything in this document on the{' '}
            <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              help page
            </Link>. See also the{' '}
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
