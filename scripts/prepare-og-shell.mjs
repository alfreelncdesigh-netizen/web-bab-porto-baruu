import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');
const builtIndex = path.join(distDir, 'index.html');
const appShellHtml = path.join(distDir, '_app.html');

if (!fs.existsSync(builtIndex)) {
  console.error('[prepare-og-shell] dist/index.html tidak ditemukan setelah vite build.');
  process.exit(1);
}

const htmlContent = fs.readFileSync(builtIndex, 'utf-8');
fs.writeFileSync(appShellHtml, htmlContent, 'utf-8');
fs.unlinkSync(builtIndex);

console.log('[prepare-og-shell] Memindahkan dist/index.html -> dist/_app.html agar / dan /project/:id melalui /api/og-html di Vercel.');
