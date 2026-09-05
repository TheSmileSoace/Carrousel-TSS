#!/usr/bin/env node
// =====================================================================
//  Assemble le deck en .pptx 16:9 avec TEXTE ÉDITABLE :
//   - fond de chaque diapo = image sans texte (photos + graphismes)  : NN_bg.png
//   - textes = vraies zones de texte PowerPoint posées par-dessus     : text.json
//  Notes du conférencier depuis notes.json. Usage : node deck/build_deck_pptx.js [out.pptx]
// =====================================================================
const fs = require("fs"), path = require("path");
const PptxGenJS = require("pptxgenjs");

const OUT = path.join(__dirname, "out");
const notes = JSON.parse(fs.readFileSync(path.join(OUT, "notes.json"), "utf8"));
const text = JSON.parse(fs.readFileSync(path.join(OUT, "text.json"), "utf8"));
const dest = process.argv[2] || path.join(__dirname, "..", "sortie", "Cas_Mathys_TSS.pptx");

const W = 13.333, H = 7.5;              // 16:9 (pouces)
const SC = W / 1920;                    // px -> pouces (identique en X et Y)
const PT = 0.5;                         // px -> points (1920px = 960pt)

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE169", width: W, height: H });
pptx.layout = "WIDE169";
pptx.title = "The Smile Space — Cas 1 · Mathys";

const bgs = fs.readdirSync(OUT).filter((f) => /^\d+_bg\.png$/.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));
if (!bgs.length) { console.error("Aucun fond NN_bg.png — lance d'abord render_mathys.js"); process.exit(1); }

const alignOf = (a) => (a === "center" || a === "right" ? a : "left");

bgs.forEach((f) => {
  const n = parseInt(f);
  const slide = pptx.addSlide();
  slide.background = { color: "FAF7F1" };
  slide.addImage({ path: path.join(OUT, f), x: 0, y: 0, w: W, h: H });

  (text[String(n)] || []).forEach((it) => {
    const runs = [];
    (it.runs || []).forEach((r) => {
      if (r.br) {
        if (runs.length) runs[runs.length - 1].options.breakLine = true;
        else runs.push({ text: "", options: { breakLine: true } });
      } else {
        runs.push({ text: r.t, options: { color: r.color || "000000", bold: !!r.bold } });
      }
    });
    if (!runs.length) return;
    slide.addText(runs, {
      x: it.x * SC, y: it.y * SC, w: it.w * SC, h: it.h * SC,
      align: alignOf(it.align), valign: "top",
      fontFace: it.family || "Inter",
      fontSize: +(it.size * PT).toFixed(1),
      lineSpacingMultiple: +(it.lh / it.size).toFixed(3),
      margin: [0, 0, 0, +((it.padL || 0) * PT).toFixed(1)],
      isTextBox: true, wrap: true, autoFit: false,
    });
  });

  const note = notes[String(n)];
  if (note) slide.addNotes(note);
});

fs.mkdirSync(path.dirname(dest), { recursive: true });
pptx.writeFile({ fileName: dest }).then(() => {
  console.log(`✅ ${dest}  (${bgs.length} slides 16:9, texte éditable)`);
});
