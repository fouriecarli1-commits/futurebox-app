'use client';

/**
 * One character in the live jam room, drawn — never a face.
 *
 * The owner, 22 October 2026: somebody in the jam room must be able to hide
 * completely behind a character. These twelve are drawn here in SVG, out of
 * nothing but shapes, so nothing is fetched and nothing can be swapped for a
 * picture of anybody.
 *
 * ── How it moves ─────────────────────────────────────────────────────────
 *
 * Three layers of motion, each on its own group so they add up rather than
 * fight over one transform (the rules are in `globals.css`, under "jam
 * characters"):
 *
 *   breathing and blinking   always, on its own clock
 *   loudness                 `--lvl`, 0 to 1, set from outside on any element
 *                            above this one: the body lifts, the mouth opens,
 *                            the glow brightens
 *   the beat and the drop    `jc-beat` (with `--jc-beat`, one beat in seconds)
 *                            bobs it on a loop's tempo; `jc-drop` is the jump
 *                            when a loop lands
 *
 * `--lvl` is written straight onto the element by the stage's animation frame
 * rather than through React, so twelve characters moving sixty times a second
 * is twelve style writes and not twelve renders.
 */
import React, { useId } from 'react';
import { COLOURS, type Character, type Look } from '../lib/jamcharacters';

/* The parts every character is built from. `jc-eyes` blink, `jc-mouth`
   opens with loudness, `jc-sway` is an ear, an antenna or a wing that moves
   a little on its own. */
const Eyes = ({ children }: { children: React.ReactNode }) => <g className="jc-eyes">{children}</g>;
const Mouth = ({ children }: { children: React.ReactNode }) => <g className="jc-mouth">{children}</g>;
const Sway = ({ children, side = 1 }: { children: React.ReactNode; side?: 1 | -1 }) => (
  <g className={side === 1 ? 'jc-sway' : 'jc-sway jc-sway-back'}>{children}</g>
);

function Robot(): React.ReactElement {
  return (
    <>
      <Sway>
        <line x1="60" y1="24" x2="60" y2="12" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <circle className="jc-c jc-lamp" cx="60" cy="10" r="4.5" />
      </Sway>
      <rect className="jc-d" x="34" y="88" width="52" height="22" rx="9" />
      <circle className="jc-l jc-lamp" cx="60" cy="99" r="4" />
      <rect fill="#334155" x="52" y="82" width="16" height="8" rx="2" />
      <rect className="jc-c" x="14" y="44" width="10" height="20" rx="4" />
      <rect className="jc-c" x="96" y="44" width="10" height="20" rx="4" />
      <rect className="jc-d" x="22" y="22" width="76" height="62" rx="16" />
      <rect className="jc-glass" x="29" y="30" width="62" height="46" rx="11" />
      <Eyes>
        <rect className="jc-c jc-shine" x="38" y="41" width="14" height="11" rx="5" />
        <rect className="jc-c jc-shine" x="68" y="41" width="14" height="11" rx="5" />
      </Eyes>
      <Mouth>
        <rect className="jc-c jc-shine" x="44" y="61" width="32" height="7" rx="3.5" />
      </Mouth>
    </>
  );
}

function Astronaut(): React.ReactElement {
  return (
    <>
      <rect fill="#e2e8f0" x="28" y="86" width="64" height="24" rx="12" />
      <rect className="jc-c" x="52" y="94" width="16" height="10" rx="3" />
      <ellipse className="jc-c" cx="60" cy="88" rx="26" ry="6" />
      <Sway>
        <rect className="jc-c" x="93" y="40" width="6" height="18" rx="3" />
        <circle className="jc-l jc-lamp" cx="96" cy="36" r="3.5" />
      </Sway>
      <circle fill="#f1f5f9" cx="60" cy="52" r="37" />
      <rect className="jc-glass jc-rim" x="30" y="29" width="60" height="47" rx="22" />
      <ellipse fill="#ffffff" opacity="0.28" cx="44" cy="39" rx="9" ry="4" transform="rotate(-28 44 39)" />
      <Eyes>
        <circle className="jc-c jc-shine" cx="48" cy="52" r="4.6" />
        <circle className="jc-c jc-shine" cx="72" cy="52" r="4.6" />
      </Eyes>
      <Mouth>
        <ellipse className="jc-c" cx="60" cy="65" rx="6.5" ry="3.2" />
      </Mouth>
    </>
  );
}

function Fox(): React.ReactElement {
  return (
    <>
      <ellipse className="jc-d" cx="60" cy="104" rx="22" ry="9" />
      <Sway side={-1}>
        <path className="jc-c" d="M28 42 L35 8 L56 30 Z" />
        <path className="jc-k" opacity="0.45" d="M34 34 L38 16 L49 29 Z" />
      </Sway>
      <Sway>
        <path className="jc-c" d="M92 42 L85 8 L64 30 Z" />
        <path className="jc-k" opacity="0.45" d="M86 34 L82 16 L71 29 Z" />
      </Sway>
      <path className="jc-c" d="M18 46 Q60 16 102 46 Q102 76 60 94 Q18 76 18 46 Z" />
      <path fill="#f8fafc" d="M22 58 Q40 62 60 94 Q28 82 22 58 Z" />
      <path fill="#f8fafc" d="M98 58 Q80 62 60 94 Q92 82 98 58 Z" />
      <ellipse fill="#f8fafc" cx="60" cy="74" rx="14" ry="13" />
      <ellipse className="jc-k" cx="60" cy="65" rx="5.5" ry="3.8" />
      <Eyes>
        <ellipse className="jc-k" cx="43" cy="51" rx="4.2" ry="5.4" />
        <ellipse className="jc-k" cx="77" cy="51" rx="4.2" ry="5.4" />
        <circle fill="#fff" cx="44.5" cy="49" r="1.4" />
        <circle fill="#fff" cx="78.5" cy="49" r="1.4" />
      </Eyes>
      <Mouth>
        <ellipse className="jc-k" cx="60" cy="78" rx="4.5" ry="2.6" />
      </Mouth>
    </>
  );
}

function Cat(): React.ReactElement {
  return (
    <>
      <ellipse className="jc-d" cx="60" cy="104" rx="22" ry="9" />
      <Sway side={-1}>
        <path className="jc-c" d="M26 46 L29 12 L54 32 Z" />
        <path fill="#f9a8d4" opacity="0.7" d="M32 39 L33 21 L46 32 Z" />
      </Sway>
      <Sway>
        <path className="jc-c" d="M94 46 L91 12 L66 32 Z" />
        <path fill="#f9a8d4" opacity="0.7" d="M88 39 L87 21 L74 32 Z" />
      </Sway>
      <ellipse className="jc-c" cx="60" cy="58" rx="39" ry="33" />
      <path className="jc-stripe" d="M53 28 L55 39 M60 26 L60 40 M67 28 L65 39" />
      <Eyes>
        <ellipse fill="#f8fafc" cx="45" cy="55" rx="7" ry="7.5" />
        <ellipse fill="#f8fafc" cx="75" cy="55" rx="7" ry="7.5" />
        <ellipse className="jc-k" cx="45" cy="55" rx="2.4" ry="6" />
        <ellipse className="jc-k" cx="75" cy="55" rx="2.4" ry="6" />
      </Eyes>
      <path fill="#f9a8d4" d="M55.5 66 L64.5 66 L60 70.5 Z" />
      <Mouth>
        <ellipse className="jc-k" cx="60" cy="76" rx="5" ry="3" />
      </Mouth>
      <g stroke="#f1f5f9" strokeWidth="1.4" strokeLinecap="round" opacity="0.75">
        <line x1="20" y1="64" x2="38" y2="67" />
        <line x1="20" y1="73" x2="38" y2="71" />
        <line x1="100" y1="64" x2="82" y2="67" />
        <line x1="100" y1="73" x2="82" y2="71" />
      </g>
    </>
  );
}

function Alien(): React.ReactElement {
  return (
    <>
      <ellipse className="jc-d" cx="60" cy="106" rx="18" ry="8" />
      <Sway side={-1}>
        <line className="jc-line" x1="46" y1="24" x2="36" y2="8" />
        <circle className="jc-l jc-lamp" cx="35" cy="7" r="4.5" />
      </Sway>
      <Sway>
        <line className="jc-line" x1="74" y1="24" x2="84" y2="8" />
        <circle className="jc-l jc-lamp" cx="85" cy="7" r="4.5" />
      </Sway>
      <path className="jc-c" d="M60 18 C88 18 98 40 96 58 C94 80 74 98 60 98 C46 98 26 80 24 58 C22 40 32 18 60 18 Z" />
      <Eyes>
        <ellipse className="jc-k" cx="43" cy="58" rx="12" ry="7.5" transform="rotate(28 43 58)" />
        <ellipse className="jc-k" cx="77" cy="58" rx="12" ry="7.5" transform="rotate(-28 77 58)" />
        <ellipse fill="#fff" opacity="0.8" cx="40" cy="54" rx="3" ry="1.8" transform="rotate(28 40 54)" />
        <ellipse fill="#fff" opacity="0.8" cx="80" cy="54" rx="3" ry="1.8" transform="rotate(-28 80 54)" />
      </Eyes>
      <Mouth>
        <ellipse className="jc-k" cx="60" cy="82" rx="5" ry="2.6" />
      </Mouth>
    </>
  );
}

function Panda(): React.ReactElement {
  return (
    <>
      <ellipse className="jc-k" cx="60" cy="106" rx="23" ry="9" />
      <circle className="jc-k" cx="31" cy="28" r="11" />
      <circle className="jc-k" cx="89" cy="28" r="11" />
      <circle fill="#f8fafc" cx="60" cy="58" r="36" />
      <ellipse className="jc-k" cx="45" cy="56" rx="10" ry="12.5" transform="rotate(-22 45 56)" />
      <ellipse className="jc-k" cx="75" cy="56" rx="10" ry="12.5" transform="rotate(22 75 56)" />
      <Eyes>
        <circle fill="#f8fafc" cx="46" cy="55" r="3.6" />
        <circle fill="#f8fafc" cx="74" cy="55" r="3.6" />
      </Eyes>
      <ellipse className="jc-k" cx="60" cy="70" rx="5.5" ry="3.8" />
      <Mouth>
        <ellipse className="jc-k" cx="60" cy="79" rx="5" ry="3" />
      </Mouth>
      <path className="jc-band" d="M20 54 Q60 -4 100 54" />
      <rect className="jc-c" x="12" y="46" width="15" height="26" rx="7" />
      <rect className="jc-c" x="93" y="46" width="15" height="26" rx="7" />
      <rect className="jc-l jc-lamp" x="16" y="52" width="4" height="14" rx="2" />
      <rect className="jc-l jc-lamp" x="100" y="52" width="4" height="14" rx="2" />
    </>
  );
}

function Ghost(): React.ReactElement {
  return (
    <>
      <path className="jc-c" opacity="0.94" d="M28 58 C28 30 44 16 60 16 C76 16 92 30 92 58 V98 Q86 108 80 99 Q74 90 68 99 Q62 108 56 99 Q50 90 44 99 Q38 108 32 99 L28 96 Z" />
      <ellipse className="jc-l" opacity="0.45" cx="45" cy="34" rx="7" ry="12" transform="rotate(24 45 34)" />
      <Eyes>
        <ellipse className="jc-k" cx="48" cy="52" rx="5" ry="7" />
        <ellipse className="jc-k" cx="72" cy="52" rx="5" ry="7" />
        <circle fill="#fff" cx="49.5" cy="49" r="1.6" />
        <circle fill="#fff" cx="73.5" cy="49" r="1.6" />
      </Eyes>
      <circle className="jc-l" opacity="0.55" cx="39" cy="64" r="4" />
      <circle className="jc-l" opacity="0.55" cx="81" cy="64" r="4" />
      <Mouth>
        <ellipse className="jc-k" cx="60" cy="70" rx="6" ry="5" />
      </Mouth>
    </>
  );
}

function Dragon(): React.ReactElement {
  return (
    <>
      <ellipse className="jc-d" cx="60" cy="106" rx="22" ry="9" />
      <Sway side={-1}><path className="jc-d" d="M22 72 L4 52 L8 70 L2 78 L14 80 Z" /></Sway>
      <Sway><path className="jc-d" d="M98 72 L116 52 L112 70 L118 78 L106 80 Z" /></Sway>
      <path fill="#fde68a" d="M38 30 L28 6 L50 25 Z" />
      <path fill="#fde68a" d="M82 30 L92 6 L70 25 Z" />
      <path className="jc-l" d="M49 23 L54 11 L60 22 L66 11 L71 23 Z" />
      <path className="jc-c" d="M20 54 C20 30 40 20 60 20 C80 20 100 30 100 54 C100 78 82 92 60 92 C38 92 20 78 20 54 Z" />
      <ellipse className="jc-l" opacity="0.85" cx="60" cy="73" rx="23" ry="14" />
      <ellipse className="jc-k" cx="53" cy="68" rx="2.6" ry="1.7" />
      <ellipse className="jc-k" cx="67" cy="68" rx="2.6" ry="1.7" />
      <path className="jc-brow" d="M34 40 L50 44 M86 40 L70 44" />
      <Eyes>
        <ellipse fill="#fef08a" cx="42" cy="50" rx="6.5" ry="7" />
        <ellipse fill="#fef08a" cx="78" cy="50" rx="6.5" ry="7" />
        <ellipse className="jc-k" cx="42" cy="50" rx="1.8" ry="5.5" />
        <ellipse className="jc-k" cx="78" cy="50" rx="1.8" ry="5.5" />
      </Eyes>
      <Mouth>
        <ellipse className="jc-k" cx="60" cy="80" rx="9" ry="2.6" />
      </Mouth>
    </>
  );
}

function Skeleton(): React.ReactElement {
  return (
    <>
      <ellipse className="jc-k" cx="60" cy="108" rx="22" ry="8" />
      <path className="jc-c" d="M22 104 L60 100 L98 104 L94 112 L26 112 Z" opacity="0.8" />
      <Sway><path className="jc-c" d="M42 26 L46 4 L53 21 L60 0 L67 21 L74 4 L78 26 Z" /></Sway>
      <path fill="#f1f5f9" d="M26 50 C26 28 42 18 60 18 C78 18 94 28 94 50 C94 64 88 70 82 74 L82 80 L38 80 L38 74 C32 70 26 64 26 50 Z" />
      <ellipse className="jc-k" cx="46" cy="51" rx="9.5" ry="10.5" />
      <ellipse className="jc-k" cx="74" cy="51" rx="9.5" ry="10.5" />
      <Eyes>
        <circle className="jc-c jc-shine" cx="46" cy="52" r="3.4" />
        <circle className="jc-c jc-shine" cx="74" cy="52" r="3.4" />
      </Eyes>
      <path className="jc-k" d="M56.5 64 L60 57 L63.5 64 Z" />
      <rect fill="#f1f5f9" x="40" y="72" width="40" height="8" rx="2" />
      <path className="jc-teeth" d="M48 72 V80 M56 72 V80 M64 72 V80 M72 72 V80" />
      <g className="jc-jaw">
        <rect fill="#e2e8f0" x="40" y="81" width="40" height="11" rx="5" />
        <path className="jc-teeth" d="M48 81 V87 M56 81 V87 M64 81 V87 M72 81 V87" />
      </g>
    </>
  );
}

function Cube(): React.ReactElement {
  return (
    <>
      <ellipse className="jc-d" cx="62" cy="106" rx="30" ry="6" />
      <path className="jc-l" d="M24 36 L40 20 L102 20 L86 36 Z" />
      <path className="jc-d" d="M86 36 L102 20 L102 82 L86 98 Z" />
      <rect className="jc-c" x="24" y="36" width="62" height="62" rx="6" />
      <path className="jc-edge" d="M24 36 L40 20 L102 20 L102 82 L86 98 M86 36 L102 20" />
      <path className="jc-grid" d="M24 57 H86 M24 77 H86 M45 36 V98 M65 36 V98" />
      <Eyes>
        <rect className="jc-k" x="36" y="52" width="10" height="10" rx="2" />
        <rect className="jc-k" x="64" y="52" width="10" height="10" rx="2" />
        <rect fill="#fff" x="38" y="54" width="3" height="3" />
        <rect fill="#fff" x="66" y="54" width="3" height="3" />
      </Eyes>
      <Mouth>
        <rect className="jc-k" x="45" y="74" width="20" height="6" rx="2" />
      </Mouth>
    </>
  );
}

function Mushroom(): React.ReactElement {
  return (
    <>
      <ellipse fill="#052e16" opacity="0.7" cx="60" cy="108" rx="30" ry="6" />
      <path fill="#fef3c7" d="M36 64 L84 64 C87 84 82 106 60 106 C38 106 33 84 36 64 Z" />
      <Eyes>
        <ellipse className="jc-k" cx="50" cy="80" rx="3.6" ry="4.6" />
        <ellipse className="jc-k" cx="70" cy="80" rx="3.6" ry="4.6" />
      </Eyes>
      <circle className="jc-c" opacity="0.45" cx="44" cy="88" r="3.6" />
      <circle className="jc-c" opacity="0.45" cx="76" cy="88" r="3.6" />
      <Mouth>
        <ellipse className="jc-k" cx="60" cy="92" rx="4.2" ry="2.6" />
      </Mouth>
      <path className="jc-c" d="M12 58 C12 26 38 12 60 12 C82 12 108 26 108 58 C108 64 102 67 96 67 L24 67 C18 67 12 64 12 58 Z" />
      <g fill="#ffffff" opacity="0.92">
        <circle cx="40" cy="31" r="7.5" />
        <circle cx="67" cy="24" r="6" />
        <circle cx="88" cy="44" r="7" />
        <circle cx="27" cy="51" r="4" />
        <circle cx="58" cy="47" r="5" />
      </g>
    </>
  );
}

function Owl(): React.ReactElement {
  return (
    <>
      <path className="jc-d" d="M30 36 L24 10 L48 26 Z" />
      <path className="jc-d" d="M90 36 L96 10 L72 26 Z" />
      <path className="jc-c" d="M24 50 C24 26 40 18 60 18 C80 18 96 26 96 50 L96 88 C96 102 80 110 60 110 C40 110 24 102 24 88 Z" />
      <Sway side={-1}><path className="jc-d" d="M26 58 Q8 80 28 100 Z" /></Sway>
      <Sway><path className="jc-d" d="M94 58 Q112 80 92 100 Z" /></Sway>
      <ellipse className="jc-l" opacity="0.7" cx="60" cy="90" rx="22" ry="17" />
      <path className="jc-chev" d="M50 84 L54 88 L58 84 M62 84 L66 88 L70 84 M56 94 L60 98 L64 94" />
      <circle fill="#f8fafc" cx="44" cy="50" r="15" />
      <circle fill="#f8fafc" cx="76" cy="50" r="15" />
      <circle className="jc-ring" cx="44" cy="50" r="15" />
      <circle className="jc-ring" cx="76" cy="50" r="15" />
      <Eyes>
        <circle className="jc-k" cx="44" cy="50" r="7" />
        <circle className="jc-k" cx="76" cy="50" r="7" />
        <circle fill="#fff" cx="46.5" cy="47.5" r="2" />
        <circle fill="#fff" cx="78.5" cy="47.5" r="2" />
      </Eyes>
      <Mouth>
        <path fill="#fbbf24" d="M54.5 63 L65.5 63 L60 73 Z" />
      </Mouth>
    </>
  );
}

const DRAWN: Readonly<Record<Character, () => React.ReactElement>> = {
  robot: Robot, astronaut: Astronaut, fox: Fox, cat: Cat, alien: Alien, panda: Panda,
  ghost: Ghost, dragon: Dragon, skeleton: Skeleton, cube: Cube, mushroom: Mushroom, owl: Owl,
};

/**
 * A character in its colour. `still` draws it without its own motion — the
 * picker's thumbnails, where twelve breathing faces at once is noise.
 */
export default function JamCharacter({ look, label, still = false, className = '' }: {
  readonly look: Look;
  /** What a screen reader says. Absent: the drawing is decoration. */
  readonly label?: string;
  readonly still?: boolean;
  readonly className?: string;
}): React.ReactElement {
  const glow = useId().replace(/:/g, '');
  const Drawn = DRAWN[look.character] ?? Robot;
  return (
    <svg
      viewBox="0 0 120 120"
      className={`jc ${still ? 'jc-still' : ''} ${className}`}
      style={{ '--jc': COLOURS[look.colour] } as React.CSSProperties}
      data-jamcharacter={look.character}
      data-jamcolour={look.colour}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <defs>
        <radialGradient id={`jcg${glow}`} cx="50%" cy="55%" r="50%">
          <stop offset="0%" style={{ stopColor: 'var(--jc)', stopOpacity: 0.7 }} />
          <stop offset="100%" style={{ stopColor: 'var(--jc)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <circle className="jc-aura" cx="60" cy="62" r="58" fill={`url(#jcg${glow})`} />
      <ellipse className="jc-floor" cx="60" cy="113" rx="34" ry="5" />
      <g className="jc-bounce">
        <g className="jc-rig">
          <g className={look.character === 'ghost' ? 'jc-float' : 'jc-breathe'}>
            <Drawn />
          </g>
        </g>
      </g>
      <circle className="jc-burst" cx="60" cy="62" r="40" />
    </svg>
  );
}
