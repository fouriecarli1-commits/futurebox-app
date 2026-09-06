/**
 * The four letters this app sends a person, in their own language.
 *
 * ── Why the wording is here and not in `i18n.tsx` ────────────────────────
 *
 * That dictionary is loaded by the browser. These are written on the server,
 * for an inbox, and shipping a receipt's wording to every visitor's browser
 * would be paying for it on every page load so that it can be used once.
 *
 * The cost is that `check:afrikaans` cannot see them. So both languages sit
 * side by side in one object per letter — a missing translation is visible by
 * reading, because the gap is the shape of the object.
 *
 * ── On knowing which language ────────────────────────────────────────────
 *
 * A person picks a language in the browser and the server never hears about
 * it. So it is passed with the thing that triggers the letter, and where it
 * genuinely is not known — a subscription Paystack renews on its own, months
 * later, with nobody present — it falls back to English rather than guessing.
 *
 * ── On the tone ──────────────────────────────────────────────────────────
 *
 * Short, and no marketing. A receipt is a document somebody files. A
 * cancellation is the last thing they will read from us, and the temptation to
 * put a "before you go, here's 20% off" in it is exactly the thing that turns
 * a person who might come back into a person who marks it as spam.
 */

export type Lang = 'en' | 'af';

interface Both {
  readonly subject: { en: string; af: string };
  readonly body: { en: string; af: string };
}

const pick = <T>(both: { en: T; af: T }, lang: Lang): T => (lang === 'af' ? both.af : both.en);

/** A rand amount from Paystack's cents. Their integer, our formatting. */
export function rands(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}

/* ── Welcome ─────────────────────────────────────────────────────────────
   Sent once, when an account first exists. Deliberately not a tour: it says
   what the app is for, the one thing that is genuinely unusual about it, and
   where the work lives. Somebody who just signed up is already in the app —
   a letter that tells them to come back to it is a letter written for the
   sender. */
const WELCOME: Both = {
  subject: {
    en: 'Welcome to FutureBox',
    af: 'Welkom by FutureBox',
  },
  body: {
    en: `You are in.

FutureBox is a studio: write a song and sing on it yourself, clone your voice
once and have it read anything, put a video to it, and write the adverts that
sell it.

Two things worth knowing on the first day.

Everything you make is kept on the device you made it on. That is deliberate —
it is nobody else's to read — but it does mean clearing your browser data
loses it, and another phone never had it. Download anything you want to keep.

Nothing here pretends. Every release says what made it, every button says what
it costs before you press it, and where something is not connected yet, the
room tells you so instead of failing quietly.`,
    af: `Jy is in.

FutureBox is ’n ateljee: skryf ’n liedjie en sing self daarop, kloon jou stem
een keer en laat dit enigiets lees, sit ’n video daarby, en skryf die
advertensies wat dit verkoop.

Twee dinge wat die eerste dag die moeite werd is om te weet.

Alles wat jy maak word gehou op die toestel waarop jy dit gemaak het. Dit is
doelbewus — dit is niemand anders s’n om te lees nie — maar dit beteken wel dat
om jou blaaier se data uit te vee dit verloor, en ’n ander foon het dit nooit
gehad nie. Laai af wat jy wil hou.

Niks hier maak asof nie. Elke vrystelling sê wat dit gemaak het, elke knoppie
sê wat dit kos voordat jy dit druk, en waar iets nog nie gekoppel is nie, sê
die kamer dit eerder as om stil te misluk.`,
  },
};

export function welcomeLetter(lang: Lang): { subject: string; text: string } {
  return { subject: pick(WELCOME.subject, lang), text: pick(WELCOME.body, lang) };
}

/* ── Receipt ─────────────────────────────────────────────────────────────
   The one letter that has to be right. It is a financial document: it says
   what was paid, for what, when, and against which reference, because that
   reference is what any dispute is settled with. */
export interface Paid {
  readonly what: string;
  readonly cents: number;
  readonly reference: string;
  readonly when: Date;
  /** True where this was Paystack renewing a subscription on its own. */
  readonly renewal?: boolean;
}

export function receiptLetter(paid: Paid, lang: Lang): { subject: string; text: string } {
  const amount = rands(paid.cents);
  const date = paid.when.toISOString().slice(0, 10);

  const en = `${paid.renewal ? 'Your subscription renewed.' : 'Thank you — your payment went through.'}

  What        ${paid.what}
  Amount      ${amount}
  Date        ${date}
  Reference   ${paid.reference}

Keep this for your records. If anything looks wrong, reply to this email with
the reference above and it can be traced.${
    paid.renewal
      ? `

You can cancel any time from Appearance → your plan, inside the app. Cancelling
stops the next charge; it does not end the month you have already paid for.`
      : ''
  }`;

  const af = `${paid.renewal ? 'Jou intekening het hernu.' : 'Dankie — jou betaling het deurgegaan.'}

  Wat         ${paid.what}
  Bedrag      ${amount}
  Datum       ${date}
  Verwysing   ${paid.reference}

Hou dit vir jou rekords. As iets verkeerd lyk, antwoord op hierdie e-pos met
die verwysing hierbo en dit kan nagespoor word.${
    paid.renewal
      ? `

Jy kan enige tyd kanselleer by Voorkoms → jou pakket, binne die app. Kansellasie
stop die volgende heffing; dit beëindig nie die maand waarvoor jy reeds betaal
het nie.`
      : ''
  }`;

  return {
    subject: pick(
      {
        en: `Receipt — ${amount} — ${paid.reference}`,
        af: `Kwitansie — ${amount} — ${paid.reference}`,
      },
      lang,
    ),
    text: lang === 'af' ? af : en,
  };
}

/* ── Cancellation ────────────────────────────────────────────────────────
   The last thing they read from us. No offer, no "are you sure", no survey.
   It confirms what happened, says exactly when access ends so nobody is
   surprised, and leaves the door open without leaning on it. */
export function cancelledLetter(
  endsOn: Date | null,
  lang: Lang,
): { subject: string; text: string } {
  const until = endsOn ? endsOn.toISOString().slice(0, 10) : null;

  const en = `We are sorry to see you go, and thank you for the time you spent
making things here.

Your subscription is cancelled and there is nothing further to pay.

${
  until
    ? `You keep everything you are on until ${until} — you have paid for that month
and it is yours.`
    : `Your plan winds down at the end of the period you have already paid for.`
}

Whatever you made stays on your device; cancelling does not touch it. Download
anything you want to keep before you clear your browser.

Your account stays exactly as it is, so coming back is one sign-in and nothing
else. We hope to see you again before long.`;

  const af = `Ons is jammer om jou te sien gaan, en dankie vir die tyd wat jy hier
gemaak het.

Jou intekening is gekanselleer en daar is niks verder om te betaal nie.

${
  until
    ? `Jy hou alles waarop jy is tot ${until} — jy het vir daardie maand betaal en
dit is joune.`
    : `Jou pakket loop uit aan die einde van die tydperk waarvoor jy reeds betaal het.`
}

Wat jy ook al gemaak het bly op jou toestel; kansellasie raak dit nie. Laai af
wat jy wil hou voordat jy jou blaaier skoonmaak.

Jou rekening bly presies soos dit is, so om terug te kom is een intekening en
niks meer nie. Ons hoop om jou gou weer te sien.`;

  return {
    subject: pick(
      /* The subject says the fact, because a letter about money that hides
         what it is about is a letter somebody opens anxiously. The warmth is
         in the first line, where it belongs — not in a subject line that has
         to be findable in a search six months later. */
      { en: 'Your FutureBox subscription is cancelled', af: 'Jou FutureBox-intekening is gekanselleer' },
      lang,
    ),
    text: lang === 'af' ? af : en,
  };
}
