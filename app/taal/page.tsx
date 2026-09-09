'use client';

/**
 * Why the app is in the language it is in, on the phone it is wrong on.
 *
 * ── Why this page exists ─────────────────────────────────────────────────
 *
 * Carli, five separate times: she chooses Afrikaans on the sign-in page and
 * lands in English. On a laptop it works. On the app installed on her phone it
 * does not. Three fixes have gone in — a React ref, then localStorage, then a
 * cookie — and each was a different guess about which of four things fails on
 * her device.
 *
 * The guessing is the fault. Nothing in this app can be looked at from her
 * side, so every round has been a theory built on a sentence, and three of
 * them were wrong. A person holding the broken phone is the only one who can
 * see what is actually happening, and until now there was nothing for them to
 * look at.
 *
 * So this prints the four inputs and says which one won. It turns "die taal is
 * nogsteeds 'n issue" into a screenshot that names the cause.
 *
 * ── Deliberately plain, and deliberately not behind a key ────────────────
 *
 * `/api/allowance` and `/api/kits/setup` are guarded because they report
 * money. This reports which of two languages a browser preferred, which is
 * neither secret nor worth guarding — and a page that needs a secret typed on
 * a phone is a page that does not get opened.
 *
 * It reads nothing it is not already holding: everything below is recorded by
 * `LanguageProvider` on the load that just happened. No account address, no
 * token, no key.
 */

import React from 'react';
import Link from 'next/link';
import { LANGUAGES, useLang } from '../lib/i18n';

function Row({
  label,
  value,
  note,
  loud = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
  readonly loud?: boolean;
}): React.ReactElement {
  return (
    <div className="border-t border-zinc-800 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm text-zinc-400">{label}</span>
        <span
          className={`text-sm font-semibold tabular-nums ${loud ? 'text-emerald-300' : 'text-white'}`}
        >
          {value}
        </span>
      </div>
      {note && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{note}</p>}
    </div>
  );
}

export default function TaalPage(): React.ReactElement {
  const { lang, setLang, sources } = useLang();
  const af = lang === 'af';

  /* Written out rather than printed as a code, because the person reading this
     is holding a phone and not a debugger. "leeg" and "geblokkeer" are two
     different answers and the difference is the whole point: one is a browser
     that has nothing stored, the other is a browser that refuses to store. */
  const say = (value: string | null): string => {
    if (value === null) return af ? 'leeg' : 'empty';
    if (value === 'blocked') return af ? 'geblokkeer' : 'blocked';
    if (value === 'unasked') return af ? 'nog nie gevra nie' : 'not asked yet';
    if (value === 'none') return af ? 'niks gestoor nie' : 'nothing stored';
    if (value === 'failed') return af ? 'kon nie vra nie' : 'could not ask';
    return value;
  };

  const WON: Record<string, { en: string; af: string }> = {
    address: {
      en: 'the choice carried through the sign-in',
      af: 'die keuse wat deur die intekening saamgedra is',
    },
    storage: { en: 'what this browser had stored', af: 'wat hierdie blaaier gestoor het' },
    cookie: { en: 'the cookie', af: 'die koekie' },
    account: { en: 'the account', af: 'die rekening' },
    locale: {
      en: 'the phone’s own language setting — a guess, because nothing else had an answer',
      af: 'die foon se eie taalinstelling — ’n raaiskoot, want niks anders het geantwoord nie',
    },
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10 text-zinc-200">
      <h1 className="text-2xl font-black tracking-tight text-white">
        {af ? 'Hoekom is die toep in hierdie taal?' : 'Why is the app in this language?'}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        {af
          ? 'Hierdie bladsy wys wat elke plek gesê het toe hierdie bladsy gelaai het, en watter een gewen het. Neem ’n skermskoot hiervan as die taal verkeerd is — dit sê presies waar dit verlore raak.'
          : 'This page shows what each place said when this page loaded, and which one won. Screenshot it if the language is wrong — it says exactly where it is being lost.'}
      </p>

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 pb-1 pt-2">
        <Row
          label={af ? 'Wat nou op die skerm is' : 'What is on screen now'}
          value={lang === 'af' ? 'Afrikaans' : 'English'}
          loud
        />
        <Row
          label={af ? 'Wat dit besluit het' : 'What decided it'}
          value={af ? WON[sources.won].af : WON[sources.won].en}
          loud
        />
      </section>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-zinc-500">
        {af ? 'Wat elke plek gesê het' : 'What each place said'}
      </h2>
      <section className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 pb-1 pt-2">
        <Row
          label={af ? '1. Saamgedra deur die intekening' : '1. Carried through the sign-in'}
          value={say(sources.address)}
          note={
            af
              ? 'Wanneer jy met Google, Apple of Facebook inteken, gaan die blaaier weg en kom terug. Die keuse ry saam in die adres, want dit is die enigste kanaal wat daardie rit oorleef.'
              : 'Signing in with Google, Apple or Facebook navigates away and back. The choice rides along in the address, because that is the only channel that survives the trip.'
          }
        />
        <Row
          label={af ? '2. Gestoor in hierdie blaaier' : '2. Stored in this browser'}
          value={say(sources.storage)}
          note={
            sources.storage === 'blocked'
              ? af
                ? 'Hierdie blaaier weier om iets te stoor. Dít is waarskynlik jou hele probleem — en dis presies hoekom die koekie en die adres ook gebruik word.'
                : 'This browser refuses to store anything. That is likely the whole problem — and it is exactly why the cookie and the address are used as well.'
              : af
                ? 'Word geskryf sodra jy ’n taal kies.'
                : 'Written the moment you choose a language.'
          }
        />
        <Row label={af ? '3. Die koekie' : '3. The cookie'} value={say(sources.cookie)} />
        <Row
          label={af ? '4. Die rekening' : '4. The account'}
          value={say(sources.account)}
          note={
            af
              ? 'Word net gevra as hierdie toestel niks te sê het nie. ’n Keuse wat jy hier gemaak het, word nooit deur die rekening oorheers nie.'
              : 'Asked only when this device has nothing to say. A choice made here is never overruled by the account.'
          }
        />
        <Row
          label={af ? 'Die foon se eie instelling' : 'The phone’s own setting'}
          value={sources.locale || (af ? 'onbekend' : 'unknown')}
          note={
            af
              ? '’n Raaiskoot, nie ’n keuse nie. Dit besluit net wat jy sien voordat jy al ooit gekies het.'
              : 'A guess, not a choice. It only decides what you see before you have ever chosen.'
          }
        />
        <Row
          label={af ? 'Loop as ’n geïnstalleerde toep' : 'Running as an installed app'}
          value={sources.installed ? (af ? 'ja' : 'yes') : af ? 'nee, ’n blaaier-oortjie' : 'no, a browser tab'}
          note={
            sources.installed
              ? af
                ? '’n Toep op die tuisskerm en die blaaier deel nie noodwendig dieselfde gestoorde goed nie. Dis waarom die taal hier anders kan werk as op die rekenaar.'
                : 'A home-screen app and the browser do not necessarily share what is stored. That is why the language can behave differently here than on a computer.'
              : undefined
          }
        />
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {LANGUAGES.map((entry) => (
          <button
            key={entry.code}
            type="button"
            onClick={() => setLang(entry.code)}
            className={`min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold ${
              lang === entry.code
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400'
            }`}
          >
            {entry.native}
          </button>
        ))}
        <Link
          href="/"
          className="min-h-[44px] inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm font-semibold text-zinc-400"
        >
          {af ? 'Terug' : 'Back'}
        </Link>
      </div>
    </main>
  );
}
