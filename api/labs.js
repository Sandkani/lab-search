import { getLabsMatrix, logEvent, seedLabsFromJson } from '../lib/labs.js';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  try {
    if (req.method === 'GET') {
      const result = await getLabsMatrix();
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
      // คืนค่าเป็น matrix เดิม [header, ...rows] ให้ frontend ใช้ได้ทันที
      // พร้อม header บอกแหล่งข้อมูล
      res.setHeader('X-Lab-Source', result.source);
      return sendJson(res, 200, result.data);
    }

    if (req.method === 'POST') {
      const secret = req.headers['x-admin-secret'];
      if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return sendJson(res, 401, { error: 'Unauthorized' });
      }

      const body = await readBody(req);
      if (body?.action === 'seed') {
        const out = await seedLabsFromJson({ replace: body.replace !== false });
        return sendJson(res, 200, { ok: true, ...out });
      }

      if (body?.action === 'log') {
        await logEvent(body.type, body.detail, body.userAgent);
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 400, { error: 'Unknown action' });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    return sendJson(res, 500, { error: String(err?.message || err) });
  }
}
