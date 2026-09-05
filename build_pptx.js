#!/usr/bin/env node
// =====================================================================
//  Génère un PowerPoint (.pptx) portrait 4:5 à partir des PNG d'un dossier
//  Usage : node build_pptx.js <dossier_slides> <sortie.pptx> ["Titre"]
//  Ex.   : node build_pptx.js sortie/S1 sortie/S1/Turkey_Teeth_S1.pptx
//  La légende (legende.txt) est placée dans les notes de la 1ʳᵉ slide.
// =====================================================================
const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const dir = process.argv[2];
const out = process.argv[3];
const title = process.argv[4] || "";
if (!dir || !out) {
  console.error("Usage : node build_pptx.js <dossier_slides> <sortie.pptx> [titre]");
  process.exit(1);
}

const W = 9, H = 11.25; // pouces, ratio 4:5 (1080x1350)
const pptx = new PptxGenJS();
pptx.defineLayout({ name: "PORTRAIT45", width: W, height: H });
pptx.layout = "PORTRAIT45";
if (title) pptx.title = title;

const pngs = fs
  .readdirSync(dir)
  .filter((f) => /^\d+\.png$/.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));

if (!pngs.length) {
  console.error("Aucune slide PNG (NN.png) trouvée dans " + dir);
  process.exit(1);
}

const legPath = path.join(dir, "legende.txt");
const legende = fs.existsSync(legPath) ? fs.readFileSync(legPath, "utf8").trim() : "";

pngs.forEach((f, i) => {
  const slide = pptx.addSlide();
  slide.background = { color: "FAF7F1" };
  slide.addImage({ path: path.join(dir, f), x: 0, y: 0, w: W, h: H });
  if (i === 0 && legende) slide.addNotes(legende);
});

pptx.writeFile({ fileName: out }).then(() => {
  console.log(`✅ ${out}  (${pngs.length} slides)`);
});
