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

const images: ImageConfig[] = [
  {
    // 731x1568, cropped: 731x1480
    sourceFile: 'coach-feed.jpeg',
    outputFile: 'landing-coach-feed.png',
    blurRegions: [
      { x: 40, y: 0, w: 420, h: 65 },      // "Good morning, Rajiv"
      { x: 100, y: 990, w: 260, h: 70 },    // "Wei Jie Tan" under NEEDS ATTENTION
      { x: 100, y: 1160, w: 260, h: 70 },   // "Sarah Chen" under GOING QUIET
    ],
  },
  {
    // 724x1568, cropped: 724x1480
    sourceFile: 'athlete-journey.png',
    outputFile: 'landing-athlete-journey.png',
    blurRegions: [
      { x: 100, y: 175, w: 530, h: 80 },   // "Hi Wei Jie Tan!"
      { x: 170, y: 700, w: 380, h: 160 },   // "Your coach" + "Rajiv C" + "18 sessions"
    ],
  },
  {
    // 774x1501, cropped: 774x1413
    sourceFile: 'milestone.jpeg',
    outputFile: 'landing-milestone.png',
    blurRegions: [
      { x: 100, y: 440, w: 580, h: 110 },  // "Wei Jie Tan" large name
      { x: 170, y: 680, w: 440, h: 55 },    // "Coached by Rajiv C"
    ],
  },
  {
    // 775x1568, cropped: 775x1480
    sourceFile: 'caregiver.jpeg',
    outputFile: 'landing-caregiver.png',
    blurRegions: [
      { x: 50, y: 100, w: 620, h: 120 },   // "Wei chose this avatar" + "Here's how Wei Jie Tan"
      { x: 150, y: 500, w: 470, h: 55 },    // "View Wei's journey story"
      { x: 25, y: 770, w: 350, h: 80 },     // "Wei Jie Tan Attending"
      { x: 30, y: 1040, w: 580, h: 70 },    // "WHAT COACHES ARE SAYING ABOUT WEI"
      { x: 60, y: 1100, w: 620, h: 200 },   // Quote body with "Wei Jie" mentions
      { x: 80, y: 1320, w: 250, h: 60 },    // "Rajiv C" at quote attribution
    ],
  },
  {
    // 724x1568, cropped: 724x1480
    sourceFile: 'session.png',
    outputFile: 'landing-session.png',
    blurRegions: [
      { x: 20, y: 270, w: 710, h: 260 },   // COACHES section (all names)
      { x: 20, y: 530, w: 710, h: 270 },    // ATHLETES section (all names)
      { x: 20, y: 800, w: 710, h: 420 },    // ALL PAIRINGS section (all names, extends to bottom)
    ],
  },
  {
    // 724x1568, cropped: 724x1480
    sourceFile: 'cues.png',
    outputFile: 'landing-cues.png',
    blurRegions: [
      { x: 30, y: 0, w: 260, h: 55 },      // "Wei Jie Tan" header
    ],
  },
  {
    // 724x1568, cropped: 724x1480
    sourceFile: 'club-stats.png',
    outputFile: 'landing-club-stats.png',
    blurRegions: [
      { x: 40, y: 0, w: 550, h: 150 },     // PB notifications (all names)
      { x: 40, y: 540, w: 680, h: 100 },    // Filter pills with first names
      { x: 25, y: 700, w: 440, h: 260 },    // First session card ("Rajiv C ran with" + "Arun Kumar")
      { x: 25, y: 1000, w: 440, h: 260 },   // Second session card ("Rajiv C ran with" + "Danish Rizal")
    ],
  },
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
