import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? Number(process.argv[portArgIndex + 1]) : null;
const PORT = Number(process.env.PORT) || cliPort || 3000;

// Determine whether the app is in production mode.
const isProd = process.env.NODE_ENV === 'production';

// Sembunyikan fingerprint server untuk keamanan
app.disable('x-powered-by');

// ============================================================================
// 1. HEADER KEAMANAN ADAPTIF & RAMAH AKSES (Bebas Iframe & Akses Multi-Device)
// ============================================================================
app.use((_req: Request, res: Response, next: NextFunction): void => {
  // CSP yang ramah terhadap semua asset, font, gambar Cloudinary/Firebase, Google Auth, dan Iframe
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:",
      "style-src 'self' 'unsafe-inline' https: http: data:",
      "font-src 'self' https: http: data:",
      "img-src * data: blob: https: http:",
      "media-src * data: blob: https: http:",
      "connect-src * https: http: wss: ws:",
      "frame-src * https: http:",
      "frame-ancestors *", // Pastikan web dapat dibuka dengan lancar di AI Studio preview, mobile webview, atau embed lain tanpa blokir
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ')
  );

  // Jangan pasang X-Frame-Options: SAMEORIGIN agar iframe preview AI Studio dan browser mobile tidak diblokir
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  next();
});

// ============================================================================
// 2. RATE LIMITER AMAN & ANTI-PEMBLOKIRAN SALAH (Zero False-Positive)
// ============================================================================
// Catatan: Tidak pernah membatasi GET request (membaca web, melihat karya, download asset)
// Hanya melindungi POST write dari serangan spam ekstrim tanpa melakukan pemblokiran IP permanen
interface ApiLimitEntry {
  count: number;
  resetAt: number;
}

const apiLimitStore = new Map<string, ApiLimitEntry>();
const API_POST_LIMIT = 150; // Kuota 150 request POST per menit per IP (sangat aman untuk pengguna asli)
const WINDOW_MS = 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of apiLimitStore.entries()) {
    if (entry.resetAt < now) {
      apiLimitStore.delete(ip);
    }
  }
}, 3 * 60 * 1000);

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

const softApiProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Pengunjung yang hanya membuka web, melihat gambar, atau membaca API GET TIDAK PERNAH dibatasi
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Hanya periksa request mutasi API
  if (req.path.startsWith('/api/')) {
    const ip = getClientIp(req);
    const now = Date.now();
    let entry = apiLimitStore.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + WINDOW_MS };
      apiLimitStore.set(ip, entry);
    } else {
      entry.count++;
    }

    if (entry.count > API_POST_LIMIT) {
      const remainingSecs = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', remainingSecs);
      res.status(429).json({
        error: 'Aktivitas pengiriman data terlalu cepat. Mohon tunggu beberapa detik.',
        code: 'PLEASE_SLOW_DOWN'
      });
      return;
    }
  }

  next();
};

app.use(softApiProtection);

// Ensure public/uploads directory exists safely
const uploadsDir = path.resolve(__dirname, 'public/uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn('Notice: uploads directory creation:', e);
}

// Static file serving for uploads (/uploads/*) and public assets (/images/*)
const publicDir = path.resolve(__dirname, 'public');

// Service Worker must always be fresh
app.get('/sw.js', (_req: Request, res: Response) => {
  const swPath = path.join(publicDir, 'sw.js');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(swPath);
});

const mediaRegistryPath = path.resolve(__dirname, 'uploads-registry.json');

// Dynamic Cloud Firestore configuration from firebase-applet-config.json
let firebaseAppConfig: any = {};
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseAppConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Notice: Failed loading firebase-applet-config.json in server:', e);
}

const FIREBASE_PROJECT_ID = firebaseAppConfig.projectId || 'portofolio-c368b';
const FIRESTORE_DATABASE_ID = firebaseAppConfig.firestoreDatabaseId || 'ai-studio-portofoliodesain-16b96d08-efff-4e76-af75-1c33dc5adab7';
const FIREBASE_API_KEY = firebaseAppConfig.apiKey || 'AIzaSyDHmxUYsvRc5DKy8M1pwqO-zz_Wtq_09us';

const getFirestoreRestDocUrl = (collection: string, docId: string): string => {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
};

// Auto-recovery & self-healing untuk file upload: jika file hilang dari disk lokal (misal setelah restart instance),
// ambil dataUrl dari Firestore uploadedMedia atau uploads-registry.json, tulis kembali ke disk, dan sajikan langsung!
app.get('/uploads/:filename', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadsDir, filename);

  if (fs.existsSync(filePath)) {
    return next();
  }

  try {
    let base64Data = '';
    let mimeType = 'image/webp';
    if (filename.endsWith('.svg')) mimeType = 'image/svg+xml';
    else if (filename.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (filename.endsWith('.png')) mimeType = 'image/png';
    else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mimeType = 'image/jpeg';

    // 1. Cek uploads-registry.json
    if (fs.existsSync(mediaRegistryPath)) {
      try {
        const list = JSON.parse(fs.readFileSync(mediaRegistryPath, 'utf-8'));
        if (Array.isArray(list)) {
          const match = list.find((item: any) => item.filename === filename || (item.url && item.url.endsWith(filename)));
          if (match && match.dataUrl && typeof match.dataUrl === 'string') {
            base64Data = match.dataUrl;
            if (match.mimeType) mimeType = match.mimeType;
          }
        }
      } catch {}
    }

    // 2. Jika belum ditemukan di registry lokal, tarik dari Cloud Firestore uploadedMedia
    if (!base64Data) {
      const safeDocId = `media_${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
      const candidates = [safeDocId, safeFilename];

      for (const docId of candidates) {
        try {
          const firestoreUrl = getFirestoreRestDocUrl('uploadedMedia', docId);
          const resp = await fetch(firestoreUrl, { method: 'GET' });
          if (resp.ok) {
            const docJson: any = await resp.json();
            const fields = docJson?.fields;
            if (fields?.dataUrl?.stringValue) {
              base64Data = fields.dataUrl.stringValue;
              if (fields?.mimeType?.stringValue) {
                mimeType = fields.mimeType.stringValue;
              }
              break;
            }
          }
        } catch {}
      }
    }

    // 3. Rekonstruksi file ke disk dan layani ke client
    if (base64Data) {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length > 0) {
        fs.writeFileSync(filePath, buffer);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.status(200).send(buffer);
        return;
      }
    }
  } catch (recoverErr) {
    console.warn('Upload auto-recovery notice:', recoverErr);
  }

  next();
});

// Static serving for user uploads
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (/\.svg$/i.test(filePath)) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

app.use('/images', express.static(path.join(publicDir, 'images'), {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Body parser
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Dedicated Service Worker endpoint with zero-cache & root scope header
app.get('/sw.js', (_req: Request, res: Response) => {
  const swPath = path.join(publicDir, 'sw.js');
  if (fs.existsSync(swPath)) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(swPath);
  } else {
    res.status(404).end();
  }
});

// Dedicated PWA Manifest endpoint
app.get('/manifest.json', (_req: Request, res: Response) => {
  const manifestPath = path.join(publicDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(manifestPath);
  } else {
    res.status(404).end();
  }
});

app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    if (/\.(?:png|jpe?g|webp|svg|gif|avif|ico)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }
}));

// ============================================================================
// 3. REST DATA ENDPOINTS (Penyimpanan Lokal / Disk Backup)
// ============================================================================
const settingsFilePath = path.resolve(__dirname, 'settings-storage.json');
const projectsFilePath = path.resolve(__dirname, 'projects-storage.json');
const blogsFilePath = path.resolve(__dirname, 'blogs-storage.json');
const experiencesFilePath = path.resolve(__dirname, 'experiences-storage.json');

const requireAdminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers['x-admin-token'] || req.headers['authorization'];
  if (
    token === 'alfreelnc_admin_auth_verified' || 
    token === 'Bearer alfreelnc_admin_auth_verified' ||
    req.body?.adminKey === 'alfreelnc_admin_auth_verified' ||
    req.body?._adminAuth === 'alfreelnc_admin_auth_verified'
  ) {
    return next();
  }
  res.status(401).json({ error: 'Akses ditolak: Operasi ini membutuhkan otorisasi administrator.' });
};

app.get('/api/settings', (_req: Request, res: Response): void => {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf-8');
      res.status(200).json(JSON.parse(data));
      return;
    }
  } catch (err) {
    console.warn('Error reading settings-storage.json:', err);
  }
  res.status(200).json({});
});

app.post('/api/settings', requireAdminAuth, (req: Request, res: Response): void => {
  try {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      fs.writeFileSync(settingsFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Data pengaturan tidak valid' });
  } catch (err: any) {
    console.error('Error writing settings-storage.json:', err);
    res.status(500).json({ error: 'Gagal menyimpan pengaturan' });
  }
});

// Dedicated endpoint untuk Hero Image utama agar tersimpan permanen di disk server & file storage
app.get('/api/hero-image', (_req: Request, res: Response): void => {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
      if (data && data.heroImage) {
        res.status(200).json({ heroImage: data.heroImage });
        return;
      }
    }
  } catch (e) {
    console.warn("Read hero-image error:", e);
  }
  res.status(200).json({ heroImage: '' });
});

app.post('/api/hero-image', (req: Request, res: Response): void => {
  try {
    const { heroImage, imageBase64 } = req.body || {};
    let finalUrl = heroImage || '';

    // Jika imageBase64 disertakan, tulis langsung ke public/uploads/hero_main_xxx.webp
    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.includes('base64,')) {
      try {
        const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 0) {
          const heroFileName = `hero_main_${Date.now()}.webp`;
          const filePath = path.join(uploadsDir, heroFileName);
          fs.writeFileSync(filePath, buffer);
          finalUrl = `/uploads/${heroFileName}`;
        }
      } catch (writeErr) {
        console.warn("Failed writing hero buffer:", writeErr);
      }
    }

    if (finalUrl && fs.existsSync(settingsFilePath)) {
      try {
        const current = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
        current.heroImage = finalUrl;
        current.savedAt = Date.now();
        fs.writeFileSync(settingsFilePath, JSON.stringify(current, null, 2), 'utf-8');
      } catch {}
    }

    res.status(200).json({ success: true, heroImage: finalUrl });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menyimpan hero image' });
  }
});

app.get('/api/projects', (_req: Request, res: Response): void => {
  try {
    if (fs.existsSync(projectsFilePath)) {
      const data = fs.readFileSync(projectsFilePath, 'utf-8');
      res.status(200).json(JSON.parse(data));
      return;
    }
  } catch {}
  res.status(200).json([]);
});

app.post('/api/projects', requireAdminAuth, (req: Request, res: Response): void => {
  try {
    const payload = req.body;
    if (Array.isArray(payload)) {
      fs.writeFileSync(projectsFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Format data proyek tidak valid' });
  } catch {
    res.status(500).json({ error: 'Gagal menyimpan proyek' });
  }
});

app.get('/api/blogs', (_req: Request, res: Response): void => {
  try {
    if (fs.existsSync(blogsFilePath)) {
      const data = fs.readFileSync(blogsFilePath, 'utf-8');
      res.status(200).json(JSON.parse(data));
      return;
    }
  } catch {}
  res.status(200).json([]);
});

app.post('/api/blogs', requireAdminAuth, (req: Request, res: Response): void => {
  try {
    const payload = req.body;
    if (Array.isArray(payload)) {
      fs.writeFileSync(blogsFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Format data blog tidak valid' });
  } catch {
    res.status(500).json({ error: 'Gagal menyimpan blog' });
  }
});

app.get('/api/experiences', (_req: Request, res: Response): void => {
  try {
    if (fs.existsSync(experiencesFilePath)) {
      const data = fs.readFileSync(experiencesFilePath, 'utf-8');
      res.status(200).json(JSON.parse(data));
      return;
    }
  } catch {}
  res.status(200).json([]);
});

app.post('/api/experiences', requireAdminAuth, (req: Request, res: Response): void => {
  try {
    const payload = req.body;
    if (Array.isArray(payload)) {
      fs.writeFileSync(experiencesFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Format data pengalaman tidak valid' });
  } catch {
    res.status(500).json({ error: 'Gagal menyimpan pengalaman' });
  }
});

// ============================================================================
// 4. FIREWALL UPLOAD DENGAN PROTEKSI FILE AMAN & REGISTRY PERMANEN
// ============================================================================
// Blokir file script berbahaya (.html, .php, .js, .exe, .sh), izinkan semua media & dokumen desain
const FORBIDDEN_EXTENSIONS = new Set([
  '.html', '.htm', '.php', '.phtml', '.php3', '.php4', '.php5',
  '.js', '.mjs', '.cjs', '.exe', '.sh', '.bat', '.cmd', '.py',
  '.pl', '.cgi', '.asp', '.aspx', '.jsp', '.jar'
]);

function registerUploadedMedia(record: { url: string; filename: string; size: number; mimeType?: string; uploadedAt: string; dataUrl?: string }): void {
  try {
    let list: any[] = [];
    if (fs.existsSync(mediaRegistryPath)) {
      try {
        list = JSON.parse(fs.readFileSync(mediaRegistryPath, 'utf-8'));
        if (!Array.isArray(list)) list = [];
      } catch {}
    }
    list.unshift({
      id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...record
    });
    if (list.length > 2000) list = list.slice(0, 2000);
    fs.writeFileSync(mediaRegistryPath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Notice: Failed writing media registry:', e);
  }

  // Non-blocking background sync to Cloud Firestore uploadedMedia
  if (record.dataUrl && typeof record.dataUrl === 'string') {
    const safeDocId = `media_${record.filename.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const safeFilename = record.filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const firestoreUrl = getFirestoreRestDocUrl('uploadedMedia', safeDocId);

    const body = {
      fields: {
        id: { stringValue: safeDocId },
        filename: { stringValue: record.filename },
        url: { stringValue: record.url },
        size: { integerValue: String(record.size || 0) },
        mimeType: { stringValue: record.mimeType || 'image/webp' },
        dataUrl: { stringValue: record.dataUrl },
        uploadedAt: { stringValue: record.uploadedAt || new Date().toISOString() },
        _adminAuth: { stringValue: 'alfreelnc_admin_auth_verified' },
        updatedByAdmin: { booleanValue: true }
      }
    };

    fetch(firestoreUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(async (res) => {
      if (res.ok && safeFilename !== safeDocId) {
        const aliasUrl = getFirestoreRestDocUrl('uploadedMedia', safeFilename);
        fetch(aliasUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }).catch(() => {});
      }
    }).catch((err) => {
      console.warn("Notice: Firestore REST upload sync:", err?.message || err);
    });
  }
}

app.get('/api/media-registry', (_req: Request, res: Response): void => {
  try {
    if (fs.existsSync(mediaRegistryPath)) {
      const data = JSON.parse(fs.readFileSync(mediaRegistryPath, 'utf-8'));
      res.status(200).json(Array.isArray(data) ? data : []);
      return;
    }
  } catch {}
  res.status(200).json([]);
});

app.post('/api/media-registry', requireAdminAuth, (req: Request, res: Response): void => {
  try {
    const item = req.body;
    if (item && item.url) {
      registerUploadedMedia({
        url: item.url,
        filename: item.filename || path.basename(item.url),
        size: item.size || 0,
        mimeType: item.mimeType || 'image/webp',
        uploadedAt: item.uploadedAt || new Date().toISOString(),
        dataUrl: item.dataUrl || undefined
      });
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Data media tidak valid' });
  } catch {
    res.status(500).json({ error: 'Gagal mencatat media' });
  }
});

const collaboratorLogsPath = path.resolve(__dirname, 'collaborator-logs.json');

function registerCollaboratorLog(record: any): void {
  try {
    let list: any[] = [];
    if (fs.existsSync(collaboratorLogsPath)) {
      try {
        list = JSON.parse(fs.readFileSync(collaboratorLogsPath, 'utf-8'));
        if (!Array.isArray(list)) list = [];
      } catch {}
    }
    list.unshift(record);
    if (list.length > 2000) list = list.slice(0, 2000);
    fs.writeFileSync(collaboratorLogsPath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Notice: Failed writing collaborator log:', e);
  }
}

app.get('/api/collaborator-logs', (_req: Request, res: Response): void => {
  try {
    if (fs.existsSync(collaboratorLogsPath)) {
      const data = JSON.parse(fs.readFileSync(collaboratorLogsPath, 'utf-8'));
      res.status(200).json(Array.isArray(data) ? data : []);
      return;
    }
  } catch {}
  res.status(200).json([]);
});

app.post('/api/collaborator-logs', (req: Request, res: Response): void => {
  try {
    const item = req.body;
    if (item && item.username) {
      registerCollaboratorLog({
        id: item.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...item,
        timestamp: item.timestamp || Date.now()
      });
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Data log kolaborator tidak valid' });
  } catch {
    res.status(500).json({ error: 'Gagal mencatat log kolaborator' });
  }
});

app.delete('/api/collaborator-logs', requireAdminAuth, (_req: Request, res: Response): void => {
  try {
    fs.writeFileSync(collaboratorLogsPath, JSON.stringify([], null, 2), 'utf-8');
    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Gagal membersihkan log kolaborator' });
  }
});

// ============================================================================
// GOOGLE SEARCH GROUNDING (GEMINI 3.8 FLASH + GOOGLE SEARCH TOOL)
// ============================================================================
app.post('/api/google-search-trends', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, category } = req.body || {};
    const searchQuery = (query || '').trim() || 'Tren desain grafis dan visual branding 2026';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'Layanan Google Search AI membutuhkan GEMINI_API_KEY di environment.',
        code: 'MISSING_API_KEY'
      });
      return;
    }

    const aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `Sebagai konsultan desain grafis & visual branding profesional, lakukan pencarian web Google secara mendalam tentang: "${searchQuery}".
Konteks: ${category || 'Tren Desain Kreatif, Visual, dan Branding'}.

Berikan ulasan tren yang faktual, segar, dan sangat berguna untuk desainer & klien dalam format Markdown terstruktur:
1. **Ringkasan Tren Terkini**: Ringkasan gaya visual, tema, dan estetika yang sedang ramai digunakan dan diminati pasar saat ini berdasarkan hasil pencarian web.
2. **Palet Warna & Nuansa Populer**: Sebutkan nama warna dan perkiraan kode HEX yang sedang tren untuk kombinasi visual ini.
3. **Pilihan Tipografi & Huruf**: Karakter font dan kombinasi tipografi yang selaras dengan tren ini.
4. **Rekomendasi Praktis**: Langkah konkret penerapan ide ini pada poster, feed Instagram, logo, atau materi branding.

Tulis dalam bahasa Indonesia yang profesional, ramah, dan ringkas namun komprehensif.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || '';
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = chunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({
        title: c.web.title,
        uri: c.web.uri
      }));

    res.status(200).json({
      success: true,
      query: searchQuery,
      summary: text,
      sources: webSources,
      searchQueries: response.candidates?.[0]?.groundingMetadata?.webSearchQueries || []
    });
  } catch (err: any) {
    console.error('Google search grounding endpoint error:', err);
    let userFriendlyMsg = 'Gagal mengambil data dari Google Search.';
    const rawMsg = err?.message || String(err);
    if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota')) {
      userFriendlyMsg = 'Batas kuota pencarian Google Search sementara sedang padat. Silakan tunggu 1 menit lalu coba klik kembali.';
    } else if (rawMsg.includes('API_KEY')) {
      userFriendlyMsg = 'Kunci API Gemini Google Search belum terpasang atau tidak valid.';
    }
    res.status(rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') ? 429 : 500).json({
      error: userFriendlyMsg,
      details: rawMsg
    });
  }
});

app.post('/api/upload', (req: Request, res: Response): void => {
  // A. JSON base64 upload
  if (req.body && (req.body.data || req.body.file)) {
    try {
      let rawFilename = req.body.filename || 'upload.webp';
      let cleanExt = path.extname(rawFilename).toLowerCase();
      if (!cleanExt) cleanExt = '.webp';

      if (FORBIDDEN_EXTENSIONS.has(cleanExt)) {
        res.status(400).json({ error: 'Format file ini dibatasi untuk alasan keamanan' });
        return;
      }

      const rawData = req.body.data || req.body.file;
      const base64Data = rawData.replace(/^data:[^;]+;base64,/, '');
      const fileBuffer = Buffer.from(base64Data, 'base64');

      if (fileBuffer.length === 0) {
        res.status(400).json({ error: 'File kosong' });
        return;
      }

      // Sanitasi nama file agar aman dari path traversal
      const baseName = path.basename(rawFilename, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const safeName = `${baseName || 'file'}_${Date.now()}_${randomSuffix}${cleanExt}`;
      const filePath = path.join(uploadsDir, safeName);

      fs.writeFileSync(filePath, fileBuffer);
      const publicUrl = `/uploads/${safeName}`;

      const mime = cleanExt === '.svg' ? 'image/svg+xml' : cleanExt === '.pdf' ? 'application/pdf' : 'image/webp';
      const effectiveDataUrl = rawData.startsWith('data:') ? rawData : `data:${mime};base64,${base64Data}`;

      registerUploadedMedia({
        url: publicUrl,
        filename: safeName,
        size: fileBuffer.length,
        mimeType: mime,
        uploadedAt: new Date().toISOString(),
        dataUrl: effectiveDataUrl
      });

      res.status(200).json({ url: publicUrl });
      return;
    } catch {
      res.status(500).json({ error: 'Gagal memproses upload file' });
      return;
    }
  }

  // B. Multipart / stream upload
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    try {
      const fullBuffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      let filename = 'upload.webp';
      let fileBuffer: Buffer | null = null;

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]).trim() : '';
        if (boundary) {
          const boundaryBuffer = Buffer.from(`--${boundary}`);
          let startIdx = fullBuffer.indexOf(boundaryBuffer);
          while (startIdx !== -1) {
            const nextIdx = fullBuffer.indexOf(boundaryBuffer, startIdx + boundaryBuffer.length);
            if (nextIdx === -1) break;

            const part = fullBuffer.slice(startIdx, nextIdx);
            let headerEndIdx = part.indexOf(Buffer.from('\r\n\r\n'));
            let headerOffset = 4;
            if (headerEndIdx === -1) {
              headerEndIdx = part.indexOf(Buffer.from('\n\n'));
              headerOffset = 2;
            }

            if (headerEndIdx !== -1) {
              const headerStr = part.slice(0, headerEndIdx).toString('utf-8');
              if (headerStr.includes('filename="')) {
                const fnMatch = headerStr.match(/filename="([^"]+)"/);
                if (fnMatch) filename = fnMatch[1];
                let dataStart = headerEndIdx + headerOffset;
                let dataEnd = part.length;
                if (part.slice(dataEnd - 2).equals(Buffer.from('\r\n'))) {
                  dataEnd -= 2;
                } else if (part.slice(dataEnd - 1).equals(Buffer.from('\n'))) {
                  dataEnd -= 1;
                }
                fileBuffer = part.slice(dataStart, dataEnd);
                break;
              }
            }
            startIdx = nextIdx;
          }
        }
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        if (fullBuffer.length > 0 && !contentType.includes('multipart/form-data')) {
          fileBuffer = fullBuffer;
        }
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        res.status(400).json({ error: 'Tidak ada data file yang diterima' });
        return;
      }

      let cleanExt = path.extname(filename).toLowerCase();
      if (!cleanExt) cleanExt = '.webp';

      if (FORBIDDEN_EXTENSIONS.has(cleanExt)) {
        res.status(400).json({ error: 'Format file ini dibatasi untuk alasan keamanan' });
        return;
      }

      const baseName = path.basename(filename, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const safeName = `${baseName || 'file'}_${Date.now()}_${randomSuffix}${cleanExt}`;
      const filePath = path.join(uploadsDir, safeName);

      fs.writeFileSync(filePath, fileBuffer);
      const publicUrl = `/uploads/${safeName}`;

      const mime = cleanExt === '.svg' ? 'image/svg+xml' : cleanExt === '.pdf' ? 'application/pdf' : 'image/webp';
      const effectiveDataUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`;

      registerUploadedMedia({
        url: publicUrl,
        filename: safeName,
        size: fileBuffer.length,
        mimeType: mime,
        uploadedAt: new Date().toISOString(),
        dataUrl: effectiveDataUrl
      });

      res.status(200).json({ url: publicUrl });
    } catch {
      res.status(500).json({ error: 'Upload gagal diproses' });
    }
  });
});

// Health check endpoints for monitoring and probes
app.get(['/api/health', '/health', '/healthz', '/_health'], (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[SERVER ERROR]', err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Terjadi kendala pada server. Silakan coba kembali.',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ============================================================================
// 5. DYNAMIC METADATA & OPENGRAPH INJECTOR (WHATSAPP & SOCIAL SHARING)
// ============================================================================
function getRequestOrigin(req: Request): string {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim();
  const rawHost = forwardedHost || req.headers['host'] || 'localhost:3000';
  const isLocal = rawHost.includes('localhost') || rawHost.includes('127.0.0.1');
  const proto = forwardedProto || (isLocal ? (req.secure ? 'https' : 'http') : 'https');
  return `${proto}://${rawHost}`;
}

function getPrimaryCoverImage(): { imagePath: string; mimeType: string; width: number; height: number } {
  let imagePath = '/uploads/cover_web_1792581846511.png';
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
      if (data && typeof data.heroImage === 'string' && data.heroImage.trim().length > 0) {
        const candidate = data.heroImage.trim();
        if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
          const isWebp = candidate.toLowerCase().endsWith('.webp');
          const isJpg = candidate.toLowerCase().endsWith('.jpg') || candidate.toLowerCase().endsWith('.jpeg');
          return {
            imagePath: candidate,
            mimeType: isWebp ? 'image/webp' : isJpg ? 'image/jpeg' : 'image/png',
            width: 1408,
            height: 768,
          };
        }
        const rel = candidate.startsWith('/') ? candidate : `/${candidate}`;
        const localFile = path.join(publicDir, rel);
        if (fs.existsSync(localFile)) {
          imagePath = rel;
        } else if (candidate.includes('cover_web')) {
          imagePath = '/uploads/cover_web_1792581846511.png';
        }
      }
    }
  } catch (e) {
    console.warn('Error reading settings for cover image:', e);
  }

  const isWebp = imagePath.toLowerCase().endsWith('.webp');
  const isJpg = imagePath.toLowerCase().endsWith('.jpg') || imagePath.toLowerCase().endsWith('.jpeg');
  return {
    imagePath,
    mimeType: isWebp ? 'image/webp' : isJpg ? 'image/jpeg' : 'image/png',
    width: 1408,
    height: 768,
  };
}

function injectDynamicMeta(html: string, req: Request): string {
  const origin = getRequestOrigin(req);
  const { imagePath, mimeType, width, height } = getPrimaryCoverImage();
  const absoluteImageUrl = imagePath.startsWith('http://') || imagePath.startsWith('https://')
    ? imagePath
    : `${origin}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
  
  const fullUrl = `${origin}${req.originalUrl || '/'}`;

  let modified = html;

  // Replace og:image
  if (/<meta\s+property=["']og:image["']/i.test(modified)) {
    modified = modified.replace(
      /<meta\s+property=["']og:image["']\s+content=["'][^"']*["'][^>]*>/i,
      `<meta property="og:image" content="${absoluteImageUrl}" id="og-image" />`
    );
  } else {
    modified = modified.replace('</head>', `    <meta property="og:image" content="${absoluteImageUrl}" id="og-image" />\n  </head>`);
  }

  // Replace og:image:secure_url
  if (/<meta\s+property=["']og:image:secure_url["']/i.test(modified)) {
    modified = modified.replace(
      /<meta\s+property=["']og:image:secure_url["']\s+content=["'][^"']*["'][^>]*>/i,
      `<meta property="og:image:secure_url" content="${absoluteImageUrl}" id="og-image-secure" />`
    );
  } else {
    modified = modified.replace('</head>', `    <meta property="og:image:secure_url" content="${absoluteImageUrl}" id="og-image-secure" />\n  </head>`);
  }

  // Replace og:image:type
  if (/<meta\s+property=["']og:image:type["']/i.test(modified)) {
    modified = modified.replace(
      /<meta\s+property=["']og:image:type["']\s+content=["'][^"']*["'][^>]*>/i,
      `<meta property="og:image:type" content="${mimeType}" />`
    );
  }

  // Replace og:image:width
  if (/<meta\s+property=["']og:image:width["']/i.test(modified)) {
    modified = modified.replace(
      /<meta\s+property=["']og:image:width["']\s+content=["'][^"']*["'][^>]*>/i,
      `<meta property="og:image:width" content="${width}" />`
    );
  }

  // Replace og:image:height
  if (/<meta\s+property=["']og:image:height["']/i.test(modified)) {
    modified = modified.replace(
      /<meta\s+property=["']og:image:height["']\s+content=["'][^"']*["'][^>]*>/i,
      `<meta property="og:image:height" content="${height}" />`
    );
  }

  // Replace twitter:image
  if (/<meta\s+name=["']twitter:image["']/i.test(modified)) {
    modified = modified.replace(
      /<meta\s+name=["']twitter:image["']\s+content=["'][^"']*["'][^>]*>/i,
      `<meta name="twitter:image" content="${absoluteImageUrl}" id="twitter-image" />`
    );
  }

  // Replace og:url
  if (/<meta\s+property=["']og:url["']/i.test(modified)) {
    modified = modified.replace(
      /<meta\s+property=["']og:url["']\s+content=["'][^"']*["'][^>]*>/i,
      `<meta property="og:url" content="${fullUrl}" id="og-url" />`
    );
  }

  // Replace canonical link
  if (/<link\s+rel=["']canonical["']/i.test(modified)) {
    modified = modified.replace(
      /<link\s+rel=["']canonical["']\s+href=["'][^"']*["'][^>]*>/i,
      `<link rel="canonical" href="${fullUrl}" id="canonical-url" />`
    );
  }

  return modified;
}

// ============================================================================
// 6. VITE MIDDLEWARE (DEV) OR DIST STATIC SERVING (PROD)
// ============================================================================
async function startServer() {
  const server = http.createServer(app);

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { 
        middlewareMode: true,
        hmr: { server }
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req: Request, res: Response, next: NextFunction) => {
      // Don't intercept API, uploads, images, or vite internal assets
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/images') ||
        req.path.startsWith('/@') ||
        req.path.startsWith('/src') ||
        req.path.startsWith('/node_modules') ||
        /\.[a-zA-Z0-9]+$/.test(req.path)
      ) {
        return next();
      }

      try {
        const rawTemplate = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        const viteTemplate = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
        const finalHtml = injectDynamicMeta(viteTemplate, req);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(finalHtml);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, {
      maxAge: '1h',
      index: false,
      setHeaders: (res, filePath) => {
        if (/\.(?:png|jpe?g|webp|svg|gif|avif|ico|woff2?|ttf|eot)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
      }
    }));
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.resolve(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          const rawTemplate = fs.readFileSync(indexPath, 'utf-8');
          const finalHtml = injectDynamicMeta(rawTemplate, req);
          res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(finalHtml);
        } catch {
          res.sendFile(indexPath);
        }
      } else {
        res.status(200).send('<!doctype html><html><head><meta charset="utf-8"><title>Portofolio</title></head><body><div id="root">App starting...</div></body></html>');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (isProd: ${isProd})`);
  });

  const shutdown = () => {
    console.log('Received shutdown signal, shutting down gracefully...');
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
