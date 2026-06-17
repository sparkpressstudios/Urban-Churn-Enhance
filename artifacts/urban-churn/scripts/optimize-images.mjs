/**
 * Generates WebP variants and resized versions of large public images.
 * Run: node scripts/optimize-images.mjs
 */
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const imagesDir = path.join(publicDir, "images");

/** @type {Record<string, { maxWidth: number; quality: number }>} */
const OPTIMIZE_CONFIG = {
  "uc-crafted-bg.jpg": { maxWidth: 1920, quality: 78 },
  "uc-footer-bg.jpeg": { maxWidth: 1920, quality: 75 },
  "uc-history.jpg": { maxWidth: 1600, quality: 78 },
  "uc-photo-1.jpg": { maxWidth: 1280, quality: 80 },
  "uc-photo-2.jpg": { maxWidth: 960, quality: 78 },
  "uc-photo-3.jpg": { maxWidth: 960, quality: 78 },
  "uc-photo-4.jpg": { maxWidth: 960, quality: 78 },
  "uc-photo-5.jpg": { maxWidth: 960, quality: 78 },
  "uc-photo-6.jpg": { maxWidth: 960, quality: 78 },
  "uc-locations-hero.jpg": { maxWidth: 1600, quality: 78 },
  "uc-events-hero.jpg": { maxWidth: 1600, quality: 78 },
  "uc-wholesale-hero.jpg": { maxWidth: 1600, quality: 78 },
  "uc-rotating-bg.jpg": { maxWidth: 1600, quality: 78 },
  "uc-pints-bg.jpg": { maxWidth: 1600, quality: 78 },
  "login-bg.jpg": { maxWidth: 1280, quality: 78 },
  "sparkpress-studios-logo.png": { maxWidth: 200, quality: 85 },
  "uc-logo-black.png": { maxWidth: 400, quality: 90 },
  "pa-preferred-logo.png": { maxWidth: 300, quality: 85 },
  "pa-preferred-logo-color.png": { maxWidth: 300, quality: 85 },
};

async function optimizeImage(filename, config) {
  const inputPath = path.join(imagesDir, filename);
  try {
    await stat(inputPath);
  } catch {
    console.warn(`Skipping missing file: ${filename}`);
    return;
  }

  const ext = path.extname(filename).toLowerCase();
  const base = filename.slice(0, -ext.length);
  const webpPath = path.join(imagesDir, `${base}.webp`);

  const pipeline = sharp(inputPath).resize({
    width: config.maxWidth,
    withoutEnlargement: true,
    fit: "inside",
  });

  await pipeline
    .webp({ quality: config.quality, effort: 4 })
    .toFile(webpPath);

  const inputStat = await stat(inputPath);
  const outputStat = await stat(webpPath);
  const savings = ((1 - outputStat.size / inputStat.size) * 100).toFixed(0);
  console.log(
    `✓ ${filename} → ${base}.webp (${formatBytes(inputStat.size)} → ${formatBytes(outputStat.size)}, -${savings}%)`,
  );
}

async function generateFavicons() {
  const logoPath = path.join(imagesDir, "uc-logo-official.png");
  try {
    await stat(logoPath);
  } catch {
    console.warn("Skipping favicon generation — uc-logo-official.png not found");
    return;
  }

  const faviconPath = path.join(publicDir, "favicon.ico");
  await sharp(logoPath)
    .resize(32, 32, { fit: "contain", background: { r: 17, g: 17, b: 24, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, "favicon-32.png"));

  await sharp(logoPath)
    .resize(16, 16, { fit: "contain", background: { r: 17, g: 17, b: 24, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, "favicon-16.png"));

  // ICO-compatible: use 32px PNG as favicon (browsers accept PNG favicons)
  await sharp(logoPath)
    .resize(32, 32, { fit: "contain", background: { r: 17, g: 17, b: 24, alpha: 1 } })
    .png()
    .toFile(faviconPath.replace(".ico", ".png"));

  await sharp(logoPath)
    .resize(180, 180, { fit: "contain", background: { r: 17, g: 17, b: 24, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));

  await sharp(logoPath)
    .resize(192, 192, { fit: "contain", background: { r: 17, g: 17, b: 24, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));

  await sharp(logoPath)
    .resize(512, 512, { fit: "contain", background: { r: 17, g: 17, b: 24, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));

  console.log("✓ Generated favicon, apple-touch-icon, and PWA icons");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

async function main() {
  console.log("Optimizing images in", imagesDir);
  for (const [filename, config] of Object.entries(OPTIMIZE_CONFIG)) {
    await optimizeImage(filename, config);
  }
  await generateFavicons();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
