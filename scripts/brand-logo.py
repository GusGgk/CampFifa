"""Gera as versões do logo do BAGROMÊTRO a partir da arte original.

- remove o fundo preto (flood fill a partir das bordas + alpha suavizado na borda)
- recolore o brasão (hexágono, contorno da faixa e barrinhas) mantendo o peixe intacto
- exporta o logo completo e a marca compacta (cabeça do bagre)

Uso: python scripts/brand-logo.py design/logo-source.png public/brand competitivo=#FF4D1F
Depois copie public/brand/mark-<nome>.png para app/icon.png (favicon).
"""

import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

BG = (13, 14, 15)
BG_TOL = 14  # distância máxima (soma dos canais) para ainda ser fundo
CREST = (128, 130, 96)  # oliva do brasão na arte original
FISH_BOTTOM = 770  # abaixo dessa linha não há peixe, só brasão e faixa
MARK_BOX = (60, -130, 1160, 970)  # quadrado com o bagre inteiro centralizado


def dist(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def lum(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def olive_hue(c, min_g=40):
    r, g, b = c
    # o creme do nome também tem g > b; o brasão nunca passa de g=160
    return abs(r - g) < 16 and g - b > 12 and min_g < g < 160


def components(mask, W, H):
    seen = bytearray(W * H)
    for start in range(W * H):
        if not mask[start] or seen[start]:
            continue
        q = deque([start])
        seen[start] = 1
        members = []
        while q:
            i = q.popleft()
            members.append(i)
            x = i % W
            for j in (i - 1 if x else -1, i + 1 if x < W - 1 else -1, i - W, i + W):
                if 0 <= j < W * H and mask[j] and not seen[j]:
                    seen[j] = 1
                    q.append(j)
        yield members


GAP = 8  # frestas do contorno menores que 2*GAP px são fechadas


def background_mask(px, W, H):
    """Só o preto de fora do brasão; o painel escuro de dentro fica (legível em fundo claro)."""
    is_bg = [dist(p, BG) <= BG_TOL for p in px]
    solid = Image.new("L", (W, H))
    solid.putdata([0 if b else 255 for b in is_bg])
    closed = solid.filter(ImageFilter.MaxFilter(2 * GAP + 1))
    ImageDraw.floodfill(closed, (0, 0), 128)
    outside = closed.point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MaxFilter(2 * GAP + 1))
    return bytearray(1 if o and b else 0 for o, b in zip(outside.getdata(), is_bg))


def crest_mask(px, W, H):
    crest = bytearray(W * H)
    # 1) linhas do hexágono: componentes oliva grandes com cor uniforme igual à do brasão
    olive = bytearray(olive_hue(p, 85) and p[1] < 150 for p in px)
    for members in components(olive, W, H):
        if len(members) < 1000:
            continue
        near = sum(dist(px[i], CREST) < 30 for i in members) / len(members)
        if near >= 0.85:
            for i in members:
                crest[i] = 1
    # 2) abaixo do peixe todo oliva é brasão (barrinhas, diagonais, contorno da faixa)
    for i in range(FISH_BOTTOM * W, W * H):
        if olive_hue(px[i]):
            crest[i] = 1
    # 3) borda antialiasada: vizinhos oliva escurecidos pelo preto
    ring = bytearray(crest)
    for _ in range(2):
        grown = bytearray(ring)
        for i in range(W * H):
            if ring[i]:
                continue
            x = i % W
            for j in (i - 1 if x else -1, i + 1 if x < W - 1 else -1, i - W, i + W):
                if 0 <= j < W * H and ring[j]:
                    if px[i][1] - px[i][2] > 4 and px[i][1] >= px[i][0] - 6:
                        grown[i] = 1
                    break
        ring = grown
    return ring


def build(src: Path, out: Path, colors: dict[str, tuple[int, int, int]]):
    im = Image.open(src).convert("RGB")
    W, H = im.size
    px = list(im.getdata())
    bg = background_mask(px, W, H)
    crest = crest_mask(px, W, H)
    ref = lum(CREST)

    # alpha: fundo some; anel de 2px em volta do fundo vira color-to-alpha contra o preto
    alpha = bytearray(0 if b else 255 for b in bg)
    edge = bytearray(W * H)
    for i in range(W * H):
        if bg[i]:
            continue
        x = i % W
        for j in (i - 1 if x else -1, i + 1 if x < W - 1 else -1, i - W, i + W):
            if 0 <= j < W * H and bg[j]:
                edge[i] = 1
                break

    out.mkdir(parents=True, exist_ok=True)
    for name, target in {"original": None, **colors}.items():
        res = []
        for i, p in enumerate(px):
            if bg[i]:
                res.append((0, 0, 0, 0))
                continue
            c = p
            if target and crest[i]:
                f = lum(p) / ref
                c = tuple(min(255, round(t * f)) for t in target)
            a = alpha[i]
            if edge[i]:
                m = max(c)
                a = min(255, round(m * 1.6))
                if a:
                    c = tuple(min(255, round(v * 255 / max(a, m))) for v in c)
            res.append((*c, a))
        img = Image.new("RGBA", (W, H))
        img.putdata(res)
        full = img.crop(img.getbbox())
        full.thumbnail((800, 800), Image.LANCZOS)
        full.save(out / f"logo-{name}.png", optimize=True)
        # marca compacta: cara do bagre num ladrilho escuro (favicon / navegação)
        tile = Image.new("RGBA", (W, H), (*BG, 255))
        tile.alpha_composite(img)
        ImageDraw.Draw(tile).rectangle((0, FISH_BOTTOM + 10, W, H), fill=(*BG, 255))
        mark = Image.new("RGBA", (MARK_BOX[2] - MARK_BOX[0],) * 2, (*BG, 255))
        mark.alpha_composite(tile.crop(MARK_BOX))
        mark.resize((512, 512), Image.LANCZOS).save(out / f"mark-{name}.png", optimize=True)
        print("ok", name, full.size)


def hex_color(s):
    s = s.lstrip("#")
    return tuple(int(s[k : k + 2], 16) for k in (0, 2, 4))


if __name__ == "__main__":
    src, out, *pairs = sys.argv[1:]
    build(Path(src), Path(out), {k: hex_color(v) for k, v in (p.split("=") for p in pairs)})
