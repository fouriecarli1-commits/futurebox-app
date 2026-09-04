/**
 * Who actually sends a scheduled post, and the one that can today.
 *
 * ── The interface exists before the connectors do, on purpose ────────────
 *
 * Every platform needs its own developer account, its own client id and
 * secret, and this app's address on somebody else's redirect list. Google,
 * Meta and TikTok each take days to weeks to approve one, and TikTok's direct
 * posting needs an audit that can be refused outright.
 *
 * None of that changes the shape of this file. A connector is a function that
 * takes a row and answers sent, failed or not-now, and the worker knows
 * nothing else about it — so YouTube arriving is one new file and one new
 * value in the `handler` check on `scheduled_posts`, not a rewrite of the
 * queue.
 *
 * ── Why 'remind' is a real handler and not a placeholder ─────────────────
 *
 * Because it is the honest thing this can do with nobody's permission, and it
 * is most of the value. A posting plan on a screen is read once; the same plan
 * arriving in somebody's inbox on Tuesday at six is the difference between a
 * plan and a document about a plan. It works today, for every platform, and it
 * keeps working for the ones that never get approved.
 */

import { accountFor, send } from '../email';

/** One row of `scheduled_posts`, as the worker hands it over. */
export interface DuePost {
  readonly id: string;
  readonly owner: string;
  readonly platform: string;
  readonly handler: string;
  readonly caption: string;
  readonly media_path: string;
  readonly due_at: string;
  readonly attempts: number;
}

export type Outcome =
  /** It went. */
  | { readonly ok: true }
  /**
   * It did not, and it is worth trying again — a service being down, a token
   * that needs refreshing. The row goes back to 'due' and keeps its attempt.
   */
  | { readonly ok: false; readonly again: true; readonly why: string }
  /**
   * It did not, and it never will — a deleted file, a refused post, a platform
   * that is not connected. The row is marked failed so nobody waits for it.
   */
  | { readonly ok: false; readonly again: false; readonly why: string };

export type Handler = (post: DuePost) => Promise<Outcome>;

/** When it was due, in words somebody reading an email will recognise. */
function when(iso: string, lang: 'en' | 'af'): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleString(lang === 'af' ? 'af-ZA' : 'en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

function letterFor(post: DuePost, lang: 'en' | 'af'): { subject: string; text: string } {
  const platform = post.platform;
  const at = when(post.due_at, lang);

  if (lang === 'af') {
    return {
      subject: `Tyd om op ${platform} te plaas`,
      text: [
        `Dit is die tyd wat jy gekies het \u2014 ${at}.`,
        '',
        `Jy het beplan om nou iets op ${platform} te sit.`,
        '',
        ...(post.caption
          ? ['Die woorde wat jy geskryf het:', '', post.caption, '']
          : ['Jy het geen woorde vir hierdie een neergeskryf nie.', '']),
        post.media_path
          ? 'Die l\u00eaer is by jou werk in die app \u2014 maak dit oop, laai dit af, en sit dit op.'
          : 'Daar is geen l\u00eaer aan hierdie een nie.',
        '',
        `FutureBox kan nog nie self op ${platform} plaas nie. Dit vereis \u2019n ontwikkelaarrekening en goedkeuring by ${platform} self, wat weke vat. Tot dan stuur dit hierdie herinnering op presies die oomblik wat jy gekies het, wat die deel is wat regtig saak maak.`,
      ].join('\n'),
    };
  }

  return {
    subject: `Time to post on ${platform}`,
    text: [
      `This is the time you chose \u2014 ${at}.`,
      '',
      `You planned to put something on ${platform} now.`,
      '',
      ...(post.caption
        ? ['The words you wrote:', '', post.caption, '']
        : ['You did not write any words for this one.', '']),
      post.media_path
        ? 'The file is with your work in the app \u2014 open it, download it, and put it up.'
        : 'There is no file attached to this one.',
      '',
      `FutureBox cannot post to ${platform} for you yet. That needs a developer account and approval from ${platform} itself, which takes weeks. Until then it sends this at exactly the moment you chose, which is the part that actually matters.`,
    ].join('\n'),
  };
}

/**
 * Tell the person it is time, with what they planned to say.
 *
 * Reuses the letter machinery the rest of the app already sends through, which
 * means it is deduped by key, never throws, and lands in the same log as
 * everything else.
 */
const remind: Handler = async (post) => {
  const account = await accountFor(post.owner);
  if (!account) {
    // No address on the account is not something a retry fixes.
    return { ok: false, again: false, why: 'no address on the account' };
  }
  const sent = await send({
    to: account.email,
    kind: 'scheduled_post',
    /* Keyed on the row, so a worker that runs twice over the same post — a
       cron retry after a timeout is ordinary — sends one email rather than
       two. The queue's own claim already prevents most of this; the dedupe is
       what covers the rest. */
    once: `post:${post.id}`,
    ...letterFor(post, account.lang),
  });
  /* `send` answers with an object, not a boolean. Checking it for truthiness
     — which is what this did first — reports every reminder as delivered,
     including the ones that were never sent because no mail provider is
     configured. `tsc` is happy with it, so nothing but reading it catches it. */
  if (sent.ok) return { ok: true };
  /* A provider that is not configured is not a retry: it will be exactly as
     unconfigured in an hour, and the row would burn its five attempts and then
     be marked failed for a reason that has nothing to do with the post. */
  const permanent = sent.why === 'not_configured';
  return { ok: false, again: !permanent, why: sent.why };
};

/**
 * Every handler there is.
 *
 * A row whose `handler` is not in here is failed rather than retried: it means
 * a connector was removed, or a row was written by a newer version of the app,
 * and neither gets better by waiting.
 */
export const HANDLERS: Readonly<Record<string, Handler>> = {
  remind,
};

export function handlerFor(name: string): Handler | null {
  return HANDLERS[name] ?? null;
}
