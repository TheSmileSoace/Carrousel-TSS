#!/usr/bin/env node
// =====================================================================
//  Générateur de carrousels Instagram — The Smile Space
//  Usage :
//     node render.js                 # rend les 20 carrousels
//     node render.js TSS-ORTHO-001   # rend un (ou plusieurs) id précis
//
//  Sortie : sortie/<id>/01.png ... 07.png  +  sortie/<id>/legende.txt
// =====================================================================

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const cfg = require("./config");
const { slideHTML } = require("./template");

const ROOT = __dirname;

// --- Localise le binaire Chromium (env managé : version pré-installée) -------
function resolveChromium() {
  // 1) chemin par défaut de Playwright s'il existe
  try {
    const p = chromium.executablePath();
    if (p && fs.existsSync(p)) return p;
  } catch (_) {}
  // 2) variable d'env / installation système
  const candidates = [];
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  try {
    for (const d of fs.readdirSync(base)) {
      if (d.startsWith("chromium-")) {
        candidates.push(path.join(base, d, "chrome-linux", "chrome"));
        candidates.push(path.join(base, d, "chrome-linux64", "chrome"));
      }
    }
  } catch (_) {}
  candidates.push("/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome");
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return undefined; // laisse Playwright tenter son chemin par défaut
}

// --- Chargement des données --------------------------------------------------
function loadData() {
  for (const f of cfg.dataFiles) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) {
      const json = JSON.parse(fs.readFileSync(p, "utf8"));
      const bib = json.bibliotheque_carrousels || json;
      return { bib, source: f };
    }
  }
  throw new Error(
    "Aucun fichier de données trouvé. Attendu l'un de : " + cfg.dataFiles.join(", ")
  );
}

// --- Fonts embarquées + logo -------------------------------------------------
function loadFontsCss() {
  const p = path.join(ROOT, "assets", "fonts", "fonts.css");
  if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  console.warn("⚠  assets/fonts/fonts.css introuvable — fallback sans-serif.");
  return "";
}

function loadLogoDataUri() {
  const p = path.join(ROOT, cfg.logo);
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(p).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  const b64 = fs.readFileSync(p).toString("base64");
  return `data:${mime};base64,${b64}`;
}

// --- Utilitaires -------------------------------------------------------------
const pad2 = (n) => String(n).padStart(2, "0");

function writeLegende(dir, carrousel) {
  const legende = (carrousel.legende || "").trim();
  const tags = (carrousel.hashtags || []).join(" ");
  const content = `${legende}\n\n${tags}\n`;
  fs.writeFileSync(path.join(dir, "legende.txt"), content, "utf8");
}

// --- Programme principal -----------------------------------------------------
(async () => {
  const t0 = Date.now();
  const { bib, source } = loadData();

  // format : priorité au JSON, sinon config
  if (bib.format && bib.format.largeur && bib.format.hauteur) {
    cfg.format = { largeur: bib.format.largeur, hauteur: bib.format.hauteur };
  }

  const fontsCss = loadFontsCss();
  const logoDataUri = loadLogoDataUri();

  let carrousels = bib.carrousels || [];
  const filter = process.argv.slice(2);
  if (filter.length) {
    const set = new Set(filter);
    carrousels = carrousels.filter((c) => set.has(c.id));
  }

  if (!carrousels.length) {
    console.error("Aucun carrousel à rendre.");
    process.exit(1);
  }

  const outRoot = path.join(ROOT, cfg.outDir);
  fs.mkdirSync(outRoot, { recursive: true });

  console.log(`📄 Source        : ${source}`);
  console.log(`🎨 Format        : ${cfg.format.largeur} x ${cfg.format.hauteur}  (scale ${cfg.deviceScaleFactor})`);
  console.log(`🖼  Logo          : ${logoDataUri ? cfg.logo : `(absent) → "${cfg.brandName}"`}`);
  console.log(`📦 Carrousels    : ${carrousels.length}`);
  console.log("");

  const execPath = resolveChromium();
  const browser = await chromium.launch({
    executablePath: execPath,
    args: ["--no-sandbox", "--font-render-hinting=none"],
  });
  const context = await browser.newContext({
    viewport: { width: cfg.format.largeur, height: cfg.format.hauteur },
    deviceScaleFactor: cfg.deviceScaleFactor,
  });
  const page = await context.newPage();

  let totalImages = 0;

  for (const carrousel of carrousels) {
    const dir = path.join(outRoot, carrousel.id);
    fs.mkdirSync(dir, { recursive: true });

    const slides = (carrousel.slides || []).slice().sort((a, b) => (a.n || 0) - (b.n || 0));
    const total = slides.length || 7;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const html = slideHTML({
        slide,
        carrousel,
        index: i,
        total,
        cfg,
        fontsCss,
        logoDataUri,
      });

      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);

      const el = await page.$(".slide");
      const file = path.join(dir, `${pad2(slide.n || i + 1)}.png`);
      await el.screenshot({ path: file });
      totalImages++;
    }

    writeLegende(dir, carrousel);
    console.log(`✅ ${carrousel.id.padEnd(16)} → ${slides.length} slides + legende.txt`);
  }

  await browser.close();

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("");
  console.log("──────────────────────────────────────────────");
  console.log(`🎉 Terminé en ${secs}s`);
  console.log(`📁 Dossier de sortie : ${outRoot}`);
  console.log(`🖼  Images générées    : ${totalImages}`);
  console.log("──────────────────────────────────────────────");
})().catch((err) => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
