# Erzeugt alle Pixelart-Grafiken von TastenHeld (16-Bit-Stil) als kleine PNG-Dateien.
# Aufruf im Projektordner:  python3 tools/pixelart.py
# Braucht Python 3 mit Pillow (pip install pillow). Die Bilder werden im Spiel
# mit "image-rendering: pixelated" vergrößert, deshalb sind sie so klein.
import math, os, random
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'pixel')
T = (0, 0, 0, 0)


def hexc(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


# Grundpalette (Kupfer & Pergament)
P = {k: hexc(v) for k, v in {
    'K': '3b2414', 'D': '2a1a0e', 'C': 'c4783f', 'c': '8a4a1c', 'H': 'e7a06a',
    'B': 'e0a94a', 'b': 'b07a24', 'h': 'f6d68a', 'S': '2a2338', 'E': '7ff3c4',
    'G': '9fe3e0', 'Y': 'ffcf6b', 'W': 'fbf3df', 'R': 'b03a2e', 'w': 'ffffff',
    'N': '1d1d2b', 'U': '2a3a8a', 'g': '5aa84a', 'q': '2f6a2a', 'r': '8a5a2b', 'n': 'd9b886',
}.items()}

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def save(img, *path):
    full = os.path.join(ROOT, *path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    img.save(full, optimize=True)


def from_grid(rows, pal=P):
    w = len(rows[0])
    img = Image.new('RGBA', (w, len(rows)), T)
    for y, row in enumerate(rows):
        assert len(row) == w, (y, row)
        for x, ch in enumerate(row):
            if ch != '.':
                img.putpixel((x, y), pal[ch])
    return img


def outline(img, color=P['K']):
    """Pixel-Umriss: transparente Pixel neben gefüllten werden dunkel."""
    w, h = img.size
    src = img.copy()
    for y in range(h):
        for x in range(w):
            if src.getpixel((x, y))[3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src.getpixel((nx, ny))[3] > 128 and src.getpixel((nx, ny)) != color:
                        img.putpixel((x, y), color)
                        break
    return img


def dither(img, box, stops):
    """Senkrechter Verlauf mit geordnetem Dithering (typisch Pixelart)."""
    x0, y0, x1, y1 = box
    n = len(stops) - 1
    for y in range(y0, y1):
        t = (y - y0) / max(1, (y1 - y0 - 1)) * n
        i = min(int(t), n - 1)
        f = t - i
        for x in range(x0, x1):
            img.putpixel((x, y), stops[i + 1] if f * 16 > BAYER[y % 4][x % 4] else stops[i])


def glow(img, cx, cy, R, inner, outer):
    w, h = img.size
    for y in range(cy - R, cy + R):
        for x in range(cx - R, cx + R):
            if 0 <= x < w and 0 <= y < h:
                f = 1 - math.hypot(x - cx, y - cy) / R
                if f > 0 and f * 20 > BAYER[y % 4][x % 4] + 4:
                    img.putpixel((x, y), outer if f < 0.5 else inner)


def paste(dst, sprite, x, y):
    dst.alpha_composite(sprite, (int(x), int(y)))


def gear_into(img, cx, cy, r, teeth, col, dark, light=None):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            dx, dy = x - cx, y - cy
            rr = math.hypot(dx, dy)
            a = (math.atan2(dy, dx) / (2 * math.pi)) * teeth
            lim = r if (a - math.floor(a)) < 0.42 else r * 0.72
            if r * 0.28 < rr <= lim and 0 <= x < img.width and 0 <= y < img.height:
                c = col
                if dx + dy > r * 0.5:
                    c = dark
                elif light and dx + dy < -r * 0.5:
                    c = light
                img.putpixel((x, y), c)


def cloud(d, x, y, s, col=None):
    col = col or hexc('ffffff')
    d.ellipse([x, y + s, x + 6 * s, y + 3 * s], fill=col)
    d.ellipse([x + s, y, x + 4 * s, y + 3 * s], fill=col)


def flower(img, x, y, col):
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
        if 0 <= x + dx < img.width and 0 <= y + dy < img.height:
            img.putpixel((x + dx, y + dy), col)
    img.putpixel((x, y), hexc('f2a900'))
    if y + 2 < img.height:
        img.putpixel((x, y + 2), hexc('3f8f3a'))


def pine(d, x, y, s, col='4f8a45', dark='3a6a32'):
    d.rectangle([x - 1, y - 2 * s, x + 1, y], fill=P['r'])
    for i, (top, half) in enumerate(((14, 4), (10, 6), (6, 8))):
        d.polygon([(x, y - top * s - 2 * s), (x - half * s, y - (top - 6) * s - 2 * s), (x + half * s, y - (top - 6) * s - 2 * s)], fill=hexc(col))
        d.line([(x, y - top * s - 2 * s), (x + half * s, y - (top - 6) * s - 2 * s)], fill=hexc(dark))


def round_tree(d, x, y, s, col='6cae4f', dark='4a8a36'):
    d.rectangle([x - s, y - 6 * s, x + s, y], fill=P['r'])
    for (ox, oy, r) in ((0, -10, 5), (-4, -7, 4), (4, -7, 4)):
        d.ellipse([x + (ox - r) * s, y + (oy - r) * s, x + (ox + r) * s, y + (oy + r) * s], fill=hexc(col))
    d.arc([x - 5 * s, y - 15 * s, x + 5 * s, y - 5 * s], 300, 60, fill=hexc(dark))


# ======================================================================= Sprites
def make_tipp():
    t = Image.new('RGBA', (32, 32), T)
    d = ImageDraw.Draw(t)
    d.line([(16, 3), (16, 7)], fill=P['K'])
    d.rectangle([14, 0, 17, 2], fill=P['Y']); t.putpixel((14, 0), T); t.putpixel((17, 0), T)
    d.rectangle([14, 3, 17, 3], fill=P['B'])
    for cx in (5, 26):  # Zahnrad-Ohren
        d.rectangle([cx - 2, 10, cx + 2, 15], fill=P['B'])
        d.rectangle([cx - 3, 11, cx + 3, 14], fill=P['B'])
        d.point([(cx, 12), (cx, 13)], fill=P['b'])
    d.rounded_rectangle([7, 6, 24, 19], radius=3, fill=P['C'])
    d.line([(8, 7), (23, 7)], fill=P['H'])
    d.line([(8, 18), (23, 18)], fill=P['c'])
    d.rectangle([9, 10, 22, 17], fill=P['S'])
    d.rectangle([11, 12, 12, 14], fill=P['E']); d.rectangle([19, 12, 20, 14], fill=P['E'])
    t.putpixel((11, 12), P['W']); t.putpixel((19, 12), P['W'])
    d.line([(14, 16), (17, 16)], fill=P['E']); t.putpixel((13, 15), P['E']); t.putpixel((18, 15), P['E'])
    d.rectangle([7, 6, 24, 7], fill=P['c'])
    for gx in (10, 19):  # Fliegerbrille
        d.ellipse([gx - 2, 4, gx + 3, 9], fill=P['B'])
        d.ellipse([gx - 1, 5, gx + 2, 8], fill=P['G'])
        t.putpixel((gx, 5), P['W'])
    t.putpixel((8, 17), P['h']); t.putpixel((23, 17), P['h'])
    d.rectangle([14, 20, 17, 21], fill=P['B'])
    d.rounded_rectangle([8, 22, 23, 29], radius=2, fill=P['B'])
    d.line([(9, 22), (22, 22)], fill=P['h'])
    d.line([(9, 29), (22, 29)], fill=P['b'])
    d.ellipse([10, 23, 15, 28], fill=P['W'])
    t.putpixel((12, 25), P['R']); t.putpixel((13, 24), P['R'])
    d.rectangle([17, 24, 18, 25], fill=P['W']); d.rectangle([20, 24, 21, 25], fill=P['W'])
    d.rectangle([17, 27, 21, 27], fill=P['W'])
    d.line([(7, 23), (5, 25), (5, 27)], fill=P['c'])
    d.line([(24, 23), (26, 25), (26, 27)], fill=P['c'])
    d.rectangle([4, 28, 6, 29], fill=P['B']); d.rectangle([25, 28, 27, 29], fill=P['B'])
    d.rectangle([10, 30, 13, 30], fill=P['D']); d.rectangle([18, 30, 21, 30], fill=P['D'])
    t = outline(t)
    ImageDraw.Draw(t).rectangle([27, 19, 28, 20], fill=(255, 255, 255, 220))
    t.putpixel((29, 17), (255, 255, 255, 180))
    return t


def make_gear(size, teeth, col, dark, light):
    g = Image.new('RGBA', (size, size), T)
    c = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            dx, dy = x - c, y - c
            r = math.hypot(dx, dy)
            a = (math.atan2(dy, dx) / (2 * math.pi)) * teeth + 0.25  # Zähne symmetrisch ausrichten
            if r <= (size * 0.44 if (a - math.floor(a)) < 0.5 else size * 0.33):
                g.putpixel((x, y), light if dx + dy < -size * 0.25 else dark if dx + dy > size * 0.3 else col)
    return outline(g)


def make_monster(friend=False):
    m = Image.new('RGBA', (40, 40), T)
    d = ImageDraw.Draw(m)
    body, belly, feet = (('f59ac8', 'fcd0e6', 'e07ab0') if friend else ('8b6bd9', 'b9a2f0', '6a4fc0'))
    body, belly, feet = hexc(body), hexc(belly), hexc(feet)
    d.polygon([(10, 11), (8, 2), (15, 8)], fill=hexc('ffe8a3'))
    d.polygon([(29, 11), (31, 2), (24, 8)], fill=hexc('ffe8a3'))
    for (cx, cy, r) in ((20, 22, 13), (10, 18, 6), (30, 18, 6), (12, 28, 6), (28, 28, 6), (20, 10, 7), (13, 11, 5), (27, 11, 5), (20, 33, 5)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=body)
    d.ellipse([12, 24, 28, 34], fill=belly)
    d.ellipse([9, 35, 17, 38], fill=feet); d.ellipse([23, 35, 31, 38], fill=feet)
    if friend:
        for ex in (13, 24):  # fröhliche Augen ^ ^
            d.line([(ex, 17), (ex + 1, 15), (ex + 2, 15), (ex + 3, 17)], fill=P['N'])
        d.rectangle([15, 21, 24, 22], fill=P['N']); d.rectangle([16, 23, 23, 24], fill=P['N'])
        d.rectangle([18, 24, 21, 24], fill=hexc('ff8fb1'))
        m.putpixel((11, 20), hexc('ff6fa8')); m.putpixel((12, 20), hexc('ff6fa8'))
        m.putpixel((27, 20), hexc('ff6fa8')); m.putpixel((28, 20), hexc('ff6fa8'))
    else:
        for ex in (12, 23):
            d.ellipse([ex, 14, ex + 5, 19], fill=P['w'])
            d.rectangle([ex + 2, 16, ex + 3, 18], fill=P['N'])
        d.line([(11, 12), (17, 14)], fill=P['N']); d.line([(28, 12), (22, 14)], fill=P['N'])
        d.line([(14, 23), (25, 23)], fill=P['N'])
        m.putpixel((16, 24), P['w']); m.putpixel((22, 24), P['w'])
    m = outline(m, hexc('2b2340'))
    if friend:  # Herzchen
        for (hx, hy) in ((1, 3), (34, 1)):
            for (px, py) in ((1, 0), (3, 0), (0, 1), (1, 1), (2, 1), (3, 1), (4, 1), (1, 2), (2, 2), (3, 2), (2, 3)):
                m.putpixel((hx + px, hy + py), hexc('e8553e'))
    return m


def make_car(frame):
    """Dampfauto mit Tipp am Steuer, 48x28. frame 0/1 = Radstellung."""
    c = Image.new('RGBA', (48, 28), T)
    d = ImageDraw.Draw(c)
    d.rectangle([7, 6, 10, 15], fill=hexc('6b4a2a')); d.rectangle([6, 5, 11, 6], fill=P['B'])  # Schornstein
    d.rectangle([24, 5, 35, 15], fill=P['C']); d.rectangle([26, 8, 33, 13], fill=P['S'])  # Kopf
    c.putpixel((28, 10), P['E']); c.putpixel((31, 10), P['E'])
    d.line([(28, 12), (31, 12)], fill=P['E'])
    d.rectangle([24, 5, 35, 6], fill=P['c']); c.putpixel((27, 5), P['G']); c.putpixel((32, 5), P['G'])
    d.line([(30, 1), (30, 4)], fill=P['K']); c.putpixel((30, 0), P['Y'])
    d.rounded_rectangle([2, 15, 45, 23], radius=2, fill=P['B'])
    d.line([(4, 17), (43, 17)], fill=P['C'])
    d.line([(3, 15), (44, 15)], fill=P['h'])
    c.putpixel((44, 19), P['Y']); c.putpixel((44, 20), P['Y'])
    for wx in (11, 36):
        d.ellipse([wx - 4, 20, wx + 4, 27], fill=P['K'])
        d.ellipse([wx - 2, 22, wx + 2, 26], fill=P['B'])
        if frame == 0:
            d.line([(wx, 21), (wx, 26)], fill=P['K']); d.line([(wx - 3, 24), (wx + 3, 24)], fill=P['K'])
        else:
            d.line([(wx - 2, 22), (wx + 2, 26)], fill=P['K']); d.line([(wx + 2, 22), (wx - 2, 26)], fill=P['K'])
        c.putpixel((wx, 24), P['W'])
    c = outline(c)
    # Dampf (ohne Umriss)
    dd = ImageDraw.Draw(c)
    if frame == 0:
        dd.rectangle([7, 1, 9, 3], fill=(255, 255, 255, 220)); c.putpixel((5, 0), (255, 255, 255, 160))
    else:
        dd.rectangle([5, 0, 7, 2], fill=(255, 255, 255, 200)); c.putpixel((10, 2), (255, 255, 255, 160))
    return c


SPRITES = {}


def sprite(name, rows, pal=None, ol=True):
    img = from_grid(rows, {**P, **(pal or {})})
    SPRITES[name] = outline(img) if ol else img
    return SPRITES[name]


sprite('magpie', [
    "..........NN....",
    ".........NNNNB..",
    "....UUU..NwNN...",
    "NN.UUUUUNNNN....",
    ".NNNNNNNNNNN....",
    "...NNwwwwNN.....",
    "....NwwwwN......",
    ".....N..N.......",
], ol=False)
sprite('frog', [
    "..gg..gg..",
    ".gNgggNgg.",
    ".gggggggg.",
    "ggqggggqgg",
    "gggqqqqggg",
    ".gggggggg.",
    "gg......gg",
])
sprite('bear', [
    ".rr....rr.",
    ".rrrrrrrr.",
    "rrNrrrrNrr",
    "rrrrnnrrrr",
    "rrrnNNnrrr",
    ".rrrnnrrr.",
    "..rrrrrr..",
    ".rrrrrrrr.",
    "rrrnnnnrrr",
    "rrnnnnnnrr",
    "rrrnnnnrrr",
    ".rrrrrrrr.",
    ".DD....DD.",
])
sprite('key', [
    "BBBBBBBB",
    "BhhhhhhB",
    "BhYYYYhB",
    "BhhhhhhB",
    "BBBBBBBB",
], {'B': hexc('a87420')})
sprite('letter', [
    "WWWWWWWWW",
    "WKWWWWWKW",
    "WWKWWWKWW",
    "WWWKRKWWW",
    "WWWWRWWWW",
    "WWWWWWWWW",
])


# ======================================================================= Szenen 444x160
# Alle Welt- und Geschichtenbilder sind 444 x 160 Pixel groß und werden im Spiel genau
# dreifach vergrößert (wie alle anderen Grafiken). Die Level-Zahnräder liegen auf der
# Weltkarte im unteren Drittel, deshalb ist der Vordergrund ruhig, die Deko sitzt rechts/oben.
W, H = 444, 160
FLOWERS = [hexc(c) for c in ['ff7aa8', 'ffd23f', 'ff8a3d', 'c38bff', 'ffffff', 'ff5c5c', '7ad3ff']]


def new(stops, until=None, size=None):
    w, h = size or (W, H)
    img = Image.new('RGBA', (w, h), stops[-1])
    dither(img, (0, 0, w, until or h), stops)
    return img, ImageDraw.Draw(img)


def ridge(d, w, h, base, amp, col, ph=0.0, fr=5.0, line=None):
    """Hügelkette als weiche Welle, gefüllt bis zum unteren Rand."""
    pts = [(x, int(base + math.sin(x / w * fr + ph) * amp + math.sin(x / w * fr * 2.7 + ph) * amp * 0.3)) for x in range(0, w + 1)]
    d.polygon(pts + [(w, h), (0, h)], fill=hexc(col))
    if line:
        d.line(pts, fill=hexc(line))
    return pts


def jagged(d, w, h, base, amp, col, ph):
    """Ferne Bergkette aus überlagerten Zacken."""
    pts = []
    for x in range(0, w + 1):
        t = x / w
        y = base - amp * (0.55 * abs(math.sin(t * 5.3 + ph)) + 0.3 * abs(math.sin(t * 11.7 + ph * 2)) + 0.15 * math.sin(t * 23 + ph))
        pts.append((x, int(y)))
    d.polygon(pts + [(w, h), (0, h)], fill=hexc(col))


def puff(d, x, y, s, col='ffffff', shade='d6e8f2'):
    if shade:
        d.ellipse([x, y + s + 1, x + 7 * s, y + 3 * s + 1], fill=hexc(shade))
    d.ellipse([x, y + s, x + 7 * s, y + 3 * s], fill=hexc(col))
    d.ellipse([x + s, y, x + 4 * s, y + 3 * s], fill=hexc(col))
    d.ellipse([x + 3 * s, y + s // 2, x + 6 * s, y + 3 * s], fill=hexc(col))


def bush(d, x, y, s=1):
    d.rectangle([x - 1, y - 3 * s, x, y], fill=hexc('7a5230'))
    d.ellipse([x - 3 * s, y - 8 * s, x + 3 * s, y - 2 * s], fill=hexc('4f9a45'))
    d.ellipse([x - 2 * s, y - 9 * s, x + 2 * s, y - 5 * s], fill=hexc('6cb85a'))
    d.point([(x - s, y - 7 * s), (x + s, y - 6 * s)], fill=hexc('8fd27a'))


def bloom(img, x, y, col, big=False):
    w, h = img.size
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
        if 0 <= x + dx < w and 0 <= y + dy < h:
            img.putpixel((x + dx, y + dy), col)
    img.putpixel((x, y), hexc('f2a900'))
    for k in ((2, 3) if big else (2,)):
        if y + k < h:
            img.putpixel((x, y + k), hexc('3f8f3a'))


def meadow_details(img, top, tufts='5aa84a', groups=None, seed=1):
    """Grasbüschel und lockere Blumengrüppchen."""
    rnd = random.Random(seed)
    w, h = img.size
    for _ in range(int(w * (h - top) / 34)):
        x, y = rnd.randrange(1, w - 1), rnd.randrange(top + 4, h - 3)
        img.putpixel((x, y), hexc(tufts)); img.putpixel((x, y - 1), hexc(tufts))
    for _ in range(groups if groups is not None else int(w * (h - top) / 520)):
        gx = rnd.randrange(6, w - 6)
        t = rnd.random() ** 0.8
        gy = int(top + 10 + t * (h - top - 16))
        col = rnd.choice(FLOWERS)
        for _ in range(rnd.randint(3, 7)):
            x = min(w - 2, max(1, gx + rnd.randint(-9, 9)))
            y = min(h - 4, max(top + 6, gy + rnd.randint(-5, 5)))
            bloom(img, x, y, col if rnd.random() < 0.7 else rnd.choice(FLOWERS), big=t > 0.5)


def sun(img, d, sx, sy, sr, col='ffd45e', halo='fdf0b8', limit=None):
    w, h = img.size
    for y in range(sy - sr * 2, sy + sr * 2):
        for x in range(sx - sr * 2, sx + sr * 2):
            if 0 <= x < w and 0 <= y < (limit or h):
                f = 1 - math.hypot(x - sx, y - sy) / (sr * 2)
                if f > 0 and f * 14 > BAYER[y % 4][x % 4] + 3:
                    img.putpixel((x, y), hexc(halo))
    d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=hexc(col))


def mountain(d, px, py, half, base, light='9aa9c2', dark='7d8cab', snow=True):
    d.polygon([(px - half, base), (px, py), (px, base)], fill=hexc(light))
    d.polygon([(px, py), (px + half, base), (px, base)], fill=hexc(dark))
    if snow:
        k = max(6, half // 5)
        d.polygon([(px - k, py + k), (px, py), (px, py + k + 3), (px - k // 2, py + k - 1)], fill=hexc('ffffff'))
        d.polygon([(px, py), (px + k, py + k), (px + k // 2, py + k - 2), (px, py + k + 3)], fill=hexc('dfe9f5'))


def stars_sky(img, n, until, seed=1):
    rnd = random.Random(seed)
    for _ in range(n):
        img.putpixel((rnd.randrange(img.width), rnd.randrange(until)), rnd.choice([hexc('ffffff'), hexc('ffe8a3'), hexc('c9d4ff')]))


# ----------------------------------------------------------------------- Welten
def world_wiese(size=None, horizon=0.52, seed=4):
    w, h = size or (W, H)
    random.seed(seed)
    hz = int(h * horizon)
    img, d = new([hexc('6fb7e6'), hexc('93cdee'), hexc('bfe3f4'), hexc('f4f0d4')], hz + 8, (w, h))
    sun(img, d, int(w * 0.74), int(hz * 0.34), max(9, h // 11), limit=hz)
    jagged(d, w, hz + 4, hz * 0.80, hz * 0.16, 'b9d3e4', 0.6)
    jagged(d, w, hz + 4, hz * 0.90, hz * 0.13, '9dbfd8', 2.4)
    puff(d, int(w * 0.12), int(hz * 0.16), max(3, h // 40))
    puff(d, int(w * 0.46), int(hz * 0.08), max(4, h // 32))
    puff(d, int(w * 0.88), int(hz * 0.5), max(2, h // 50))
    for i, (base, amp, col, ph, fr) in enumerate([(hz - 4, 5, '9ed58a', 0.0, 5.0), (hz + 6, 6, '86c873', 1.7, 4.0), (hz + 18, 5, '6dba5c', 3.1, 6.0)]):
        ridge(d, w, h, base, amp, col, ph, fr, 'b8e4a6' if i == 0 else '9ed58a')
        if i == 0:
            for tx in range(8, w, 23):
                ty = int(base + math.sin(tx / w * fr + ph) * amp)
                if random.random() < 0.6 and not (0.78 * w < tx < 0.95 * w):
                    bush(d, tx + random.randint(-4, 4), ty + 1)
    mx, my = int(w * 0.87), hz - 22  # Dampf-Windmühle
    d.polygon([(mx - 6, my + 34), (mx - 4, my), (mx + 4, my), (mx + 6, my + 34)], fill=hexc('b0703a'))
    d.line([(mx - 4, my), (mx - 6, my + 34)], fill=hexc('8a4a1c'))
    d.line([(mx + 3, my + 1), (mx + 5, my + 33)], fill=hexc('d08a52'))
    d.rectangle([mx - 2, my + 14, mx + 1, my + 20], fill=hexc('ffe08a'))
    d.rectangle([mx - 2, my + 26, mx + 1, my + 34], fill=hexc('5a3d12'))
    d.polygon([(mx - 6, my), (mx, my - 7), (mx + 6, my)], fill=P['B'])
    d.line([(mx - 6, my), (mx + 6, my)], fill=P['b'])
    for a in (20, 110, 200, 290):
        r = math.radians(a)
        ex, ey = mx + int(22 * math.cos(r)), my - 3 + int(22 * math.sin(r))
        px, py = -math.sin(r), math.cos(r)
        d.line([(mx, my - 3), (ex, ey)], fill=P['K'])
        d.polygon([(mx + int(7 * math.cos(r)), my - 3 + int(7 * math.sin(r))), (ex, ey), (ex + int(5 * px), ey + int(5 * py)),
                   (mx + int(7 * math.cos(r) + 5 * px), my - 3 + int(7 * math.sin(r) + 5 * py))], fill=hexc('f3e2bd'), outline=hexc('8a6a4a'))
    d.rectangle([mx - 1, my - 4, mx + 1, my - 2], fill=P['B'])
    meadow_details(img, hz + 12, seed=seed)
    return img


def world_berge():
    random.seed(12)
    img, d = new([hexc('6fa8de'), hexc('9cc4ea'), hexc('d6e6f6'), hexc('f2f4ee')], 116)
    puff(d, 196, 10, 4); puff(d, 20, 70, 3)
    jagged(d, W, 116, 86, 26, 'c3d3e6', 1.1)
    for (px, py, half) in ((60, 44, 70), (170, 34, 80), (268, 20, 78), (346, 40, 60), (420, 12, 74)):
        mountain(d, px, py, half, 112)
    for x in range(4, W, 11):  # Tannenwald am Fuß der Berge
        pine(d, x + random.randint(-2, 2), 104 + random.randint(-2, 2), 1, '3f7a45', '2f5f35')
    ridge(d, W, H, 102, 4, '8cc878', 0.4, 4.0, 'a8dc94')
    ridge(d, W, H, 122, 4, '74b864', 2.0, 5.0)
    x1, y1, x2, y2 = 366, 108, 446, 14  # Zahnradbahn
    d.line([(x1, y1), (x2, y2)], fill=P['K'], width=2)
    for i in range(26):
        t = i / 25; x = x1 + (x2 - x1) * t; y = y1 + (y2 - y1) * t
        d.line([(x - 3, y - 2), (x + 3, y + 2)], fill=P['K'])
    wx, wy = 404, 60
    d.polygon([(wx - 12, wy + 8), (wx + 6, wy - 13), (wx + 13, wy - 7), (wx - 5, wy + 14)], fill=P['C'])
    d.line([(wx - 12, wy + 8), (wx + 6, wy - 13)], fill=P['H'])
    d.polygon([(wx - 7, wy + 6), (wx - 2, wy), (wx + 1, wy + 3), (wx - 4, wy + 9)], fill=P['Y'])
    d.polygon([(wx + 1, wy - 3), (wx + 6, wy - 9), (wx + 9, wy - 6), (wx + 4, wy)], fill=P['Y'])
    d.rectangle([wx + 8, wy - 22, wx + 10, wy - 13], fill=hexc('5a3d12'))
    d.ellipse([wx + 8, wy - 30, wx + 14, wy - 24], fill=(255, 255, 255, 230)); d.ellipse([wx + 13, wy - 38, wx + 22, wy - 30], fill=(255, 255, 255, 200))
    gear_into(img, wx - 9, wy + 12, 3.5, 6, P['B'], P['b']); gear_into(img, wx + 9, wy - 7, 3.5, 6, P['B'], P['b'])
    meadow_details(img, 110, groups=14, seed=3)
    return img


def world_wolken():
    random.seed(13)
    img, d = new([hexc('e89a6a'), hexc('f4b987'), hexc('f9dcae'), hexc('e4eef5'), hexc('cfe3f2')], 110)
    sun(img, d, 250, 36, 11, 'fff3c4', 'fbe3b8', 104)
    for (px, py, half) in ((30, 70, 46), (120, 84, 40)):
        mountain(d, px, py, half, 120, 'b5c0d4', '98a6c0')
    for (base, n, r, col, shade) in ((100, 9, 20, 'e9f1f7', None), (116, 8, 24, 'ffffff', 'dfe9f2'), (136, 7, 28, 'ffffff', 'dfe9f2')):
        for i in range(n + 1):
            x = int(i * W / n + random.randint(-10, 10)); rr = r + random.randint(-5, 5)
            if shade:
                d.ellipse([x - rr, base - rr // 2 + 3, x + rr, base + rr + 3], fill=hexc(shade))
            d.ellipse([x - rr, base - rr // 2, x + rr, base + rr], fill=hexc(col))
    d.rectangle([0, 146, W, H], fill=hexc('ffffff'))
    cx, cy = 352, 44  # Luftschiff
    d.ellipse([cx - 48, cy - 15, cx + 48, cy + 15], fill=P['C'])
    d.chord([cx - 48, cy - 15, cx + 48, cy + 15], 20, 160, fill=P['c'])
    d.arc([cx - 44, cy - 13, cx + 40, cy + 9], 190, 300, fill=P['H'])
    for x in range(cx - 36, cx + 40, 12):
        d.line([(x, cy - 13), (x + 2, cy), (x, cy + 13)], fill=hexc('7a4018'))
    d.polygon([(cx + 44, cy), (cx + 62, cy - 11), (cx + 62, cy + 11)], fill=P['B']); d.line([(cx + 62, cy - 11), (cx + 62, cy + 11)], fill=P['b'])
    d.line([(cx - 12, cy + 14), (cx - 9, cy + 22)], fill=P['K']); d.line([(cx + 12, cy + 14), (cx + 9, cy + 22)], fill=P['K'])
    d.rectangle([cx - 17, cy + 22, cx + 17, cy + 30], fill=P['r']); d.line([(cx - 17, cy + 22), (cx + 17, cy + 22)], fill=hexc('b07a44'))
    for x in range(cx - 12, cx + 13, 8):
        d.rectangle([x, cy + 24, x + 2, cy + 27], fill=P['Y'])
    gear_into(img, cx - 54, cy, 6, 8, P['B'], P['b'], P['h'])
    for (bx, by, col) in ((206, 26, 'c0392b'), (182, 52, '2c6e86')):  # ferne Ballons
        d.ellipse([bx - 5, by - 6, bx + 5, by + 5], fill=hexc(col)); d.line([(bx, by + 5), (bx, by + 8)], fill=P['K']); d.rectangle([bx - 1, by + 8, bx + 1, by + 10], fill=P['r'])
    return img


def world_hoehle():
    random.seed(14)
    img, d = new([hexc('1e1828'), hexc('2f2740'), hexc('4b3d62'), hexc('3a2f4a')], 100)
    x = 0
    while x < W:
        sw = random.randint(6, 12); tip = random.randint(10, 34)
        d.polygon([(x, 0), (x + sw, 0), (x + sw // 2, tip)], fill=hexc('4a3d5c'))
        d.line([(x + sw // 2, tip), (x + sw, 0)], fill=hexc('2b2338'))
        x += sw
    ridge(d, W, H, 94, 4, '2b2338', 0.3, 7.0, '4a3d5c')
    ridge(d, W, H, 104, 3, '352b48', 1.9, 5.0)
    ridge(d, W, H, 126, 4, '2e2540', 0.7, 6.0)
    for lx in (228, 318):
        glow(img, lx, 34, 18, hexc('c49a6a'), hexc('7a5f58'))
        d.line([(lx, 0), (lx, 28)], fill=P['B'])
        d.rectangle([lx - 3, 28, lx + 3, 38], fill=P['Y']); d.line([(lx - 3, 28), (lx + 3, 28)], fill=P['B']); d.line([(lx - 3, 38), (lx + 3, 38)], fill=P['b'])
    for off in (0, 4):  # Grubenbahn
        d.line([(300, 84 + off), (372, 92 + off), (444, 118 + off)], fill=hexc('8a6a4a'))
    for i in range(0, 14):
        t = i / 13; x = 300 + 144 * t; y = 84 + (8 * min(1, t * 2) + 26 * max(0, t * 2 - 1))
        d.line([(x, y - 1), (x - 1, y + 5)], fill=hexc('5a4636'))
    cx, cy = 372, 80
    d.polygon([(cx - 11, cy - 8), (cx + 11, cy - 5), (cx + 8, cy + 6), (cx - 9, cy + 3)], fill=hexc('7a7f8c'))
    d.line([(cx - 11, cy - 8), (cx + 11, cy - 5)], fill=hexc('a8adb8'))
    d.polygon([(cx - 9, cy - 8), (cx - 4, cy - 14), (cx + 2, cy - 11), (cx + 9, cy - 5)], fill=hexc('7ff3e0'))
    gear_into(img, cx - 6, cy + 6, 3, 6, P['B'], P['b']); gear_into(img, cx + 6, cy + 8, 3, 6, P['B'], P['b'])
    for (x0, y0, k, col) in ((8, 150, 22, '7ff3e0'), (22, 154, 14, 'c38bff'), (176, 100, 12, '7ff3e0'), (270, 98, 10, 'c38bff'), (404, 150, 26, 'ff7ad9'), (424, 154, 16, '7ff3e0'), (120, 156, 12, 'ff7ad9')):
        d.polygon([(x0, y0), (x0 + k // 4, y0 - k), (x0 + k // 2, y0)], fill=hexc(col))
        d.line([(x0 + k // 4, y0 - k + 1), (x0 + k // 4, y0 - 1)], fill=hexc('ffffff'))
        d.polygon([(x0 + k // 2, y0), (x0 + k // 2 + k // 5, y0 - k * 2 // 3), (x0 + k // 2 + k // 3, y0)], fill=hexc(col))
    for _ in range(60):  # Steinchen auf dem Boden
        x, y = random.randrange(W), random.randrange(108, H)
        img.putpixel((x, y), hexc('453a5a'))
    return img


def world_uhrturm():
    random.seed(15)
    img, d = new([hexc('eeb27a'), hexc('f4cc9c'), hexc('fbe9cf')], 96)
    sun(img, d, 290, 26, 9, 'ffe08a', 'fbe0b0', 90)
    puff(d, 200, 8, 3, 'fff3e0', 'f0d2b0'); puff(d, 330, 34, 2, 'fff3e0', 'f0d2b0')
    for (col, roof, win, base, hmin, hmax, step) in (('dfc4a0', 'b96a3c', 'f3e2bd', 92, 28, 48, 0), ('c9a27a', 'a8552a', 'ffe8a3', 96, 20, 40, 7)):
        x = -step
        while x < W:
            w = random.choice([16, 18, 22, 26]); hh = random.randint(hmin, hmax); top = base - hh
            d.rectangle([x, top, x + w, base], fill=hexc(col)); d.line([(x, top), (x, base)], fill=hexc('8a6a4a'))
            d.polygon([(x - 1, top), (x + w // 2, top - 7), (x + w + 1, top)], fill=hexc(roof))
            for wy in range(top + 4, base - 6, 8):
                for wx in range(x + 3, x + w - 3, 6):
                    d.rectangle([wx, wy, wx + 2, wy + 3], fill=hexc(win))
            x += w + 2
    tx = 372  # Uhrturm
    d.rectangle([tx, 14, tx + 34, 96], fill=P['C']); d.line([(tx, 14), (tx, 96)], fill=P['c']); d.line([(tx + 34, 14), (tx + 34, 96)], fill=P['c'])
    d.line([(tx + 2, 16), (tx + 2, 94)], fill=P['H'])
    d.polygon([(tx - 4, 15), (tx + 17, -4), (tx + 38, 15)], fill=hexc('7a3a1a'))
    d.ellipse([tx + 4, 20, tx + 30, 46], fill=P['B']); d.ellipse([tx + 6, 22, tx + 28, 44], fill=P['W'])
    for i in range(12):
        a = math.radians(i * 30)
        img.putpixel((int(tx + 17 + 9.4 * math.sin(a)), int(33 - 9.4 * math.cos(a))), P['K'])
    d.line([(tx + 17, 33), (tx + 17, 25)], fill=P['K']); d.line([(tx + 17, 33), (tx + 23, 36)], fill=P['K'])
    d.rectangle([tx + 12, 78, tx + 22, 96], fill=P['c']); d.rectangle([tx + 10, 56, tx + 24, 60], fill=P['c'])
    gear_into(img, tx + 46, 76, 8, 10, P['B'], P['b'], P['h']); gear_into(img, tx + 58, 88, 5, 7, P['C'], P['c'])
    d.rectangle([0, 96, W, H], fill=hexc('cdb890')); d.line([(0, 96), (W, 96)], fill=hexc('8f7a58')); d.line([(0, 97), (W, 97)], fill=hexc('dccba6'))
    for y in range(102, H, 6):  # Kopfsteinpflaster
        for x in range((y // 6 % 2) * 5, W, 10):
            if random.random() < 0.55:
                d.line([(x, y), (x + 5, y)], fill=hexc('b8a27a'))
    for lx in (56, 168, 300):  # Laternen
        d.line([(lx, 78), (lx, 98)], fill=P['K']); d.rectangle([lx - 2, 73, lx + 2, 78], fill=P['Y']); d.line([(lx - 3, 72), (lx + 3, 72)], fill=P['K'])
    return img


def world_werkstatt():
    random.seed(16)
    img = Image.new('RGBA', (W, H), hexc('c9a27a')); d = ImageDraw.Draw(img)
    for y in range(8, 92, 12):
        d.line([(0, y), (W, y)], fill=hexc('a8825a')); d.line([(0, y + 1), (W, y + 1)], fill=hexc('d6b38c'))
        for x in range(random.randint(0, 50), W, 70):
            d.line([(x, y - 11), (x, y)], fill=hexc('b8926a'))
    d.rectangle([0, 0, W, 6], fill=P['C']); d.line([(0, 1), (W, 1)], fill=P['H']); d.line([(0, 6), (W, 6)], fill=P['c'])
    for x in (186, 300):
        d.rectangle([x, 6, x + 3, 22], fill=P['C']); d.line([(x, 6), (x, 22)], fill=P['H']); gear_into(img, x + 2, 26, 5, 7, P['B'], P['b'], P['h'])
    lx = 246  # Hängelampe
    glow(img, lx, 30, 20, hexc('e9cfa0'), hexc('d9b88c')); d.line([(lx, 6), (lx, 20)], fill=P['K'])
    d.polygon([(lx - 7, 26), (lx - 3, 20), (lx + 3, 20), (lx + 7, 26)], fill=P['c']); d.rectangle([lx - 2, 26, lx + 2, 29], fill=P['Y'])
    d.rectangle([196, 60, 296, 62], fill=P['r']); d.line([(196, 63), (296, 63)], fill=hexc('6b4220'))  # Regal
    for i, col in enumerate(['b8642a', '2c6e86', '7a5aa8', '4f8a3a', 'c9932f', 'b03a2e']):
        hh = 12 + (i % 3) * 2
        d.rectangle([200 + i * 6, 60 - hh, 204 + i * 6, 59], fill=hexc(col)); d.line([(200 + i * 6, 60 - hh), (200 + i * 6, 59)], fill=P['K'])
    for i, col in enumerate(['7ff3e0', 'ff8fb1', 'ffe28a']):
        x = 246 + i * 15
        d.rectangle([x, 48, x + 9, 59], fill=hexc(col)); d.rectangle([x + 2, 45, x + 7, 47], fill=P['r']); d.line([(x + 1, 50), (x + 1, 57)], fill=hexc('ffffff'))
    cx, cy, R = 384, 46, 28  # Zahlenscheibe
    d.ellipse([cx - R - 3, cy - R - 3, cx + R + 3, cy + R + 3], fill=P['b']); d.ellipse([cx - R - 2, cy - R - 2, cx + R + 2, cy + R + 2], fill=P['B'])
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=P['W'])
    for i in range(10):
        a = math.radians(i * 36 - 90); x, y = int(cx + 21 * math.cos(a)), int(cy + 21 * math.sin(a))
        d.rectangle([x - 1, y - 2, x + 1, y + 2], fill=P['K'])
    d.line([(cx, cy), (cx + 13, cy - 11)], fill=P['R'], width=2); d.rectangle([cx - 2, cy - 2, cx + 2, cy + 2], fill=P['K'])
    gear_into(img, 330, 76, 9, 10, P['B'], P['b'], P['h']); gear_into(img, 344, 88, 5, 7, P['C'], P['c'])
    d.rectangle([0, 92, W, 97], fill=hexc('9a6a38')); d.line([(0, 92), (W, 92)], fill=hexc('c08a52')); d.line([(0, 97), (W, 97)], fill=hexc('5a3d12'))
    d.rectangle([0, 98, W, H], fill=hexc('7a5230'))  # Dielenboden
    for y in range(98, H, 13):
        d.line([(0, y), (W, y)], fill=hexc('5f3e22'))
        for x in range(random.randint(0, 60), W, 90):
            d.line([(x, y), (x, y + 12)], fill=hexc('5f3e22'))
    for _ in range(50):
        x, y = random.randrange(W), random.randrange(100, H)
        img.putpixel((x, y), hexc('8a6038'))
    return img


def world_maschinenraum():
    random.seed(17)
    img = Image.new('RGBA', (W, H), hexc('5d6870')); d = ImageDraw.Draw(img)
    for x in range(0, W, 37):
        d.rectangle([x, 0, x + 36, 92], fill=hexc('66727a')); d.line([(x, 0), (x, 92)], fill=hexc('4a545b')); d.line([(x + 1, 0), (x + 1, 92)], fill=hexc('76828a'))
        for y in range(4, 92, 18):
            img.putpixel((x + 3, y), hexc('8a969e')); img.putpixel((x + 34, y), hexc('8a969e'))
    for (y, hh) in ((10, 7), (82, 5)):
        d.rectangle([0, y, W, y + hh], fill=P['C']); d.line([(0, y), (W, y)], fill=P['H']); d.line([(0, y + hh), (W, y + hh)], fill=P['c'])
        for x in range(30, W, 74):
            d.rectangle([x, y - 1, x + 3, y + hh + 1], fill=P['B']); d.line([(x, y - 1), (x, y + hh + 1)], fill=P['b'])
    for x in (296, 428):
        d.rectangle([x, 17, x + 5, 82], fill=P['C']); d.line([(x, 17), (x, 82)], fill=P['H']); d.line([(x + 5, 17), (x + 5, 82)], fill=P['c'])
    d.rounded_rectangle([332, 26, 400, 80], radius=16, fill=P['C'])  # Kessel
    d.arc([332, 26, 400, 80], 180, 270, fill=P['H']); d.arc([334, 28, 398, 78], 0, 90, fill=P['c'])
    for x in range(342, 394, 8):
        img.putpixel((x, 30), P['h']); img.putpixel((x, 76), P['h'])
    d.ellipse([354, 38, 378, 62], fill=P['B']); d.ellipse([356, 40, 376, 60], fill=P['W']); d.line([(366, 50), (372, 44)], fill=P['R'])
    for i in range(7):
        a = math.radians(200 + i * 23); img.putpixel((int(366 + 8 * math.cos(a)), int(50 + 8 * math.sin(a))), P['K'])
    d.ellipse([258, 40, 282, 64], outline=P['B'], width=2); d.line([(258, 52), (282, 52)], fill=P['B']); d.line([(270, 40), (270, 64)], fill=P['B']); d.rectangle([268, 50, 272, 54], fill=P['b'])
    for gx in (190, 212, 234):  # Messuhren
        d.ellipse([gx - 7, 36, gx + 7, 50], fill=P['b']); d.ellipse([gx - 5, 38, gx + 5, 48], fill=P['W']); d.line([(gx, 43), (gx + 3, 40)], fill=P['K'])
    d.rectangle([412, 56, 420, 82], fill=hexc('3a4248')); d.line([(416, 58), (424, 40)], fill=P['B'], width=2); d.ellipse([421, 35, 428, 42], fill=P['R'])
    puff(d, 388, 2, 2, 'eef2f4', None); puff(d, 284, 20, 1, 'eef2f4', None)
    gear_into(img, 210, 70, 8, 10, P['B'], P['b'], P['h']); gear_into(img, 222, 80, 5, 7, P['C'], P['c'])
    d.rectangle([0, 92, W, H], fill=hexc('3f474d')); d.line([(0, 92), (W, 92)], fill=hexc('252b30')); d.line([(0, 93), (W, 93)], fill=hexc('5a646b'))
    for y in range(100, H, 10):  # Gitterboden
        d.line([(0, y), (W, y)], fill=hexc('343b41'))
    for x in range(0, W, 14):
        d.line([(x, 94), (x, H)], fill=hexc('343b41'))
    return img


def world_sternwarte():
    random.seed(18)
    img, d = new([hexc('10163a'), hexc('1f2858'), hexc('39407a'), hexc('4a4f8a')], 100)
    stars_sky(img, 130, 90, 18)
    for (sx, sy) in ((196, 16), (300, 60), (420, 30)):
        for (px, py) in ((0, -1), (-1, 0), (0, 0), (1, 0), (0, 1)):
            img.putpixel((sx + px, sy + py), hexc('ffffff'))
    d.ellipse([238, 20, 262, 44], fill=hexc('fff3c4')); d.ellipse([245, 16, 269, 40], fill=hexc('1a2250'))
    d.line([(318, 14), (336, 22)], fill=hexc('c9d4ff')); img.putpixel((337, 23), hexc('ffffff'))
    ridge(d, W, H, 96, 6, '2e3566', 0.5, 4.0, '3f4780')
    ridge(d, W, H, 112, 5, '272d58', 2.2, 5.0)
    ridge(d, W, H, 134, 4, '20264c', 1.0, 6.0)
    for x in (18, 46, 150, 196, 300):
        pine(d, x, 100 + (x % 5), 1, '1f2a4a', '161e38')
    ox = 384  # Sternwarte
    d.rectangle([ox - 28, 66, ox + 28, 100], fill=P['C']); d.line([(ox - 28, 66), (ox - 28, 100)], fill=P['c']); d.line([(ox - 26, 68), (ox - 26, 98)], fill=P['H'])
    d.pieslice([ox - 32, 36, ox + 32, 96], 180, 360, fill=P['B']); d.arc([ox - 32, 36, ox + 32, 96], 180, 250, fill=P['h']); d.arc([ox - 32, 36, ox + 32, 96], 300, 360, fill=P['b'])
    d.rectangle([ox - 3, 38, ox + 3, 66], fill=hexc('1a2250'))
    d.line([(ox + 2, 50), (ox + 42, 24)], fill=P['b'], width=7); d.line([(ox + 2, 48), (ox + 40, 23)], fill=P['h'])
    d.rectangle([ox - 5, 82, ox + 5, 100], fill=P['K']); d.rectangle([ox - 20, 74, ox - 13, 82], fill=P['Y']); d.rectangle([ox + 13, 74, ox + 20, 82], fill=P['Y'])
    gear_into(img, ox - 24, 60, 5, 8, P['B'], P['b'])
    return img


def world_wald():
    random.seed(19)
    img, d = new([hexc('9fd3b0'), hexc('c4e5c4'), hexc('e8f4dc')], 110)
    puff(d, 210, 8, 3, 'ffffff', 'd4ead8')
    jagged(d, W, 110, 70, 14, '9cc9a4', 0.9)
    for x in range(4, W, 13):
        pine(d, x + random.randint(-3, 3), 86 + random.randint(-3, 2), 1, '5f9a68', '4a7f54')
    for x in range(0, W, 17):
        pine(d, x + random.randint(-3, 3), 98 + random.randint(-2, 2), 2 if random.random() < 0.3 else 1, '3f7a45', '2f5f35')
    ridge(d, W, H, 98, 4, '7fc06a', 0.2, 4.0, 'a2d890')
    ridge(d, W, H, 120, 4, '68b058', 2.4, 5.0)
    tx, ty = 394, 112  # großer Baum mit Nest
    d.polygon([(tx - 5, ty), (tx - 3, ty - 34), (tx + 3, ty - 34), (tx + 5, ty)], fill=hexc('7a5230')); d.line([(tx - 3, ty - 34), (tx - 5, ty)], fill=hexc('5a3d12'))
    for (ox, oy, r, col) in ((0, -58, 22, '4f9a3f'), (-18, -46, 16, '4f9a3f'), (18, -46, 17, '4f9a3f'), (-6, -64, 14, '63b052'), (10, -56, 12, '63b052')):
        d.ellipse([tx + ox - r, ty + oy - r, tx + ox + r, ty + oy + r], fill=hexc(col))
    d.arc([tx - 22, ty - 80, tx + 22, ty - 36], 300, 70, fill=hexc('3a7a2e'))
    d.ellipse([tx - 14, ty - 52, tx + 14, ty - 44], fill=hexc('8a6a3a')); d.line([(tx - 12, ty - 48), (tx + 12, ty - 48)], fill=hexc('5a3d12'))
    glow(img, tx, ty - 54, 10, hexc('ffe9a0'), hexc('cfe6a8'))
    paste(img, SPRITES['key'], tx - 4, ty - 58)
    paste(img, SPRITES['magpie'], 296, 30)
    meadow_details(img, 106, groups=10, seed=5)
    return img


WORLDS = {
    'wiese': world_wiese, 'berge': world_berge, 'wolken': world_wolken, 'hoehle': world_hoehle,
    'uhrturm': world_uhrturm, 'werkstatt': world_werkstatt, 'maschinenraum': world_maschinenraum,
    'sternwarte': world_sternwarte, 'wald': world_wald,
}


# ----------------------------------------------------------------------- Szenen der Geschichte
def story_wald():
    random.seed(21)
    img, d = new([hexc('bfe6d2'), hexc('e6f3dc'), hexc('fff6dc')], 112)
    for i in range(6):  # Lichtstrahlen
        for y in range(0, 110):
            x = 330 - i * 16 - y * 0.6
            for k in range(4):
                if (y + k + i) % 3 == 0 and 0 <= x + k < W:
                    img.putpixel((int(x + k), y), hexc('fff6c4'))
    jagged(d, W, 112, 74, 12, 'a6d0ac', 0.4)
    for x in range(0, W, 15):
        pine(d, x + random.randint(-3, 3), 96 + random.randint(-2, 2), 2 if random.random() < 0.35 else 1, '4f8a45', '3a6a32')
    ridge(d, W, H, 98, 4, '7fc06a', 0.6, 4.0, 'a2d890'); ridge(d, W, H, 122, 4, '68b058', 2.0, 5.0)
    d.polygon([(190, H), (214, 124), (236, 104), (248, 104), (238, 126), (236, H)], fill=hexc('d9b886'))
    round_tree(d, 286, 112, 4)
    meadow_details(img, 108, groups=8, seed=2)
    return img


def story_fluss():
    random.seed(22)
    img, d = new([hexc('86c8ee'), hexc('b8e2f4'), hexc('f4f7e8')], 80)
    puff(d, 300, 12, 4); puff(d, 80, 30, 3)
    jagged(d, W, 84, 70, 14, 'b9d3e4', 1.3)
    ridge(d, W, H, 80, 4, '9ed58a', 0.3, 4.0, 'b8e4a6')
    for x in (360, 392, 420):
        pine(d, x, 86, 2)
    pts_top = [(x, int(100 + math.sin(x / 60) * 3)) for x in range(0, W + 1, 4)]
    pts_bot = [(x, int(128 + math.sin(x / 50 + 1) * 3)) for x in range(W, -1, -4)]
    d.polygon(pts_top + pts_bot, fill=hexc('5ab0d8')); d.line(pts_top, fill=hexc('3f8fb8')); d.line(pts_bot, fill=hexc('3f8fb8'))
    for _ in range(26):
        x, y = random.randrange(6, W - 10), random.randrange(106, 124)
        d.line([(x, y), (x + random.randint(4, 8), y)], fill=hexc('bfe6f4'))
    ridge(d, W, H, 134, 3, '74b864', 1.2, 5.0)
    d.ellipse([222, 104, 268, 122], fill=hexc('9aa0a8')); d.arc([222, 104, 268, 122], 180, 320, fill=hexc('c8ced4')); d.line([(226, 120), (264, 120)], fill=hexc('6d747c'))
    paste(img, SPRITES['frog'], 240, 98)
    for (x, y) in ((40, 92), (76, 88), (112, 94), (150, 90), (186, 95)):  # Federspur
        d.line([(x, y), (x + 3, y - 5)], fill=P['N']); img.putpixel((x + 1, y - 1), hexc('ffffff'))
    for px in (332, 350):  # Reste der kaputten Brücke
        d.rectangle([px, 86, px + 3, 104], fill=P['r']); d.line([(px, 86), (px, 104)], fill=hexc('5a3d12'))
    d.line([(318, 92), (336, 90)], fill=P['r'])
    meadow_details(img, 138, groups=5, seed=4)
    return img


def story_bruecke():
    random.seed(23)
    img, d = new([hexc('9ec4ea'), hexc('cddcee'), hexc('f2ecdc')], 110)
    puff(d, 60, 16, 3)
    mountain(d, 300, 12, 110, 150, '8f86a6', '6d6280')
    d.rectangle([0, 96, 150, H], fill=hexc('7aa66a')); d.rectangle([294, 96, W, H], fill=hexc('7aa66a'))
    d.line([(0, 96), (150, 96)], fill=hexc('9ccc8a')); d.line([(294, 96), (W, 96)], fill=hexc('9ccc8a'))
    d.polygon([(150, 96), (164, H), (150, H)], fill=hexc('6a5a4a')); d.polygon([(294, 96), (280, H), (294, H)], fill=hexc('6a5a4a'))
    d.polygon([(150, 96), (164, H), (280, H), (294, 96)], fill=hexc('4a3f38'))
    d.polygon([(160, 140), (284, 140), (280, H), (164, H)], fill=hexc('3a6a8a'))
    for x in range(170, 276, 14):
        d.line([(x, 148), (x + 6, 148)], fill=hexc('6aa0c0'))
    pts = [(150 + i, 96 + int(12 * math.sin(math.pi * i / 144))) for i in range(145)]
    d.line(pts, fill=hexc('6b4a2a'), width=2); d.line([(x, y - 10) for (x, y) in pts], fill=hexc('6b4a2a'))
    for i in range(0, 145, 9):
        x, y = pts[i]
        d.line([(x, y - 10), (x, y)], fill=hexc('6b4a2a'))
    for x in (178, 214, 250):  # leuchtende Bretter: Mut, Geduld, Fleiß
        y = 96 + int(12 * math.sin(math.pi * (x - 150) / 144))
        glow(img, x + 7, y, 11, hexc('fff0b0'), hexc('e6d8b0'))
        d.rectangle([x, y - 2, x + 14, y + 1], fill=P['Y']); d.line([(x, y + 2), (x + 14, y + 2)], fill=hexc('a87420'))
    for x in (30, 70, 110):
        pine(d, x, 100, 2)
    for x in (330, 374, 414):
        pine(d, x, 100, 2)
    return img


def story_berg():
    random.seed(24)
    img, d = new([hexc('b0c8ee'), hexc('d2ddf0'), hexc('f6efe0')], 120)
    puff(d, 40, 20, 4); puff(d, 380, 50, 3)
    jagged(d, W, 130, 110, 24, 'c3d0e6', 2.0)
    d.polygon([(110, H), (276, 10), (W + 30, H)], fill=hexc('8c8aa6')); d.polygon([(276, 10), (W + 30, H), (276, H)], fill=hexc('75738f'))
    d.polygon([(262, 26), (276, 10), (276, 34), (268, 28)], fill=hexc('ffffff')); d.polygon([(276, 10), (290, 28), (283, 26), (276, 34)], fill=hexc('dfe9f5'))
    glow(img, 276, 8, 10, hexc('ffe08a'), hexc('e8e0c8'))
    pts = [(150, 152), (214, 128), (178, 104), (236, 82), (206, 60), (254, 40), (268, 22)]
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        n = max(4, int(math.hypot(x2 - x1, y2 - y1) / 7))
        for i in range(n):
            t = i / n; x, y = int(x1 + (x2 - x1) * t), int(y1 + (y2 - y1) * t)
            d.rectangle([x - 3, y, x + 3, y + 1], fill=hexc('e0cfa8')); d.line([(x - 3, y + 2), (x + 3, y + 2)], fill=hexc('8a6a4a'))
    paste(img, SPRITES['bear'], 196, 86)
    ridge(d, W, H, 150, 3, '9ab08a', 0.5, 5.0)
    return img


def story_nest():
    random.seed(25)
    img, d = new([hexc('c2d9f0'), hexc('e0e6ee'), hexc('fbf0dc')], H)
    puff(d, 40, 24, 4); puff(d, 250, 14, 3); puff(d, 380, 100, 3)
    d.polygon([(300, H), (310, 104), (334, 104), (344, H)], fill=P['r']); d.line([(310, 104), (300, H)], fill=hexc('5a3d12'))
    d.ellipse([240, 84, 404, 130], fill=hexc('8a6a3a')); d.arc([240, 84, 404, 130], 20, 160, fill=hexc('5a3d12'))
    for _ in range(70):
        x, y = random.randint(250, 394), random.randint(96, 126)
        d.line([(x - 5, y), (x + 5, y - 1)], fill=random.choice([hexc('5a3d12'), hexc('a8844a')]))
    d.ellipse([254, 84, 390, 104], fill=hexc('4a3210'))
    d.rectangle([276, 80, 278, 92], fill=hexc('cfd6df')); d.ellipse([273, 74, 281, 82], fill=hexc('cfd6df'))  # Löffel
    for (x, col) in ((298, 'c9932f'), (350, 'c9932f'), (366, 'd9dbe7'), (262, 'd9dbe7')):
        d.ellipse([x - 4, 86, x + 4, 94], fill=hexc(col)); img.putpixel((x - 2, 88), hexc('ffffff'))
    d.ellipse([334, 88, 340, 94], fill=P['R']); img.putpixel((336, 89), hexc('ffffff'))
    glow(img, 322, 84, 14, hexc('fff0b0'), hexc('f0e2c0'))
    paste(img, SPRITES['key'], 318, 81)
    paste(img, SPRITES['magpie'].transpose(Image.FLIP_LEFT_RIGHT), 392, 62)
    return img


def story_abendhimmel():
    random.seed(26)
    img, d = new([hexc('2a2f6a'), hexc('6a4a8a'), hexc('d97a6a'), hexc('f39a6b')], 110)
    stars_sky(img, 60, 60, 26)
    d.ellipse([306, 82, 354, 130], fill=hexc('ffb36b')); d.ellipse([312, 88, 348, 124], fill=hexc('ffd08a'))
    ridge(d, W, H, 106, 5, '5a4a6e', 0.4, 4.0, '7a6a8e'); ridge(d, W, H, 128, 4, '4a3d5c', 2.0, 5.0)
    for x in (24, 60, 96, 380, 412):
        pine(d, x, 112, 2, '3a3550', '2a2540')
    paste(img, SPRITES['magpie'], 190, 48)
    paste(img, SPRITES['letter'], 224, 38)
    for i in range(0, 18, 3):
        img.putpixel((208 + i, 52 - i // 2), hexc('ffffff'))
    return img


STORY = {
    'wald': story_wald, 'fluss': story_fluss, 'bruecke': story_bruecke,
    'berg': story_berg, 'nest': story_nest, 'abendhimmel': story_abendhimmel,
}


# ======================================================================= UI-Bausatz
INK = hexc('2b1a10')
U = {k: hexc(v) for k, v in {
    'K': '2b1a10', 'C': 'c4783f', 'c': '8a4a1c', 'H': 'e9a66e', 'L': 'f6cfa0', 'B': 'e0a94a', 'b': 'b07a24', 'h': 'f8dc8e',
    'P': 'fbf3df', 'p': 'ead9b4', 'q': 'd9c49a', 'W': 'ffffff', 'G': '6fbf5a', 'g': '3f8f3a', 'R': 'c0392b', 'Y': 'ffcf4a',
    'y': 'd68a00', 'S': '9aa3ad', 's': '6b7480', 'd': '5a3d28', 'N': '8fc2e6', 'A': 'ffb02e', 'M': 'bfae95', 'm': '8f8070',
}.items()}


def ui_frame(fill, light, mid, dark, rivet=True, size=24):
    """Rahmen als 9-Slice (Ecke 8 px): Umriss, Lichtkante, Fläche, Schattenkante, Innenlinie."""
    im = Image.new('RGBA', (size, size), T)
    d = ImageDraw.Draw(im)
    e = size - 1
    d.rectangle([0, 0, e, e], fill=INK); d.rectangle([1, 1, e - 1, e - 1], fill=mid)
    d.line([(1, 1), (e - 1, 1)], fill=light); d.line([(1, 1), (1, e - 1)], fill=light)
    d.line([(1, e - 1), (e - 1, e - 1)], fill=dark); d.line([(e - 1, 1), (e - 1, e - 1)], fill=dark)
    d.line([(3, 3), (e - 3, 3)], fill=dark); d.line([(3, 3), (3, e - 3)], fill=dark)
    d.line([(3, e - 3), (e - 3, e - 3)], fill=light); d.line([(e - 3, 3), (e - 3, e - 3)], fill=light)
    d.rectangle([4, 4, e - 4, e - 4], fill=INK); d.rectangle([5, 5, e - 5, e - 5], fill=fill)
    for c in ((0, 0), (e, 0), (0, e), (e, e)):
        im.putpixel(c, T)
    if rivet:
        for (cx, cy) in ((2, 2), (e - 2, 2), (2, e - 2), (e - 2, e - 2)):
            im.putpixel((cx, cy), U['h'])
    return im


def ui_button(top, face, lip, size=15, lip_h=3):
    """Knopf als 9-Slice: Lichtkante oben, dunkle Lippe unten."""
    im = Image.new('RGBA', (size, size), T)
    d = ImageDraw.Draw(im)
    e = size - 1
    d.rectangle([0, 0, e, e], fill=INK); d.rectangle([1, 1, e - 1, e - 1], fill=face)
    d.line([(1, 1), (e - 1, 1)], fill=top); d.rectangle([1, e - lip_h, e - 1, e - 1], fill=lip)
    for c in ((0, 0), (e, 0), (0, e), (e, e)):
        im.putpixel(c, T)
    if size > 9:
        for c in ((1, 1), (e - 1, 1), (1, e - 1), (e - 1, e - 1)):
            im.putpixel(c, INK)
    return im


def ui_bubble():
    im = Image.new('RGBA', (15, 15), T)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 14, 14], fill=INK); d.rectangle([1, 1, 13, 13], fill=U['P']); d.line([(1, 13), (13, 13)], fill=U['q'])
    for c in ((0, 0), (14, 0), (0, 14), (14, 14)):
        im.putpixel(c, T)
    for c in ((1, 1), (13, 1), (1, 13), (13, 13)):
        im.putpixel(c, INK)
    return im


ICONS = {
    'star': [".....KK.....", "....KYYK....", "....KYYK....", "KKKKKYYKKKKK", "KhYYYYYYYYyK", ".KYYYYYYYyK.", "..KYYYYYyK..", "..KYYYYYyK..", ".KYYYyyYYyK.", ".KYyKKKKyyK.", "KyKK....KKyK", "KK........KK"],
    'star-off': [".....mm.....", "....mppm....", "....mppm....", "mmmmmppmmmmm", "mppppppppppm", ".mppppppppm.", "..mppppppm..", "..mppppppm..", ".mppppppppm.", ".mppmmmmppm.", "mpmm....mmpm", "mm........mm"],
    'lock': ["....KKKK....", "...KSSSSK...", "..KSKKKKSK..", "..KSK..KSK..", "..KSK..KSK..", ".KKKKKKKKKK.", ".KBBBBBBBBK.", ".KBBBKKBBBK.", ".KBBBKKBBBK.", ".KBBBBKBBBK.", ".KbbbbbbbbK.", ".KKKKKKKKKK."],
    'disk': ["KKKKKKKKKKK.", "KNKPPPPPKNKK", "KNKPPKKPKNNK", "KNKPPKKPKNNK", "KNKKKKKKKNNK", "KNNNNNNNNNNK", "KNKKKKKKKKNK", "KNKPPPPPPKNK", "KNKPKKKKPKNK", "KNKPPPPPPKNK", "KNKPKKKKPKNK", "KKKKKKKKKKKK"],
    'cog': ["....KKKK....", ".KK.KBBK.KK.", "KBBKKBBKKBBK", "KBBBBBBBBBBK", ".KBBBKKBBBK.", "KKBBK..KBBKK", "KBBBK..KBBBK", "KKBBBKKBBBKK", ".KBBBBBBBBK.", "KBBKKbbKKBBK", ".KK.KbbK.KK.", "....KKKK...."],
    'bolt': ["......KKKK..", ".....KYYYK..", "....KYYYK...", "...KYYYK....", "..KYYYKKKK..", ".KYYYYYYYK..", ".KKKKYYYK...", "....KYYK....", "...KYYK.....", "...KYK......", "..KYK.......", "..KK........"],
    'pause': ["............", ".KKKK..KKKK.", ".KPPK..KPPK.", ".KPPK..KPPK.", ".KPPK..KPPK.", ".KPPK..KPPK.", ".KPPK..KPPK.", ".KPPK..KPPK.", ".KPPK..KPPK.", ".KqqK..KqqK.", ".KKKK..KKKK.", "............"],
    'keys': ["............", "KKKKKKKKKKKK", "KPPPPPPPPPPK", "KPKPKPKPKPPK", "KPPPPPPPPPPK", "KPPKPKPKPKPK", "KPPPPPPPPPPK", "KPKPKKKKPKPK", "KqqqqqqqqqqK", "KKKKKKKKKKKK", "............", "............"],
    'hand': ["....KK.KK...", "..KKPKKPKKK.", "..KPKPKPKPK.", "..KPKPKPKPK.", "..KPKPKPKPK.", "KKKPPPPPPPK.", "KPKPPPPPPPK.", "KPPPPPPPPPK.", ".KPPPPPPPPK.", ".KPPPPPPPK..", "..KqqqqqqK..", "..KKKKKKKK.."],
    'check': ["............", "..........KK", ".........KGK", "........KGGK", "KK.....KGGK.", "KGK...KGGK..", "KGGK.KGGK...", ".KGGKGGK....", "..KGGGK.....", "...KGK......", "....K.......", "............"],
    'play': ["..KK........", "..KPKK......", "..KPPPKK....", "..KPPPPPKK..", "..KPPPPPPPK.", "..KPPPPPPPK.", "..KPPPPPKK..", "..KPPPKK....", "..KPKK......", "..KK........", "............", "............"],
    'exit': ["KKKKKKK.....", "KdddddK..K..", "KdddddK..KK.", "KddKKKKKKPKK", "KddKPPPPPPPK", "KddKPPPPPPPK", "KddKKKKKKPKK", "KdddddK..KK.", "KdddddK..K..", "KdddddK.....", "KKKKKKK.....", "............"],
    'target': ["....KKKK....", "..KKRRRRKK..", ".KRRPPPPRRK.", ".KRPPRRPPRK.", "KRPPRRRRPPRK", "KRPRRKKRRPRK", "KRPRRKKRRPRK", "KRPPRRRRPPRK", ".KRPPRRPPRK.", ".KRRPPPPRRK.", "..KKRRRRKK..", "....KKKK...."],
    'clock': ["....KKKK....", "..KKPPPPKK..", ".KPPPKPPPPK.", ".KPPPKPPPPK.", "KPPPPKPPPPPK", "KPPPPKPPPPPK", "KPPPPKKKKPPK", "KPPPPPPPPPPK", ".KPPPPPPPPK.", ".KqPPPPPPqK.", "..KKqqqqKK..", "....KKKK...."],
    'wrench': ["......KKK...", ".....KSSK...", "....KSSK..K.", "....KSSKKKSK", "....KSSSSSSK", "...KSSSSSKK.", "..KSSSKKK...", ".KSSSK......", "KSSSK.......", "KSSK........", "KKK.........", "............"],
    'medal': [".KKK....KKK.", ".KRNK..KNRK.", "..KRNKKNRK..", "...KRNNRK...", "...KKKKKK...", "..KYYYYYYK..", ".KYYhYYYYyK.", ".KYhYYYYYyK.", ".KYYYYYYYyK.", ".KYYYYYYyyK.", "..KyyyyyyK..", "...KKKKKK..."],
    'bulb': ["...KKKKKK...", "..KYYYYYYK..", ".KYYhYYYYYK.", ".KYhYYYYYYK.", ".KYYYYYYYYK.", ".KYYYYYYYYK.", "..KYYYYYYK..", "...KYYYYK...", "...KSSSSK...", "...KsssSK...", "....KSSK....", ".....KK....."],
    'info': ["....KKKK....", "..KKNNNNKK..", ".KNNNWWNNNK.", ".KNNNWWNNNK.", "KNNNNNNNNNNK", "KNNNWWWNNNNK", "KNNNNWWNNNNK", "KNNNNWWNNNNK", ".KNNNWWNNNK.", ".KNNWWWWNNK.", "..KKNNNNKK..", "....KKKK...."],
    'back': [".....KK.....", "....KPK.....", "...KPPK.....", "..KPPPKKKKKK", ".KPPPPPPPPPK", "KPPPPPPPPPPK", ".KPPPPPPPPPK", "..KPPPKKKKKK", "...KPPK.....", "....KPK.....", ".....KK.....", "............"],
    'brush': ["........KKK.", ".......KRRRK", "......KRRRRK", ".....KRRRRK.", "....KSRRRK..", "...KSSSRK...", "..KbSSSK....", ".KBbbSK.....", "KBBBbK......", "KBBBK.......", "KKKK........", "............"],
    'star-s': ["...K...", "..KYK..", "KKKYKKK", "KYYYYyK", ".KYYyK.", ".KYKyK.", "KK...KK"],
    'star-s-off': ["...m...", "..mpm..", "mmmpmmm", "mpppppm", ".mpppm.", ".mpmpm.", "mm...mm"],
}


def ui_led(c1, c2):
    return from_grid(["..KKK..", f".K{c1}W{c1}K.", f"K{c1}{c1}{c1}{c1}{c1}K", f"K{c1}{c1}{c1}{c1}{c2}K", f"K{c1}{c1}{c1}{c2}{c2}K", f".K{c2}{c2}{c2}K.", "..KKK.."], U)


def ui_big_star(fill, light, dark, line):
    S = 23
    im = Image.new('RGBA', (S, S), T)
    d = ImageDraw.Draw(im)
    c = (S - 1) / 2
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = 10.6 if i % 2 == 0 else 4.6
        pts.append((c + r * math.cos(a), c + 0.8 + r * math.sin(a)))
    d.polygon(pts, fill=fill)
    for y in range(S):
        for x in range(S):
            if im.getpixel((x, y))[3]:
                if x + y < S * 0.62 and y > 6:
                    im.putpixel((x, y), light)
                elif x + y > S * 1.22:
                    im.putpixel((x, y), dark)
    return outline(im, line)


def ui_gear(col, dark, light, line=INK, size=24, teeth=8):
    """Level-Zahnrad mit dunkler Nabe (dort steht die Levelnummer)."""
    g = Image.new('RGBA', (size, size), T)
    c = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            dx, dy = x - c, y - c
            r = math.hypot(dx, dy)
            a = (math.atan2(dy, dx) / (2 * math.pi)) * teeth + 0.25
            if r <= (size * 0.44 if (a - math.floor(a)) < 0.5 else size * 0.33):
                g.putpixel((x, y), dark if r <= size * 0.24 else light if dx + dy < -size * 0.25 else dark if dx + dy > size * 0.3 else col)
    return outline(g, line)


HAND_FINGERS = {'P': (2, 13), 'R': (9, 6), 'M': (16, 3), 'I': (23, 7)}
HAND_COLORS = {'P': 'f2a0bf', 'R': 'f5cf62', 'M': 'a2d48c', 'I': '8fc2e6', 'T': 'c6b0e8'}


def ui_hand():
    """Linke Hand (die rechte wird im Spiel gespiegelt)."""
    im = Image.new('RGBA', (40, 44), T)
    d = ImageDraw.Draw(im)
    d.polygon([(27, 31), (34, 22), (37, 25), (30, 35)], fill=hexc(HAND_COLORS['T']))
    d.rounded_rectangle([3, 25, 29, 41], radius=5, fill=hexc('f6dcc0')); d.line([(5, 40), (27, 40)], fill=hexc('dbb896'))
    for name, (x, y0) in HAND_FINGERS.items():
        d.rounded_rectangle([x + 1, y0 + 1, x + 6, 28], radius=2, fill=hexc(HAND_COLORS[name]))
        d.line([(x + 2, y0 + 3), (x + 2, 25)], fill=hexc('ffffff'))
    return outline(im, hexc('7a5235'))


def ui_hand_mark(finger):
    """Markierung für den aktiven Finger: goldener Ring mit dunklem Rand (liegt über der Hand)."""
    im = Image.new('RGBA', (40, 44), T)
    d = ImageDraw.Draw(im)
    if finger == 'T':
        for pts, col in (([(24, 31), (34, 18), (39, 24), (31, 38)], INK), ([(25, 31), (34, 19), (38, 24), (31, 37)], U['Y']),
                         ([(26, 31), (34, 20), (37, 24), (31, 36)], U['Y'])):
            d.polygon(pts, outline=col)
    else:
        x, y0 = HAND_FINGERS[finger]
        d.rounded_rectangle([x - 2, y0 - 2, x + 9, 30], radius=4, outline=INK)
        d.rounded_rectangle([x - 1, y0 - 1, x + 8, 29], radius=3, outline=U['Y'], width=2)
    return im


def ui_texture(base, specks, n, size=48, seed=1):
    rnd = random.Random(seed)
    im = Image.new('RGBA', (size, size), hexc(base))
    for _ in range(n):
        im.putpixel((rnd.randrange(size), rnd.randrange(size)), hexc(rnd.choice(specks)))
    return im


def ui_wood():
    rnd = random.Random(2)
    im = Image.new('RGBA', (64, 16), hexc('3a2618'))
    d = ImageDraw.Draw(im)
    for y, col in ((3, '422c1c'), (8, '33210f'), (12, '442e1e')):
        x = 0
        while x < 64:
            ln = rnd.randint(6, 18)
            d.line([(x, y), (min(63, x + ln), y)], fill=hexc(col))
            x += ln + rnd.randint(3, 9)
    return im


def make_ui():
    save(ui_frame(U['P'], U['H'], U['C'], U['c']), 'ui', 'frame.png')
    save(ui_frame(T, U['H'], U['C'], U['c']), 'ui', 'frame-hollow.png')
    save(ui_frame(hexc('3a2618'), U['h'], U['B'], U['b']), 'ui', 'frame-dark.png')
    for name, (top, face, lip) in {'primary': (U['L'], U['C'], U['c']), 'light': (U['W'], U['P'], U['q']),
                                   'dark': (hexc('7a5a40'), hexc('4a2f1c'), hexc('2b1a10')), 'green': (hexc('a6e09a'), hexc('46963c'), hexc('2c6a2a'))}.items():
        save(ui_button(top, face, lip), 'ui', f'btn-{name}.png')
        save(ui_button(top, face, lip, 9, 2), 'ui', f'btn-sm-{name}.png')
        # gedrückt: ohne Lippe, dunklere Fläche oben
        save(ui_button(lip, face, face, 15, 1), 'ui', f'btn-{name}-down.png')
        save(ui_button(lip, face, face, 9, 1), 'ui', f'btn-sm-{name}-down.png')
    save(ui_bubble(), 'ui', 'bubble.png')
    for name, rows in ICONS.items():
        save(from_grid(rows, U), 'ui', f'i-{name}.png')
    save(ui_led('A', 'y'), 'ui', 'led-amber.png'); save(ui_led('G', 'g'), 'ui', 'led-green.png')
    save(ui_big_star(U['Y'], U['h'], U['y'], INK), 'ui', 'star-big.png')
    save(ui_big_star(U['p'], U['P'], U['q'], U['m']), 'ui', 'star-big-off.png')
    save(ui_gear(U['C'], U['c'], U['H']), 'ui', 'gear.png')
    save(ui_gear(U['B'], U['b'], U['h']), 'ui', 'gear-gold.png')
    save(ui_gear(U['M'], U['m'], hexc('ddd0bb'), hexc('5a4a3c')), 'ui', 'gear-locked.png')
    save(ui_hand(), 'ui', 'hand.png')
    for f in 'PRMIT':
        save(ui_hand_mark(f), 'ui', f'hand-{f}.png')
    save(ui_texture('f3e6c9', ['efe0bf', 'f6ebd2', 'ecdcb8'], 110, seed=1), 'ui', 'tex-paper.png')
    save(ui_texture('2b1d14', ['2f2016', '271a11', '332318'], 90, seed=3), 'ui', 'tex-dark.png')
    save(ui_texture('14394a', ['173f52', '113342', '1a4658'], 90, seed=4), 'ui', 'tex-teal.png')
    save(ui_wood(), 'ui', 'tex-wood.png')


if __name__ == '__main__':
    save(make_tipp(), 'tipp.png')
    save(make_monster(False), 'monster.png')
    save(make_monster(True), 'monster-freund.png')
    car = Image.new('RGBA', (96, 28), T)
    car.alpha_composite(make_car(0), (0, 0)); car.alpha_composite(make_car(1), (48, 0))
    save(car, 'auto.png')  # zwei Bilder nebeneinander (Räder drehen sich)
    make_ui()
    for name, fn in WORLDS.items():
        save(fn(), 'welten', f'{name}.png')
    for name, fn in STORY.items():
        save(fn(), 'story', f'{name}.png')
    save(world_wiese((456, 256), 0.6, 9), 'titel.png')
    print('Pixelart erzeugt in', os.path.normpath(ROOT))
