import { config } from 'dotenv';
import { ensureSchema, seedLabsFromJson } from '../lib/labs.js';

config({ path: '.env.local' });
config();

if (!process.env.DATABASE_URL) {
  console.error('ตั้ง DATABASE_URL ในไฟล์ .env.local ก่อน');
  process.exit(1);
}

await ensureSchema();
const result = await seedLabsFromJson({ replace: true });
console.log(`Seed เสร็จแล้ว: ${result.inserted} รายการ`);
