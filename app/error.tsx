'use client';

/**
 * What she sees instead of a white screen.
 *
 * "I accidentally went out of videodesk, and now when I want to go back in, it
 *  only shows a white screen."
 *
 * There was no error boundary in this app at all — no `error.tsx`, no
 * `global-error.tsx`, no `componentDidCatch` anywhere. So anything that threw
 * while drawing, and any piece of JavaScript that failed to load, emptied the
 * page and left nothing: no words, no button, no way to tell whether the app
 * was broken, the phone was offline, or the thing had simply not finished.
 *
 * The likeliest cause of her particular white screen is the most ordinary one:
 * a page left open across a deploy. The browser holds the old page, the old
 * page asks for a piece of itself by a filename that the new deploy does not
 * have, the request 404s and the render dies. Nothing is wrong with the app or
 * with her phone, and reloading fixes it — which is unguessable from a blank
 * screen and obvious from a sentence.
 *
 * So: a sentence, in both languages, and a button. In both languages because
 * the thing that broke may be the thing that knows which language she reads —
 * this must not depend on the translator, the theme, or anything else that
 * could be what failed. Plain colours for the same reason: the palette here
 * remaps white and black onto theme variables, and a boundary that renders
 * invisible because the stylesheet is the casualty is not a boundary.
 */

import React, { useEffect } from 'react';

/** A piece of the app that is no longer on the server, which a reload cures. */
function isStale(error: Error): boolean {
  const said = `${error.name} ${error.message}`;
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported|Importing a module script failed|error loading dynamically imported module/i.test(said);
}

export default function Problem({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const stale = isStale(error);

  useEffect(() => {
    // Left in the console for the one case where somebody is looking at it.
    // Not sent anywhere: an error report is a thing somebody has to consent to.
    console.error('FutureBox stopped drawing:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgb(9 9 11)',
        color: 'rgb(228 228 231)',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: '30rem', width: '100%' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
          {stale ? 'FutureBox is opgedateer' : 'Iets het verkeerd geloop'}
        </h1>
        <p style={{ margin: '0 0 0.5rem', lineHeight: 1.5, color: 'rgb(161 161 170)' }}>
          {stale
            ? 'Hierdie bladsy was oop toe ’n nuwe weergawe uitgegaan het, en dit soek nou ’n stuk van homself wat nie meer daar is nie. Niks is stukkend nie en niks is weg nie — laai dit net weer.'
            : 'Die skerm kon nie klaar teken nie. Jou liedjies en opnames is op hierdie toestel en is nie geraak nie.'}
        </p>
        <p style={{ margin: '0 0 1.25rem', lineHeight: 1.5, color: 'rgb(113 113 122)', fontSize: '0.875rem' }}>
          {stale
            ? 'This page was open when a new version went out. Reload it.'
            : 'The screen could not finish drawing. Your songs and takes are on this device and were not touched.'}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {/* A reload rather than `reset()` for a stale bundle: `reset()` draws
              the same broken tree again with the same missing file, which is
              the white screen a second time. A reload is what actually fetches
              the version that exists. */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              minHeight: '44px',
              padding: '0 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: 'rgb(16 185 129)',
              color: 'rgb(9 9 11)',
              fontWeight: 700,
              fontSize: '0.9375rem',
              cursor: 'pointer',
            }}
          >
            Laai weer · Reload
          </button>
          {!stale && (
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: '44px',
                padding: '0 1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid rgb(63 63 70)',
                background: 'rgb(24 24 27)',
                color: 'rgb(212 212 216)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                cursor: 'pointer',
              }}
            >
              Probeer weer · Try again
            </button>
          )}
          <a
            href="/"
            style={{
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 1.25rem',
              borderRadius: '0.75rem',
              border: '1px solid rgb(63 63 70)',
              color: 'rgb(212 212 216)',
              fontWeight: 600,
              fontSize: '0.9375rem',
              textDecoration: 'none',
            }}
          >
            Voorblad · Home
          </a>
        </div>

        {/* The digest, small, because it is the only handle on a production
            error whose stack was stripped — and useless to her unless it is
            written down somewhere she can read it back to me. */}
        {error.digest && (
          <p style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'rgb(82 82 91)' }}>
            {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
