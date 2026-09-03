"""
Draw the FutureBox mark as a PNG, with no image library.

The brand is a wordmark — FUTURE in white, BOX in emerald, on near-black —
and "the black box of the future" is the line under it. So the mark is the
black box: a dark rounded square with an emerald box drawn inside it.

Rendered at four times the size and averaged down, which is all
anti-aliasing is, so the edges are not a staircase at 32 pixels.
"""
import zlib, struct, math

BG      = (9, 9, 11)         # zinc-950, the app's own ground
EMERALD = (16, 185, 129)     # the same green as BOX in the wordmark

def rounded(x, y, w, h, r):
    """Inside a rounded rectangle?"""
    if x < 0 or y < 0 or x >= w or y >= h:
        return False
    cx = min(max(x, r), w - r)
    cy = min(max(y, r), h - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def draw(size, scale=4):
    S = size * scale
    r = S * 0.22                       # the tile's corner
    # The box: a square outline, sitting slightly low so it reads as an object
    # standing rather than a frame floating.
    m  = S * 0.24                      # margin
    bw = S - 2 * m                     # box width
    top = m + S * 0.03
    thick = S * 0.085                  # stroke
    lid = S * 0.055                    # the lid line across the top third

    rows = []
    for py in range(S):
        row = []
        for px in range(S):
            colour = None
            if rounded(px, py, S, S, r):
                colour = BG
                inbox = (m <= px <= m + bw) and (top <= py <= top + bw)
                if inbox:
                    edge = (
                        px <= m + thick or px >= m + bw - thick
                        or py <= top + thick or py >= top + bw - thick
                    )
                    # The lid: one line across, which is what makes a square
                    # read as a box rather than as a frame.
                    lidline = abs(py - (top + bw * 0.34)) <= lid / 2
                    if edge or lidline:
                        colour = EMERALD
            row.append(colour)
        rows.append(row)

    # Average each block of scale × scale down to one pixel, over transparency.
    out = bytearray()
    for y in range(size):
        out.append(0)                                  # PNG filter: none
        for x in range(size):
            rs = gs = bs = as_ = 0
            for dy in range(scale):
                for dx in range(scale):
                    c = rows[y * scale + dy][x * scale + dx]
                    if c is not None:
                        rs += c[0]; gs += c[1]; bs += c[2]; as_ += 255
            n = scale * scale
            if as_ == 0:
                out += bytes((0, 0, 0, 0))
            else:
                # Averaged over the covered samples only, so the edge colour is
                # the shape's colour at partial alpha rather than mixed with black.
                covered = as_ // 255
                out += bytes((rs // covered, gs // covered, bs // covered, as_ // n))
    return bytes(out)

def png(size, path):
    raw = draw(size)
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)   # 8-bit RGBA
    blob = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    open(path, 'wb').write(blob)
    print(path, len(blob), 'bytes')

png(512, 'public/icon-512.png')
png(192, 'public/icon-192.png')
png(180, 'app/apple-icon.png')
png(32,  'app/icon.png')
