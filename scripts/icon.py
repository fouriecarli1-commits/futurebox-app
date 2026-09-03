"""
Draw the FutureBox app icon as a PNG, with no image library.

## Why it is this shape

It is the mark the app already uses. `Landing.tsx` draws a chip glyph on a
rounded tile with an emerald-to-cyan gradient, at the top of the page and again
in the hero. An app icon that is a different drawing is a second brand: the
thing in the browser tab would not be the thing on the landing page, and
somebody looking for FutureBox among twenty tabs would be looking for the wrong
picture.

The first version of this file drew a box instead — "the black box of the
future" is the line under the wordmark, so it seemed obvious. It was still
wrong, because the app was not already drawing a box anywhere.

## Why no image library

A PNG is a header, a zlib stream of filtered rows, and a checksum. Adding a
dependency to produce four small files, in a project that would then carry it
forever, is the wrong trade.

Rendered at four times the size and averaged down, which is all anti-aliasing
is, so the edges are not a staircase at thirty-two pixels.

    python3 scripts/icon.py
"""
import zlib, struct

EMERALD = (16, 185, 129)   # emerald-500, the gradient's start
CYAN    = (34, 211, 238)   # cyan-400, its end
INK     = (9, 9, 11)       # the glyph, on the app's own near-black


def rounded(x, y, size, r):
    """Inside a rounded square of `size`, corner radius `r`?"""
    cx = min(max(x, r), size - r)
    cy = min(max(y, r), size - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def on_rect_stroke(x, y, x0, y0, x1, y1, half):
    """On the outline of a rectangle, within `half` of it?"""
    inside_outer = (x0 - half <= x <= x1 + half) and (y0 - half <= y <= y1 + half)
    inside_inner = (x0 + half < x < x1 - half) and (y0 + half < y < y1 - half)
    return inside_outer and not inside_inner


def glyph(gx, gy, unit):
    """
    Lucide's `cpu`, in its own 24-unit box: a rounded body, an inner square,
    and three pins on each side. Coordinates are theirs, so the icon and the
    page cannot drift apart.
    """
    half = 1.15 * unit          # their stroke is 2 units; a shade heavier reads better small
    if on_rect_stroke(gx, gy, 4 * unit, 4 * unit, 20 * unit, 20 * unit, half):
        return True
    if on_rect_stroke(gx, gy, 9 * unit, 9 * unit, 15 * unit, 15 * unit, half):
        return True
    # The pins. Two per side in lucide's own path, at 9 and 15.
    for at in (9, 15):
        # Top and bottom.
        if abs(gx - at * unit) <= half and 2 * unit <= gy <= 4 * unit:
            return True
        if abs(gx - at * unit) <= half and 20 * unit <= gy <= 22 * unit:
            return True
        # Left and right.
        if abs(gy - at * unit) <= half and 2 * unit <= gx <= 4 * unit:
            return True
        if abs(gy - at * unit) <= half and 20 * unit <= gx <= 22 * unit:
            return True
    return False


def draw(size, scale=4):
    S = size * scale
    radius = S * 0.22
    # The glyph fills a little over half the tile, the proportion the landing
    # page uses: a 20-pixel icon inside a 36-pixel tile.
    box = S * 0.58
    off = (S - box) / 2
    unit = box / 24.0

    rows = []
    for py in range(S):
        row = []
        for px in range(S):
            if not rounded(px, py, S, radius):
                row.append(None)
                continue
            # to-tr: emerald at the bottom-left, cyan at the top-right.
            t = ((px / S) + (1 - py / S)) / 2
            colour = tuple(round(EMERALD[i] + (CYAN[i] - EMERALD[i]) * t) for i in range(3))
            if glyph(px - off, py - off, unit):
                colour = INK
            row.append(colour)
        rows.append(row)

    out = bytearray()
    for y in range(size):
        out.append(0)                                   # PNG filter: none
        for x in range(size):
            r = g = b = a = 0
            for dy in range(scale):
                for dx in range(scale):
                    c = rows[y * scale + dy][x * scale + dx]
                    if c is not None:
                        r += c[0]; g += c[1]; b += c[2]; a += 255
            n = scale * scale
            if a == 0:
                out += bytes((0, 0, 0, 0))
            else:
                covered = a // 255
                out += bytes((r // covered, g // covered, b // covered, a // n))
    return bytes(out)


def png(size, path):
    raw = draw(size)

    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)      # 8-bit RGBA
    blob = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    open(path, 'wb').write(blob)
    print(path, len(blob), 'bytes')


png(512, 'public/icon-512.png')
png(192, 'public/icon-192.png')
png(180, 'app/apple-icon.png')
png(32,  'app/icon.png')
