import { hasDatabase } from '../lib/labs.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = 200;
  res.end(
    JSON.stringify({
      ok: true,
      database: hasDatabase() ? 'configured' : 'fallback-json',
      time: new Date().toISOString(),
    })
  );
}
