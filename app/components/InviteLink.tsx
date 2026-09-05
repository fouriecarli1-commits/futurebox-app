'use client';

/**
 * A link that turns a stranger into a collaborator.
 *
 * ── The gap ──────────────────────────────────────────────────────────────
 *
 * The radar drafts an email to a podcast host or another maker, and that
 * email had nowhere to send them. Carli: "Send an email, sal dit 'n link he
 * na die kamer." It did not, and could not: the room only exists once two
 * FutureBox accounts have accepted each other, so a stranger reading the
 * email had four steps between "yes, interesting" and a conversation — find
 * the app, sign up, work out a handle, ask.
 *
 * A link is one step. It survives signing up and turns into a request from
 * the person who sent it, with the reason they gave already on it.
 *
 * ── What it says about itself ────────────────────────────────────────────
 *
 * That it expires, and that it is not a private door. Both are true and both
 * change how somebody uses it: a link that lasts forever ends up in an old
 * email, and one somebody thinks is private ends up on a public page.
 *
 * The email text is here rather than somewhere clever, because the person
 * copying the link is the person writing the email, and two screens for one
 * action is one screen too many.
 */

import React, { useCallback, useState } from 'react';
import { Check, Copy, Link2, Loader2, Mail } from 'lucide-react';
import { makeInvite, type Invite } from '../lib/collab';
import { useLang } from '../lib/i18n';
import Hint from './Hint';
import Note from './Note';

export default function InviteLink({ from }: { readonly from?: string }): React.ReactElement {
  const { t } = useLang();
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<Invite | null>(null);
  const [problem, setProblem] = useState('');
  const [copied, setCopied] = useState('');

  const make = useCallback(async () => {
    setBusy(true);
    setProblem('');
    const made = await makeInvite(why);
    setBusy(false);
    if ('message' in made) {
      setProblem(made.message);
      return;
    }
    setLink(made);
  }, [why]);

  const copy = useCallback((what: string, which: string) => {
    void navigator.clipboard?.writeText(what);
    setCopied(which);
    setTimeout(() => setCopied(''), 1600);
  }, []);

  /** A short note somebody can send as it is, with the link in it. */
  const asEmail = link
    ? [
        t('invite.mailHi', 'Hi,'),
        '',
        why.trim() ||
          t('invite.mailWhy', 'I make music with AI and I think there is something worth doing together.'),
        '',
        t('invite.mailLink', 'This link opens a room where we can talk and pass songs back and forth:'),
        link.url,
        '',
        `${t('invite.mailLasts', 'It works for')} ${link.days} ${t('invite.mailDays', 'days')}.`,
        '',
        from ? `— ${from}` : '',
      ]
        .filter((one, index, all) => !(one === '' && all[index - 1] === ''))
        .join('\n')
    : '';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
      <p className="text-base font-bold text-white flex items-center gap-2">
        <Link2 className="w-4 h-4 text-emerald-400" />
        {t('invite.title', 'Invite somebody who is not here yet')}
        <Hint>
          {t(
            'invite.why',
            'The room only exists once two people have agreed, so somebody who does not have an account cannot be reached from here. This link lands them on the app, survives them signing up, and turns into a request from you with your reason already on it.',
          )}
        </Hint>
      </p>

      <div>
        <label htmlFor="invite-why" className="sr-only">
          {t('invite.reason', 'What it is about')}
        </label>
        <input
          id="invite-why"
          value={why}
          maxLength={300}
          onChange={(event) => setWhy(event.target.value)}
          placeholder={t('invite.reasonPlaceholder', 'What it is about — one line')}
          className="w-full min-h-[44px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={() => void make()}
        disabled={busy}
        className="min-h-[44px] rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-onAccent flex items-center gap-2 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        {link ? t('invite.again', 'Make another link') : t('invite.make', 'Make a link')}
      </button>

      {link && (
        <div className="space-y-2">
          <p className="break-all rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-emerald-300">
            {link.url}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(link.url, 'link')}
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 flex items-center gap-1.5"
            >
              {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied === 'link' ? t('make.copied', 'Copied') : t('invite.copyLink', 'Copy the link')}
            </button>
            <button
              type="button"
              onClick={() => copy(asEmail, 'mail')}
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 flex items-center gap-1.5"
            >
              {copied === 'mail' ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              {copied === 'mail' ? t('make.copied', 'Copied') : t('invite.copyMail', 'Copy an email with it in')}
            </button>
          </div>
          <Note className="text-xs text-zinc-500">
            {t(
              'invite.lasts',
              'It works for a month and for a handful of people, then it stops. Anybody who has the link can use it, so send it rather than post it.',
            )}
          </Note>
        </div>
      )}

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
    </div>
  );
}
