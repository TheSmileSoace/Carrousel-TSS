#!/usr/bin/env node
// Rend les illustrations SVG (illus.html) en PNG 1080x1080 @2x -> assets/illus/
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "illus");
const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const HTML = "file://" + path.join(__dirname, "illus.html");

const JOBS = [
  { img: "sourire", file: "beau_sourire.png" },
  { img: "moignons", file: "moignons.png" },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: fs.existsSync(EXEC) ? EXEC : undefined,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1080 },
    deviceScaleFactor: 2,
  });
  for (const j of JOBS) {
    await page.goto(`${HTML}?img=${j.img}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__ready === true);
    const el = await page.$("svg");
    await el.screenshot({ path: path.join(OUT, j.file) });
    console.log("✅", j.file);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
