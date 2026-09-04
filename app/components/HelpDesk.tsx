'use client';

/**
 * The help desk: ask the assistant, or write to a person.
 *
 * ── Both, in that order, on one screen ───────────────────────────────────
 *
 * The assistant answers out of the app's own terms, prices and room list —
 * see `app/api/help/route.ts` for where every one of those comes from. It
 * handles the questions that have an answer already written down, which is
 * most of them, at any hour.
 *
 * Under it, always visible and never behind a "still stuck?" click, is the
 * form that reaches a person. A support page that hides the human behind a bot
 * is a support page people write about instead of writing to. So the form is
 * there from the first paint, and what the assistant said is carried into it
 * automatically — nobody should have to retype their question because the
 * first answer was wrong.
 *
 * ── Signed out is the normal case ────────────────────────────────────────
 *
 * Neither half needs an account. The person who cannot sign in is the person
 * with a question.
 *
 * ── No address on the page ───────────────────────────────────────────────
 *
 * There is one mailbox behind this app and it belongs to one person. An
 * address printed on a public page is an address that is scraped within days,
 * and a support inbox buried in spam is a support inbox that misses the real
 * message. So the form is the way in, and it is a complete one: the message
 * lands in that inbox with the sender's own address as reply-to, so answering
 * is pressing reply.
 *
 * Nothing here — and nothing any route it calls says back — names a mailbox.
 * `check:security` asserts that, because the natural way to write an error
 * message is "or write to us at…".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LifeBuoy, Loader2, Send, Check, Mail, AlertTriangle } from 'lucide-react';
import { useLang } from '../lib/i18n';

interface Turn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

export default function HelpDesk(): React.ReactElement {
  const { t, lang } = useLang();

  const [available, setAvailable] = useState<boolean | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const thread = useRef<HTMLDivElement | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendTrouble, setSendTrouble] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/help')
      .then((response) => (response.ok ? response.json() : null))
      .then((said: { available?: boolean } | null) => setAvailable(Boolean(said?.available)))
      .catch(() => setAvailable(false));
  }, []);

  // The newest answer, not the top of it. A reply that arrives below the fold
  // reads as nothing having happened.
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' });
  }, [turns, thinking]);

  const ask = useCallback(async () => {
    const asked = question.trim();
    if (!asked || thinking) return;
    setQuestion('');
    setTrouble(null);
    setTurns((before) => [...before, { role: 'user', text: asked }]);
    setThinking(true);
    try {
      const response = await fetch('/api/help', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: asked, history: turns.slice(-4), lang }),
      });
      const said = (await response.json().catch(() => ({}))) as {
        reply?: string;
        message?: string;
      };
      if (said.reply) setTurns((before) => [...before, { role: 'assistant', text: said.reply! }]);
      else
        setTrouble(
          said.message ||
            t('help.failed', 'That could not be answered just now. The form below still works.'),
        );
    } catch {
      setTrouble(t('help.failed', 'That could not be answered just now. The form below still works.'));
    } finally {
      setThinking(false);
    }
  }, [question, thinking, turns, lang, t]);

  const write = useCallback(async () => {
    if (sending) return;
    setSending(true);
    setSendTrouble(null);
    try {
      const lastAnswer = [...turns].reverse().find((turn) => turn.role === 'assistant');
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          message: note,
          where: 'help',
          // So whoever answers can see what the assistant already told them
          // and does not repeat it back.
          tried: lastAnswer?.text ?? '',
        }),
      });
      const said = (await response.json().catch(() => ({}))) as {
        sent?: boolean;
        message?: string;
      };
      if (said.sent) {
        setSent(true);
        setNote('');
      } else {
        setSendTrouble(
          said.message || t('help.sendFailed', 'That could not be sent. Try again in a moment.'),
        );
      }
    } catch {
      setSendTrouble(t('help.sendFailed', 'That could not be sent. Try again in a moment.'));
    } finally {
      setSending(false);
    }
  }, [sending, email, name, note, turns, t]);

  const canSend = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && note.trim().length >= 5 && !sending;

  return (
    <div className="space-y-8">
      {/* ── The assistant ────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <LifeBuoy className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-lg font-black text-white tracking-tight">
              {t('help.askTitle', 'Ask about anything here')}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t(
                'help.askNote',
                'It answers out of this app’s own terms, privacy policy, prices and rooms — not a summary of them. It cannot see your account, so it cannot check a balance or cancel anything.',
              )}
            </p>
          </div>
        </div>

        {available === false && (
          <p className="text-sm text-amber-400 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {t(
              'help.off',
              'The assistant is switched off for this app right now. The form below reaches a person.',
            )}
          </p>
        )}

        {turns.length > 0 && (
          <div
            ref={thread}
            className="max-h-[26rem] overflow-y-auto space-y-3 rounded-xl border border-zinc-800 bg-black/30 p-3"
          >
            {turns.map((turn, index) => (
              <div
                key={index}
                className={
                  turn.role === 'user'
                    ? 'rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-2.5 text-sm text-emerald-100 leading-relaxed whitespace-pre-wrap'
                    : 'rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap'
                }
              >
                {turn.text}
              </div>
            ))}
            {thinking && (
              <p className="flex items-center gap-2 text-sm text-zinc-500 px-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('help.thinking', 'Reading the terms…')}
              </p>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="help-question">
            {t('help.questionLabel', 'Your question')}
          </label>
          <textarea
            id="help-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, shift-enter makes a line. A support box people
              // type one sentence into should not need a mouse.
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void ask();
              }
            }}
            rows={2}
            disabled={available === false}
            placeholder={t('help.placeholder', 'What does a music video cost? How do I cancel?')}
            className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void ask()}
            disabled={!question.trim() || thinking || available === false}
            aria-label={t('help.ask', 'Ask')}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">{t('help.ask', 'Ask')}</span>
          </button>
        </div>

        {trouble && <p className="text-sm text-amber-400 leading-snug">{trouble}</p>}
      </section>

      {/* ── The person ───────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-lg font-black text-white tracking-tight">
              {t('help.writeTitle', 'Or write to a person')}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t(
                'help.writeNote',
                'Billing, an account you cannot get into, something that went wrong, or anything the assistant did not settle. It goes straight to the person who runs FutureBox, and they reply to you.',
              )}
            </p>
          </div>
        </div>

        {sent ? (
          <p className="text-sm text-emerald-300 flex items-start gap-2 leading-relaxed">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {t(
              'help.sent',
              'Sent. You will get a reply at the address you gave.',
            )}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="help-email" className="block text-sm font-semibold text-zinc-300">
                  {t('help.email', 'Your email')}
                </label>
                <input
                  id="help-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jy@voorbeeld.co.za"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="help-name" className="block text-sm font-semibold text-zinc-300">
                  {t('help.name', 'Your name')}{' '}
                  <span className="font-normal text-zinc-500">{t('help.optional', '(optional)')}</span>
                </label>
                <input
                  id="help-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="help-note" className="block text-sm font-semibold text-zinc-300">
                {t('help.message', 'What is the matter?')}
              </label>
              <textarea
                id="help-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={5}
                className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => void write()}
              disabled={!canSend}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('help.send', 'Send it')}
            </button>

            {sendTrouble && <p className="text-sm text-amber-400 leading-snug">{sendTrouble}</p>}
          </div>
        )}

        <p className="text-sm text-zinc-500 leading-relaxed">
          {t(
            'help.private',
            'Nothing here is published. The message goes to one person, and your address is used to reply to you and nothing else.',
          )}
        </p>
      </section>
    </div>
  );
}
