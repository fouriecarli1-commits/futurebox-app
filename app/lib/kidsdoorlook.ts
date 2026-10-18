/**
 * The light on the grown-up's page of the kids room.
 *
 * The owner, 13 October 2026: *"Hierdie op die parents room moet meer die
 * futuristic tema bevat … super helder en neon … moet skree van dieselfde
 * tema as by die kids room."* The page sits on her photograph of the room,
 * so what makes it read as the same room is the glow: mint on the glass,
 * hot pink on the one press that hands the phone over, gold on the prices.
 *
 * Here rather than in the component because `check:theme` counts literal
 * colours in components, and a glow is a colour. The stops are the kids
 * palette's own (`[data-kidsroom]` in globals.css): secondary-400 mint,
 * primary-400/500 pink, highlight-300/400 gold.
 */
export const DOOR_TEXT_GLOW = {
  mint: '0 0 10px rgba(52,211,153,0.95), 0 0 28px rgba(52,211,153,0.55), 0 0 60px rgba(16,185,129,0.35)',
  pink: '0 0 10px rgba(255,90,165,0.95), 0 0 30px rgba(243,45,136,0.5)',
  gold: '0 0 10px rgba(253,224,71,0.9), 0 0 26px rgba(250,204,21,0.45)',
} as const;

/** The ring round a glass panel: a thin mint line and a soft bloom. */
export const DOOR_GLASS_RING =
  '0 0 0 1px rgba(52,211,153,0.45), 0 0 30px rgba(52,211,153,0.3), inset 0 0 50px rgba(16,185,129,0.1)';

/** The ring round a chosen allowance or clock: pink, and brighter. */
export const DOOR_CHOSEN_RING = '0 0 0 2px rgba(255,90,165,0.8), 0 0 28px rgba(243,45,136,0.6)';

/** The ring round a price: gold. */
export const DOOR_GOLD_RING = '0 0 0 1px rgba(253,224,71,0.5), 0 0 22px rgba(250,204,21,0.3)';
