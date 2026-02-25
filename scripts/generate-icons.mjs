import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function createIconSvg(size) {
  // Scale factor based on 512 as the base
  const s = size / 512

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14B8A6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0F766E;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.15);stop-opacity:1" />
      <stop offset="50%" style="stop-color:rgba(255,255,255,0);stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="${2 * s}" stdDeviation="${4 * s}" flood-color="rgba(0,0,0,0.15)" />
    </filter>
  </defs>

  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" ry="${size * 0.22}" fill="url(#bg)" />

  <!-- Subtle shine overlay -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" ry="${size * 0.22}" fill="url(#shine)" />

  <!-- Running figure - stylized silhouette -->
  <g transform="translate(${size * 0.5}, ${size * 0.36}) scale(${s})" filter="url(#shadow)">
    <!-- Head -->
    <circle cx="30" cy="-55" r="28" fill="white" opacity="0.95" />

    <!-- Body - fluid running pose -->
    <path d="
      M 15,-25
      C 10,-5 5,20 -10,55
      L -25,55
      C -10,20 -5,-5 10,-25
      Z
    " fill="white" opacity="0.95" />

    <!-- Front arm -->
    <path d="
      M 10,-20
      C 30,-35 55,-50 70,-40
    " stroke="white" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.95" />

    <!-- Back arm -->
    <path d="
      M 5,-15
      C -25,-30 -55,-20 -60,-10
    " stroke="white" stroke-width="16" stroke-linecap="round" fill="none" opacity="0.9" />

    <!-- Front leg (extended) -->
    <path d="
      M -5,50
      C 20,75 50,100 70,110
    " stroke="white" stroke-width="20" stroke-linecap="round" fill="none" opacity="0.95" />

    <!-- Back leg (kicked back) -->
    <path d="
      M -15,50
      C -40,70 -70,60 -85,45
    " stroke="white" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.9" />
  </g>

  <!-- SOSG text -->
  <text
    x="${size * 0.5}"
    y="${size * 0.85}"
    text-anchor="middle"
    font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    font-size="${size * 0.115}"
    font-weight="700"
    letter-spacing="${size * 0.015}"
    fill="white"
    opacity="0.95"
  >SOSG</text>
</svg>`
}

async function generateIcons() {
  const publicDir = join(__dirname, '..', 'public')

  for (const size of [192, 512]) {
    const svg = createIconSvg(size)
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()
    const outputPath = join(publicDir, `icon-${size}.png`)
    writeFileSync(outputPath, pngBuffer)
    console.log(`Generated ${outputPath} (${pngBuffer.length} bytes)`)
  }

  console.log('Done! Icons generated successfully.')
}

generateIcons().catch(console.error)
