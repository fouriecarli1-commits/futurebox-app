/**
 * The Photo Editor's pages, as one PDF.
 *
 * The owner, 29 October 2026: *"Say they want to download it in a pdf, then
 * the screens must all be on the one document. If it is png then they will
 * land separately on their device."* So the ticked pages, each drawn and
 * charged exactly as a picture is (`takePages`), are laid one to a sheet in
 * page order. Nothing is redrawn here: each sheet holds the picture the room
 * drew, at its full size, so the PDF is as sharp as the PNG would have been.
 *
 * A sheet is the page's pixels at 96 to the inch (three quarters of a point
 * each), which is how a screen-made picture prints at the size it was seen.
 */

/** One drawn page: its file (PNG or JPG) and its size in pixels. */
export interface DrawnPage {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
}

/** Points per pixel at 96 to the inch. */
export const POINTS_PER_PIXEL = 0.75;

/** The pages in one PDF, in the order given. Loaded only when asked for. */
export async function pagesPdf(pages: readonly DrawnPage[]): Promise<Blob> {
  const { PDFDocument } = await import('@cantoo/pdf-lib');
  const doc = await PDFDocument.create();
  for (const one of pages) {
    const bytes = new Uint8Array(await one.blob.arrayBuffer());
    const image = one.blob.type === 'image/jpeg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
    const width = one.width * POINTS_PER_PIXEL;
    const height = one.height * POINTS_PER_PIXEL;
    const sheet = doc.addPage([width, height]);
    sheet.drawImage(image, { x: 0, y: 0, width, height });
  }
  const saved = await doc.save();
  return new Blob([saved as BlobPart], { type: 'application/pdf' });
}
