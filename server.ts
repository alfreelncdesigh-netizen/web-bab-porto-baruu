import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? Number(process.argv[portArgIndex + 1]) : null;
const PORT = Number(process.env.PORT) || cliPort || 3000;

// Determine whether the app is in production mode.
// In dev server, it runs via `npm run dev` (lifecycle event 'dev').
// In Cloud Run deployment, it runs via `npm start` or `node server.ts` where lifecycle event is 'start' or undefined.
const hasDist = fs.existsSync(path.resolve(__dirname, 'dist/index.html'));
const isDev = process.env.npm_lifecycle_event === 'dev' || (!hasDist && process.env.NODE_ENV === 'development');
const isProd = !isDev;

// Ensure public/uploads directory exists safely
const uploadsDir = path.resolve(__dirname, 'public/uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn('Notice: uploads directory creation:', e);
}

// 1. Static file serving for uploads (/uploads/*) and public assets (/images/*)
const publicDir = path.resolve(__dirname, 'public');
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));
app.use('/images', express.static(path.join(publicDir, 'images'), {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(publicDir));

// Settings persistence on server disk (instant fallback and cross-session persistence)
const settingsFilePath = path.resolve(__dirname, 'settings-storage.json');
const projectsFilePath = path.resolve(__dirname, 'projects-storage.json');
const blogsFilePath = path.resolve(__dirname, 'blogs-storage.json');
const experiencesFilePath = path.resolve(__dirname, 'experiences-storage.json');

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

app.post('/api/settings', (req: Request, res: Response): void => {
  try {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      fs.writeFileSync(settingsFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Invalid settings payload' });
  } catch (err: any) {
    console.error('Error writing settings-storage.json:', err);
    res.status(500).json({ error: err?.message || 'Failed to save settings' });
  }
});

// Projects endpoint
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

app.post('/api/projects', (req: Request, res: Response): void => {
  try {
    const payload = req.body;
    if (Array.isArray(payload)) {
      fs.writeFileSync(projectsFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Invalid projects payload' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to save projects' });
  }
});

// Blogs endpoint
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

app.post('/api/blogs', (req: Request, res: Response): void => {
  try {
    const payload = req.body;
    if (Array.isArray(payload)) {
      fs.writeFileSync(blogsFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Invalid blogs payload' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to save blogs' });
  }
});

// Experiences endpoint
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

app.post('/api/experiences', (req: Request, res: Response): void => {
  try {
    const payload = req.body;
    if (Array.isArray(payload)) {
      fs.writeFileSync(experiencesFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ error: 'Invalid experiences payload' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to save experiences' });
  }
});

// 2. Upload endpoint: /api/upload
app.post('/api/upload', (req: Request, res: Response): void => {
  // A. Jika request berupa JSON (sudah di-parse oleh express.json)
  if (req.body && (req.body.data || req.body.file)) {
    try {
      let filename = req.body.filename || `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webp`;
      const rawData = req.body.data || req.body.file;
      const base64Data = rawData.replace(/^data:[^;]+;base64,/, '');
      const fileBuffer = Buffer.from(base64Data, 'base64');
      const cleanExt = path.extname(filename) || '.webp';
      const baseName = path.basename(filename, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeName = `${baseName}_${Date.now()}${cleanExt}`;
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, fileBuffer);
      res.status(200).json({ url: `/uploads/${safeName}` });
      return;
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'JSON upload failed' });
      return;
    }
  }

  // B. Jika request berupa multipart/form-data atau binary stream
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    try {
      const fullBuffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      let filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webp`;
      let fileBuffer: Buffer | null = null;

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : '';
        if (boundary) {
          const boundaryBuffer = Buffer.from(`--${boundary}`);
          let startIdx = fullBuffer.indexOf(boundaryBuffer);
          while (startIdx !== -1) {
            const nextIdx = fullBuffer.indexOf(boundaryBuffer, startIdx + boundaryBuffer.length);
            if (nextIdx === -1) break;

            const part = fullBuffer.slice(startIdx, nextIdx);
            const headerEndIdx = part.indexOf(Buffer.from('\r\n\r\n'));
            if (headerEndIdx !== -1) {
              const headerStr = part.slice(0, headerEndIdx).toString('utf-8');
              if (headerStr.includes('filename="')) {
                const fnMatch = headerStr.match(/filename="([^"]+)"/);
                if (fnMatch) filename = fnMatch[1];
                let dataStart = headerEndIdx + 4;
                let dataEnd = part.length;
                if (part.slice(dataEnd - 2).equals(Buffer.from('\r\n'))) {
                  dataEnd -= 2;
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

      if (fileBuffer && fileBuffer.length > 0) {
        const cleanExt = path.extname(filename) || '.webp';
        const baseName = path.basename(filename, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeName = `${baseName}_${Date.now()}${cleanExt}`;
        const filePath = path.join(uploadsDir, safeName);
        fs.writeFileSync(filePath, fileBuffer);
        res.status(200).json({ url: `/uploads/${safeName}` });
      } else {
        res.status(400).json({ error: 'No file data received' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Upload failed' });
    }
  });
});

// 3. Health check endpoints for Cloud Run and monitoring probes
app.get(['/api/health', '/health', '/healthz', '/_health'], (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 4. Vite middleware (in development) or static files (in production)
async function startServer() {
  const server = http.createServer(app);

  if (!isProd) {
    const { createServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createServer({
      server: { 
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Prevent unhandled WebSocket upgrade drops when HMR is disabled
    server.on('upgrade', (_req, socket) => {
      if (isHmrDisabled) {
        socket.destroy();
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, {
      maxAge: '1h',
      index: false,
    }));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.resolve(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err && !res.headersSent) {
            res.status(500).send('Error serving application');
          }
        });
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
