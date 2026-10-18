/**
 * The document room's tools, by name, and how to open the room on one.
 *
 * Kept apart from the room itself (`components/PdfRoom.tsx`) so the All
 * tools page and the front door can name a tool without loading the room,
 * which loads the PDF libraries.
 */

export type PdfToolId = 'organise' | 'combine' | 'comment' | 'edit' | 'sign' | 'redact' | 'protect' | 'form' | 'convert';

export interface PdfTool {
  readonly id: PdfToolId;
  readonly en: string;
  readonly af: string;
  /** One line under its name on the room's front page. */
  readonly enLine: string;
  readonly afLine: string;
}

export const PDF_TOOLS: readonly PdfTool[] = [
  { id: 'edit', en: 'Edit a PDF', af: 'Wysig ’n PDF', enLine: 'Change words, add text, pictures, links, headers and watermarks.', afLine: 'Verander woorde, sit teks, prente, skakels, opskrifte en watermerke by.' },
  { id: 'sign', en: 'Fill and sign', af: 'Vul in en teken', enLine: 'Fill in a form and sign it with your finger.', afLine: 'Vul ’n vorm in en teken dit met jou vinger.' },
  { id: 'organise', en: 'Organise pages', af: 'Rangskik bladsye', enLine: 'Turn, move, delete, insert and take pages out.', afLine: 'Draai, skuif, vee uit, voeg in en haal bladsye uit.' },
  { id: 'combine', en: 'Combine files', af: 'Voeg lêers saam', enLine: 'Several PDFs and pictures as one document.', afLine: 'Verskeie PDF’s en prente as een dokument.' },
  { id: 'comment', en: 'Add comments', af: 'Lewer kommentaar', enLine: 'Sticky notes, highlights, underlines and strike-throughs.', afLine: 'Plaknotas, uitlig, onderstreep en deurhaal.' },
  { id: 'redact', en: 'Redact', af: 'Swart uit', enLine: 'Black out words for good, page by page or by searching.', afLine: 'Swart woorde vir altyd uit, bladsy vir bladsy of deur te soek.' },
  { id: 'protect', en: 'Protect a PDF', af: 'Beskerm ’n PDF', enLine: 'A password to open it, and nothing hidden left inside.', afLine: '’n Wagwoord om dit oop te maak, en niks versteek binne-in nie.' },
  { id: 'form', en: 'Prepare a form', af: 'Berei ’n vorm voor', enLine: 'Boxes to type in and tick, for somebody else to fill.', afLine: 'Blokkies om in te tik en te merk, vir iemand anders om in te vul.' },
  { id: 'convert', en: 'Convert', af: 'Skakel om', enLine: 'Pages as pictures, the words as text, pictures as a PDF, or a smaller file.', afLine: 'Bladsye as prente, die woorde as teks, prente as ’n PDF, of ’n kleiner lêer.' },
];

export const pdfTool = (id: PdfToolId): PdfTool => PDF_TOOLS.find((one) => one.id === id) ?? PDF_TOOLS[0];

/** The event the room listens for; its detail is the tool to open on, or null for the front page. */
export const OPEN_PDF_EVENT = 'fb-open-pdf';

/** Open the document room, on one tool or on its front page. */
export function askPdf(tool: PdfToolId | null = null): void {
  window.dispatchEvent(new CustomEvent<PdfToolId | null>(OPEN_PDF_EVENT, { detail: tool }));
}
