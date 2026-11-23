import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import labsJson from '../data/labs.json' with { type: 'json' };

export const LAB_HEADERS = [
  'รายการตรวจ',
  'ประเภทสิ่งส่งตรวจ',
  'ภาชนะเก็บสิ่งส่งตรวจ',
  'ราคา (อ้างอิงราคากรมบัญชีกลาง)',
  'ระยะเวลารอคอยผล (TAT)',
  'คำอธิบายเพิ่มเติม',
  'หมวดหมู่ (ใบ Lab)',
];

const JSON_PATH = join(process.cwd(), 'data', 'labs.json');

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function normalizeLab(input = {}) {
  return {
    test_name: String(input.test_name ?? input.testName ?? '').trim(),
    specimen_type: String(input.specimen_type ?? input.specimenType ?? '').trim(),
    container: String(input.container ?? '').trim(),
    price: String(input.price ?? '').trim(),
    tat: String(input.tat ?? '').trim(),
    description: String(input.description ?? '').trim(),
    category: String(input.category ?? '').trim(),
  };
}

function rowToItem(row, id) {
  return {
    id,
    test_name: row[0] ?? '',
    specimen_type: row[1] ?? '',
    container: row[2] ?? '',
    price: row[3] ?? '',
    tat: row[4] ?? '',
    description: row[5] ?? '',
    category: row[6] ?? '',
  };
}

function itemToRow(item) {
  return [
    item.test_name,
    item.specimen_type,
    item.container,
    item.price,
    item.tat,
    item.description,
    item.category,
  ];
}

export function loadLabsFromJson() {
  try {
    if (existsSync(JSON_PATH)) {
      return JSON.parse(readFileSync(JSON_PATH, 'utf8'));
    }
  } catch {
    // fall through
  }
  return structuredClone(labsJson);
}

function saveLabsJson(matrix) {
  writeFileSync(JSON_PATH, JSON.stringify(matrix, null, 2), 'utf8');
}

export async function getLabsMatrix() {
  const sql = getSql();
  if (!sql) {
    return {
      source: 'json',
      data: loadLabsFromJson(),
    };
  }

  const rows = await sql`
    SELECT
      test_name,
      specimen_type,
      container,
      price,
      tat,
      description,
      category
    FROM labs
    ORDER BY id ASC
  `;

  if (!rows.length) {
    return {
      source: 'database-empty',
      data: loadLabsFromJson(),
    };
  }

  const data = [
    LAB_HEADERS,
    ...rows.map((r) => [
      r.test_name ?? '',
      r.specimen_type ?? '',
      r.container ?? '',
      r.price ?? '',
      r.tat ?? '',
      r.description ?? '',
      r.category ?? '',
    ]),
  ];

  return { source: 'database', data };
}

export async function ensureSchema() {
  const sql = getSql();
  if (!sql) throw new Error('DATABASE_URL is not set');

  await sql`
    CREATE TABLE IF NOT EXISTS labs (
      id            SERIAL PRIMARY KEY,
      test_name     TEXT NOT NULL,
      specimen_type TEXT DEFAULT '',
      container     TEXT DEFAULT '',
      price         TEXT DEFAULT '',
      tat           TEXT DEFAULT '',
      description   TEXT DEFAULT '',
      category      TEXT DEFAULT '',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS labs_test_name_idx ON labs (test_name)`;
  await sql`CREATE INDEX IF NOT EXISTS labs_container_idx ON labs (container)`;
  await sql`CREATE INDEX IF NOT EXISTS labs_category_idx ON labs (category)`;
  await sql`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id         SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      detail     TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function seedLabsFromJson({ replace = true } = {}) {
  const sql = getSql();
  const matrix = loadLabsFromJson();
  const rows = matrix.slice(1).filter((row) => row && String(row[0] || '').trim());

  if (!sql) {
    // JSON mode: seed = reset file from bundled import if replace
    if (replace) {
      saveLabsJson(structuredClone(labsJson));
      return { inserted: labsJson.length - 1, source: 'json' };
    }
    return { inserted: 0, source: 'json' };
  }

  await ensureSchema();

  if (replace) {
    await sql`TRUNCATE TABLE labs RESTART IDENTITY`;
  }

  let inserted = 0;
  for (const row of rows) {
    const item = rowToItem(row, 0);
    await sql`
      INSERT INTO labs (
        test_name, specimen_type, container, price, tat, description, category
      ) VALUES (
        ${item.test_name},
        ${item.specimen_type},
        ${item.container},
        ${item.price},
        ${item.tat},
        ${item.description},
        ${item.category}
      )
    `;
    inserted += 1;
  }

  return { inserted, source: 'database' };
}

export async function listLabsAdmin() {
  const sql = getSql();
  if (!sql) {
    const matrix = loadLabsFromJson();
    const items = matrix.slice(1).map((row, i) => rowToItem(row, i + 1));
    return { source: 'json', count: items.length, items };
  }

  await ensureSchema();
  const rows = await sql`
    SELECT id, test_name, specimen_type, container, price, tat, description, category
    FROM labs
    ORDER BY id ASC
  `;
  return {
    source: 'database',
    count: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      test_name: r.test_name ?? '',
      specimen_type: r.specimen_type ?? '',
      container: r.container ?? '',
      price: r.price ?? '',
      tat: r.tat ?? '',
      description: r.description ?? '',
      category: r.category ?? '',
    })),
  };
}

export async function createLab(input) {
  const item = normalizeLab(input);
  if (!item.test_name) throw new Error('ต้องระบุชื่อรายการตรวจ');

  const sql = getSql();
  if (!sql) {
    const matrix = loadLabsFromJson();
    matrix.push(itemToRow(item));
    saveLabsJson(matrix);
    return { id: matrix.length - 1, ...item, source: 'json' };
  }

  await ensureSchema();
  const rows = await sql`
    INSERT INTO labs (
      test_name, specimen_type, container, price, tat, description, category
    ) VALUES (
      ${item.test_name},
      ${item.specimen_type},
      ${item.container},
      ${item.price},
      ${item.tat},
      ${item.description},
      ${item.category}
    )
    RETURNING id
  `;
  return { id: rows[0].id, ...item, source: 'database' };
}

export async function updateLab(id, input) {
  const numId = Number(id);
  if (!Number.isFinite(numId) || numId <= 0) throw new Error('รหัสรายการไม่ถูกต้อง');

  const item = normalizeLab(input);
  if (!item.test_name) throw new Error('ต้องระบุชื่อรายการตรวจ');

  const sql = getSql();
  if (!sql) {
    const matrix = loadLabsFromJson();
    const idx = numId; // 1-based index into data rows
    if (idx < 1 || idx >= matrix.length) throw new Error('ไม่พบรายการ');
    matrix[idx] = itemToRow(item);
    saveLabsJson(matrix);
    return { id: numId, ...item, source: 'json' };
  }

  const rows = await sql`
    UPDATE labs SET
      test_name = ${item.test_name},
      specimen_type = ${item.specimen_type},
      container = ${item.container},
      price = ${item.price},
      tat = ${item.tat},
      description = ${item.description},
      category = ${item.category},
      updated_at = NOW()
    WHERE id = ${numId}
    RETURNING id
  `;
  if (!rows.length) throw new Error('ไม่พบรายการ');
  return { id: numId, ...item, source: 'database' };
}

export async function deleteLab(id) {
  const numId = Number(id);
  if (!Number.isFinite(numId) || numId <= 0) throw new Error('รหัสรายการไม่ถูกต้อง');

  const sql = getSql();
  if (!sql) {
    const matrix = loadLabsFromJson();
    if (numId < 1 || numId >= matrix.length) throw new Error('ไม่พบรายการ');
    matrix.splice(numId, 1);
    saveLabsJson(matrix);
    return { ok: true, source: 'json' };
  }

  const rows = await sql`DELETE FROM labs WHERE id = ${numId} RETURNING id`;
  if (!rows.length) throw new Error('ไม่พบรายการ');
  return { ok: true, source: 'database' };
}

export async function logEvent(type, detail = '', userAgent = '') {
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`
      INSERT INTO usage_logs (event_type, detail, user_agent)
      VALUES (${String(type || '')}, ${String(detail || '')}, ${String(userAgent || '')})
    `;
  } catch {
    // ignore logging failures
  }
}
