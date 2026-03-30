import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SOURCE_DIR = path.join(__dirname, 'landing-source');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'landing');

const TARGET_WIDTH = 750;
const CROP_TOP = 88;
const BLUR_RADIUS = 50;

interface BlurRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImageConfig {
  sourceFile: string;
  outputFile: string;
  blurRegions: BlurRegion[];
}

// No blur regions — data is dummy, so names don't need redacting.
// The blur region definitions are kept commented out for future reference
// when real user data is used.
const images: ImageConfig[] = [
  { sourceFile: 'coach-feed.jpeg', outputFile: 'landing-coach-feed.png', blurRegions: [] },
  { sourceFile: 'athlete-journey.png', outputFile: 'landing-athlete-journey.png', blurRegions: [] },
  { sourceFile: 'milestone.jpeg', outputFile: 'landing-milestone.png', blurRegions: [] },
  { sourceFile: 'caregiver.jpeg', outputFile: 'landing-caregiver.png', blurRegions: [] },
  { sourceFile: 'session.png', outputFile: 'landing-session.png', blurRegions: [] },
  { sourceFile: 'cues.png', outputFile: 'landing-cues.png', blurRegions: [] },
  { sourceFile: 'club-stats.png', outputFile: 'landing-club-stats.png', blurRegions: [] },
];

async function processImage(config: ImageConfig): Promise<void> {
  const sourcePath = path.join(SOURCE_DIR, config.sourceFile);
  const outputPath = path.join(OUTPUT_DIR, config.outputFile);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`  SKIP: ${config.sourceFile} not found`);
    return;
  }

  console.log(`Processing ${config.sourceFile} -> ${config.outputFile}`);

  // Get original metadata
  const metadata = await sharp(sourcePath).metadata();
  const origWidth = metadata.width!;
  const origHeight = metadata.height!;

  // Crop top 88px (iOS status bar)
  const croppedHeight = origHeight - CROP_TOP;
  let image = sharp(sourcePath).extract({
    left: 0,
    top: CROP_TOP,
    width: origWidth,
    height: croppedHeight,
  });

  // Apply blur regions at original resolution (before resize)
  // Sharp composite approach: extract each region, blur it, composite back
  if (config.blurRegions.length > 0) {
    // First, get the cropped buffer to work with
    const croppedBuffer = await image.toBuffer();

    const composites: sharp.OverlayOptions[] = [];

    for (const region of config.blurRegions) {
      // Clamp region to image bounds
      const x = Math.max(0, Math.min(region.x, origWidth - 1));
      const y = Math.max(0, Math.min(region.y, croppedHeight - 1));
      const w = Math.min(region.w, origWidth - x);
      const h = Math.min(region.h, croppedHeight - y);

      if (w <= 0 || h <= 0) continue;

      // Extract the region, blur it heavily (double-blur for maximum privacy)
      const firstBlur = await sharp(croppedBuffer)
        .extract({ left: x, top: y, width: w, height: h })
        .blur(BLUR_RADIUS)
        .toBuffer();
      const blurredRegion = await sharp(firstBlur)
        .blur(BLUR_RADIUS)
        .toBuffer();

      composites.push({
        input: blurredRegion,
        left: x,
        top: y,
      });
    }

    image = sharp(croppedBuffer).composite(composites);
  }

  // Resize to target width and save as optimised PNG
  await image
    .resize(TARGET_WIDTH, null, { withoutEnlargement: true })
    .png({ quality: 85, compressionLevel: 9 })
    .toFile(outputPath);

  // Report output size
  const stats = fs.statSync(outputPath);
  const sizeKB = (stats.size / 1024).toFixed(0);
  console.log(`  Done: ${sizeKB} KB`);
}

async function main() {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('');

  let processed = 0;
  let skipped = 0;

  for (const config of images) {
    try {
      const sourcePath = path.join(SOURCE_DIR, config.sourceFile);
      if (!fs.existsSync(sourcePath)) {
        console.warn(`SKIP: ${config.sourceFile} not found`);
        skipped++;
        continue;
      }
      await processImage(config);
      processed++;
    } catch (err) {
      console.error(`ERROR processing ${config.sourceFile}:`, err);
    }
  }

  console.log('');
  console.log(`Processed: ${processed}, Skipped: ${skipped}`);
}

main().catch(console.error);
