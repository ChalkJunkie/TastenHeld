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

# ======================================================================= Weltbilder 280x80
W, H = 280, 80


def world_wiese(seed=3):
    random.seed(seed)
    img = Image.new('RGBA', (W, H), T)
    dither(img, (0, 0, W, H), [hexc('86c8ee'), hexc('b8e2f4'), hexc('fdf3d2')])
    d = ImageDraw.Draw(img)
    d.ellipse([214, 8, 240, 34], fill=hexc('ffe9a0')); d.ellipse([216, 10, 238, 32], fill=hexc('ffd45e'))
    cloud(d, 150, 6, 3); cloud(d, 70, 4, 2)
    for (base, amp, col, ph) in [(0.55, 0.06, '9bd785', 0), (0.68, 0.05, '74c262', 2)]:
        pts = [(x, int(H * base + math.sin(x / W * 6 + ph) * H * amp)) for x in range(0, W + 1)]
        d.polygon(pts + [(W, H), (0, H)], fill=hexc(col))
    mx, my = 252, 28  # Dampf-Windmühle
    d.rectangle([mx - 5, my, mx + 5, my + 28], fill=P['c'])
    d.rectangle([mx - 3, my + 12, mx + 3, my + 18], fill=P['Y'])
    d.polygon([(mx - 7, my), (mx, my - 6), (mx + 7, my)], fill=P['B'])
    d.rectangle([mx + 6, my - 10, mx + 8, my - 2], fill=hexc('6b4a2a'))
    d.rectangle([mx + 8, my - 15, mx + 10, my - 13], fill=(255, 255, 255, 220))
    for a in (25, 115, 205, 295):
        r = math.radians(a)
        d.line([(mx, my - 2), (mx + int(18 * math.cos(r)), my - 2 + int(18 * math.sin(r)))], fill=P['K'], width=2)
    gear_into(img, mx, my - 2, 4, 6, P['B'], P['b'])
    cols = [hexc(c) for c in ['ff7aa8', 'ffd23f', 'ff8a3d', 'c38bff', 'ffffff', 'ff5c5c', '7ad3ff']]
    for _ in range(260):
        flower(img, random.randrange(1, W - 1), random.randrange(56, H - 2), random.choice(cols))
    for (bx, by) in ((150, 30), (170, 36)):  # Schmetterlinge
        for (px, py) in ((0, 0), (1, 1), (3, 1), (4, 0), (0, 1), (4, 1), (2, 2)):
            img.putpixel((bx + px, by + py), hexc('ff8fb1') if (px, py) != (2, 2) else P['K'])
    return img


def world_berge(seed=4):
    random.seed(seed)
    img = Image.new('RGBA', (W, H), T)
    dither(img, (0, 0, W, H), [hexc('7fb2e2'), hexc('b7d3f0'), hexc('eaf2fb')])
    d = ImageDraw.Draw(img)
    cloud(d, 120, 6, 2); cloud(d, 30, 10, 2)
    back = [(-10, H), (30, 26), (66, 50), (106, 16), (150, 46), (194, 10), (236, 42), (264, 22), (290, H)]
    d.polygon(back, fill=hexc('94a2bb'))
    for (x, y) in back[1:-1:2]:
        d.polygon([(x - 7, y + 7), (x, y), (x + 7, y + 7), (x + 3, y + 5), (x, y + 8), (x - 3, y + 5)], fill=P['w'])
    d.polygon([(-10, H), (20, 50), (60, 62), (100, 40), (140, 60), (180, 44), (230, 62), (290, H)], fill=hexc('74839e'))
    d.rectangle([0, 70, W, H], fill=hexc('7aa66a'))
    d.line([(0, 70), (W, 70)], fill=hexc('5a8a4c'))
    x1, y1, x2, y2 = 180, 82, 280, 8  # Zahnradbahn
    d.line([(x1, y1), (x2, y2)], fill=P['K'], width=2)
    for i in range(20):
        t = i / 19; x = x1 + (x2 - x1) * t; y = y1 + (y2 - y1) * t
        d.line([(x - 2, y - 2), (x + 2, y + 2)], fill=P['K'])
    wx, wy = 228, 40
    d.polygon([(wx - 10, wy + 3), (wx + 8, wy - 10), (wx + 12, wy - 4), (wx - 6, wy + 9)], fill=P['C'])
    d.polygon([(wx - 6, wy + 1), (wx - 1, wy - 3), (wx + 1, wy), (wx - 4, wy + 4)], fill=P['Y'])
    d.polygon([(wx + 1, wy - 4), (wx + 6, wy - 8), (wx + 8, wy - 5), (wx + 3, wy - 1)], fill=P['Y'])
    d.rectangle([wx + 5, wy - 17, wx + 7, wy - 10], fill=hexc('5a3d12'))
    d.rectangle([wx + 6, wy - 22, wx + 9, wy - 19], fill=(255, 255, 255, 220))
    gear_into(img, wx - 6, wy + 8, 3, 6, P['B'], P['b'])
    gear_into(img, wx + 9, wy - 1, 3, 6, P['B'], P['b'])
    return img


def world_wolken(seed=5):
    random.seed(seed)
    img = Image.new('RGBA', (W, H), T)
    dither(img, (0, 0, W, H), [hexc('f1ab76'), hexc('f9dcae'), hexc('d4e8f5')])
    d = ImageDraw.Draw(img)
    d.ellipse([248, 8, 262, 22], fill=hexc('fff3c4'))
    d.polygon([(-5, H), (22, 60), (42, 70), (72, 55), (105, H)], fill=hexc('aab6cc'))
    for (x, y, s) in ((30, 64, 7), (110, 68, 8), (200, 64, 7), (262, 68, 6)):
        d.ellipse([x - 5 * s, y - s, x + 5 * s, y + 3 * s], fill=hexc('dfe9f2'))
        d.ellipse([x - 4 * s, y - 2 * s, x + 2 * s, y + 2 * s], fill=P['w'])
        d.ellipse([x - s, y - 3 * s, x + 4 * s, y + s], fill=P['w'])
    cloud(d, 140, 22, 2); cloud(d, 70, 14, 2)
    cx, cy = 206, 26  # Luftschiff
    d.ellipse([cx - 40, cy - 13, cx + 40, cy + 13], fill=P['C'])
    for x in range(cx - 30, cx + 35, 10):
        d.line([(x, cy - 11), (x + 2, cy), (x, cy + 11)], fill=P['c'])
    d.line([(cx - 34, cy - 7), (cx + 30, cy - 9)], fill=P['H'])
    d.polygon([(cx + 38, cy), (cx + 52, cy - 9), (cx + 52, cy + 9)], fill=P['B'])
    d.line([(cx - 10, cy + 12), (cx - 8, cy + 18)], fill=P['K']); d.line([(cx + 10, cy + 12), (cx + 8, cy + 18)], fill=P['K'])
    d.rectangle([cx - 14, cy + 18, cx + 14, cy + 25], fill=P['r'])
    for x in range(cx - 10, cx + 12, 6):
        d.rectangle([x, cy + 20, x + 2, cy + 22], fill=P['Y'])
    gear_into(img, cx - 45, cy, 5, 8, P['B'], P['b'])
    return img


def world_hoehle(seed=5):
    random.seed(seed)
    img = Image.new('RGBA', (W, H), T)
    dither(img, (0, 0, W, H), [hexc('1e1828'), hexc('3a2f4a'), hexc('5d4c72'), hexc('3a2f4a')])
    d = ImageDraw.Draw(img)
    x = 0
    while x < W:
        sw = random.randint(5, 10)
        tipy = random.randint(12, 30)
        d.polygon([(x, 0), (x + sw, 0), (x + sw // 2, tipy)], fill=hexc('4a3d5c'))
        d.line([(x + sw // 2, tipy), (x + sw, 0)], fill=hexc('2b2338'))
        x += sw
    d.rectangle([0, 70, W, H], fill=hexc('2b2338'))
    d.line([(0, 70), (W, 70)], fill=hexc('4a3d5c'))
    for lx in (174, 246):
        glow(img, lx, 26, 14, hexc('c49a6a'), hexc('8a6a5a'))
        d.line([(lx, 0), (lx, 21)], fill=P['B'])
        d.rectangle([lx - 3, 21, lx + 3, 29], fill=P['Y'])
        d.line([(lx - 3, 21), (lx + 3, 21)], fill=P['B'])
    for off in (0, 3):
        d.line([(150, 40 + off), (218, 50 + off), (W, 72 + off)], fill=hexc('8a6a4a'))
    cx, cy = 212, 40
    d.polygon([(cx - 9, cy - 6), (cx + 9, cy - 3), (cx + 6, cy + 6), (cx - 7, cy + 3)], fill=hexc('7a7f8c'))
    d.polygon([(cx - 8, cy - 6), (cx - 3, cy - 11), (cx + 3, cy - 9), (cx + 8, cy - 3)], fill=hexc('7ff3e0'))
    gear_into(img, cx - 5, cy + 5, 2.5, 6, P['B'], P['b'])
    gear_into(img, cx + 5, cy + 7, 2.5, 6, P['B'], P['b'])
    for (fx, sc, col) in [(0.04, 1.2, '7ff3e0'), (0.09, 0.8, 'c38bff'), (0.5, 0.7, '7ff3e0'), (0.9, 1.4, 'ff7ad9'), (0.96, 0.9, '7ff3e0')]:
        x0 = int(W * fx); y0 = 74; k = int(16 * sc)
        d.polygon([(x0, y0), (x0 + k // 4, y0 - k), (x0 + k // 2, y0)], fill=hexc(col))
        d.line([(x0 + k // 4, y0 - k + 1), (x0 + k // 4, y0 - 1)], fill=P['w'])
        d.polygon([(x0 + k // 2, y0), (x0 + k // 2 + k // 5, y0 - k * 2 // 3), (x0 + k // 2 + k // 3, y0)], fill=hexc(col))
    return img


def world_uhrturm(seed=6):
    random.seed(seed)
    img = Image.new('RGBA', (W, H), T)
    dither(img, (0, 0, W, H), [hexc('eeb27a'), hexc('f6d3a8'), hexc('fbe9cf')])
    d = ImageDraw.Draw(img)
    d.ellipse([176, 10, 192, 26], fill=hexc('ffe08a'))
    cloud(d, 120, 8, 2); cloud(d, 40, 4, 2)
    x = 0
    while x < 220:
        w = random.choice([12, 14, 18, 22]); h = random.choice([18, 24, 30, 36])
        top = 62 - h
        d.rectangle([x, top, x + w, 62], fill=hexc('c9a27a'))
        d.line([(x, top), (x, 62)], fill=hexc('8a6a4a'))
        d.polygon([(x - 1, top), (x + w // 2, top - 6), (x + w + 1, top)], fill=hexc('a8552a'))
        for wy in range(top + 3, 58, 7):
            for wx in range(x + 3, x + w - 3, 5):
                d.rectangle([wx, wy, wx + 1, wy + 2], fill=hexc('ffe8a3'))
        x += w + 2
    d.rectangle([226, 10, 256, 66], fill=P['C'])  # Uhrturm
    d.line([(226, 10), (226, 66)], fill=P['c']); d.line([(256, 10), (256, 66)], fill=P['c'])
    d.polygon([(222, 11), (241, -2), (260, 11)], fill=hexc('7a3a1a'))
    d.ellipse([230, 16, 252, 38], fill=P['B']); d.ellipse([232, 18, 250, 36], fill=P['W'])
    for i in range(12):
        a = math.radians(i * 30)
        img.putpixel((int(241 + 7.5 * math.sin(a)), int(27 - 7.5 * math.cos(a))), P['K'])
    d.line([(241, 27), (241, 20)], fill=P['K']); d.line([(241, 27), (246, 29)], fill=P['K'])
    d.rectangle([236, 52, 246, 66], fill=P['c'])
    gear_into(img, 266, 50, 7, 10, P['B'], P['b'], P['h'])
    gear_into(img, 274, 61, 4, 7, P['C'], P['c'])
    d.rectangle([0, 62, W, H], fill=hexc('b9a27e'))
    d.line([(0, 62), (W, 62)], fill=hexc('8f7a58'))
    for x in range(0, W, 12):
        d.line([(x, 69), (x + 6, 69)], fill=hexc('8f7a58'))
    return img


def world_werkstatt(seed=7):
    random.seed(seed)
    img = Image.new('RGBA', (W, H), hexc('c9a27a'))
    d = ImageDraw.Draw(img)
    for y in range(4, H, 9):
        d.line([(0, y), (W, y)], fill=hexc('a8825a'))
        for x in range(random.randint(0, 40), W, 60):
            d.line([(x, y - 8), (x, y)], fill=hexc('b8926a'))
    d.rectangle([0, 0, W, 5], fill=P['C']); d.line([(0, 1), (W, 1)], fill=P['H']); d.line([(0, 5), (W, 5)], fill=P['c'])
    for x in (60, 160):
        d.rectangle([x, 5, x + 3, 22], fill=P['C']); d.line([(x, 5), (x, 22)], fill=P['H'])
        gear_into(img, x + 2, 25, 4, 6, P['B'], P['b'])
    d.rectangle([126, 36, 200, 38], fill=P['r'])  # Regal
    for i, col in enumerate(['b8642a', '2c6e86', '7a5aa8', '4f8a3a', 'c9932f']):
        hh = 10 + (i % 2) * 2
        d.rectangle([130 + i * 5, 36 - hh, 133 + i * 5, 35], fill=hexc(col))
    for i, col in enumerate(['7ff3e0', 'ff8fb1', 'ffe28a']):
        d.rectangle([160 + i * 12, 26, 167 + i * 12, 35], fill=hexc(col)); d.line([(160 + i * 12, 26), (167 + i * 12, 26)], fill=P['K'])
    cx, cy, R = 246, 30, 20  # Zahlenscheibe
    d.ellipse([cx - R - 2, cy - R - 2, cx + R + 2, cy + R + 2], fill=P['B'])
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=P['W'])
    for i in range(10):
        a = math.radians(i * 36 - 90)
        x, y = int(cx + 14 * math.cos(a)), int(cy + 14 * math.sin(a))
        d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=P['K'])
    d.line([(cx, cy), (cx + 9, cy - 7)], fill=P['R'], width=2)
    d.rectangle([cx - 1, cy - 1, cx + 1, cy + 1], fill=P['K'])
    gear_into(img, 212, 56, 8, 10, P['B'], P['b'], P['h'])
    gear_into(img, 224, 66, 5, 7, P['C'], P['c'])
    d.rectangle([0, 66, W, 70], fill=P['r']); d.line([(0, 66), (W, 66)], fill=hexc('a87a4a'))
    d.rectangle([0, 71, W, H], fill=hexc('6b4220'))
    return img


def world_maschinenraum(seed=8):
    random.seed(seed)
    img = Image.new('RGBA', (W, H), hexc('5d6870'))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 28):
        d.rectangle([x, 0, x + 27, H], fill=hexc('66727a'))
        d.line([(x, 0), (x, H)], fill=hexc('4a545b'))
        for y in range(3, H, 14):
            img.putpixel((x + 2, y), hexc('8a969e')); img.putpixel((x + 25, y), hexc('8a969e'))
    for (y, hgt) in ((8, 5), (58, 4)):
        d.rectangle([0, y, W, y + hgt], fill=P['C']); d.line([(0, y), (W, y)], fill=P['H']); d.line([(0, y + hgt), (W, y + hgt)], fill=P['c'])
    for x in (178, 262):
        d.rectangle([x, 0, x + 4, 58], fill=P['C']); d.line([(x, 0), (x, 58)], fill=P['H'])
    d.rounded_rectangle([206, 22, 250, 60], radius=12, fill=P['C'])  # Kessel
    d.line([(212, 24), (244, 24)], fill=P['H'])
    for x in range(212, 246, 6):
        img.putpixel((x, 26), P['h']); img.putpixel((x, 57), P['h'])
    d.ellipse([220, 30, 236, 46], fill=P['B']); d.ellipse([222, 32, 234, 44], fill=P['W'])
    d.line([(228, 38), (232, 34)], fill=P['R'])
    d.ellipse([186, 28, 202, 44], outline=P['B'], width=2)
    d.line([(186, 36), (202, 36)], fill=P['B']); d.line([(194, 28), (194, 44)], fill=P['B'])
    d.rectangle([266, 38, 273, 60], fill=hexc('3a4248'))
    d.line([(270, 40), (277, 28)], fill=P['B'], width=2)
    d.ellipse([274, 24, 280, 30], fill=P['R'])
    cloud(d, 236, 2, 2, hexc('eef2f4')); cloud(d, 170, 14, 1, hexc('eef2f4'))
    gear_into(img, 154, 30, 8, 10, P['B'], P['b'], P['h'])
    gear_into(img, 165, 41, 5, 7, P['C'], P['c'])
    d.rectangle([0, 63, W, H], fill=hexc('3a4248'))
    for x in range(-20, W, 10):
        d.line([(x, 63), (x + 6, H)], fill=hexc('2a3035'))
    return img


def world_sternwarte(seed=9):
    random.seed(seed)
    img = Image.new('RGBA', (W, H), T)
    dither(img, (0, 0, W, H), [hexc('141a3d'), hexc('2b3268'), hexc('4a4f8a')])
    d = ImageDraw.Draw(img)
    for _ in range(80):
        img.putpixel((random.randrange(W), random.randrange(56)), random.choice([P['w'], hexc('ffe8a3'), hexc('c9d4ff')]))
    for (sx, sy) in ((40, 10), (120, 20)):
        for (px, py) in ((0, -1), (-1, 0), (0, 0), (1, 0), (0, 1)):
            img.putpixel((sx + px, sy + py), P['w'])
    d.ellipse([168, 8, 184, 24], fill=hexc('fff3c4')); d.ellipse([172, 6, 188, 22], fill=hexc('1d2550'))
    d.polygon([(150, 12), (152, 16), (156, 16), (153, 19), (154, 23), (150, 21), (146, 23), (147, 19), (144, 16), (148, 16)], fill=P['Y'])
    d.polygon([(0, 66), (60, 60), (140, 64), (200, 58), (W, 62), (W, H), (0, H)], fill=hexc('2e3560'))
    d.rectangle([216, 44, 262, 66], fill=P['C'])  # Sternwarte
    d.line([(216, 44), (216, 66)], fill=P['c'])
    d.pieslice([212, 24, 266, 66], 180, 360, fill=P['B'])
    d.arc([212, 24, 266, 66], 180, 360, fill=P['b'])
    d.rectangle([236, 26, 240, 44], fill=hexc('1d2550'))
    d.line([(240, 30), (268, 12)], fill=P['B'], width=5)
    d.line([(240, 30), (268, 12)], fill=P['h'], width=1)
    d.rectangle([234, 54, 242, 66], fill=P['K'])
    gear_into(img, 220, 40, 5, 8, P['B'], P['b'])
    return img


def world_wald(seed=10):
    random.seed(seed)
    img = Image.new('RGBA', (W, H), T)
    dither(img, (0, 0, W, H), [hexc('9fd3b0'), hexc('c4e5c4'), hexc('e8f4dc')])
    d = ImageDraw.Draw(img)
    cloud(d, 150, 6, 2)
    d.polygon([(0, 56), (80, 50), (160, 54), (W, 50), (W, H), (0, H)], fill=hexc('7fb36a'))
    for x in range(8, 230, 22):
        pine(d, x + random.randint(-4, 4), 62, 1, '4f8a45', '3a6a32')
    d.polygon([(0, 66), (90, 62), (180, 66), (W, 63), (W, H), (0, H)], fill=hexc('5a8f4a'))
    round_tree(d, 252, 74, 3, '4f9a3f', '3a7a2e')
    d.ellipse([240, 28, 266, 34], fill=hexc('8a6a3a')); d.line([(242, 31), (264, 31)], fill=hexc('5a3d12'))
    glow(img, 253, 26, 9, hexc('ffe9a0'), hexc('e9f2c0'))
    paste(img, SPRITES['key'], 249, 23)
    paste(img, SPRITES['magpie'], 206, 14)
    return img


WORLDS = {
    'wiese': world_wiese, 'berge': world_berge, 'wolken': world_wolken, 'hoehle': world_hoehle,
    'uhrturm': world_uhrturm, 'werkstatt': world_werkstatt, 'maschinenraum': world_maschinenraum,
    'sternwarte': world_sternwarte, 'wald': world_wald,
}

# ======================================================================= Story-Szenen 200x100
SW, SH = 200, 100


def story_wald():
    random.seed(21)
    img = Image.new('RGBA', (SW, SH), T)
    dither(img, (0, 0, SW, SH), [hexc('bfe6d2'), hexc('e6f3dc'), hexc('fff6dc')])
    d = ImageDraw.Draw(img)
    for i in range(5):  # Lichtstrahlen
        for y in range(0, 80):
            x = 160 - i * 12 - y * 0.5
            for k in range(3):
                if (y + k + i) % 3 == 0 and 0 <= x + k < SW:
                    img.putpixel((int(x + k), y), hexc('fff6c4'))
    d.polygon([(0, 74), (60, 68), (130, 74), (SW, 70), (SW, SH), (0, SH)], fill=hexc('7fb36a'))
    for x in (12, 38, 64, 148, 174, 194):
        pine(d, x, 82, 2 if x % 2 else 1)
    round_tree(d, 104, 84, 3)
    d.polygon([(84, SH), (100, 82), (116, 76), (124, 76), (112, 84), (104, SH)], fill=hexc('d9b886'))
    for (x, y) in ((92, 52), (94, 52), (96, 52), (98, 52), (92, 60), (98, 60)):
        img.putpixel((x, y), hexc('a87420'))
    for y in range(52, 61, 2):
        img.putpixel((92, y), hexc('a87420')); img.putpixel((98, y), hexc('a87420'))
    return img


def story_fluss():
    img = Image.new('RGBA', (SW, SH), T)
    dither(img, (0, 0, SW, SH), [hexc('a6dcf5'), hexc('cfe9f2'), hexc('f4f7e8')])
    d = ImageDraw.Draw(img)
    cloud(d, 140, 12, 3)
    d.rectangle([0, 56, SW, SH], fill=hexc('8cc472'))
    d.polygon([(0, 72), (60, 68), (120, 74), (SW, 70), (SW, 88), (120, 92), (60, 86), (0, 90)], fill=hexc('5ab0d8'))
    for x in range(6, SW, 18):
        d.line([(x, 79), (x + 4, 79)], fill=P['w'])
    d.ellipse([60, 72, 92, 84], fill=hexc('9aa0a8')); d.line([(62, 75), (88, 75)], fill=hexc('c0c6cc'))
    paste(img, SPRITES['frog'], 70, 66)
    for (x, y) in ((30, 60), (44, 58), (120, 56), (138, 60)):
        d.line([(x, y), (x + 2, y - 4)], fill=P['N'])
    pine(d, 176, 60, 2); pine(d, 194, 62, 1)
    return img


def story_bruecke():
    img = Image.new('RGBA', (SW, SH), T)
    dither(img, (0, 0, SW, SH), [hexc('a9c8ea'), hexc('cdd9ec'), hexc('f2ecdc')])
    d = ImageDraw.Draw(img)
    d.polygon([(90, SH), (128, 16), (172, SH)], fill=hexc('6d6280'))
    d.polygon([(121, 31), (128, 16), (135, 31), (131, 28), (128, 34), (125, 28)], fill=P['w'])
    d.rectangle([0, 58, 62, SH], fill=hexc('7aa66a')); d.rectangle([138, 58, SW, SH], fill=hexc('7aa66a'))
    d.rectangle([62, 62, 138, SH], fill=hexc('3a6a8a'))
    for x in range(66, 136, 10):
        d.line([(x, 80), (x + 3, 80)], fill=hexc('6aa0c0'))
    pts = [(62 + i, 58 + int(10 * math.sin(math.pi * i / 76))) for i in range(77)]
    d.line(pts, fill=hexc('6b4a2a'))
    d.line([(x, y - 7) for (x, y) in pts], fill=hexc('6b4a2a'))
    for i, x in enumerate((76, 96, 116)):  # Bretter Mut, Geduld, Fleiß
        y = 58 + int(10 * math.sin(math.pi * (x - 62) / 76))
        glow(img, x + 5, y, 8, hexc('fff0b0'), hexc('f6e6c0'))
        d.rectangle([x, y - 2, x + 10, y + 1], fill=P['Y']); d.line([(x, y + 1), (x + 10, y + 1)], fill=hexc('a87420'))
    pine(d, 20, 62, 2); pine(d, 178, 62, 2)
    return img


def story_berg():
    img = Image.new('RGBA', (SW, SH), T)
    dither(img, (0, 0, SW, SH), [hexc('b8cdee'), hexc('d6dff0'), hexc('f6efe0')])
    d = ImageDraw.Draw(img)
    cloud(d, 20, 14, 3)
    d.polygon([(30, SH), (116, 8), (SW + 10, SH)], fill=hexc('8c8aa6'))
    d.line([(116, 8), (SW + 10, SH)], fill=hexc('6d6a88'))
    d.polygon([(106, 19), (116, 8), (126, 19), (121, 17), (116, 23), (111, 17)], fill=P['w'])
    glow(img, 116, 6, 8, hexc('ffe08a'), hexc('f4ecd0'))
    pts = [(56, 96), (88, 80), (66, 64), (98, 48), (82, 34), (110, 18)]
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        for i in range(6):
            t = i / 6
            x, y = int(x1 + (x2 - x1) * t), int(y1 + (y2 - y1) * t)
            d.rectangle([x - 3, y, x + 3, y + 1], fill=hexc('d9c49a'))
            d.line([(x - 3, y + 1), (x + 3, y + 1)], fill=hexc('8a6a4a'))
    paste(img, SPRITES['bear'], 70, 50)
    return img


def story_nest():
    random.seed(22)
    img = Image.new('RGBA', (SW, SH), T)
    dither(img, (0, 0, SW, SH), [hexc('c9def2'), hexc('e2e6ec'), hexc('fbf0dc')])
    d = ImageDraw.Draw(img)
    cloud(d, 20, 16, 3); cloud(d, 150, 12, 2)
    d.polygon([(84, SH), (92, 66), (108, 66), (116, SH)], fill=P['r'])
    d.ellipse([46, 54, 154, 82], fill=hexc('8a6a3a'))
    for _ in range(40):
        x, y = random.randint(52, 146), random.randint(60, 78)
        d.line([(x - 4, y), (x + 4, y - 1)], fill=hexc('5a3d12'))
    d.ellipse([56, 54, 144, 66], fill=hexc('5a3d12'))
    d.rectangle([70, 52, 72, 60], fill=hexc('cfd6df')); d.ellipse([68, 48, 74, 54], fill=hexc('cfd6df'))
    for (x, col) in ((84, 'c9932f'), (116, 'c9932f'), (126, 'd9dbe7'), (62, 'd9dbe7')):
        d.ellipse([x - 3, 55, x + 3, 61], fill=hexc(col)); img.putpixel((x - 1, 56), P['w'])
    d.ellipse([104, 56, 108, 60], fill=P['R'])
    glow(img, 100, 53, 12, hexc('fff0b0'), hexc('f4e8d0'))
    paste(img, SPRITES['key'], 96, 50)
    paste(img, SPRITES['magpie'].transpose(Image.FLIP_LEFT_RIGHT), 140, 36)
    return img


def story_abendhimmel():
    random.seed(23)
    img = Image.new('RGBA', (SW, SH), T)
    dither(img, (0, 0, SW, SH), [hexc('2a2f6a'), hexc('6a4a8a'), hexc('d97a6a'), hexc('f39a6b')])
    d = ImageDraw.Draw(img)
    for _ in range(30):
        img.putpixel((random.randrange(SW), random.randrange(40)), P['w'])
    d.ellipse([146, 62, 176, 92], fill=hexc('ffb36b'))
    d.polygon([(0, 76), (60, 70), (120, 76), (SW, 72), (SW, SH), (0, SH)], fill=hexc('5a4a6e'))
    for x in (12, 34, 168, 190):
        pine(d, x, 84, 1, '3a3550', '2a2540')
    paste(img, SPRITES['magpie'], 60, 36)
    paste(img, SPRITES['letter'], 92, 28)
    for i in range(0, 14, 3):
        img.putpixel((80 + i, 40 - i // 2), P['w'])
    return img


STORY = {
    'wald': story_wald, 'fluss': story_fluss, 'bruecke': story_bruecke,
    'berg': story_berg, 'nest': story_nest, 'abendhimmel': story_abendhimmel,
}

if __name__ == '__main__':
    save(make_tipp(), 'tipp.png')
    save(make_gear(24, 8, P['C'], P['c'], P['H']), 'zahnrad.png')
    save(make_gear(24, 8, hexc('bfae95'), hexc('8f8070'), hexc('ddd0bb')), 'zahnrad-gesperrt.png')
    save(make_monster(False), 'monster.png')
    save(make_monster(True), 'monster-freund.png')
    car = Image.new('RGBA', (96, 28), T)
    car.alpha_composite(make_car(0), (0, 0)); car.alpha_composite(make_car(1), (48, 0))
    save(car, 'auto.png')  # zwei Bilder nebeneinander (Räder drehen sich)
    for name, fn in WORLDS.items():
        save(fn(), 'welten', f'{name}.png')
    for name, fn in STORY.items():
        save(fn(), 'story', f'{name}.png')
    print('Pixelart erzeugt in', os.path.normpath(ROOT))
