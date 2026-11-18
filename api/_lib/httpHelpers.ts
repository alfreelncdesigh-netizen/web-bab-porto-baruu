import type { IncomingMessage, ServerResponse } from 'http';

export type ApiRequest = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>;
  body?: any;
};

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
  cacheControl = 'no-store, no-cache, must-revalidate'
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.end(JSON.stringify(payload));
}

export function getQueryParam(req: ApiRequest, key: string): string | undefined {
  const direct = req.query?.[key];
  if (typeof direct === 'string') return direct;
  if (Array.isArray(direct) && direct.length > 0) return direct[0];

  if (req.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const val = url.searchParams.get(key);
      if (val !== null) return val;
    } catch {
      // ignore invalid URL
    }
  }
  return undefined;
}

export function isAdminAuthorized(req: ApiRequest): boolean {
  const tokenHeader = req.headers['x-admin-token'] || req.headers['authorization'];
  const tokenStr = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
  return (
    tokenStr === 'alfreelnc_admin_auth_verified' ||
    tokenStr === 'Bearer alfreelnc_admin_auth_verified'
  );
}

export async function readJsonBody(req: ApiRequest): Promise<any> {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      return req.body.trim() ? JSON.parse(req.body) : {};
    }
    if (Buffer.isBuffer(req.body)) {
      const str = req.body.toString('utf-8').trim();
      return str ? JSON.parse(str) : {};
    }
    return req.body ?? {};
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function redactSecrets(text: string): string {
  return text
    .replace(/vercel_blob_rw_[A-Za-z0-9_-]+/gi, '[REDACTED_BLOB_TOKEN]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
}

export function logSafeApiError(scope: string, err: unknown): void {
  if (err instanceof Error) {
    const code = (err as any)?.code || (err as any)?.statusCode || 'UNKNOWN';
    console.error(`[${scope}]`, {
      name: err.name,
      code,
      message: redactSecrets(err.message || ''),
      stack: err.stack ? redactSecrets(err.stack) : undefined,
    });
    return;
  }
  console.error(`[${scope}]`, redactSecrets(String(err || 'Unknown error')));
}

