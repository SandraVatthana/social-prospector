/**
 * Script pour générer les icônes PNG depuis le SVG
 * Usage: node generate-icons.js
 *
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Vérifie si sharp est installé
try {
  const sharp = require('sharp');

  const sizes = [16, 48, 128];
  const svgPath = path.join(__dirname, 'icons', 'icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  async function generateIcons() {
    for (const size of sizes) {
      const outputPath = path.join(__dirname, 'icons', `icon${size}.png`);

      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated icon${size}.png`);
    }

    console.log('\nAll icons generated successfully!');
  }

  generateIcons().catch(console.error);

} catch (e) {
  // Fallback: créer des icônes PNG simples avec un canvas HTML
  console.log('Sharp not installed. Creating placeholder icons...');
  console.log('To generate proper icons, run: npm install sharp && node generate-icons.js');
  console.log('\nAlternatively, convert the SVG manually using an online tool like:');
  console.log('https://svgtopng.com/');

  // Créer des fichiers PNG placeholder (1x1 pixel transparent)
  const sizes = [16, 48, 128];
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, // RGBA
    0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xD7, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
    0x0D, 0x0A, 0x2D, 0xB4,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
  ]);

  for (const size of sizes) {
    const outputPath = path.join(__dirname, 'icons', `icon${size}.png`);
    fs.writeFileSync(outputPath, pngHeader);
    console.log(`✓ Created placeholder icon${size}.png`);
  }

  console.log('\n⚠️  Ces icônes sont des placeholders. Convertissez le SVG pour de vraies icônes.');
}
