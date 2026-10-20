/**
 * The four corner marks of a futuristic panel, like a viewfinder's. The
 * panel needs `position: relative`; `.fb-fx-panel` gives it that. The look
 * is in `globals.css` under "The futuristic look".
 */
import React from 'react';

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const;

export default function HoloCorners(): React.ReactElement {
  return (
    <>
      {CORNERS.map((at) => (
        <span key={at} className="fb-fx-corner" data-at={at} aria-hidden="true" />
      ))}
    </>
  );
}
