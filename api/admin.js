import {
  createLab,
  deleteLab,
  hasDatabase,
  listLabsAdmin,
  seedLabsFromJson,
  updateLab,
} from '../lib/labs.js';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
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

function requireAdmin(req, res) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    sendJson(res, 500, {
      error: 'ยังไม่ได้ตั้ง ADMIN_SECRET ใน Environment Variables',
    });
    return false;
  }
  const secret = req.headers['x-admin-secret'];
  if (secret !== expected) {
    sendJson(res, 401, { error: 'รหัสไม่ถูกต้อง' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  try {
    if (!requireAdmin(req, res)) return;

    if (req.method === 'GET') {
      const list = await listLabsAdmin();
      return sendJson(res, 200, {
        ok: true,
        database: hasDatabase() ? 'configured' : 'json-file',
        ...list,
      });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);

      if (body?.action === 'login') {
        return sendJson(res, 200, {
          ok: true,
          database: hasDatabase() ? 'configured' : 'json-file',
        });
      }

      if (body?.action === 'seed') {
        const out = await seedLabsFromJson({ replace: body.replace !== false });
        const list = await listLabsAdmin();
        return sendJson(res, 200, { ok: true, ...out, count: list.count });
      }

      if (body?.action === 'create' || body?.item) {
        const created = await createLab(body.item || body);
        return sendJson(res, 201, { ok: true, item: created });
      }

      return sendJson(res, 400, { error: 'Unknown action' });
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      const id = body.id;
      const updated = await updateLab(id, body.item || body);
      return sendJson(res, 200, { ok: true, item: updated });
    }

    if (req.method === 'DELETE') {
      const body = await readBody(req);
      const id = body.id;
      const out = await deleteLab(id);
      return sendJson(res, 200, { ok: true, ...out });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    return sendJson(res, 500, { error: String(err?.message || err) });
  }
}
