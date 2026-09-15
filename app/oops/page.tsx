'use client';

/**
 * What broke on this device, in words somebody can read to me over a phone.
 *
 * ── Why a page of its own ────────────────────────────────────────────────
 *
 * Because the thing that broke may be the studio, the theme, the translator,
 * or the stylesheet — so this depends on none of them. Plain inline styles
 * and both languages on every line, for the same reason `app/error.tsx` is
 * written that way: a diagnostic that needs the app to be working is not a
 * diagnostic.
 *
 * ── Why it exists at all ─────────────────────────────────────────────────
 *
 * Carli hit a white screen choosing a photo, twice, and both explanations I
 * offered were wrong — a memory death and an in-app browser, each ruled out
 * by her next message. They were beaten by the same thing: a white screen
 * keeps its reason to itself, and the console it is written to does not exist
 * on a phone.
 *
 * So: reload, open `/oops`, read me the top line. That ends the guessing.
 *
 * ── It is not sent anywhere ──────────────────────────────────────────────
 *
 * Everything here is read out of this browser's own storage and stays in it.
 * The button copies it so she can send it to me herself, which is the whole
 * difference between a report somebody makes and one that is taken.
 */

import React, { useEffect, useState } from 'react';
import { forgetProblems, problems, type Problem } from '../lib/lasterror';

const INK = 'rgb(228 228 231)';
const DIM = 'rgb(161 161 170)';
const FAINT = 'rgb(113 113 122)';

export default function Oops(): React.ReactElement {
  const [list, setList] = useState<Problem[] | null>(null);
  const [copied, setCopied] = useState(false);

  /* Read after mounting, never during: this is browser storage, and a server
     render that reaches for it is a page that does not render at all. */
  useEffect(() => setList(problems()), []);

  const asText = (list ?? [])
    .map(
      (one) =>
        `${one.at} · ${one.how} · ${one.page}` +
        `${one.doing ? `\ndoing: ${one.doing}` : ''}` +
        `\n${one.name}: ${one.message}\n${one.where}`,
    )
    .join('\n\n');

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '24px 16px',
        background: 'rgb(9 9 11)',
        color: INK,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          Wat laas verkeerd geloop het
        </h1>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', lineHeight: 1.5, color: DIM }}>
          Dit word net op hierdie toestel gehou en nêrens gestuur nie. Druk <strong>Kopieer</strong> en
          plak dit vir my.
          <br />
          <span style={{ color: FAINT }}>
            Kept on this device only and never sent. Copy it and send it to me.
          </span>
        </p>

        {list === null ? (
          <p style={{ color: FAINT }}>…</p>
        ) : list.length === 0 ? (
          <p style={{ lineHeight: 1.6, color: DIM }}>
            Niks aangeteken nie. Dit beteken die bladsy het nie 'n fout gegooi nie — as die skerm
            leeg gebly het, is dit iets anders.
            <br />
            <span style={{ color: FAINT, fontSize: '0.875rem' }}>
              Nothing recorded. The page did not throw — if the screen went blank, it is something else.
            </span>
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(asText).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  );
                }}
                style={{
                  minHeight: '44px', padding: '0 1.25rem', borderRadius: '0.75rem', border: 'none',
                  background: 'rgb(16 185 129)', color: 'rgb(9 9 11)', fontWeight: 700, fontSize: '0.9375rem',
                }}
              >
                {copied ? 'Gekopieer · Copied' : 'Kopieer · Copy'}
              </button>
              <button
                type="button"
                onClick={() => { forgetProblems(); setList([]); }}
                style={{
                  minHeight: '44px', padding: '0 1.25rem', borderRadius: '0.75rem',
                  border: '1px solid rgb(63 63 70)', background: 'rgb(24 24 27)', color: 'rgb(212 212 216)',
                  fontWeight: 600, fontSize: '0.9375rem',
                }}
              >
                Vee uit · Clear
              </button>
              <a
                href="/"
                style={{
                  minHeight: '44px', display: 'inline-flex', alignItems: 'center', padding: '0 1.25rem',
                  borderRadius: '0.75rem', border: '1px solid rgb(63 63 70)', color: 'rgb(212 212 216)',
                  fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none',
                }}
              >
                Terug · Back
              </a>
            </div>

            {list.map((one, at) => (
              <div
                key={`${one.at}-${at}`}
                style={{
                  border: '1px solid rgb(39 39 42)', borderRadius: '0.75rem',
                  padding: '0.875rem', marginBottom: '0.75rem', background: 'rgb(24 24 27)',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.75rem', color: FAINT }}>
                  {one.at} · {one.how} · {one.page}
                </p>
                <p style={{ margin: '0.375rem 0 0', fontWeight: 700, lineHeight: 1.4 }}>
                  {one.name}: {one.message}
                </p>
                {/* What the page was in the middle of.

                    The most useful line on this card and the one it did not
                    have. `page` says which screen, which on a five-tab app
                    narrows very little; this says which STEP, and it is
                    written down before the step rather than after it — which
                    is the only reason it survives a tab whose memory was
                    taken. */}
                {one.doing && (
                  <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: 'rgb(250 204 21)' }}>
                    Besig met · Doing: {one.doing}
                  </p>
                )}
                {/* The one entry that is not a fault, said plainly where it
                    appears. Somebody reading "discarded" in a list called
                    "what went wrong" would reasonably think something in the
                    app broke, and nothing did. */}
                {(one.how === 'discarded' || one.how === 'frozen') && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', lineHeight: 1.5, color: DIM }}>
                    Dis nie 'n fout in die app nie. Die foon het die blad se geheue gevat vir iets
                    anders — gewoonlik die lêerkieser of die kamera — en 'n leë een teruggesit.
                    <br />
                    <span style={{ color: FAINT }}>
                      Not an app fault. The phone took the page's memory for something else — usually
                      the file picker or the camera — and put an empty one back.
                    </span>
                  </p>
                )}
                {one.digest && (
                  <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: FAINT }}>{one.digest}</p>
                )}
                {one.where && (
                  <pre
                    style={{
                      margin: '0.5rem 0 0', fontSize: '0.6875rem', color: DIM, lineHeight: 1.5,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    }}
                  >
                    {one.where}
                  </pre>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
