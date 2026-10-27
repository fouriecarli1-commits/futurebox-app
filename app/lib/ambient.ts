/**
 * The photo's own colours, tiny, for the glow behind the Photo Editor.
 *
 * The owner, 27 October 2026, of the tool panel: *"nogsteeds solid oor 'n
 * groot gedeelte van die skerm met 'n swart agtergrond"*. The panel is glass,
 * but glass over a black room is black. So the room behind it is the photo
 * itself, blurred out of all detail, and the glass shows its colours.
 *
 * Forty-eight pixels: a colour field, not a picture, so it is no way out of
 * the room for the photograph (the paid export is), and it costs nothing to
 * redraw.
 */
export function ambientOf(picture: HTMLImageElement | null): string | null {
  if (!picture) return null;
  const wide = picture.naturalWidth || picture.width;
  const tall = picture.naturalHeight || picture.height;
  if (!wide || !tall) return null;
  try {
    const canvas = document.createElement('canvas');
    const scale = 48 / Math.max(wide, tall);
    canvas.width = Math.max(1, Math.round(wide * scale));
    canvas.height = Math.max(1, Math.round(tall * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(picture, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    /* A picture from another address that will not be read: no glow. */
    return null;
  }
}
