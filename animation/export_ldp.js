#!/usr/bin/env node
/* Export de l'animation LAD :
   - MP4 vertical 1080x1920 (boucle 14 s) via capture frame-par-frame (Playwright) + ffmpeg (H.264)
   - Still de l'étape 3 en 1080x1350 pour la slide 6 de TSS-022
   Usage : node animation/export_ldp.js
*/
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const ROOT = __dirname;
const HTML = "file://" + path.join(ROOT, "ldp.html");
const OUT = path.join(ROOT, "..", "sortie", "reels");
const FRAMES = path.join(ROOT, "_frames");

function ffmpegExe() {
  try {
    return require("child_process")
      .execSync('python3 -c "import imageio_ffmpeg as f;print(f.get_ffmpeg_exe())"')
      .toString().trim();
  } catch (_) { return "ffmpeg"; }
}
function chromePath() {
  try { const p = chromium.executablePath(); if (fs.existsSync(p)) return p; } catch (_) {}
  for (const c of [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium-1194/chrome-linux64/chrome",
  ]) if (fs.existsSync(c)) return c;
  return undefined;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });

  const browser = await chromium.launch({
    executablePath: chromePath(),
    args: ["--no-sandbox", "--force-color-profile=srgb", "--font-render-hinting=none"],
  });

  // ---------- MP4 vertical 1080x1920 ----------
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__capture = true; });
  await page.goto(HTML, { waitUntil: "load" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const meta = await page.evaluate(() => window.__meta);
  const fps = meta.fps, total = meta.total;
  const nFrames = Math.round(total * fps);
  process.stdout.write(`MP4 : ${nFrames} frames @ ${fps}fps (${total}s)\n`);

  for (let i = 0; i < nFrames; i++) {
    const t = i / fps;
    await page.evaluate((tt) => window.__seek(tt), t);
    await page.screenshot({ path: path.join(FRAMES, `f${String(i).padStart(4, "0")}.png`) });
    if (i % 30 === 0) process.stdout.write(`  frame ${i}/${nFrames}\r`);
  }
  await ctx.close();

  // ---------- Still étape 3 en 1080x1350 ----------
  const ctx2 = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 2,
  });
  const page2 = await ctx2.newPage();
  await page2.goto(HTML + "?still=8.6&bare=1", { waitUntil: "load" });
  await page2.evaluate(() => document.fonts && document.fonts.ready);
  await page2.evaluate(() => window.__seek(8.6));
  const stillPath = path.join(OUT, "TSS-022_slide6_etape3.png");
  await page2.screenshot({ path: stillPath });
  await ctx2.close();
  await browser.close();

  // ---------- assemblage MP4 (H.264) ----------
  const FF = ffmpegExe();
  const mp4 = path.join(OUT, "ldp_deplacement_dentaire.mp4");
  execFileSync(FF, [
    "-y", "-framerate", String(fps),
    "-i", path.join(FRAMES, "f%04d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-crf", "18",
    "-movflags", "+faststart",
    "-vf", "scale=1080:1920:flags=lanczos",
    mp4,
  ], { stdio: "inherit" });

  fs.rmSync(FRAMES, { recursive: true, force: true });
  const sz = (fs.statSync(mp4).size / 1e6).toFixed(1);
  console.log(`\n✅ MP4  : ${mp4} (${sz} Mo)`);
  console.log(`✅ Still: ${stillPath} (1080x1350, étape 3)`);
})().catch((e) => { console.error(e); process.exit(1); });
