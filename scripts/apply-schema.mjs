import { config } from 'dotenv';
import { ensureSchema, hasDatabase } from '../lib/labs.js';

config({ path: '.env.local' });
config();

if (!hasDatabase()) {
  console.error('ตั้ง DATABASE_URL ในไฟล์ .env.local ก่อน');
  process.exit(1);
}

await ensureSchema();
console.log('สร้างตาราง labs / usage_logs เรียบร้อย');
