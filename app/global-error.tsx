'use client';

/**
 * The same, for when the layout itself is what threw.
 *
 * `app/error.tsx` is drawn *inside* the root layout, so it cannot help when
 * the root layout is the casualty — and that is precisely the case that ends
 * as a blank white page. This one replaces the whole document, which is why it
 * has to carry its own <html> and <body>.
 *
 * Deliberately plainer than its sibling: no imports beyond React, no theme, no
 * translator. Everything it might reach for is a thing that could be what
 * broke.
 */

import React from 'react';

export default function Broken({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="af">
      <body
        style={{
          margin: 0,
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
        <div style={{ maxWidth: '30rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
            FutureBox kon nie oopmaak nie
          </h1>
          <p style={{ margin: '0 0 1.25rem', lineHeight: 1.5, color: 'rgb(161 161 170)' }}>
            Laai die bladsy weer. Jou liedjies en opnames is op hierdie toestel en is nie geraak nie.
            <br />
            <span style={{ color: 'rgb(113 113 122)', fontSize: '0.875rem' }}>
              Reload the page. Your songs and takes are on this device and were not touched.
            </span>
          </p>
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
          {error.digest && (
            <p style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'rgb(82 82 91)' }}>
              {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
