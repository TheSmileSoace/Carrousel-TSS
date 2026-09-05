#!/usr/bin/env node
// =====================================================================
//  Assemble le deck en .pptx 16:9 — TOUT NATIF (rien de cuit) :
//   - fond : uniquement couleur/texture (NN_bg.png plat)
//   - formes (cartes, boîtes, pastilles, puces, chips) = shapes natives
//   - photos = images natives (déplaçables/redimensionnables/remplaçables)
//   - textes = zones de texte natives
//   - pied : ligne + logo + badge ULB natifs, NUMÉRO = champ slide-number auto
//  Usage : node deck/build_deck_pptx.js [out.pptx]
// =====================================================================
const fs = require("fs"), path = require("path");
const PptxGenJS = require("pptxgenjs");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(__dirname, "out");
const rd = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8"));
const notes = rd("notes.json"), text = rd("text.json"), shapes = rd("shapes.json");
const foot = rd("foot.json"), meta = rd("meta.json");
const photosPath = path.join(OUT, "photos_final.json");
const photos = fs.existsSync(photosPath) ? JSON.parse(fs.readFileSync(photosPath, "utf8")) : {};
const dest = process.argv[2] || path.join(ROOT, "sortie", "Cas_Mathys_TSS.pptx");

const W = 13.333, H = 7.5, SC = W / 1920, PT = 0.5;
const LOGO_DARK = path.join(ROOT, "assets/logo.png");
const LOGO_LIGHT = path.join(ROOT, "assets/logo-light.png");
const ULB_LOGO = path.join(ROOT, "assets/logo-ulb.png");

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE169", width: W, height: H });
pptx.layout = "WIDE169";
pptx.title = "The Smile Space — Cas 1 · Mathys";

const alignOf = (a) => (a === "center" || a === "right" ? a : "left");
const IN = (px) => px * SC;

const bgs = fs.readdirSync(OUT).filter((f) => /^\d+_bg\.png$/.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));

bgs.forEach((f) => {
  const n = parseInt(f), k = String(n), dark = meta[k] && meta[k].dark;
  const slide = pptx.addSlide();
  // fond = couleur/texture uniquement
  slide.background = { path: path.join(OUT, f) };

  // ---- formes natives ----
  (shapes[k] || []).forEach((sh) => {
    if (sh.type === "ellipse") {
      slide.addShape("ellipse", { x: IN(sh.x), y: IN(sh.y), w: IN(sh.w), h: IN(sh.h),
        fill: { color: sh.fill } });
    } else {
      const rad = Math.min(sh.rad, sh.w / 2, sh.h / 2);
      const o = { x: IN(sh.x), y: IN(sh.y), w: IN(sh.w), h: IN(sh.h),
        fill: { color: sh.fill }, rectRadius: IN(rad) };
      if (sh.line) o.line = { color: sh.line, width: sh.lw || 1 };
      else o.line = { type: "none" };
      if (sh.shadow) o.shadow = { type: "outer", color: "2B2926", blur: 10, offset: 5, angle: 90, opacity: 0.10 };
      slide.addShape("roundRect", o);
    }
  });

  // ---- photos natives ----
  (photos[k] || []).forEach((ph) => {
    slide.addImage({ path: path.join(ROOT, ph.png), x: IN(ph.x), y: IN(ph.y), w: IN(ph.w), h: IN(ph.h),
      shadow: { type: "outer", color: "2B2926", blur: 9, offset: 4, angle: 90, opacity: 0.16 } });
  });

  // ---- textes natifs (+ puces de liste + barre de citation) ----
  (text[k] || []).forEach((it) => {
    // barre d'accent de la citation
    if (it.sel === ".quote") {
      slide.addShape("rect", { x: IN(it.x), y: IN(it.y), w: IN(6), h: IN(it.h), fill: { color: "C3A46E" }, line: { type: "none" } });
    }
    // puce de liste (carte)
    if (it.sel === ".card li") {
      slide.addShape("roundRect", { x: IN(it.x), y: IN(it.y + (it.lh - 14) / 2), w: IN(14), h: IN(14),
        rectRadius: IN(4), fill: { color: "C3A46E" }, line: { type: "none" } });
    }
    const runs = [];
    (it.runs || []).forEach((r) => {
      if (r.br) { if (runs.length) runs[runs.length - 1].options.breakLine = true; else runs.push({ text: "", options: { breakLine: true } }); }
      else runs.push({ text: r.t, options: { color: r.color || "000000", bold: !!r.bold } });
    });
    if (!runs.length) return;
    const hasBr = (it.runs || []).some((r) => r.br);
    const singleLine = !hasBr && it.h <= it.lh * 1.6;   // libellé sur une ligne -> pas de retour
    slide.addText(runs, {
      x: IN(it.x), y: IN(it.y), w: IN(it.w + (singleLine ? 8 : 0)), h: IN(it.h),
      align: alignOf(it.align), valign: it.mid ? "middle" : "top",
      fontFace: it.family || "Inter", fontSize: +(it.size * PT).toFixed(1),
      lineSpacingMultiple: +(it.lh / it.size).toFixed(3),
      margin: [ (it.padT || 0) * PT, (it.padR || 0) * PT, 0, (it.padL || 0) * PT ],
      isTextBox: true, wrap: !singleLine, autoFit: false,
    });
  });

  // ---- pied de page ----
  const ft = foot[k] || {};
  if (ft.lineY != null) {
    slide.addShape("line", { x: IN(ft.lineX0), y: IN(ft.lineY), w: IN(ft.lineX1 - ft.lineX0), h: 0,
      line: { color: ft.dark ? "6A655C" : "DED6C8", width: 1 } });
  }
  if (ft.logo) {
    slide.addImage({ path: ft.dark ? LOGO_LIGHT : LOGO_DARK, x: IN(ft.logo.x), y: IN(ft.logo.y), w: IN(ft.logo.w), h: IN(ft.logo.h) });
  }
  if (ft.ulb) {
    if (fs.existsSync(ULB_LOGO)) {
      slide.addImage({ path: ULB_LOGO, x: IN(ft.ulb.x), y: IN(ft.ulb.y), w: IN(ft.ulb.w), h: IN(ft.ulb.h) });
    } else {
      slide.addShape("roundRect", { x: IN(ft.ulb.x), y: IN(ft.ulb.y), w: IN(ft.ulb.w), h: IN(ft.ulb.h),
        rectRadius: IN(12), fill: { type: "none" }, line: { color: ft.dark ? "8A857C" : "9B927F", width: 1.5, dashType: "dash" } });
      slide.addText("ULB", { x: IN(ft.ulb.x), y: IN(ft.ulb.y), w: IN(ft.ulb.w), h: IN(ft.ulb.h),
        align: "center", valign: "middle", fontFace: "Poppins", fontSize: 12, bold: true, charSpacing: 2,
        color: ft.dark ? "D8D2C8" : "8A8272", margin: 0 });
    }
  }
  if (ft.num) {
    // NUMÉRO DYNAMIQUE : champ slide-number natif (recalculé auto)
    slide.slideNumber = { x: IN(ft.num.x - 6), y: IN(ft.num.y), w: IN(ft.num.w + 12), h: IN(ft.num.h),
      align: "center", valign: "middle", fontFace: "Poppins", fontSize: +(ft.num.size * PT).toFixed(1), color: ft.num.color };
  }
  if (ft.portrait && ft.portrait.src) {
    slide.addImage({ path: path.join(ROOT, ft.portrait.src), x: IN(ft.portrait.x), y: IN(ft.portrait.y), w: IN(ft.portrait.w), h: IN(ft.portrait.h),
      shadow: { type: "outer", color: "000000", blur: 14, offset: 6, angle: 90, opacity: 0.4 } });
  }

  if (notes[k]) slide.addNotes(notes[k]);
});

fs.mkdirSync(path.dirname(dest), { recursive: true });
pptx.writeFile({ fileName: dest }).then(() => {
  console.log(`✅ ${dest}  (${bgs.length} slides, tout natif, n° dynamique)`);
});
