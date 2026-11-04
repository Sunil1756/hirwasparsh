const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function run() {
  const publicDir = path.resolve(__dirname, '../public');
  const logoPath = path.join(publicDir, 'logo.png');

  if (!fs.existsSync(logoPath)) {
    console.error('Logo not found at:', logoPath);
    process.exit(1);
  }

  console.log('Generating proper icons from logo.png...');

  // 1. Icon 192x192
  await sharp(logoPath)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Created icon-192.png (192x192)');

  // 2. Icon 512x512
  await sharp(logoPath)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-512.png (512x512)');

  // 3. Favicon 32x32
  await sharp(logoPath)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('Created favicon-32x32.png (32x32)');

  // 4. Favicon 16x16
  await sharp(logoPath)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('Created favicon-16x16.png (16x16)');

  // 5. Generate 1200x630 OpenGraph Image (public/og-image.jpg)
  console.log('Generating 1200x630 OpenGraph social share card...');
  const logoResized = await sharp(logoPath)
    .resize(130, 130, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const svgCard = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#022c22" />
          <stop offset="50%" stop-color="#064e3b" />
          <stop offset="100%" stop-color="#021f18" />
        </linearGradient>
        <radialGradient id="glow" cx="80%" cy="20%" r="60%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#064e3b" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bg)" />
      <rect width="1200" height="630" fill="url(#glow)" />

      <!-- Border Frame -->
      <rect x="30" y="30" width="1140" height="570" rx="24" fill="none" stroke="#10b981" stroke-opacity="0.35" stroke-width="2" />
      <circle cx="1040" cy="160" r="140" fill="#10b981" fill-opacity="0.08" />
      <circle cx="980" cy="460" r="180" fill="#34d399" fill-opacity="0.06" />

      <!-- Top Badge -->
      <rect x="80" y="70" width="450" height="42" rx="21" fill="#10b981" fill-opacity="0.2" stroke="#34d399" stroke-opacity="0.5" stroke-width="1.5" />
      <text x="105" y="97" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="#a7f3d0" letter-spacing="1.5">
        VERIFIED AFFORESTATION MRV PLATFORM
      </text>

      <!-- Title -->
      <text x="240" y="215" font-family="system-ui, -apple-system, sans-serif" font-size="58" font-weight="800" fill="#ffffff" letter-spacing="-1">
        Green Enlightenment
      </text>

      <!-- Slogan -->
      <text x="80" y="315" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" fill="#34d399">
        Plant with Proof. Grow with Trust.
      </text>

      <!-- Subtitle -->
      <text x="80" y="375" font-family="system-ui, -apple-system, sans-serif" font-size="21" font-weight="400" fill="#e2e8f0">
        AI Ground Truth Audits • Copernicus Sentinel-2 Telemetry • IPCC Tier-2 Carbon
      </text>

      <!-- Badges -->
      <g transform="translate(80, 430)">
        <rect x="0" y="0" width="235" height="48" rx="12" fill="#064e3b" stroke="#10b981" stroke-opacity="0.45" stroke-width="1.5" />
        <text x="20" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600" fill="#a7f3d0">Sentinel-2 Live Telemetry</text>

        <rect x="255" y="0" width="220" height="48" rx="12" fill="#064e3b" stroke="#10b981" stroke-opacity="0.45" stroke-width="1.5" />
        <text x="275" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600" fill="#a7f3d0">Anti-Greenwashing MRV</text>

        <rect x="495" y="0" width="210" height="48" rx="12" fill="#064e3b" stroke="#10b981" stroke-opacity="0.45" stroke-width="1.5" />
        <text x="515" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600" fill="#a7f3d0">ISO 14064-2 Aligned</text>
      </g>

      <!-- Footer URL -->
      <text x="80" y="550" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#6ee7b7">
        https://green-enlightenment.com
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svgCard))
    .composite([
      {
        input: logoResized,
        top: 135,
        left: 80,
      },
    ])
    .jpeg({ quality: 92 })
    .toFile(path.join(publicDir, 'og-image.jpg'));

  console.log('Created og-image.jpg (1200x630)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
