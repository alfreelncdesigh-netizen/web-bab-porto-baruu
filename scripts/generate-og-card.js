import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function createSocialCard() {
  const width = 1200;
  const height = 630;

  // Clean studio background SVG
  const svgBg = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad" cx="72%" cy="50%" r="65%">
          <stop offset="0%" stop-color="#eff6ff" stop-opacity="1" />
          <stop offset="55%" stop-color="#f8fafc" stop-opacity="1" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="1" />
        </radialGradient>
        <radialGradient id="glow" cx="75%" cy="52%" r="40%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)" />
      <circle cx="880" cy="330" r="280" fill="url(#glow)" />
      
      <!-- Text Branding on Left Side -->
      <g transform="translate(80, 160)">
        <!-- Badge -->
        <rect x="0" y="0" width="180" height="32" rx="16" fill="#2563eb" fill-opacity="0.12" />
        <circle cx="16" cy="16" r="4" fill="#2563eb" />
        <text x="28" y="21" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="700" fill="#2563eb" letter-spacing="1.5">PORTFOLIO DESIGN</text>
        
        <!-- Big Title -->
        <text x="0" y="85" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="52" font-weight="900" fill="#09090b" letter-spacing="-1.5">ALFREELNC DESIGN</text>
        <text x="0" y="145" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="34" font-weight="800" fill="#2563eb" letter-spacing="-0.5">Muhammad Albiansyah</text>
        
        <!-- Subtitle / Tagline -->
        <text x="0" y="200" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="18" font-weight="600" fill="#475569">Desainer Grafis Profesional &amp; UI/UX Specialist</text>
        <text x="0" y="230" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="15" font-weight="400" fill="#94a3b8">Jasa Desain Poster • Visual Identity • Mockup 3D</text>
        
        <!-- Action Button Pill -->
        <rect x="0" y="275" width="220" height="42" rx="21" fill="#09090b" />
        <text x="24" y="302" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="13" font-weight="700" fill="#ffffff">Lihat Karya Portofolio →</text>
      </g>
    </svg>
  `);

  const heroSource = fs.existsSync('public/images/hero-albi-original.png')
    ? 'public/images/hero-albi-original.png'
    : 'public/images/hero-albi.png';

  const heroImgBuffer = await sharp(heroSource)
    .resize({ height: 590, fit: 'inside' })
    .toBuffer();

  const heroMeta = await sharp(heroImgBuffer).metadata();
  const heroLeft = Math.round(width - (heroMeta.width || 470) - 60);
  const heroTop = height - (heroMeta.height || 590);

  await sharp(svgBg)
    .composite([
      {
        input: heroImgBuffer,
        top: Math.max(0, heroTop),
        left: Math.max(480, heroLeft),
      }
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile('public/images/hero-albi-og.jpg');

  const stat = fs.statSync('public/images/hero-albi-og.jpg');
  console.log('Successfully created public/images/hero-albi-og.jpg:', stat.size, 'bytes (~', Math.round(stat.size/1024), 'KB)');
}

createSocialCard().catch(console.error);
