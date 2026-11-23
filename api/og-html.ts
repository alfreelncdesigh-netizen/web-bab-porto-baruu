import fs from 'fs';
import path from 'path';
import type { ServerResponse } from 'http';
import { type ApiRequest, logSafeApiError } from './_lib/httpHelpers.js';
import { injectOgMetaIntoHtml, resolveSeoOrigin } from './_lib/ogMeta.js';

const GLOBAL_HTML_TEMPLATE_KEY = '__alfreelncOgHtmlTemplate_v1';

async function loadIndexHtmlTemplate(req: ApiRequest): Promise<string | null> {
  const g = globalThis as any;
  if (typeof g[GLOBAL_HTML_TEMPLATE_KEY] === 'string' && g[GLOBAL_HTML_TEMPLATE_KEY].length > 0) {
    return g[GLOBAL_HTML_TEMPLATE_KEY] as string;
  }

  const localCandidates = [
    path.resolve(process.cwd(), 'dist', '_app.html'),
    path.resolve(process.cwd(), 'dist', 'index.html'),
    path.resolve(process.cwd(), 'index.html'),
  ];

  for (const candidate of localCandidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const html = fs.readFileSync(candidate, 'utf-8');
        if (html && html.includes('<head')) {
          g[GLOBAL_HTML_TEMPLATE_KEY] = html;
          return html;
        }
      }
    } catch {
      // Try next candidate
    }
  }

  // Remote static Edge fallback if serverless bundle lacked dist/_app.html
  if (!req.headers['x-og-html-internal']) {
    const origin = resolveSeoOrigin(req);
    for (const remotePath of ['/_app.html', '/index.html']) {
      try {
        const staticRes = await fetch(`${origin}${remotePath}`, {
          method: 'GET',
          headers: {
            Accept: 'text/html',
            'x-og-html-internal': '1',
          },
          signal: AbortSignal.timeout(4000),
        });
        if (staticRes.ok) {
          const html = await staticRes.text();
          if (html && html.includes('<head')) {
            g[GLOBAL_HTML_TEMPLATE_KEY] = html;
            return html;
          }
        }
      } catch {
        // Try next path
      }
    }
  }

  return null;
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method Not Allowed');
    return;
  }

  try {
    const rawHtml = await loadIndexHtmlTemplate(req);
    if (!rawHtml) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Template HTML tidak ditemukan.');
      return;
    }

    let finalHtml = rawHtml;
    try {
      finalHtml = await injectOgMetaIntoHtml(rawHtml, req);
    } catch (metaErr) {
      logSafeApiError('API OG HTML META INJECT', metaErr);
      finalHtml = rawHtml;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=30, stale-while-revalidate=300'
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (method === 'HEAD') {
      res.end();
      return;
    }
    res.end(finalHtml);
  } catch (err) {
    logSafeApiError('API OG HTML ERROR', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Gagal memproses halaman HTML.');
  }
}
