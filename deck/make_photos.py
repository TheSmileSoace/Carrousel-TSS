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
OUT = os.path.join(os.path.dirname(__file__), "out")
ASSETS = os.path.join(ROOT, "assets/carrousels/mathys")
PDIR = os.path.join(OUT, "photos")
os.makedirs(PDIR, exist_ok=True)
S = 2                # rendu 2x
RAD = 20             # rayon coins (px CSS)

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

for slide, lst in photos.items():
    out = []
    for i, ph in enumerate(lst):
        src = Image.open(os.path.join(ASSETS, ph["file"])).convert("RGB")
        if ph["fit"] == "contain":
            # ajuste l'image (contain) dans le cadre, centrée
            fw = ph["w"]; fh = ph["h"]
            iw, ih = src.size
            sc = min(fw / iw, fh / ih)
            pw, ph2 = iw * sc, ih * sc
            im = src.resize((max(1, int(pw * S)), max(1, int(ph2 * S))), Image.LANCZOS)
            png = os.path.join(PDIR, f"{int(slide):02d}_{i}.png")
            rounded(im, RAD * S // 2).save(png)
            out.append({"png": os.path.relpath(png, ROOT),
                        "x": ph["x"] + (fw - pw) / 2, "y": ph["y"] + (fh - ph2) / 2,
                        "w": pw, "h": ph2, "fit": "contain"})
        else:
            tw, th = int(ph["w"] * S), int(ph["h"] * S)
            im = rounded(cover(src, tw, th), RAD * S)
            png = os.path.join(PDIR, f"{int(slide):02d}_{i}.png")
            im.save(png)
            out.append({"png": os.path.relpath(png, ROOT),
                        "x": ph["x"], "y": ph["y"], "w": ph["w"], "h": ph["h"], "fit": "cover"})
    final[slide] = out

json.dump(final, open(os.path.join(OUT, "photos_final.json"), "w"), indent=1)
print("photos préparées :", sum(len(v) for v in final.values()))
