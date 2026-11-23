/**
 * Local dev server: static files + /api/labs + /api/health
 * รัน: npm run dev  แล้วเปิด http://localhost:3000
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { config } from 'dotenv';
import labsHandler from '../api/labs.js';
import healthHandler from '../api/health.js';
import adminHandler from '../api/admin.js';

config({ path: '.env.local' });
config();

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

function sendFile(res, filePath) {
  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname === '/api/labs') {
      return labsHandler(req, res);
    }
    if (url.pathname === '/api/health') {
      return healthHandler(req, res);
    }
    if (url.pathname === '/api/admin') {
      return adminHandler(req, res);
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    if (pathname === '/admin') pathname = '/admin.html';

    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(ROOT, safe);

    if (!filePath.startsWith(ROOT) || !existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    sendFile(res, filePath);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
});

server.listen(PORT, () => {
  console.log(`LAB search running at http://localhost:${PORT}`);
  console.log(
    process.env.DATABASE_URL
      ? 'Database: Neon (DATABASE_URL detected)'
      : 'Database: fallback to data/labs.json'
  );
});
