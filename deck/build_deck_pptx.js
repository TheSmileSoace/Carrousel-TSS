#!/usr/bin/env node
// =====================================================================
//  Assemble le deck Cas Mathys en .pptx 16:9 (une image plein cadre / slide)
//  Reprend les notes du conférencier depuis mathys_notes.json.
//  Usage : node deck/build_deck_pptx.js [sortie.pptx]
// =====================================================================
const fs = require("fs"), path = require("path");
const PptxGenJS = require("pptxgenjs");

const OUT = path.join(__dirname, "out");
const notesPath = path.join(OUT, "notes.json");
const notes = fs.existsSync(notesPath)
  ? JSON.parse(fs.readFileSync(notesPath, "utf8"))
  : JSON.parse(fs.readFileSync(path.join(__dirname, "mathys_notes.json"), "utf8"));
const dest = process.argv[2] || path.join(__dirname, "..", "sortie", "Cas_Mathys_TSS.pptx");

const W = 13.333, H = 7.5; // 16:9
const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE169", width: W, height: H });
pptx.layout = "WIDE169";
pptx.title = "The Smile Space — Cas 1 · Mathys";

const pngs = fs.readdirSync(OUT).filter(f => /^\d+\.png$/.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));
if (!pngs.length) { console.error("Aucune slide PNG dans " + OUT); process.exit(1); }

pngs.forEach((f) => {
  const n = parseInt(f);
  const slide = pptx.addSlide();
  slide.background = { color: "FAF7F1" };
  slide.addImage({ path: path.join(OUT, f), x: 0, y: 0, w: W, h: H });
  const note = notes[String(n)];
  if (note) slide.addNotes(note);
});

fs.mkdirSync(path.dirname(dest), { recursive: true });
pptx.writeFile({ fileName: dest }).then(() => {
  console.log(`✅ ${dest}  (${pngs.length} slides 16:9)`);
});
