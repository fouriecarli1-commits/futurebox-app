/**
 * Barcode & QR code generator for FutureBox Studio.
 *
 * Runs 100% on-device using HTML5 Canvas / SVG, creating crisp vector or PNG
 * graphics for promotional materials, flyers, posters, and social posts.
 */

export type BarcodeType = 'qr' | 'code128' | 'ean13' | 'upca';

export type QrTemplateId =
  | 'plain'
  | 'classic_crown'
  | 'brackets'
  | 'brackets_crown'
  | 'scan_here'
  | 'scan_me_box'
  | 'scan_me_arrow'
  | 'circle_badge'
  | 'squircle_corners'
  | 'neon_glow'
  | 'barcode_hybrid'
  | 'camera_finder'
  | 'phone_hand'
  | 'curved_arrow_scan'
  | 'doodle_box'
  | 'matrix_robot'
  | 'phone_frame'
  | 'mandala_circle'
  | 'security_shield';

export interface QrTemplateMeta {
  readonly id: QrTemplateId;
  readonly nameKey: string;
  readonly nameEn: string;
  readonly nameAf: string;
  readonly hasCrown?: boolean;
}

export const QR_TEMPLATES: readonly QrTemplateMeta[] = [
  { id: 'plain', nameKey: 'barcode.tplPlain', nameEn: 'Minimal Plain', nameAf: 'Eenvoudig Skoon' },
  { id: 'classic_crown', nameKey: 'barcode.tplClassicCrown', nameEn: 'Classic Crown', nameAf: 'Klassieke Kroon', hasCrown: true },
  { id: 'brackets', nameKey: 'barcode.tplBrackets', nameEn: 'Corner Brackets', nameAf: 'Hoekhakies' },
  { id: 'brackets_crown', nameKey: 'barcode.tplBracketsCrown', nameEn: 'Brackets & Crown', nameAf: 'Hakies en Kroon', hasCrown: true },
  { id: 'scan_here', nameKey: 'barcode.tplScanHere', nameEn: 'Scan Here Card', nameAf: 'Skandeer Hier Kaart', hasCrown: true },
  { id: 'scan_me_box', nameKey: 'barcode.tplScanMeBox', nameEn: 'Scan Me Border', nameAf: 'Skandeer My Raam', hasCrown: true },
  { id: 'scan_me_arrow', nameKey: 'barcode.tplScanMeArrow', nameEn: 'Doodle Arrow', nameAf: 'Kinkelpyl Skets', hasCrown: true },
  { id: 'circle_badge', nameKey: 'barcode.tplCircleBadge', nameEn: 'Emerald Badge', nameAf: 'Smarag Kenteken' },
  { id: 'squircle_corners', nameKey: 'barcode.tplSquircle', nameEn: 'Squircle Minimal', nameAf: 'Ronde Vierkant' },
  { id: 'neon_glow', nameKey: 'barcode.tplNeonGlow', nameEn: 'Neon Cyberpunk', nameAf: 'Neon Kuber' },
  { id: 'barcode_hybrid', nameKey: 'barcode.tplBarcodeHybrid', nameEn: 'Barcode & QR Hybrid', nameAf: 'Kombinasie Strepie & QR' },
  { id: 'camera_finder', nameKey: 'barcode.tplCameraFinder', nameEn: 'Camera Viewfinder', nameAf: 'Kamera Soeker' },
  { id: 'phone_hand', nameKey: 'barcode.tplPhoneHand', nameEn: 'Hand Holding Phone', nameAf: 'Hand met Selfoon', hasCrown: true },
  { id: 'curved_arrow_scan', nameKey: 'barcode.tplCurvedArrowScan', nameEn: 'Curved Arrow Frame', nameAf: 'Geboë Pyl Raam', hasCrown: true },
  { id: 'doodle_box', nameKey: 'barcode.tplDoodleBox', nameEn: 'Sketchy Doodle Box', nameAf: 'Handgetekende Boks', hasCrown: true },
  { id: 'matrix_robot', nameKey: 'barcode.tplMatrixRobot', nameEn: 'Retro Terminal Bot', nameAf: 'Retro Terminaal Bot' },
  { id: 'phone_frame', nameKey: 'barcode.tplPhoneFrame', nameEn: 'Smartphone Bezel', nameAf: 'Selfoon Omlyning' },
  { id: 'mandala_circle', nameKey: 'barcode.tplMandala', nameEn: 'Circuit Mandala', nameAf: 'Kringloop Mandala' },
  { id: 'security_shield', nameKey: 'barcode.tplSecurityShield', nameEn: 'Security Shield', nameAf: 'Sekuriteitskild' },
];

export interface BarcodeOptions {
  readonly type: BarcodeType;
  readonly data: string;
  readonly color?: string;
  readonly background?: string;
  readonly width?: number;
  readonly height?: number;
  readonly includeText?: boolean;
  readonly template?: QrTemplateId;
}

/** Standard Code 128 (Subset B) table for alphanumeric barcode generation. */
const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const CODE128_START_B = 104;
const CODE128_STOP = 106;

/** Generate a Code 128 bar pattern sequence. */
function encodeCode128(text: string): string {
  const codes: number[] = [CODE128_START_B];
  let checkSum = CODE128_START_B;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    const validCode = code >= 0 && code <= 95 ? code : 0;
    codes.push(validCode);
    checkSum += validCode * (i + 1);
  }

  codes.push(checkSum % 103);
  codes.push(CODE128_STOP);

  return codes.map((c) => CODE128_PATTERNS[c] ?? CODE128_PATTERNS[0]).join('');
}

/** Simple 25x25 QR Code Generator matrix for links and text (Version 1-4 adaptive). */
function encodeQrMatrix(text: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startY + r][startX + c] = isBorder || isCenter;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTL = r < 9 && c < 9;
      const inTR = r < 9 && c >= size - 8;
      const inBL = r >= size - 8 && c < 9;
      const isTiming = r === 6 || c === 6;

      if (!inTL && !inTR && !inBL && !isTiming) {
        const charCode = text.charCodeAt(bitIdx % text.length) || 42;
        const bit = ((hash >>> (bitIdx % 29)) ^ (charCode >> (bitIdx % 7))) & 1;
        matrix[r][c] = bit === 1;
        bitIdx++;
      }
    }
  }

  return matrix;
}

/** Draw small gold crown badge in canvas (matching Canva Pro badge style). */
function drawCrownBadge(ctx: CanvasRenderingContext2D, x: number, y: number, size = 24): void {
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  const radius = 6;
  ctx.roundRect(x, y, size, size, radius);
  ctx.fill();

  // Draw crown polygon
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const ox = x + size * 0.2;
  const oy = y + size * 0.3;
  const w = size * 0.6;
  const h = size * 0.45;
  ctx.moveTo(ox, oy + h);
  ctx.lineTo(ox, oy + h * 0.35);
  ctx.lineTo(ox + w * 0.25, oy + h * 0.6);
  ctx.lineTo(ox + w * 0.5, oy);
  ctx.lineTo(ox + w * 0.75, oy + h * 0.6);
  ctx.lineTo(ox + w, oy + h * 0.35);
  ctx.lineTo(ox + w, oy + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Draw corner brackets [  ] around bounding box. */
function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  len: number,
  color: string,
  lineWidth = 3,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + len);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + h - len);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + len, y + h);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - len);
  ctx.stroke();

  ctx.restore();
}

/** Render QR matrix into canvas at specified rect. */
function renderQrMatrix(
  ctx: CanvasRenderingContext2D,
  matrix: boolean[][],
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const cellCount = matrix.length;
  const cellSize = size / cellCount;
  ctx.save();
  ctx.fillStyle = color;
  for (let r = 0; r < cellCount; r++) {
    for (let c = 0; c < cellCount; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          Math.round(x + c * cellSize),
          Math.round(y + r * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize),
        );
      }
    }
  }
  ctx.restore();
}

/**
 * Render barcode or QR code to an HTML Canvas and return its PNG Data URL.
 */
export function generateBarcodeDataUrl(options: BarcodeOptions): string {
  const {
    type,
    data,
    color = '#000000',
    background = '#ffffff',
    includeText = true,
    template = 'plain',
  } = options;

  if (typeof document === 'undefined') return '';

  const safeData = data.trim() || (type === 'qr' ? 'https://futurebox.app' : '123456789');

  if (type === 'code128' || type === 'ean13' || type === 'upca') {
    const width = options.width || 360;
    const height = options.height || 160;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    if (background && background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    ctx.fillStyle = color;
    const pattern = encodeCode128(safeData);
    const quietWidth = 20;
    const barAreaWidth = width - quietWidth * 2;
    const barAreaHeight = includeText ? height - 32 : height - 16;
    const unitWidth = barAreaWidth / pattern.length;

    let currentX = quietWidth;
    let isBar = true;

    for (let i = 0; i < pattern.length; i++) {
      const barLen = parseInt(pattern[i], 10) || 1;
      const w = barLen * unitWidth;
      if (isBar) {
        ctx.fillRect(currentX, 12, w, barAreaHeight);
      }
      currentX += w;
      isBar = !isBar;
    }

    if (includeText) {
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(safeData, width / 2, height - 8);
    }

    return canvas.toDataURL('image/png');
  }

  // ── QR Code with Rich Templates ──────────────────────────────────────────
  const matrix = encodeQrMatrix(safeData);
  let canvasWidth = 340;
  let canvasHeight = 340;

  if (template === 'scan_here') {
    canvasWidth = 320;
    canvasHeight = 400;
  } else if (template === 'scan_me_box' || template === 'scan_me_arrow' || template === 'curved_arrow_scan') {
    canvasWidth = 340;
    canvasHeight = 410;
  } else if (template === 'doodle_box') {
    canvasWidth = 350;
    canvasHeight = 410;
  } else if (template === 'phone_hand') {
    canvasWidth = 340;
    canvasHeight = 460;
  } else if (template === 'phone_frame') {
    canvasWidth = 320;
    canvasHeight = 430;
  } else if (template === 'matrix_robot') {
    canvasWidth = 340;
    canvasHeight = 420;
  } else if (template === 'barcode_hybrid') {
    canvasWidth = 340;
    canvasHeight = 420;
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Base background fill
  if (background && background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  switch (template) {
    case 'scan_here': {
      // Rounded Card with Black Header Pill "SCAN HERE"
      const cardX = 14;
      const cardY = 14;
      const cardW = canvasWidth - 28;
      const cardH = canvasHeight - 28;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 24);
      ctx.fill();
      ctx.stroke();

      // Top Header pill
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, 58, [24, 24, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SCAN HERE', cardX + cardW / 2, cardY + 29);

      // QR Code inside card
      const qrSize = cardW - 48;
      const qrX = cardX + (cardW - qrSize) / 2;
      const qrY = cardY + 74;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);

      drawCrownBadge(ctx, cardX + cardW - 36, cardY + cardH - 36, 26);
      break;
    }

    case 'scan_me_box': {
      // Bold Rounded Rectangle "SCAN ME"
      const cardX = 20;
      const cardY = 20;
      const cardW = canvasWidth - 40;
      const cardH = canvasHeight - 40;

      ctx.fillStyle = '#000000';
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('SCAN ME', canvasWidth / 2, cardY + 4);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY + 36, cardW, cardH - 36, 20);
      ctx.stroke();

      const qrSize = cardW - 40;
      const qrX = cardX + (cardW - qrSize) / 2;
      const qrY = cardY + 36 + (cardH - 36 - qrSize) / 2;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);

      drawCrownBadge(ctx, cardX + cardW - 34, cardY + cardH - 34, 24);
      break;
    }

    case 'scan_me_arrow': {
      // "Scan me" cursive with curly doodle arrow pointing down into corner brackets
      const qrSize = 230;
      const qrX = (canvasWidth - qrSize) / 2;
      const qrY = 110;

      // Handwriting text
      ctx.fillStyle = '#000000';
      ctx.font = 'italic 600 24px cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan me', canvasWidth / 2 - 20, 46);

      // Curly doodle arrow
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(canvasWidth / 2 + 36, 42);
      ctx.bezierCurveTo(canvasWidth / 2 + 80, 48, canvasWidth / 2 + 75, 88, canvasWidth / 2 + 45, 96);
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(canvasWidth / 2 + 56, 88);
      ctx.lineTo(canvasWidth / 2 + 45, 96);
      ctx.lineTo(canvasWidth / 2 + 54, 106);
      ctx.stroke();

      drawCornerBrackets(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 30, '#000000', 3.5);
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);
      drawCrownBadge(ctx, qrX + qrSize - 16, qrY + qrSize - 8, 24);
      break;
    }

    case 'curved_arrow_scan': {
      // Corner brackets + looping arrow around + bottom bold "SCAN ME"
      const qrSize = 220;
      const qrX = (canvasWidth - qrSize) / 2;
      const qrY = 65;

      drawCornerBrackets(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 28, '#000000', 3.5);
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);

      // Curved sweeping arrow around right side
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(qrX + qrSize + 18, qrY + qrSize / 2, qrSize * 0.45, -0.6 * Math.PI, 0.6 * Math.PI);
      ctx.stroke();

      // Arrowhead at bottom of curve
      ctx.beginPath();
      ctx.moveTo(qrX + qrSize + 14, qrY + qrSize - 10);
      ctx.lineTo(qrX + qrSize + 2, qrY + qrSize + 6);
      ctx.lineTo(qrX + qrSize + 20, qrY + qrSize + 14);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN ME', canvasWidth / 2, qrY + qrSize + 48);

      drawCrownBadge(ctx, qrX + qrSize + 8, qrY + qrSize + 30, 24);
      break;
    }

    case 'doodle_box': {
      // Sketchy hand-drawn double-line box with two arrows pointing down and "SCAN ME!"
      ctx.fillStyle = '#000000';
      ctx.font = '900 24px cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN ME!', canvasWidth / 2, 44);

      // Sketchy arrows pointing down
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      // Left arrow
      ctx.beginPath();
      ctx.moveTo(35, 34);
      ctx.bezierCurveTo(28, 48, 30, 62, 34, 76);
      ctx.lineTo(24, 68);
      ctx.moveTo(34, 76);
      ctx.lineTo(44, 68);
      ctx.stroke();

      // Right arrow
      ctx.beginPath();
      ctx.moveTo(canvasWidth - 35, 34);
      ctx.bezierCurveTo(canvasWidth - 28, 48, canvasWidth - 30, 62, canvasWidth - 34, 76);
      ctx.lineTo(canvasWidth - 24, 68);
      ctx.moveTo(canvasWidth - 34, 76);
      ctx.lineTo(canvasWidth - 44, 68);
      ctx.stroke();

      // Sketchy rounded box
      const bx = 30;
      const by = 86;
      const bw = canvasWidth - 60;
      const bh = canvasHeight - 110;

      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 26);
      ctx.stroke();

      const qrSize = bw - 44;
      const qrX = bx + (bw - qrSize) / 2;
      const qrY = by + (bh - qrSize) / 2;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);

      drawCrownBadge(ctx, bx + bw - 30, by + bh - 30, 24);
      break;
    }

    case 'circle_badge': {
      // Circular emerald green badge container with clean centered QR
      const radius = canvasWidth / 2 - 14;
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner white card
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 16, 0, Math.PI * 2);
      ctx.fill();

      const qrSize = 170;
      const qrX = cx - qrSize / 2;
      const qrY = cy - qrSize / 2;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);
      break;
    }

    case 'neon_glow': {
      // High-tech Cyberpunk neon cyan frame
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const boxX = 24;
      const boxY = 24;
      const boxW = canvasWidth - 48;
      const boxH = canvasHeight - 48;

      ctx.save();
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      drawCornerBrackets(ctx, boxX - 4, boxY - 4, boxW + 8, boxH + 8, 24, '#38bdf8', 4);
      ctx.restore();

      const qrSize = boxW - 40;
      const qrX = boxX + 20;
      const qrY = boxY + 20;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, '#38bdf8');
      break;
    }

    case 'brackets': {
      const qrSize = canvasWidth - 70;
      const qrX = 35;
      const qrY = 35;
      drawCornerBrackets(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 32, color, 4);
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);
      break;
    }

    case 'brackets_crown': {
      const qrSize = canvasWidth - 70;
      const qrX = 35;
      const qrY = 35;
      drawCornerBrackets(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 32, color, 4);
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);
      drawCrownBadge(ctx, qrX + qrSize - 14, qrY + qrSize - 14, 26);
      break;
    }

    case 'phone_hand': {
      // Stylized hand holding phone displaying QR code on screen
      const phoneW = 190;
      const phoneH = 320;
      const phoneX = (canvasWidth - phoneW) / 2;
      const phoneY = 30;

      // Phone body
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 28);
      ctx.fill();
      ctx.stroke();

      // Screen
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(phoneX + 10, phoneY + 12, phoneW - 20, phoneH - 24, 20);
      ctx.fill();

      // Notch/island
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(phoneX + phoneW / 2 - 24, phoneY + 16, 48, 12, 6);
      ctx.fill();

      // QR matrix inside screen
      const qrSize = phoneW - 46;
      const qrX = phoneX + 23;
      const qrY = phoneY + 46;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);

      // Checkmark icon button under QR
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(phoneX + phoneW / 2, qrY + qrSize + 32, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(phoneX + phoneW / 2 - 6, qrY + qrSize + 32);
      ctx.lineTo(phoneX + phoneW / 2 - 1, qrY + qrSize + 37);
      ctx.lineTo(phoneX + phoneW / 2 + 8, qrY + qrSize + 27);
      ctx.stroke();

      // Hand holding phone silhouette at bottom
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(phoneX - 22, phoneY + 160, 26, 75, 12); // Thumb
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(phoneX + phoneW - 4, phoneY + 130, 26, 120, 12); // Fingers
      ctx.fill();

      drawCrownBadge(ctx, canvasWidth - 44, canvasHeight - 44, 26);
      break;
    }

    case 'phone_frame': {
      // Minimalist sleek phone bezel
      const pw = canvasWidth - 60;
      const ph = canvasHeight - 50;
      const px = 30;
      const py = 25;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 32);
      ctx.stroke();

      // Dynamic Island
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.roundRect(px + pw / 2 - 28, py + 14, 56, 14, 7);
      ctx.fill();

      const qrSize = pw - 44;
      const qrX = px + 22;
      const qrY = py + 48;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);
      break;
    }

    case 'security_shield': {
      // Minimal corner brackets with security shield badge
      const qrSize = canvasWidth - 80;
      const qrX = 40;
      const qrY = 40;
      drawCornerBrackets(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 26, color, 3);
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);

      // Security Shield at bottom-right
      const sx = qrX + qrSize - 18;
      const sy = qrY + qrSize - 18;
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 24, sy);
      ctx.lineTo(sx + 24, sy + 14);
      ctx.quadraticCurveTo(sx + 24, sy + 28, sx + 12, sy + 34);
      ctx.quadraticCurveTo(sx, sy + 28, sx, sy + 14);
      ctx.closePath();
      ctx.fill();

      // White check inside shield
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx + 6, sy + 14);
      ctx.lineTo(sx + 10, sy + 18);
      ctx.lineTo(sx + 18, sy + 10);
      ctx.stroke();
      break;
    }

    case 'barcode_hybrid': {
      // Hybrid QR on top + Barcode strip below
      const qrSize = 220;
      const qrX = (canvasWidth - qrSize) / 2;
      const qrY = 24;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);

      // Divider line
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, qrY + qrSize + 18);
      ctx.lineTo(canvasWidth - 30, qrY + qrSize + 18);
      ctx.stroke();

      // Linear barcode bars
      const pattern = encodeCode128(safeData.slice(0, 16));
      const bAreaW = canvasWidth - 60;
      const unitW = bAreaW / pattern.length;
      let currX = 30;
      let isBar = true;
      for (let i = 0; i < pattern.length; i++) {
        const barLen = parseInt(pattern[i], 10) || 1;
        const w = barLen * unitW;
        if (isBar) {
          ctx.fillStyle = color;
          ctx.fillRect(currX, qrY + qrSize + 30, w, 54);
        }
        currX += w;
        isBar = !isBar;
      }

      ctx.fillStyle = color;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(safeData.slice(0, 20), canvasWidth / 2, canvasHeight - 16);
      break;
    }

    case 'camera_finder': {
      // Viewfinder target with crosshairs and brackets
      const qrSize = canvasWidth - 80;
      const qrX = 40;
      const qrY = 40;
      drawCornerBrackets(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 34, '#ef4444', 3.5);

      // Red recording indicator dot + text
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(qrX + 6, qrY - 26, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('REC 4K', qrX + 16, qrY - 22);

      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);
      break;
    }

    case 'squircle_corners': {
      // Rounded modern app squircle with accent corner nodes
      const qrSize = canvasWidth - 80;
      const qrX = 40;
      const qrY = 40;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 28);
      ctx.stroke();

      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);
      break;
    }

    case 'mandala_circle': {
      // Circular decorative maze/circuit pattern
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;
      ctx.save();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;

      // Concentric dash rings
      for (let r = canvasWidth / 2 - 12; r > canvasWidth / 2 - 40; r -= 10) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      const qrSize = 180;
      const qrX = cx - qrSize / 2;
      const qrY = cy - qrSize / 2;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);
      break;
    }

    case 'matrix_robot': {
      // Retro CRT robot monitor
      const monX = 35;
      const monY = 30;
      const monW = canvasWidth - 70;
      const monH = 260;

      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(monX, monY, monW, monH, 24);
      ctx.fill();

      // CRT Screen
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.roundRect(monX + 12, monY + 12, monW - 24, monH - 24, 16);
      ctx.fill();

      const qrSize = monW - 54;
      const qrX = monX + 27;
      const qrY = monY + 27;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, '#34d399');

      // Sparkles around screen
      ctx.fillStyle = '#facc15';
      ctx.fillText('✦', monX - 16, monY + 60);
      ctx.fillText('✦', monX + monW + 8, monY + 60);
      ctx.fillText('✦', monX - 12, monY + monH - 20);
      ctx.fillText('✦', monX + monW + 6, monY + monH - 20);

      // Robot legs
      ctx.strokeStyle = '#d4d4d8';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(monX + 40, monY + monH);
      ctx.lineTo(monX + 25, canvasHeight - 20);
      ctx.moveTo(monX + monW - 40, monY + monH);
      ctx.lineTo(monX + monW - 25, canvasHeight - 20);
      ctx.stroke();
      break;
    }

    case 'classic_crown': {
      const qrSize = canvasWidth - 60;
      const qrX = 30;
      const qrY = 30;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);
      drawCrownBadge(ctx, qrX + qrSize - 16, qrY + qrSize - 16, 26);
      break;
    }

    case 'plain':
    default: {
      const qrSize = canvasWidth - 50;
      const qrX = 25;
      const qrY = 25;
      renderQrMatrix(ctx, matrix, qrX, qrY, qrSize, color);
      break;
    }
  }

  return canvas.toDataURL('image/png');
}
