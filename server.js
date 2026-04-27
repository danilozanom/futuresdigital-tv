const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const BASE = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const ONE_DAY = 60 * 60 * 24;
const HTML_CACHE_CONTROL = 'no-cache, no-store, must-revalidate';
const STATIC_CACHE_CONTROL = `public, max-age=${ONE_DAY}, immutable`;

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function securityHeaders(contentType) {
  const isHtml = typeof contentType === 'string' && contentType.includes('text/html');
  return {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    ...(isHtml
      ? {
          'Content-Security-Policy': [
            "default-src 'self'",
            "img-src 'self' data: https:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "script-src 'self' 'unsafe-inline'",
            "connect-src 'self' https:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            'upgrade-insecure-requests',
          ].join('; '),
        }
      : {}),
  };
}

function resolvePath(urlPath) {
  // Remove query string for file resolution
  const cleanUrl = decodeURIComponent(urlPath.split('?')[0]);
  let resolvedPath = cleanUrl;

  // Route clean URLs to their .html files
  if (cleanUrl === '/paginas') resolvedPath = '/paginas.html';
  if (cleanUrl === '/revendedores') resolvedPath = '/revendedores.html';

  // Route / to /index.html
  if (resolvedPath === '/') {
    resolvedPath = '/index.html';
  }

  const normalizedPath = path.normalize(resolvedPath).replace(/^(\.\.[/\\])+/, '');
  return path.join(BASE, normalizedPath);
}

http
  .createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      return send(
        res,
        405,
        req.method === 'HEAD' ? '' : 'Method Not Allowed',
        {
          Allow: 'GET, HEAD',
          ...securityHeaders('text/plain; charset=utf-8'),
        }
      );
    }

    if (req.url === '/healthz') {
      return send(
        res,
        200,
        req.method === 'HEAD' ? '' : JSON.stringify({ ok: true }),
        {
          ...securityHeaders('application/json; charset=utf-8'),
          'Cache-Control': 'no-store',
        }
      );
    }

    const filePath = resolvePath(req.url || '/');
    if (!filePath.startsWith(BASE)) {
      return send(
        res,
        403,
        req.method === 'HEAD' ? '' : 'Forbidden',
        securityHeaders('text/plain; charset=utf-8')
      );
    }

    fs.stat(filePath, (statErr, stats) => {
      if (statErr || !stats.isFile()) {
        return send(
          res,
          404,
          req.method === 'HEAD' ? '' : 'Not found',
          securityHeaders('text/plain; charset=utf-8')
        );
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';
      const headers = {
        ...securityHeaders(contentType),
        'Cache-Control': ext === '.html' ? HTML_CACHE_CONTROL : STATIC_CACHE_CONTROL,
      };

      if (req.method === 'HEAD') {
        return send(res, 200, '', headers);
      }

      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          return send(
            res,
            500,
            'Internal Server Error',
            securityHeaders('text/plain; charset=utf-8')
          );
        }

        headers['Content-Length'] = Buffer.byteLength(data);
        send(res, 200, data, headers);
      });
    });
  })
  .listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
