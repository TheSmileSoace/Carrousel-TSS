#!/usr/bin/env python3
# =====================================================================
#  make_photos.py — prépare les photos en images NATIVES pour le .pptx.
#  Lit deck/out/photos.json (rects mesurés dans le rendu) et produit :
#   - cover : recadrage au ratio du cadre + coins arrondis (PNG RGBA)
#   - contain (radios) : image ajustée (contain) dans le cadre
#  Sorties : deck/out/photos/NN_i.png + deck/out/photos_final.json
# =====================================================================
import json, os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.environ.get("DECK_OUT", os.path.join(os.path.dirname(__file__), "out"))
ASSETS = os.environ.get("DECK_ASSETS", os.path.join(ROOT, "assets/carrousels/mathys"))
PDIR = os.path.join(OUT, "photos")
os.makedirs(PDIR, exist_ok=True)
S = 1.6              # rendu (assez net à la taille d'affichage, fichiers légers)
RAD = 20             # rayon coins (px CSS)
CREAM = (250, 247, 241)   # fond crème des diapos claires (matte des coins arrondis)
ANTH = (43, 41, 38)       # anthracite des diapos sombres (matte des coins arrondis)

photos = json.load(open(os.path.join(OUT, "photos.json")))
final = {}

def rounded(im, rad):
    im = im.convert("RGBA")
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.size[0], im.size[1]], radius=rad, fill=255)
    im.putalpha(mask)
    return im

def cover(im, tw, th):
    iw, ih = im.size
    s = max(tw / iw, th / ih)
    nw, nh = int(iw * s + 0.5), int(ih * s + 0.5)
    im = im.resize((nw, nh), Image.LANCZOS)
    x = (nw - tw) // 2; y = (nh - th) // 2
    return im.crop((x, y, x + tw, y + th))

def save(im_rgba, base, is_qr, matte=CREAM):
    """QR -> PNG net ; sinon coins arrondis mattés (crème ou anthracite) -> JPEG léger."""
    if is_qr:
        p = base + ".png"; im_rgba.save(p); return p
    bg = Image.new("RGB", im_rgba.size, matte)
    bg.paste(im_rgba, (0, 0), im_rgba)
    p = base + ".jpg"; bg.save(p, quality=84, optimize=True); return p

for slide, lst in photos.items():
    out = []
    for i, ph in enumerate(lst):
        src = Image.open(os.path.join(ASSETS, ph["file"])).convert("RGB")
        is_qr = "qr/" in ph["file"]
        matte = ANTH if ph.get("dark") else CREAM
        base = os.path.join(PDIR, f"{int(slide):02d}_{i}")
        if ph["fit"] == "contain":
            fw = ph["w"]; fh = ph["h"]; iw, ih = src.size
            sc = min(fw / iw, fh / ih); pw, ph2 = iw * sc, ih * sc
            im = src.resize((max(1, int(pw * S)), max(1, int(ph2 * S))), Image.LANCZOS)
            p = save(rounded(im, RAD * S // 2), base, is_qr, matte)
            out.append({"png": os.path.relpath(p, ROOT),
                        "x": ph["x"] + (fw - pw) / 2, "y": ph["y"] + (fh - ph2) / 2,
                        "w": pw, "h": ph2, "fit": "contain"})
        else:
            tw, th = int(ph["w"] * S), int(ph["h"] * S)
            p = save(rounded(cover(src, tw, th), int(RAD * S)), base, is_qr, matte)
            out.append({"png": os.path.relpath(p, ROOT),
                        "x": ph["x"], "y": ph["y"], "w": ph["w"], "h": ph["h"], "fit": "cover"})
    final[slide] = out

json.dump(final, open(os.path.join(OUT, "photos_final.json"), "w"), indent=1)
print("photos préparées :", sum(len(v) for v in final.values()))
