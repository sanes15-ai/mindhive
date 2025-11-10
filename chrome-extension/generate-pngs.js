const sharp = require('sharp');
const fs = require('fs');

// Read our SVG
const svgBuffer = fs.readFileSync('assets/icon.svg');

// Generate all required sizes
const sizes = [16, 32, 48, 128];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(`assets/icon${size}.png`);
    console.log(`✓ Generated assets/icon${size}.png`);
  }
  console.log('\n✅ All icon sizes generated!');
}

generateIcons().catch(console.error);
