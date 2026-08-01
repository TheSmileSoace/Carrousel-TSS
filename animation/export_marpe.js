#!/usr/bin/env node
/* Export de l'animation MARPE (expansion maxillaire → tissus mous) :
   - MP4 vertical 1080x1920, 30 fps, boucle ~21 s, AVEC piste audio silencieuse
     (un MP4 muet est pénalisé par Instagram ; la musique sera posée au montage)
   - Still de l'étape 3 (base élargie) en 1080x1350 pour le carrousel
   Usage : node animation/export_marpe.js
*/
const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");
const { chromium } = require("playwright");

const ROOT = __dirname;
const HTML = "file://" + path.join(ROOT, "marpe.html");
const OUT = path.join(ROOT, "..", "sortie", "reels");
const FRAMES = path.join(ROOT, "_frames_marpe");

const ffmpegExe = () => {
  try { return execSync('python3 -c "import imageio_ffmpeg as f;print(f.get_ffmpeg_exe())"').toString().trim(); }
  catch (_) { return "ffmpeg"; }
};
const chromePath = () => {
  try { const p = chromium.executablePath(); if (fs.existsSync(p)) return p; } catch (_) {}
  for (const c of [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium-1194/chrome-linux64/chrome",
  ]) if (fs.existsSync(c)) return c;
  return undefined;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });

  const browser = await chromium.launch({
    executablePath: chromePath(),
    args: ["--no-sandbox", "--force-color-profile=srgb", "--font-render-hinting=none"],
  });

  // ---------- frames MP4 1080x1920 ----------
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__capture = true; });
  await page.goto(HTML, { waitUntil: "load" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const meta = await page.evaluate(() => window.__meta);
  const fps = meta.fps, total = meta.total, nFrames = Math.round(total * fps);
  process.stdout.write(`MP4 : ${nFrames} frames @ ${fps}fps (${total}s)\n`);
  for (let i = 0; i < nFrames; i++) {
    await page.evaluate((tt) => window.__seek(tt), i / fps);
    await page.screenshot({ path: path.join(FRAMES, `f${String(i).padStart(4, "0")}.png`) });
    if (i % 30 === 0) process.stdout.write(`  frame ${i}/${nFrames}\r`);
  }
  await ctx.close();

  // ---------- still étape 3 (base élargie) 1080x1350 (bare) ----------
  const ctx2 = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  const page2 = await ctx2.newPage();
  await page2.goto(HTML + "?still=16&bare=1", { waitUntil: "load" });
  await page2.evaluate(() => document.fonts && document.fonts.ready);
  await page2.evaluate(() => window.__seek(16));
  const stillPath = path.join(OUT, "expansion_maxillaire_etape3.png");
  await page2.screenshot({ path: stillPath });
  await ctx2.close();
  await browser.close();

  // ---------- assemblage MP4 + piste audio silencieuse ----------
  const FF = ffmpegExe();
  const mp4 = path.join(OUT, "marpe_expansion_maxillaire.mp4");
  execFileSync(FF, [
    "-y",
    "-framerate", String(fps), "-i", path.join(FRAMES, "f%04d.png"),
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", // audio muet
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-crf", "18",
    "-c:a", "aac", "-b:a", "96k", "-shortest",
    "-movflags", "+faststart",
    "-vf", "scale=1080:1920:flags=lanczos",
    mp4,
  ], { stdio: "inherit" });

  fs.rmSync(FRAMES, { recursive: true, force: true });
  const sz = (fs.statSync(mp4).size / 1e6).toFixed(1);
  console.log(`\n✅ MP4  : ${mp4} (${sz} Mo, avec piste audio silencieuse)`);
  console.log(`✅ Still: ${stillPath} (1080x1350, étape 3)`);
})().catch((e) => { console.error(e); process.exit(1); });
