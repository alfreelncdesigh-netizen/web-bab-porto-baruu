import express from 'express';
import type { Request, Response } from 'express';
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

// 1. Static file serving for uploads (/uploads/*)
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// 2. Upload endpoint: /api/upload
app.post('/api/upload', (req: Request, res: Response): void => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    try {
      const fullBuffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      let filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webp`;
      let fileBuffer: Buffer | null = null;

      if (contentType.includes('application/json')) {
        const parsed = JSON.parse(fullBuffer.toString('utf-8'));
        if (parsed.filename) filename = parsed.filename;
        if (parsed.data) {
          const base64Data = parsed.data.replace(/^data:image\/\w+;base64,/, '');
          fileBuffer = Buffer.from(base64Data, 'base64');
        }
      } else if (contentType.includes('multipart/form-data')) {
        const boundary = contentType.split('boundary=')[1];
        if (boundary) {
          const rawString = fullBuffer.toString('binary');
          const parts = rawString.split('--' + boundary);
          for (const part of parts) {
            if (part.includes('filename="')) {
              const match = part.match(/filename="([^"]+)"/);
              if (match) filename = match[1];
              const headerEnd = part.indexOf('\r\n\r\n');
              if (headerEnd !== -1) {
                const rawData = part.substring(headerEnd + 4, part.lastIndexOf('\r\n'));
                fileBuffer = Buffer.from(rawData, 'binary');
                break;
              }
            }
          }
        }
      } else {
        fileBuffer = fullBuffer;
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
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
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

  const server = app.listen(PORT, '0.0.0.0', () => {
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
